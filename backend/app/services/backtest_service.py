from typing import List, Dict, Any
from app.core.engine import BacktestEngine
from app.core.models import BacktestConfig, BACKTEST_PRESETS
from app.data.yfinance_client import get_stock_history


class BacktestService:
    def _build_config(self, schema) -> BacktestConfig:
        if schema.preset and schema.preset in BACKTEST_PRESETS:
            return BACKTEST_PRESETS[schema.preset]
        return BacktestConfig(
            buy_commission=schema.buy_commission,
            sell_commission=schema.sell_commission,
            slippage=schema.slippage,
            fx_spread=schema.fx_spread,
            capital_gains_tax=schema.capital_gains_tax,
            dividend_tax=schema.dividend_tax,
            allow_fractional=schema.allow_fractional,
        )

    def _get_prices_and_dates(self, ticker: str, period: str):
        history = get_stock_history(ticker, period=period)
        if not history:
            raise ValueError(f"No price data for {ticker}")
        prices = [h['close'] for h in history]
        dates = [h['date'] for h in history]
        return prices, dates

    async def run_infinite_buy(self, request) -> Dict[str, Any]:
        config = self._build_config(request.config)
        engine = BacktestEngine(config)
        prices, dates = self._get_prices_and_dates(request.ticker, request.period)
        result = engine.run_infinite_buy(
            prices=prices, capital=request.capital,
            divisions=request.divisions, target_profit=request.target_profit,
            dates=dates
        )
        return self._format_result(result)

    async def run_dca(self, request) -> Dict[str, Any]:
        config = self._build_config(request.config)
        engine = BacktestEngine(config)
        prices, dates = self._get_prices_and_dates(request.ticker, request.period)
        result = engine.run_dca(
            prices=prices, capital=request.capital,
            periodic_amount=request.periodic_amount, interval=request.interval,
            initial_lump=request.initial_lump, dates=dates
        )
        return self._format_result(result)

    async def run_buy_and_hold(self, request) -> Dict[str, Any]:
        config = self._build_config(request.config)
        engine = BacktestEngine(config)
        prices, dates = self._get_prices_and_dates(request.ticker, request.period)
        result = engine.run_buy_and_hold(prices=prices, capital=request.capital, dates=dates)
        return self._format_result(result)

    async def run_value_rebalance(self, request) -> Dict[str, Any]:
        config = self._build_config(request.config)
        engine = BacktestEngine(config)
        prices, dates = self._get_prices_and_dates(request.ticker, request.period)
        result = engine.run_value_rebalance(
            prices=prices, capital=request.capital,
            upper_band=request.upper_band, lower_band=request.lower_band,
            annual_growth=request.annual_growth, pool_limit=request.pool_limit,
            dates=dates
        )
        return self._format_result(result)

    async def run_compare(self, request) -> Dict[str, Any]:
        config = self._build_config(request.config)
        engine = BacktestEngine(config)
        prices, dates = self._get_prices_and_dates(request.ticker, request.period)
        results = []
        for strategy in request.strategies:
            if strategy == "infinite_buy":
                r = engine.run_infinite_buy(prices=prices, capital=request.capital, dates=dates)
            elif strategy == "dca":
                r = engine.run_dca(prices=prices, capital=request.capital, periodic_amount=request.capital/12, dates=dates)
            elif strategy == "buy_and_hold":
                r = engine.run_buy_and_hold(prices=prices, capital=request.capital, dates=dates)
            elif strategy == "value_rebalance":
                r = engine.run_value_rebalance(prices=prices, capital=request.capital, dates=dates)
            else:
                continue
            results.append(r)
        comparison = engine.compare(results)
        comparison['results'] = [self._format_result(r) for r in results]
        return comparison

    def _format_result(self, result) -> Dict[str, Any]:
        return {
            "strategy_name": result.strategy_name,
            "strategy_type": result.strategy_type.value,
            "initial_capital": result.initial_capital,
            "final_value": result.final_value,
            "total_return": round(result.total_return, 2),
            "total_return_amount": round(result.total_return_amount, 2),
            "total_cost": round(result.total_cost, 2),
            "net_return": round(result.net_return, 2),
            "metrics": {k: round(v, 4) if isinstance(v, float) else v for k, v in result.metrics.items()},
            "history": result.history[-100:] if len(result.history) > 100 else result.history,
            "trade_count": len(result.trades),
        }
