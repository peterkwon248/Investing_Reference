def format_krw(value: float) -> str:
    if abs(value) >= 1e8:
        return f"{value/1e8:.2f}억"
    elif abs(value) >= 1e4:
        return f"{value/1e4:,.0f}만"
    else:
        return f"{value:,.0f}"


def format_usd(value: float) -> str:
    return f"${value:,.2f}"


def format_dual(usd_value: float, ex_rate: float, decimals: int = 0) -> dict:
    krw_value = usd_value * ex_rate
    if decimals == 0:
        usd_str = f"${usd_value:,.0f}"
    else:
        usd_str = f"${usd_value:,.{decimals}f}"
    if abs(krw_value) >= 1e8:
        krw_str = f"{krw_value/1e8:.1f}억"
    elif abs(krw_value) >= 1e4:
        krw_str = f"{krw_value/1e4:,.0f}만"
    else:
        krw_str = f"{krw_value:,.0f}"
    return {"usd": usd_str, "krw": krw_str}


def format_percent(value: float) -> str:
    sign = "+" if value > 0 else ""
    return f"{sign}{value:.2f}%"
