from enum import Enum


class TaskStatus(str, Enum):
    A_FAZER = "a_fazer"
    EM_PROGRESSO = "em_progresso"
    CONCLUIDA = "concluida"
    CANCELADA = "cancelada"
    
    PENDING = "pending"
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    CANCELLED = "cancelled"

    @classmethod
    def _missing_(cls, value):
        """Fallback para converter inglês em português"""
        mapping = {
            "pending": cls.A_FAZER,
            "todo": cls.A_FAZER,
            "in_progress": cls.EM_PROGRESSO,
            "done": cls.CONCLUIDA,
            "cancelled": cls.CANCELADA,
        }
        return mapping.get(value.lower() if isinstance(value, str) else value)
