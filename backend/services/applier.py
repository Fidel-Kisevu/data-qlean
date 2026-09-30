"""Applier – apply approved suggestion or manual transform."""
from typing import Any
import re
import pandas as pd


# ---------- Kenyan phone normalization ----------

KENYAN_MOBILE = re.compile(r"^(?:\+?254|0)([17]\d{8})$")


def normalize_kenyan_phone(raw) -> str | None:
    """Convert a Kenyan phone number to E.164 format (+254XXXXXXXXX).

    Handles:
      0725366734             → +254725366734
      +254707457184          → +254707457184
      254707457184           → +254707457184
      0707 457 184           → +254707457184
      O722961343             → +254722961343     (letter O → zero)
      0725818141 /0737579967 → +254725818141     (first number only)

    Returns None for values that aren't phone numbers.
    """
    if raw is None or pd.isna(raw):
        return None

    s = str(raw).strip()
    if not s or s.lower() in {"nan", "none", "null", "n/a"}:
        return None

    # Common typo: letter O instead of zero
    s = s.replace("O", "0").replace("o", "0")

    # Multiple numbers in one cell → take the first
    if "/" in s:
        s = s.split("/")[0].strip()
    if "," in s:
        s = s.split(",")[0].strip()

    # Strip everything but digits and leading +
    s = re.sub(r"[^\d+]", "", s)

    match = KENYAN_MOBILE.match(s)
    if match:
        return f"+254{match.group(1)}"

    # 9-digit fallback (missing 0 or 254 prefix)
    if re.fullmatch(r"[17]\d{8}", s):
        return f"+254{s}"

    return None


def normalize_phone_column(df: pd.DataFrame, column: str) -> pd.DataFrame:
    """Add a `<column>_e164` sibling column. Original is untouched."""
    df = df.copy()
    new_col = f"{column}_e164"
    df[new_col] = df[column].apply(normalize_kenyan_phone)
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