from enum import Enum


class Priority(str, Enum):
    # Português (preferido)
    BAIXA = "baixa"
    MEDIA = "media"
    ALTA = "alta"
    URGENTE = "urgente"

    # English (para compatibilidade com dados existentes)
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

    @classmethod
    def _missing_(cls, value):
        """Fallback para converter inglês em português"""
        mapping = {
            "low": cls.BAIXA,
            "medium": cls.MEDIA,
            "high": cls.ALTA,
            "urgent": cls.URGENTE,
        }
        return mapping.get(value.lower() if isinstance(value, str) else value)
