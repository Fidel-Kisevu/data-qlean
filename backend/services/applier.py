"""Applier – apply approved suggestion or manual transform."""
from typing import Any
import re
import pandas as pd


# ---------- Kenyan phone normalization ----------

KENYAN_MOBILE = re.compile(r"^(?:\+?254|0)([17]\d{8})$")


def normalize_kenyan_phone(raw) -> str | None:
    """Convert a Kenyan phone number to local format (0XXXXXXXXX).

    Handles:
      0725366734             → 0725366734
      +254707457184          → 0707457184
      254707457184           → 0707457184
      0707 457 184           → 0707457184
      O722961343             → 0722961343   (letter O → zero)
      0725818141 /0737579967 → 0725818141   (first number only)
      725366734.0            → 0725366734   (recovered from float)

    Returns None for values that don't look like Kenyan phone numbers.
    """
    if raw is None or pd.isna(raw):
        return None

    s = str(raw).strip()
    if not s or s.lower() in {"nan", "none", "null", "n/a"}:
        return None

    # Handle floats that came through as "725366734.0"
    if re.fullmatch(r"\d+\.0", s):
        s = s.split(".")[0]

    # Common typo: letter O instead of zero
    s = s.replace("O", "0").replace("o", "0")

    # Multiple numbers in one cell → take the first
    if "/" in s:
        s = s.split("/")[0].strip()
    if "," in s:
        s = s.split(",")[0].strip()

    # Strip everything but digits and leading +
    s = re.sub(r"[^\d+]", "", s)

    # Case 1: already local — "0[17]XXXXXXXX"
    if re.fullmatch(r"0[17]\d{8}", s):
        return s

    # Case 2: international — "+254[17]XXXXXXXX" or "254[17]XXXXXXXX"
    if re.fullmatch(r"\+?254[17]\d{8}", s):
        digits = re.sub(r"\D", "", s)  # drop the +
        return "0" + digits[3:]         # strip "254", prepend "0"

    # Case 3: bare 9-digit mobile — "7XXXXXXXX" or "1XXXXXXXX"
    if re.fullmatch(r"[17]\d{8}", s):
        return "0" + s

    return None


def normalize_phone_column(df: pd.DataFrame, column: str) -> pd.DataFrame:
    """Add a `<column>_normalized` sibling column. Original is untouched."""
    df = df.copy()
    new_col = f"{column}_normalized"
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