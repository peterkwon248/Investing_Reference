import numpy as np
from typing import List, Dict
from app.core.models import TradeRecord


class BacktestMetrics:
    """백테스트 성과 지표 계산기"""

    @staticmethod
    def calculate_all(history: List[Dict], trades: List[TradeRecord],
                      initial_capital: float, risk_free_rate: float = 0.03) -> Dict[str, float]:
        if not history:
            return BacktestMetrics._empty_metrics()

        values = BacktestMetrics._extract_values(history)
        returns = BacktestMetrics._calculate_returns(values)

        metrics = {}
        metrics['total_return'] = BacktestMetrics.total_return(values, initial_capital)
        metrics['cagr'] = BacktestMetrics.cagr(values, initial_capital, len(history))
        metrics['mdd'] = BacktestMetrics.mdd(values)
        metrics['mdd_duration'] = BacktestMetrics.mdd_duration(values)
        metrics['sharpe'] = BacktestMetrics.sharpe_ratio(returns, risk_free_rate)
        metrics['sortino'] = BacktestMetrics.sortino_ratio(returns, risk_free_rate)
        metrics['calmar'] = BacktestMetrics.calmar_ratio(metrics['cagr'], metrics['mdd'])
        metrics['volatility'] = BacktestMetrics.volatility(returns)
        metrics['downside_volatility'] = BacktestMetrics.downside_volatility(returns)
        trade_metrics = BacktestMetrics.trade_metrics(trades, initial_capital, len(history))
        metrics.update(trade_metrics)
        metrics['max_win_streak'] = BacktestMetrics.max_streak(trades, 'win')
        metrics['max_lose_streak'] = BacktestMetrics.max_streak(trades, 'lose')

        return metrics

    @staticmethod
    def _empty_metrics() -> Dict[str, float]:
        return {
            'total_return': 0, 'cagr': 0, 'mdd': 0, 'mdd_duration': 0,
            'sharpe': 0, 'sortino': 0, 'calmar': 0,
            'volatility': 0, 'downside_volatility': 0,
            'win_rate': 0, 'profit_factor': 0, 'avg_win': 0, 'avg_loss': 0,
            'total_trades': 0, 'turnover': 0, 'avg_holding_days': 0,
            'max_win_streak': 0, 'max_lose_streak': 0
        }

    @staticmethod
    def _extract_values(history: List[Dict]) -> List[float]:
        for key in ['total_value', 'value', 'portfolio_value']:
            if key in history[0]:
                return [h.get(key, 0) for h in history]
        return [0] * len(history)

    @staticmethod
    def _calculate_returns(values: List[float]) -> List[float]:
        returns = []
        for i in range(1, len(values)):
            if values[i-1] > 0:
                ret = (values[i] - values[i-1]) / values[i-1]
                returns.append(ret)
        return returns

    @staticmethod
    def total_return(values: List[float], initial_capital: float) -> float:
        if not values or initial_capital <= 0:
            return 0
        return ((values[-1] / initial_capital) - 1) * 100

    @staticmethod
    def cagr(values: List[float], initial_capital: float, days: int) -> float:
        if not values or initial_capital <= 0 or days <= 0:
            return 0
        years = days / 252
        if years <= 0:
            return 0
        final = values[-1]
        if final <= 0:
            return 0
        return ((final / initial_capital) ** (1 / years) - 1) * 100

    @staticmethod
    def mdd(values: List[float]) -> float:
        if not values:
            return 0
        peak = values[0]
        max_dd = 0
        for v in values:
            if v > peak:
                peak = v
            if peak > 0:
                dd = (v - peak) / peak * 100
                if dd < max_dd:
                    max_dd = dd
        return max_dd

    @staticmethod
    def mdd_duration(values: List[float]) -> int:
        if not values:
            return 0
        peak = values[0]
        peak_idx = 0
        max_duration = 0
        for i, v in enumerate(values):
            if v >= peak:
                duration = i - peak_idx
                if duration > max_duration:
                    max_duration = duration
                peak = v
                peak_idx = i
        if values[-1] < peak:
            duration = len(values) - 1 - peak_idx
            if duration > max_duration:
                max_duration = duration
        return max_duration

    @staticmethod
    def sharpe_ratio(returns: List[float], risk_free_rate: float = 0.03) -> float:
        if not returns:
            return 0
        avg_ret = np.mean(returns) * 252
        std_ret = np.std(returns) * np.sqrt(252)
        if std_ret <= 0:
            return 0
        return (avg_ret - risk_free_rate) / std_ret

    @staticmethod
    def sortino_ratio(returns: List[float], risk_free_rate: float = 0.03) -> float:
        if not returns:
            return 0
        avg_ret = np.mean(returns) * 252
        downside = [r for r in returns if r < 0]
        if not downside:
            return float('inf') if avg_ret > risk_free_rate else 0
        downside_std = np.std(downside) * np.sqrt(252)
        if downside_std <= 0:
            return 0
        return (avg_ret - risk_free_rate) / downside_std

    @staticmethod
    def calmar_ratio(cagr: float, mdd: float) -> float:
        if mdd >= 0:
            return 0
        return cagr / abs(mdd)

    @staticmethod
    def volatility(returns: List[float]) -> float:
        if not returns:
            return 0
        return np.std(returns) * np.sqrt(252) * 100

    @staticmethod
    def downside_volatility(returns: List[float]) -> float:
        if not returns:
            return 0
        downside = [r for r in returns if r < 0]
        if not downside:
            return 0
        return np.std(downside) * np.sqrt(252) * 100

    @staticmethod
    def trade_metrics(trades: List[TradeRecord], initial_capital: float, days: int) -> Dict[str, float]:
        if not trades:
            return {
                'win_rate': 0, 'profit_factor': 0, 'avg_win': 0, 'avg_loss': 0,
                'total_trades': 0, 'turnover': 0, 'avg_holding_days': 0
            }
        sells = [t for t in trades if t.action == 'sell']
        wins = []
        losses = []
        for t in sells:
            if hasattr(t, 'profit'):
                if t.profit > 0:
                    wins.append(t.profit)
                elif t.profit < 0:
                    losses.append(abs(t.profit))
        total_closed = len(wins) + len(losses)
        win_rate = (len(wins) / total_closed * 100) if total_closed > 0 else 0
        total_win = sum(wins) if wins else 0
        total_loss = sum(losses) if losses else 1
        profit_factor = total_win / total_loss if total_loss > 0 else float('inf')
        avg_win = np.mean(wins) if wins else 0
        avg_loss = np.mean(losses) if losses else 0
        total_volume = sum(t.amount for t in trades)
        years = days / 252
        turnover = (total_volume / initial_capital / years) if years > 0 else 0
        buy_trades = [t for t in trades if t.action == 'buy']
        sell_trades = [t for t in trades if t.action == 'sell']
        if buy_trades and sell_trades:
            avg_holding = days / max(len(sell_trades), 1)
        else:
            avg_holding = days
        return {
            'win_rate': win_rate, 'profit_factor': profit_factor,
            'avg_win': avg_win, 'avg_loss': avg_loss,
            'total_trades': len(trades), 'turnover': turnover,
            'avg_holding_days': avg_holding
        }

    @staticmethod
    def max_streak(trades: List[TradeRecord], streak_type: str = 'win') -> int:
        if not trades:
            return 0
        sells = [t for t in trades if t.action == 'sell']
        if not sells:
            return 0
        max_streak = 0
        current_streak = 0
        for t in sells:
            profit = getattr(t, 'profit', 0)
            is_win = profit > 0
            if (streak_type == 'win' and is_win) or (streak_type == 'lose' and not is_win):
                current_streak += 1
                max_streak = max(max_streak, current_streak)
            else:
                current_streak = 0
        return max_streak
