import logging
import sys
from typing import Any

from pythonjsonlogger import jsonlogger


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    def add_fields(self, log_record: dict[str, Any], record: logging.LogRecord, message_dict: dict[str, Any]) -> None:
        super().add_fields(log_record, record, message_dict)
        log_record["level"] = record.levelname
        log_record["logger"] = record.name
        log_record["timestamp"] = self.formatTime(record, self.datefmt)


def setup_logging(log_level: str = "INFO") -> None:
    logger = logging.getLogger("sgti")
    logger.setLevel(getattr(logging, log_level.upper()))
    
    handler = logging.StreamHandler(sys.stdout)
    formatter = CustomJsonFormatter(
        "%(timestamp)s %(level)s %(logger)s %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S",
    )
    handler.setFormatter(formatter)
    
    logger.addHandler(handler)
    
    logging.getLogger("uvicorn.access").disabled = True
