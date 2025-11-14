"""
DEPRECATED: regex_parser

This module previously provided a regex-based fallback parser. Regex-based
parsing has been removed from the default runtime paths. The file remains
as a deprecated stub to avoid import errors during transitional updates.
Do not use this parser; it may be removed in a future release.
"""

from typing import Any, Optional


class RegexParser:
    def __init__(self):
        raise NotImplementedError("RegexParser has been deprecated and removed from the runtime. Use Llama or GPT providers instead.")
