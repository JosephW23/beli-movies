import re
import unicodedata


def normalize_username(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    normalized = re.sub(r"[^a-z0-9]", "", ascii_value.lower())[:24]
    if not normalized:
        return "watchduser"
    return normalized if len(normalized) >= 3 else f"{normalized}watchd"[:24]
