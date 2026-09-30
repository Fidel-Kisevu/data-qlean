"""Applier – apply approved suggestion or manual transform."""
from typing import Any
import re
import pandas as pd


# ---------- Kenyan phone normalization ----------

KENYAN_MOBILE = re.compile(r"^(?:\+?254|0)([17]\d{8})$")


def normalize_kenyan_phone(raw) -> str | None:
    """Convert a Kenyan phone number to local format (0XXXXXXXXX)."""
    if raw is None or pd.isna(raw):
        return None

    s = str(raw).strip()
    if not s or s.lower() in {"nan", "none", "null", "n/a"}:
        return None

    if re.fullmatch(r"\d+\.0", s):
        s = s.split(".")[0]

    s = s.replace("O", "0").replace("o", "0")

    if "/" in s:
        s = s.split("/")[0].strip()
    if "," in s:
        s = s.split(",")[0].strip()

    s = re.sub(r"[^\d+]", "", s)

    if re.fullmatch(r"0[17]\d{8}", s):
        return s

    if re.fullmatch(r"\+?254[17]\d{8}", s):
        digits = re.sub(r"\D", "", s)
        return "0" + digits[3:]

    if re.fullmatch(r"[17]\d{8}", s):
        return "0" + s

    return None


def normalize_phone_column(df: pd.DataFrame, column: str) -> pd.DataFrame:
    """Add a `<column>_normalized` sibling column. Original is untouched."""
    df = df.copy()
    new_col = f"{column}_normalized"
    df[new_col] = df[column].apply(normalize_kenyan_phone)
    return df


# ---------- Name case normalization (UPPERCASE) ----------

def normalize_name(raw) -> str | None:
    """Uppercase a name. Collapses extra whitespace first.

    Examples:
      "mary muriithi"          → "MARY MURIITHI"
      "DeBora Aluoch Omondi"   → "DEBORA ALUOCH OMONDI"
      "  JOHN   DOE  "         → "JOHN DOE"
    """
    if raw is None or pd.isna(raw):
        return None

    s = str(raw).strip()
    if not s or s.lower() in {"nan", "none", "null", "n/a"}:
        return None

    # Collapse multiple spaces
    s = re.sub(r"\s+", " ", s)

    return s.upper()


def normalize_name_column(df: pd.DataFrame, column: str) -> pd.DataFrame:
    """Add a `<column>_normalized` sibling column. Original is untouched."""
    df = df.copy()
    new_col = f"{column}_normalized"
    df[new_col] = df[column].apply(normalize_name)
    return df


# ---------- Invalid values in name columns ----------

PLACEHOLDER_VALUES = {
    "n/a", "na", "n.a.", "none", "null", "nil", "-", "--", "---",
    "unknown", "unspecified", "not applicable", "tbd", "tba",
    "000", "999", "xxx", "xxxx",
}


def _is_placeholder(s: str) -> bool:
    return s.strip().lower() in PLACEHOLDER_VALUES


def _is_numeric_name(s: str) -> bool:
    s = s.strip()
    if not s:
        return False
    if re.fullmatch(r"[\d\-\.\s]+", s):
        return True
    digit_ratio = sum(c.isdigit() for c in s) / len(s)
    return digit_ratio >= 0.4 and len(re.findall(r"\d", s)) >= 4


def clean_numeric_in_name_column(df: pd.DataFrame, column: str) -> pd.DataFrame:
    """Replace placeholder/numeric values in a name column with '(missing)'."""
    df = df.copy()

    def clean(raw):
        if raw is None or pd.isna(raw):
            return raw
        s = str(raw).strip()
        if not s:
            return raw
        if _is_placeholder(s) or _is_numeric_name(s):
            return "(missing)"
        return raw

    df[column] = df[column].apply(clean)
    return df


# ---------- Apply ----------

def apply_suggestion(df: pd.DataFrame, suggestion: dict[str, Any]) -> pd.DataFrame:
    action = suggestion.get("proposed_action")
    column = suggestion.get("column")
    df = df.copy()

    if action == "drop_column" and column in df.columns:
        return df.drop(columns=[column])

    if action == "drop_empty_rows":
        return df.dropna(how="all").reset_index(drop=True)

    if action == "fill_null_with_placeholder" and column in df.columns:
        return df.fillna({column: "(missing)"})

    if action == "drop_duplicates":
        return df.drop_duplicates()

    if action == "to_numeric" and column in df.columns:
        df[column] = pd.to_numeric(df[column], errors="coerce")
        return df

    if action == "trim" and column in df.columns:
        df[column] = df[column].astype(str).str.strip()
        df[column] = df[column].replace({"nan": None, "None": None})
        return df

    if action == "normalize_phone" and column in df.columns:
        return normalize_phone_column(df, column)

    if action == "normalize_name_case" and column in df.columns:
        return normalize_name_column(df, column)

    if action == "clean_numeric_in_name" and column in df.columns:
        return clean_numeric_in_name_column(df, column)

    return df


def rename_column(df: pd.DataFrame, old: str, new: str) -> pd.DataFrame:
    if old not in df.columns:
        raise ValueError(f"Column not found: {old}")
    if new in df.columns and new != old:
        raise ValueError(f"Column already exists: {new}")
    return df.rename(columns={old: new})


def drop_column(df: pd.DataFrame, column: str) -> pd.DataFrame:
    if column not in df.columns:
        raise ValueError(f"Column not found: {column}")
    return df.drop(columns=[column])
def reorder_columns(df: pd.DataFrame, order: list[str]) -> pd.DataFrame:
    """Reorder columns. Missing columns are dropped; unknown names ignored."""
    existing = [c for c in order if c in df.columns]
    extras = [c for c in df.columns if c not in existing]
    return df[existing + extras]


def sort_rows(df: pd.DataFrame, column: str, ascending: bool = True) -> pd.DataFrame:
    if column not in df.columns:
        raise ValueError(f"Column not found: {column}")
    # Sort with stable algorithm so equal values keep their relative order
    return df.sort_values(by=column, ascending=ascending, kind="stable").reset_index(drop=True)


def delete_rows(df: pd.DataFrame, indices: list[int]) -> pd.DataFrame:
    """Delete rows by 0-based index. Invalid indices are ignored."""
    valid = [i for i in indices if 0 <= i < len(df)]
    return df.drop(index=valid).reset_index(drop=True)