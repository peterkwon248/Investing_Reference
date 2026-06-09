from typing import List, Dict, Optional
from app.core.enums import StrategyType
from app.core.models import BacktestConfig, TradeRecord, BacktestResult
from app.core.metrics import BacktestMetrics


class BacktestEngine:
    """백테스트 실행 엔진"""

    def __init__(self, config: BacktestConfig = None):
        self.config = config or BacktestConfig.zero_cost()

    def apply_buy_cost(self, price: float, amount: float) -> tuple:
        slippage_cost = price * (self.config.slippage / 100)
        actual_price = price * (1 + self.config.slippage / 100)
        commission = amount * (self.config.buy_commission / 100)
        fx_cost = amount * (self.config.fx_spread / 100)
        return actual_price, commission + fx_cost, slippage_cost

    def apply_sell_cost(self, price: float, amount: float, profit: float = 0) -> tuple:
        slippage_cost = price * (self.config.slippage / 100)
        actual_price = price * (1 - self.config.slippage / 100)
        commission = amount * (self.config.sell_commission / 100)
        fx_cost = amount * (self.config.fx_spread / 100)
        tax = 0
        if profit > 0 and self.config.capital_gains_tax > 0:
            tax = profit * (self.config.capital_gains_tax / 100)
        return actual_price, commission + fx_cost, slippage_cost, tax

    def run_infinite_buy(self, prices: List[float], capital: float,
                         divisions: int = 40, target_profit: float = 10,
                         seed_exhausted_action: str = 'hold',
                         dates: List = None) -> BacktestResult:
        history = []
        trades = []
        daily_amount = capital / divisions
        cash = capital
        shares = 0
        avg_price = 0
        buy_count = 0
        total_commission = 0
        total_slippage = 0
        total_tax = 0
        cycles = []
        cycle_count = 0
        target_ratio = 1 + (target_profit / 100)

        for i, price in enumerate(prices):
            date_str = str(dates[i]) if dates is not None and i < len(dates) else None
            action = 'hold'
            action_detail = {}

            if shares > 0 and avg_price > 0:
                target_price = avg_price * target_ratio
                if price >= target_price:
                    sell_amount = shares * price
                    profit = (price - avg_price) * shares
                    actual_price, commission, slippage, tax = self.apply_sell_cost(price, sell_amount, profit)
                    net_profit = profit - commission - slippage - tax
                    total_commission += commission
                    total_slippage += slippage
                    total_tax += tax
                    trades.append(TradeRecord(
                        day=i+1, date=date_str, action='sell',
                        price=actual_price, shares=shares, amount=sell_amount,
                        commission=commission, slippage_cost=slippage,
                        net_amount=sell_amount - commission - slippage - tax,
                        reason=f"익절 (목표 {target_profit}% 도달)"
                    ))
                    cycles.append({
                        'cycle': cycle_count + 1, 'profit': net_profit,
                        'return_pct': (net_profit / (daily_amount * buy_count)) * 100 if buy_count > 0 else 0,
                        'buy_count': buy_count, 'end_day': i + 1
                    })
                    cash = capital + net_profit
                    shares = 0
                    avg_price = 0
                    buy_count = 0
                    cycle_count += 1
                    action = 'sell'
                    action_detail = {'profit': net_profit, 'cycle': cycle_count}

            if action != 'sell' and buy_count < divisions and cash >= daily_amount:
                actual_price, commission, slippage = self.apply_buy_cost(price, daily_amount)
                buy_shares = (daily_amount - commission - slippage) / actual_price
                if not self.config.allow_fractional:
                    buy_shares = int(buy_shares)
                if buy_shares > 0:
                    total_cost = buy_shares * avg_price * shares if shares > 0 else 0
                    total_cost += buy_shares * actual_price
                    total_shares = shares + buy_shares
                    avg_price = total_cost / total_shares if total_shares > 0 else actual_price
                    shares = total_shares
                    cash -= daily_amount
                    buy_count += 1
                    total_commission += commission
                    total_slippage += slippage
                    trades.append(TradeRecord(
                        day=i+1, date=date_str, action='buy',
                        price=actual_price, shares=buy_shares, amount=daily_amount,
                        commission=commission, slippage_cost=slippage,
                        net_amount=daily_amount - commission - slippage,
                        reason=f"{buy_count}회차 매수"
                    ))
                    action = 'buy'
                    action_detail = {'shares': buy_shares, 'count': buy_count}

            market_value = shares * price
            total_value = cash + market_value
            unrealized_pnl = (price - avg_price) * shares if shares > 0 and avg_price > 0 else 0
            history.append({
                'day': i + 1, 'date': date_str, 'price': price,
                'shares': shares, 'avg_price': avg_price, 'cash': cash,
                'market_value': market_value, 'total_value': total_value,
                'unrealized_pnl': unrealized_pnl, 'buy_count': buy_count,
                'cycle': cycle_count, 'action': action, 'action_detail': action_detail
            })

        final_value = history[-1]['total_value'] if history else capital
        total_return = ((final_value / capital) - 1) * 100
        total_cost = total_commission + total_slippage + total_tax
        net_return = (((final_value - total_cost) / capital) - 1) * 100
        metrics = BacktestMetrics.calculate_all(history, trades, capital)

        return BacktestResult(
            strategy_name="무한매수법", strategy_type=StrategyType.INFINITE_BUY,
            config=self.config, initial_capital=capital, final_value=final_value,
            total_return=total_return, total_return_amount=final_value - capital,
            total_commission=total_commission, total_slippage=total_slippage,
            total_tax=total_tax, total_cost=total_cost, net_return=net_return,
            history=history, trades=trades, metrics=metrics
        )

    def run_dca(self, prices: List[float], capital: float,
                periodic_amount: float, interval: int = 21,
                initial_lump: float = 0, dates: List = None) -> BacktestResult:
        history = []
        trades = []
        cash = initial_lump if initial_lump > 0 else periodic_amount
        shares = 0
        avg_price = 0
        total_invested = 0
        total_commission = 0
        total_slippage = 0

        for i, price in enumerate(prices):
            date_str = str(dates[i]) if dates is not None and i < len(dates) else None
            action = 'hold'
            action_detail = {}
            if i > 0 and i % interval == 0:
                if total_invested + periodic_amount <= capital:
                    cash += periodic_amount
            if cash >= periodic_amount * 0.1:
                buy_amount = cash
                actual_price, commission, slippage = self.apply_buy_cost(price, buy_amount)
                buy_shares = (buy_amount - commission - slippage) / actual_price
                if not self.config.allow_fractional:
                    buy_shares = int(buy_shares)
                if buy_shares > 0:
                    if shares > 0:
                        total_cost_calc = shares * avg_price + buy_shares * actual_price
                        avg_price = total_cost_calc / (shares + buy_shares)
                    else:
                        avg_price = actual_price
                    shares += buy_shares
                    total_invested += buy_amount
                    cash = 0
                    total_commission += commission
                    total_slippage += slippage
                    trades.append(TradeRecord(
                        day=i+1, date=date_str, action='buy',
                        price=actual_price, shares=buy_shares, amount=buy_amount,
                        commission=commission, slippage_cost=slippage,
                        net_amount=buy_amount - commission - slippage,
                        reason=f"DCA 매수 (Day {i+1})"
                    ))
                    action = 'buy'
                    action_detail = {'shares': buy_shares, 'invested': total_invested}
            market_value = shares * price
            total_value = cash + market_value
            history.append({
                'day': i + 1, 'date': date_str, 'price': price,
                'shares': shares, 'avg_price': avg_price, 'cash': cash,
                'market_value': market_value, 'total_value': total_value,
                'invested': total_invested,
                'return_pct': ((total_value / total_invested) - 1) * 100 if total_invested > 0 else 0,
                'action': action, 'action_detail': action_detail
            })

        final_value = history[-1]['total_value'] if history else 0
        total_return = ((final_value / total_invested) - 1) * 100 if total_invested > 0 else 0
        total_cost = total_commission + total_slippage
        metrics = BacktestMetrics.calculate_all(history, trades, total_invested)

        return BacktestResult(
            strategy_name="DCA (적립식)", strategy_type=StrategyType.DCA,
            config=self.config, initial_capital=total_invested, final_value=final_value,
            total_return=total_return, total_return_amount=final_value - total_invested,
            total_commission=total_commission, total_slippage=total_slippage,
            total_tax=0, total_cost=total_cost,
            net_return=total_return - (total_cost / total_invested * 100) if total_invested > 0 else 0,
            history=history, trades=trades, metrics=metrics
        )

    def run_buy_and_hold(self, prices: List[float], capital: float,
                         dates: List = None) -> BacktestResult:
        history = []
        trades = []
        first_price = prices[0]
        actual_price, commission, slippage = self.apply_buy_cost(first_price, capital)
        shares = (capital - commission - slippage) / actual_price
        if not self.config.allow_fractional:
            shares = int(shares)
            remaining_cash = capital - (shares * actual_price) - commission - slippage
        else:
            remaining_cash = 0
        total_commission = commission
        total_slippage = slippage
        date_str = str(dates[0]) if dates is not None else None
        trades.append(TradeRecord(
            day=1, date=date_str, action='buy',
            price=actual_price, shares=shares, amount=capital,
            commission=commission, slippage_cost=slippage,
            net_amount=capital - commission - slippage, reason="초기 매수"
        ))
        for i, price in enumerate(prices):
            date_str = str(dates[i]) if dates is not None and i < len(dates) else None
            market_value = shares * price
            total_value = remaining_cash + market_value
            history.append({
                'day': i + 1, 'date': date_str, 'price': price,
                'shares': shares, 'cash': remaining_cash,
                'market_value': market_value, 'total_value': total_value,
                'return_pct': ((total_value / capital) - 1) * 100,
                'action': 'buy' if i == 0 else 'hold'
            })
        final_value = history[-1]['total_value'] if history else capital
        total_return = ((final_value / capital) - 1) * 100
        total_cost = total_commission + total_slippage
        metrics = BacktestMetrics.calculate_all(history, trades, capital)
        return BacktestResult(
            strategy_name="바이앤홀드", strategy_type=StrategyType.BUY_AND_HOLD,
            config=self.config, initial_capital=capital, final_value=final_value,
            total_return=total_return, total_return_amount=final_value - capital,
            total_commission=total_commission, total_slippage=total_slippage,
            total_tax=0, total_cost=total_cost, net_return=total_return,
            history=history, trades=trades, metrics=metrics
        )

    def run_value_rebalance(self, prices: List[float], capital: float,
                            upper_band: float = 1.15, lower_band: float = 0.85,
                            annual_growth: float = 0.15, pool_limit: float = 0.25,
                            dates: List = None) -> BacktestResult:
        history = []
        trades = []
        cash = capital / 2
        stock_value = capital / 2
        shares = stock_value / prices[0] if prices[0] > 0 else 0
        if not self.config.allow_fractional:
            shares = int(shares)
            stock_value = shares * prices[0]
            cash = capital - stock_value
        value_line = capital / 2
        daily_growth = (1 + annual_growth) ** (1/252)
        cash_pool = capital / 2
        total_commission = 0
        total_slippage = 0
        total_tax = 0
        rebalance_count = 0

        for i, price in enumerate(prices):
            date_str = str(dates[i]) if dates is not None and i < len(dates) else None
            action = 'hold'
            action_detail = {}
            if i > 0:
                value_line *= daily_growth
            stock_value = shares * price
            upper_bound = value_line * upper_band
            lower_bound = value_line * lower_band

            if stock_value >= upper_bound and shares > 0:
                excess = stock_value - value_line
                max_sell = cash_pool * pool_limit
                sell_amount = min(excess, max_sell)
                if sell_amount > 0:
                    sell_shares = sell_amount / price
                    if not self.config.allow_fractional:
                        sell_shares = int(sell_shares)
                        sell_amount = sell_shares * price
                    if sell_shares > 0 and sell_shares <= shares:
                        profit = (price - (stock_value - sell_amount) / (shares - sell_shares)) * sell_shares if shares > sell_shares else 0
                        actual_price, commission, slippage_cost, tax = self.apply_sell_cost(price, sell_amount, profit)
                        net_amount = sell_amount - commission - slippage_cost - tax
                        shares -= sell_shares
                        cash += net_amount
                        cash_pool += net_amount
                        total_commission += commission
                        total_slippage += slippage_cost
                        total_tax += tax
                        rebalance_count += 1
                        trades.append(TradeRecord(
                            day=i+1, date=date_str, action='sell',
                            price=actual_price, shares=sell_shares, amount=sell_amount,
                            commission=commission, slippage_cost=slippage_cost,
                            net_amount=net_amount, reason=f"상단 돌파 리밸런싱 (V={value_line:.0f})"
                        ))
                        action = 'sell'
                        action_detail = {'shares': sell_shares, 'amount': sell_amount}
            elif stock_value <= lower_bound and cash_pool > 0:
                deficit = value_line - stock_value
                max_buy = cash_pool * pool_limit
                buy_amount = min(deficit, max_buy, cash_pool)
                if buy_amount > 0:
                    actual_price, commission, slippage_cost = self.apply_buy_cost(price, buy_amount)
                    net_buy = buy_amount - commission - slippage_cost
                    buy_shares = net_buy / actual_price
                    if not self.config.allow_fractional:
                        buy_shares = int(buy_shares)
                        net_buy = buy_shares * actual_price
                    if buy_shares > 0:
                        shares += buy_shares
                        cash -= buy_amount
                        cash_pool -= buy_amount
                        total_commission += commission
                        total_slippage += slippage_cost
                        rebalance_count += 1
                        trades.append(TradeRecord(
                            day=i+1, date=date_str, action='buy',
                            price=actual_price, shares=buy_shares, amount=buy_amount,
                            commission=commission, slippage_cost=slippage_cost,
                            net_amount=net_buy, reason=f"하단 돌파 리밸런싱 (V={value_line:.0f})"
                        ))
                        action = 'buy'
                        action_detail = {'shares': buy_shares, 'amount': buy_amount}

            stock_value = shares * price
            total_value = cash + stock_value
            history.append({
                'day': i + 1, 'date': date_str, 'price': price,
                'shares': shares, 'stock_value': stock_value, 'cash': cash,
                'cash_pool': cash_pool, 'total_value': total_value,
                'value_line': value_line, 'upper_bound': upper_bound,
                'lower_bound': lower_bound,
                'return_pct': ((total_value / capital) - 1) * 100,
                'action': action, 'action_detail': action_detail
            })

        final_value = history[-1]['total_value'] if history else capital
        total_return = ((final_value / capital) - 1) * 100
        total_cost = total_commission + total_slippage + total_tax
        metrics = BacktestMetrics.calculate_all(history, trades, capital)
        metrics['rebalance_count'] = rebalance_count

        return BacktestResult(
            strategy_name="밸류리밸런싱", strategy_type=StrategyType.VALUE_REBALANCE,
            config=self.config, initial_capital=capital, final_value=final_value,
            total_return=total_return, total_return_amount=final_value - capital,
            total_commission=total_commission, total_slippage=total_slippage,
            total_tax=total_tax, total_cost=total_cost,
            net_return=total_return - (total_cost / capital * 100) if capital > 0 else 0,
            history=history, trades=trades, metrics=metrics
        )

    def compare(self, results: List[BacktestResult]) -> Dict:
        if not results:
            return {}
        comparison = {
            'strategies': [], 'best_return': None,
            'best_sharpe': None, 'lowest_mdd': None, 'best_risk_adjusted': None
        }
        for r in results:
            comparison['strategies'].append({
                'name': r.strategy_name, 'total_return': r.total_return,
                'net_return': r.net_return, 'mdd': r.metrics.get('mdd', 0),
                'sharpe': r.metrics.get('sharpe', 0), 'sortino': r.metrics.get('sortino', 0),
                'calmar': r.metrics.get('calmar', 0), 'total_cost': r.total_cost,
                'win_rate': r.metrics.get('win_rate', 0)
            })
        if comparison['strategies']:
            comparison['best_return'] = max(comparison['strategies'], key=lambda x: x['total_return'])['name']
            comparison['best_sharpe'] = max(comparison['strategies'], key=lambda x: x['sharpe'])['name']
            comparison['lowest_mdd'] = min(comparison['strategies'], key=lambda x: x['mdd'])['name']
            comparison['best_risk_adjusted'] = max(comparison['strategies'], key=lambda x: x['calmar'])['name']
        return comparison
