"""
Utilidades para manipulação de datas e horas com timezone brasileiro
"""
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

BRAZIL_TZ = ZoneInfo("America/Sao_Paulo")


def now_brazil() -> datetime:
    """Retorna a data/hora atual no timezone de Brasília"""
    return datetime.now(BRAZIL_TZ)


def utcnow_aware() -> datetime:
    """Retorna a data/hora atual em UTC mas timezone-aware"""
    return datetime.now(timezone.utc)


def to_brazil_tz(dt: datetime) -> datetime:
    """
    Converte um datetime para o timezone de Brasília

    Args:
        dt: datetime para converter (pode ser naive ou aware)

    Returns:
        datetime no timezone de Brasília
    """
    if dt.tzinfo is None:
        return dt.replace(tzinfo=BRAZIL_TZ)
    
    if str(dt.tzinfo) == "America/Sao_Paulo" or str(dt.tzinfo) == "BRT" or str(dt.tzinfo) == "-03:00":
        return dt
    
    return dt.astimezone(BRAZIL_TZ)
