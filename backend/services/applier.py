"""Applier – every data cleaning operation Data Qlean supports.

This file is the single source of truth for all transformations that can
be applied to a working DataFrame. Every action is dispatched by a string
key from `apply_suggestion`, or called directly by manual transforms.

Categories:
  1.  Missing values    — 15 fill strategies
  2.  Duplicates        — keep first / last / flag
  3.  Outliers          — IQR / Z-score flagging
  4.  Types & format    — numeric, datetime, boolean, strip symbols
  5.  Text & categories — case, trim, clustering, split, merge
  6.  Structure         — drop, rename, reorder, sort, delete, pivot
  7.  Validation flags  — required, regex, range, allowed values
  8.  Kenyan phones     — local format normalization
  9.  Names             — case + invalid-value cleaning
"""
from typing import Any
import re
import pandas as pd
import numpy as np


# ═══════════════════════════════════════════════════════════════════════
# 1. KENYAN PHONE NORMALIZATION
# ═══════════════════════════════════════════════════════════════════════

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
    df = df.copy()
    df[f"{column}_normalized"] = df[column].apply(normalize_kenyan_phone)
    return df


# ═══════════════════════════════════════════════════════════════════════
# 2. NAME HANDLING
# ═══════════════════════════════════════════════════════════════════════

def normalize_name(raw, case: str = "upper") -> str | None:
    """Normalize a name to upper / lower / title / sentence case."""
    if raw is None or pd.isna(raw):
        return None
    s = str(raw).strip()
    if not s or s.lower() in {"nan", "none", "null", "n/a"}:
        return None
    s = re.sub(r"\s+", " ", s)
    if case == "lower":
        return s.lower()
    if case == "title":
        return s.title()
    if case == "sentence":
        return s.capitalize()
    return s.upper()


def normalize_name_column(df: pd.DataFrame, column: str, case: str = "upper") -> pd.DataFrame:
    df = df.copy()
    df[f"{column}_normalized"] = df[column].apply(lambda v: normalize_name(v, case))
    return df


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


def _is_invalid_name_value(v) -> bool:
    if v is None or pd.isna(v):
        return False
    s = str(v).strip()
    if not s:
        return False
    return _is_placeholder(s) or _is_numeric_name(s)


def clean_numeric_in_name_column(df: pd.DataFrame, column: str) -> pd.DataFrame:
    df = df.copy()
    df[column] = df[column].apply(
        lambda v: "(missing)" if _is_invalid_name_value(v) else v
    )
    return df


def drop_invalid_name_rows(df: pd.DataFrame, column: str) -> pd.DataFrame:
    df = df.copy()
    if column not in df.columns:
        return df
    mask = df[column].apply(_is_invalid_name_value)
    return df[~mask].reset_index(drop=True)


def flag_invalid_name(df: pd.DataFrame, column: str) -> pd.DataFrame:
    df = df.copy()
    if column not in df.columns:
        return df
    df[f"{column}_invalid"] = df[column].apply(_is_invalid_name_value)
    return df


# ═══════════════════════════════════════════════════════════════════════
# 3. MISSING VALUE FILL STRATEGIES (15 options)
# ═══════════════════════════════════════════════════════════════════════

def fill_null_with_median(df: pd.DataFrame, column: str) -> pd.DataFrame:
    df = df.copy()
    if column not in df.columns:
        return df
    numeric = pd.to_numeric(df[column], errors="coerce")
    if numeric.notna().any():
        df[column] = df[column].fillna(numeric.median())
    else:
        modes = df[column].mode(dropna=True)
        if not modes.empty:
            df[column] = df[column].fillna(modes.iloc[0])
    return df


def fill_null_with_mean(df: pd.DataFrame, column: str) -> pd.DataFrame:
    df = df.copy()
    if column not in df.columns:
        return df
    numeric = pd.to_numeric(df[column], errors="coerce")
    if numeric.notna().any():
        df[column] = df[column].fillna(numeric.mean())
    else:
        modes = df[column].mode(dropna=True)
        if not modes.empty:
            df[column] = df[column].fillna(modes.iloc[0])
    return df


def fill_null_with_mode(df: pd.DataFrame, column: str) -> pd.DataFrame:
    df = df.copy()
    if column not in df.columns:
        return df
    modes = df[column].mode(dropna=True)
    if not modes.empty:
        df[column] = df[column].fillna(modes.iloc[0])
    return df


def fill_null_forward(df: pd.DataFrame, column: str) -> pd.DataFrame:
    df = df.copy()
    if column in df.columns:
        df[column] = df[column].ffill()
    return df


def fill_null_backward(df: pd.DataFrame, column: str) -> pd.DataFrame:
    df = df.copy()
    if column in df.columns:
        df[column] = df[column].bfill()
    return df


def fill_null_interpolate(df: pd.DataFrame, column: str, method: str = "linear") -> pd.DataFrame:
    df = df.copy()
    if column not in df.columns:
        return df
    numeric = pd.to_numeric(df[column], errors="coerce")
    if numeric.notna().sum() >= 2:
        try:
            df[column] = numeric.interpolate(method=method)
        except Exception:
            df[column] = numeric.interpolate(method="linear")
    else:
        df[column] = df[column].ffill().bfill()
    return df


def fill_null_grouped(df: pd.DataFrame, column: str, group_by: str, method: str = "median") -> pd.DataFrame:
    df = df.copy()
    if column not in df.columns or group_by not in df.columns:
        return df

    if method == "mean":
        fill_values = df.groupby(group_by)[column].transform(
            lambda s: pd.to_numeric(s, errors="coerce").mean()
        )
    elif method == "mode":
        fill_values = df.groupby(group_by)[column].transform(
            lambda s: s.mode().iloc[0] if not s.mode().empty else None
        )
    else:
        fill_values = df.groupby(group_by)[column].transform(
            lambda s: pd.to_numeric(s, errors="coerce").median()
        )

    df[column] = df[column].fillna(fill_values)
    return df


def fill_null_with_constant(df: pd.DataFrame, column: str, value: str = "(missing)") -> pd.DataFrame:
    df = df.copy()
    if column in df.columns:
        df[column] = df[column].fillna(value)
    return df


def flag_null_as_column(df: pd.DataFrame, column: str) -> pd.DataFrame:
    df = df.copy()
    if column in df.columns:
        df[f"{column}_was_missing"] = df[column].isna()
    return df


def drop_null_rows(df: pd.DataFrame, column: str) -> pd.DataFrame:
    df = df.copy()
    if column in df.columns:
        df = df.dropna(subset=[column]).reset_index(drop=True)
    return df


def drop_null_columns(df: pd.DataFrame, threshold_pct: float = 90.0) -> pd.DataFrame:
    """Drop columns whose null percentage meets or exceeds the threshold."""
    df = df.copy()
    if len(df) == 0:
        return df
    null_pct = df.isna().mean() * 100
    to_drop = null_pct[null_pct >= threshold_pct].index.tolist()
    return df.drop(columns=to_drop)


# ═══════════════════════════════════════════════════════════════════════
# 4. DUPLICATE HANDLING
# ═══════════════════════════════════════════════════════════════════════

def drop_duplicates_keep_first(df: pd.DataFrame) -> pd.DataFrame:
    return df.drop_duplicates(keep="first").reset_index(drop=True)


def drop_duplicates_keep_last(df: pd.DataFrame) -> pd.DataFrame:
    return df.drop_duplicates(keep="last").reset_index(drop=True)


def drop_duplicates_all(df: pd.DataFrame) -> pd.DataFrame:
    return df.drop_duplicates(keep=False).reset_index(drop=True)


def flag_duplicates(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["is_duplicate"] = df.duplicated(keep="first")
    return df


def drop_duplicates_subset(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    """Drop duplicates by a subset of columns (business key)."""
    valid = [c for c in columns if c in df.columns]
    if not valid:
        return df.copy()
    return df.drop_duplicates(subset=valid, keep="first").reset_index(drop=True)


# ═══════════════════════════════════════════════════════════════════════
# 5. OUTLIER DETECTION (flag only)
# ═══════════════════════════════════════════════════════════════════════

def flag_outliers_iqr(df: pd.DataFrame, column: str, multiplier: float = 1.5) -> pd.DataFrame:
    """Add a boolean column flagging values outside Q1 - k*IQR and Q3 + k*IQR."""
    df = df.copy()
    if column not in df.columns:
        return df
    numeric = pd.to_numeric(df[column], errors="coerce")
    q1 = numeric.quantile(0.25)
    q3 = numeric.quantile(0.75)
    iqr = q3 - q1
    lower = q1 - multiplier * iqr
    upper = q3 + multiplier * iqr
    df[f"{column}_outlier"] = numeric.notna() & ((numeric < lower) | (numeric > upper))
    return df


def flag_outliers_zscore(df: pd.DataFrame, column: str, threshold: float = 3.0) -> pd.DataFrame:
    """Add a boolean column flagging values more than `threshold` std devs from the mean."""
    df = df.copy()
    if column not in df.columns:
        return df
    numeric = pd.to_numeric(df[column], errors="coerce")
    mean = numeric.mean()
    std = numeric.std()
    if std == 0 or pd.isna(std):
        df[f"{column}_outlier"] = False
        return df
    z = (numeric - mean) / std
    df[f"{column}_outlier"] = numeric.notna() & (z.abs() > threshold)
    return df


def winsorize_column(df: pd.DataFrame, column: str, lower_q: float = 0.01, upper_q: float = 0.99) -> pd.DataFrame:
    """Cap extreme values at given quantiles."""
    df = df.copy()
    if column not in df.columns:
        return df
    numeric = pd.to_numeric(df[column], errors="coerce")
    lo = numeric.quantile(lower_q)
    hi = numeric.quantile(upper_q)
    df[column] = numeric.clip(lower=lo, upper=hi)
    return df


# ═══════════════════════════════════════════════════════════════════════
# 6. TYPE & FORMAT CONVERSION
# ═══════════════════════════════════════════════════════════════════════

def to_numeric(df: pd.DataFrame, column: str) -> pd.DataFrame:
    df = df.copy()
    if column in df.columns:
        df[column] = pd.to_numeric(df[column], errors="coerce")
    return df


def to_numeric_keep_text(df: pd.DataFrame, column: str) -> pd.DataFrame:
    df = df.copy()
    if column in df.columns:
        df[f"{column}_numeric"] = pd.to_numeric(df[column], errors="coerce")
    return df


def to_integer(df: pd.DataFrame, column: str) -> pd.DataFrame:
    df = df.copy()
    if column in df.columns:
        df[column] = pd.to_numeric(df[column], errors="coerce").astype("Int64")
    return df


def to_boolean(df: pd.DataFrame, column: str, true_values: list[str] | None = None) -> pd.DataFrame:
    df = df.copy()
    if column not in df.columns:
        return df
    tv = true_values or ["yes", "true", "y", "1", "t"]
    tv = {v.lower() for v in tv}
    df[column] = df[column].apply(
        lambda v: True if (pd.notna(v) and str(v).strip().lower() in tv) else
                  False if pd.notna(v) else None
    )
    return df


def _parse_date_smart(s: str, dayfirst_hint: bool = True):
    """
    Parse a single date string, handling mixed formats.

    Strategy:
      1. If the string has a month name, pandas handles it.
      2. If it's ISO (YYYY-MM-DD), pandas handles it.
      3. If it's numeric-only (DD-MM-YYYY, MM-DD-YYYY, etc.):
         - If one part >12, that part must be the day → infer format
         - If both parts ≤12, it's ambiguous → use dayfirst_hint
    """
    if s is None or pd.isna(s):
        return pd.NaT
    s = str(s).strip()
    if not s or s.lower() in {"nan", "none", "null", "n/a", ""}:
        return pd.NaT

    # Let pandas try first — handles ISO, month-name, and clean cases
    try:
        return pd.to_datetime(s, errors="raise")
    except Exception:
        pass

    # Numeric-only formats — try each separator
    import re as _re
    m = _re.match(r"^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})$", s)
    if not m:
        return pd.NaT

    a, b, c = int(m.group(1)), int(m.group(2)), int(m.group(3))

    # If a is 4 digits, it's YYYY-MM-DD or YYYY-DD-MM
    if a > 31:
        # a is the year
        if b > 12:  # b must be day
            return pd.to_datetime(f"{a}-{c:02d}-{b:02d}", errors="coerce")
        if c > 12:  # c must be day
            return pd.to_datetime(f"{a}-{b:02d}-{c:02d}", errors="coerce")
        # Both valid months — use hint
        if dayfirst_hint:
            return pd.to_datetime(f"{a}-{c:02d}-{b:02d}", errors="coerce")
        return pd.to_datetime(f"{a}-{b:02d}-{c:02d}", errors="coerce")

    # If c is 4 digits, it's DD-MM-YYYY or MM-DD-YYYY
    if c > 31:
        if a > 12:  # a must be day
            return pd.to_datetime(f"{c}-{b:02d}-{a:02d}", errors="coerce")
        if b > 12:  # b must be day
            return pd.to_datetime(f"{c}-{a:02d}-{b:02d}", errors="coerce")
        # Both valid — use hint
        if dayfirst_hint:
            return pd.to_datetime(f"{c}-{b:02d}-{a:02d}", errors="coerce")
        return pd.to_datetime(f"{c}-{a:02d}-{b:02d}", errors="coerce")

    return pd.NaT


def to_datetime(df: pd.DataFrame, column: str, dayfirst: bool = True) -> pd.DataFrame:
    """Convert mixed-format date column to datetime type."""
    df = df.copy()
    if column not in df.columns:
        return df
    df[column] = df[column].apply(lambda v: _parse_date_smart(v, dayfirst_hint=dayfirst))
    return df


def to_datetime_iso(df: pd.DataFrame, column: str, dayfirst: bool = True) -> pd.DataFrame:
    """
    Convert mixed-format date column to ISO strings (YYYY-MM-DD).

    Handles:
      - ISO (2026-04-03)
      - Month-name (17 Jun 2024)
      - US numeric (10-15-2024)
      - Day-first numeric (16/10/2025)
      - Ambiguous numeric (11-09-2024) — resolved via dayfirst hint

    Adds a `<column>_iso` sibling so the original is preserved.
    """
    df = df.copy()
    if column not in df.columns:
        return df

    parsed = df[column].apply(lambda v: _parse_date_smart(v, dayfirst_hint=dayfirst))

    new_col = f"{column}_iso"
    df[new_col] = parsed.dt.strftime("%Y-%m-%d").where(parsed.notna(), None)
    return df


def strip_currency(df: pd.DataFrame, column: str) -> pd.DataFrame:
    """Remove currency symbols ($ € £ KSh etc.) and thousands separators."""
    df = df.copy()
    if column not in df.columns:
        return df
    pattern = r"[\$€£¥₹KShksh,\s]"
    df[column] = pd.to_numeric(
        df[column].astype(str).str.replace(pattern, "", regex=True),
        errors="coerce",
    )
    return df


def strip_percent(df: pd.DataFrame, column: str, as_fraction: bool = True) -> pd.DataFrame:
    """Strip % sign. If as_fraction, 45% → 0.45; else → 45."""
    df = df.copy()
    if column not in df.columns:
        return df
    cleaned = df[column].astype(str).str.replace("%", "", regex=False).str.strip()
    numeric = pd.to_numeric(cleaned, errors="coerce")
    df[column] = numeric / 100 if as_fraction else numeric
    return df


def extract_numbers(df: pd.DataFrame, column: str) -> pd.DataFrame:
    """Extract numeric value from strings like 'About 500' → 500."""
    df = df.copy()
    if column not in df.columns:
        return df

    def extract(v):
        if v is None or pd.isna(v):
            return None
        m = re.search(r"-?\d+(?:\.\d+)?", str(v))
        return float(m.group()) if m else None

    df[column] = df[column].apply(extract)
    return df


def preserve_leading_zeros(df: pd.DataFrame, column: str, width: int = 0) -> pd.DataFrame:
    """Ensure strings keep leading zeros (or pad to given width)."""
    df = df.copy()
    if column not in df.columns:
        return df
    s = df[column].astype(str)
    if width > 0:
        s = s.str.zfill(width)
    df[column] = s.where(df[column].notna(), None)
    return df


# ═══════════════════════════════════════════════════════════════════════
# 7. TEXT & CATEGORY STANDARDIZATION
# ═══════════════════════════════════════════════════════════════════════

def trim_whitespace(df: pd.DataFrame, column: str) -> pd.DataFrame:
    df = df.copy()
    if column in df.columns:
        df[column] = df[column].astype(str).str.strip()
        df[column] = df[column].replace({"nan": None, "None": None})
    return df


def collapse_spaces(df: pd.DataFrame, column: str) -> pd.DataFrame:
    df = df.copy()
    if column in df.columns:
        df[column] = df[column].astype(str).str.replace(r"\s+", " ", regex=True).str.strip()
        df[column] = df[column].replace({"nan": None, "None": None})
    return df


def case_upper(df: pd.DataFrame, column: str) -> pd.DataFrame:
    df = df.copy()
    if column in df.columns:
        df[column] = df[column].astype(str).str.strip().str.upper()
        df[column] = df[column].replace({"NAN": None, "NONE": None})
    return df


def case_lower(df: pd.DataFrame, column: str) -> pd.DataFrame:
    df = df.copy()
    if column in df.columns:
        df[column] = df[column].astype(str).str.strip().str.lower()
        df[column] = df[column].replace({"nan": None, "none": None})
    return df


def case_title(df: pd.DataFrame, column: str) -> pd.DataFrame:
    df = df.copy()
    if column in df.columns:
        df[column] = df[column].astype(str).str.strip().str.title()
        df[column] = df[column].replace({"Nan": None, "None": None})
    return df


def case_sentence(df: pd.DataFrame, column: str) -> pd.DataFrame:
    df = df.copy()
    if column in df.columns:
        df[column] = df[column].astype(str).str.strip().str.capitalize()
        df[column] = df[column].replace({"Nan": None, "None": None})
    return df


def remove_special_chars(df: pd.DataFrame, column: str, keep: str = " ") -> pd.DataFrame:
    """Remove anything that isn't a letter, digit, or a char in `keep`."""
    df = df.copy()
    if column not in df.columns:
        return df
    pattern = f"[^A-Za-z0-9{re.escape(keep)}]"
    df[column] = df[column].astype(str).str.replace(pattern, "", regex=True)
    df[column] = df[column].replace({"nan": None, "None": None})
    return df


def category_clusters(df: pd.DataFrame, column: str, min_similarity: float = 0.85) -> dict[str, list[str]]:
    """Group similar values in a column. Returns a map of canonical → variants.

    Uses simple ratio-based similarity via difflib (no extra deps). For
    production, swap with rapidfuzz.
    """
    from difflib import SequenceMatcher

    if column not in df.columns:
        return {}

    values = df[column].dropna().astype(str).unique().tolist()
    values.sort()

    clusters: list[list[str]] = []
    for v in values:
        placed = False
        for cluster in clusters:
            if SequenceMatcher(None, v.lower(), cluster[0].lower()).ratio() >= min_similarity:
                cluster.append(v)
                placed = True
                break
        if not placed:
            clusters.append([v])

    return {c[0]: c for c in clusters if len(c) > 1}


def apply_category_mapping(df: pd.DataFrame, column: str, mapping: dict[str, str]) -> pd.DataFrame:
    """Replace variants with their canonical form. Also case-insensitive."""
    df = df.copy()
    if column not in df.columns:
        return df

    # Build a case-insensitive lookup
    lookup = {k.lower(): v for k, v in mapping.items()}
    df[column] = df[column].apply(
        lambda v: lookup.get(str(v).strip().lower(), v) if pd.notna(v) else v
    )
    return df


# ═══════════════════════════════════════════════════════════════════════
# 8. STRUCTURE — split, merge, pivot, drop, rename
# ═══════════════════════════════════════════════════════════════════════

def split_column(df: pd.DataFrame, column: str, separator: str, into: list[str]) -> pd.DataFrame:
    """Split a column by a separator into N new columns. Original is dropped."""
    df = df.copy()
    if column not in df.columns or not into:
        return df
    parts = df[column].astype(str).str.split(re.escape(separator), n=len(into) - 1, expand=True)
    for i, name in enumerate(into):
        df[name] = parts[i] if i in parts.columns else None
    return df.drop(columns=[column])


def merge_columns(df: pd.DataFrame, columns: list[str], into: str, separator: str = " ") -> pd.DataFrame:
    """Concatenate columns into a single new column. Originals are dropped."""
    df = df.copy()
    valid = [c for c in columns if c in df.columns]
    if not valid:
        return df
    df[into] = df[valid].astype(str).agg(separator.join, axis=1).str.strip()
    df[into] = df[into].replace({"nan": None, "None": None})
    return df.drop(columns=valid)


def unpivot(df: pd.DataFrame, id_columns: list[str], value_columns: list[str],
            var_name: str = "variable", value_name: str = "value") -> pd.DataFrame:
    valid_ids = [c for c in id_columns if c in df.columns]
    valid_vals = [c for c in value_columns if c in df.columns]
    if not valid_vals:
        return df.copy()
    return df.melt(id_vars=valid_ids, value_vars=valid_vals,
                   var_name=var_name, value_name=value_name)


def pivot(df: pd.DataFrame, index_col: str, columns_col: str, values_col: str) -> pd.DataFrame:
    if not all(c in df.columns for c in [index_col, columns_col, values_col]):
        return df.copy()
    try:
        return df.pivot_table(index=index_col, columns=columns_col,
                              values=values_col, aggfunc="first").reset_index()
    except Exception:
        return df.copy()


def transpose(df: pd.DataFrame) -> pd.DataFrame:
    return df.transpose().reset_index()


def reorder_columns(df: pd.DataFrame, order: list[str]) -> pd.DataFrame:
    existing = [c for c in order if c in df.columns]
    extras = [c for c in df.columns if c not in existing]
    return df[existing + extras]


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


def sort_rows(df: pd.DataFrame, column: str, ascending: bool = True) -> pd.DataFrame:
    if column not in df.columns:
        raise ValueError(f"Column not found: {column}")
    return df.sort_values(by=column, ascending=ascending, kind="stable").reset_index(drop=True)


def delete_rows(df: pd.DataFrame, indices: list[int]) -> pd.DataFrame:
    valid = [i for i in indices if 0 <= i < len(df)]
    return df.drop(index=valid).reset_index(drop=True)


def drop_empty_rows(df: pd.DataFrame) -> pd.DataFrame:
    return df.dropna(how="all").reset_index(drop=True)


# ═══════════════════════════════════════════════════════════════════════
# 9. VALIDATION FLAGS (add boolean columns, never remove data)
# ═══════════════════════════════════════════════════════════════════════

def flag_required(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    """Flag rows missing any of the required columns."""
    df = df.copy()
    valid = [c for c in columns if c in df.columns]
    if not valid:
        return df
    df["_row_has_all_required"] = ~df[valid].isna().any(axis=1)
    return df


def flag_regex_mismatch(df: pd.DataFrame, column: str, pattern: str, flag_name: str = "") -> pd.DataFrame:
    """Flag rows where the value doesn't match the given regex."""
    df = df.copy()
    if column not in df.columns:
        return df
    name = flag_name or f"{column}_regex_ok"
    df[name] = df[column].astype(str).str.match(pattern, na=False)
    return df


def flag_range(df: pd.DataFrame, column: str, low: float | None, high: float | None) -> pd.DataFrame:
    """Flag rows outside [low, high]."""
    df = df.copy()
    if column not in df.columns:
        return df
    numeric = pd.to_numeric(df[column], errors="coerce")
    ok = pd.Series(True, index=df.index)
    if low is not None:
        ok &= numeric >= low
    if high is not None:
        ok &= numeric <= high
    df[f"{column}_in_range"] = ok
    return df


def flag_allowed_values(df: pd.DataFrame, column: str, allowed: list[str]) -> pd.DataFrame:
    """Flag rows whose value isn't in the allowed set (case-insensitive)."""
    df = df.copy()
    if column not in df.columns:
        return df
    allowed_lower = {a.lower() for a in allowed}
    df[f"{column}_allowed"] = df[column].astype(str).str.strip().str.lower().isin(allowed_lower)
    return df


def replace_value(df: pd.DataFrame, column: str, find: str, replace: str,
                  case_sensitive: bool = False) -> pd.DataFrame:
    """Replace all occurrences of `find` with `replace` in a column."""
    df = df.copy()
    if column not in df.columns:
        return df

    if case_sensitive:
        df[column] = df[column].apply(
            lambda v: str(v).replace(find, replace) if pd.notna(v) else v
        )
    else:
        pattern = re.compile(re.escape(find), re.IGNORECASE)
        df[column] = df[column].apply(
            lambda v: pattern.sub(replace, str(v)) if pd.notna(v) else v
        )
    return df


def regex_replace(df: pd.DataFrame, column: str, pattern: str, replace: str,
                  case_sensitive: bool = True) -> pd.DataFrame:
    """Replace using a regex pattern in a specific column."""
    df = df.copy()
    if column not in df.columns:
        return df

    flags = 0 if case_sensitive else re.IGNORECASE
    try:
        compiled = re.compile(pattern, flags)
    except re.error as e:
        raise ValueError(f"Invalid regex: {e}")

    df[column] = df[column].apply(
        lambda v: compiled.sub(replace, str(v)) if pd.notna(v) else v
    )
    return df


def replace_value_all_columns(df: pd.DataFrame, find: str, replace: str,
                               case_sensitive: bool = False) -> pd.DataFrame:
    """Find & replace across every text column."""
    df = df.copy()
    if not find:
        return df

    if case_sensitive:
        for col in df.columns:
            if df[col].dtype == "object":
                df[col] = df[col].apply(
                    lambda v: str(v).replace(find, replace) if pd.notna(v) else v
                )
    else:
        pattern = re.compile(re.escape(find), re.IGNORECASE)
        for col in df.columns:
            if df[col].dtype == "object":
                df[col] = df[col].apply(
                    lambda v: pattern.sub(replace, str(v)) if pd.notna(v) else v
                )
    return df


def regex_replace_all_columns(df: pd.DataFrame, pattern: str, replace: str,
                               case_sensitive: bool = True) -> pd.DataFrame:
    """Regex replace across every text column."""
    df = df.copy()
    flags = 0 if case_sensitive else re.IGNORECASE
    try:
        compiled = re.compile(pattern, flags)
    except re.error as e:
        raise ValueError(f"Invalid regex: {e}")

    for col in df.columns:
        if df[col].dtype == "object":
            df[col] = df[col].apply(
                lambda v: compiled.sub(replace, str(v)) if pd.notna(v) else v
            )
    return df


# ═══════════════════════════════════════════════════════════════════════
# 10. DISPATCHER — apply_suggestion
# ═══════════════════════════════════════════════════════════════════════

def apply_suggestion(df: pd.DataFrame, suggestion: dict[str, Any]) -> pd.DataFrame:
    """Apply an approved suggestion using the selected variant action.

    Reads `proposed_action` (or `action`), `column`, and `params`.
    """
    action = suggestion.get("proposed_action") or suggestion.get("action")
    column = suggestion.get("column")
    params = suggestion.get("params") or {}

    # ── Missing values ──────────────────────────────────────────────
    if action == "fill_null_with_median" and column:
        return fill_null_with_median(df, column)
    if action == "fill_null_with_mean" and column:
        return fill_null_with_mean(df, column)
    if action == "fill_null_with_mode" and column:
        return fill_null_with_mode(df, column)
    if action == "fill_null_forward" and column:
        return fill_null_forward(df, column)
    if action == "fill_null_backward" and column:
        return fill_null_backward(df, column)
    if action == "fill_null_interpolate" and column:
        return fill_null_interpolate(df, column, params.get("method", "linear"))
    if action == "fill_null_grouped" and column:
        group_by = params.get("group_by")
        if group_by:
            return fill_null_grouped(df, column, group_by, params.get("method", "median"))
        return df.copy()
    if action == "fill_null_with_constant" and column:
        return fill_null_with_constant(df, column, params.get("value", "(missing)"))
    if action == "fill_null_with_placeholder" and column:
        return fill_null_with_constant(df, column, "(missing)")
    if action == "flag_null_as_column" and column:
        return flag_null_as_column(df, column)
    if action == "drop_null_rows" and column:
        return drop_null_rows(df, column)
    if action == "drop_null_columns":
        return drop_null_columns(df, params.get("threshold_pct", 90.0))

    # ── Duplicates ─────────────────────────────────────────────────
    if action in {"drop_duplicates", "drop_duplicates_keep_first"}:
        return drop_duplicates_keep_first(df)
    if action == "drop_duplicates_keep_last":
        return drop_duplicates_keep_last(df)
    if action == "drop_duplicates_all":
        return drop_duplicates_all(df)
    if action == "flag_duplicates":
        return flag_duplicates(df)
    if action == "drop_duplicates_subset":
        return drop_duplicates_subset(df, params.get("columns", []))

    # ── Outliers ───────────────────────────────────────────────────
    if action == "flag_outliers_iqr" and column:
        return flag_outliers_iqr(df, column, params.get("multiplier", 1.5))
    if action == "flag_outliers_zscore" and column:
        return flag_outliers_zscore(df, column, params.get("threshold", 3.0))
    if action == "winsorize" and column:
        return winsorize_column(df, column, params.get("lower_q", 0.01), params.get("upper_q", 0.99))

    # ── Types ──────────────────────────────────────────────────────
    if action == "to_numeric" and column:
        return to_numeric(df, column)
    if action == "to_numeric_keep_text" and column:
        return to_numeric_keep_text(df, column)
    if action == "to_integer" and column:
        return to_integer(df, column)
    if action == "to_boolean" and column:
        return to_boolean(df, column, params.get("true_values"))
    if action == "to_datetime" and column:
        return to_datetime(df, column, params.get("dayfirst", True))
    if action == "to_datetime_iso" and column:
        return to_datetime_iso(df, column, params.get("dayfirst", True))
    if action == "strip_currency" and column:
        return strip_currency(df, column)
    if action == "strip_percent" and column:
        return strip_percent(df, column, params.get("as_fraction", True))
    if action == "extract_numbers" and column:
        return extract_numbers(df, column)
    if action == "preserve_leading_zeros" and column:
        return preserve_leading_zeros(df, column, params.get("width", 0))

    # ── Text ───────────────────────────────────────────────────────
    if action == "trim" and column:
        return trim_whitespace(df, column)
    if action == "collapse_spaces" and column:
        return collapse_spaces(df, column)
    if action == "case_upper" and column:
        return case_upper(df, column)
    if action == "case_lower" and column:
        return case_lower(df, column)
    if action == "case_title" and column:
        return case_title(df, column)
    if action == "case_sentence" and column:
        return case_sentence(df, column)
    if action == "remove_special_chars" and column:
        return remove_special_chars(df, column, params.get("keep", " "))
    if action == "apply_category_mapping" and column:
        return apply_category_mapping(df, column, params.get("mapping", {}))

    # ── Structure ──────────────────────────────────────────────────
    if action == "split_column" and column:
        into = params.get("into") or []
        separator = params.get("separator", " ")
        if into:
            return split_column(df, column, separator, into)
        return df.copy()
    if action == "merge_columns":
        cols = params.get("columns") or []
        into = params.get("into")
        separator = params.get("separator", " ")
        if cols and into:
            return merge_columns(df, cols, into, separator)
        return df.copy()
    if action == "unpivot":
        return unpivot(df, params.get("id_columns", []), params.get("value_columns", []),
                       params.get("var_name", "variable"), params.get("value_name", "value"))
    if action == "pivot":
        return pivot(df, params.get("index_col"), params.get("columns_col"), params.get("values_col"))
    if action == "transpose":
        return transpose(df)
    if action == "drop_column" and column:
        return drop_column(df, column)
    if action == "drop_empty_rows":
        return drop_empty_rows(df)
    if action == "reorder_columns":
        return reorder_columns(df, params.get("order", []))

    if action == "replace_value_all" and not column:
        return replace_value_all_columns(
            df,
            params.get("find", ""),
            params.get("replace", ""),
            params.get("case_sensitive", False),
        )
    if action == "regex_replace_all" and not column:
        return regex_replace_all_columns(
            df,
            params.get("pattern", ""),
            params.get("replace", ""),
            params.get("case_sensitive", True),
        )
    # ── Validation flags ───────────────────────────────────────────
    if action == "flag_required":
        return flag_required(df, params.get("columns", []))
    if action == "flag_regex_mismatch" and column:
        return flag_regex_mismatch(df, column, params.get("pattern", ""), params.get("flag_name", ""))
    if action == "flag_range" and column:
        return flag_range(df, column, params.get("low"), params.get("high"))
    if action == "flag_allowed_values" and column:
        return flag_allowed_values(df, column, params.get("allowed", []))


    if action == "replace_value" and column:
        return replace_value(
            df, column,
            params.get("find", ""),
            params.get("replace", ""),
            params.get("case_sensitive", False),
        )
    if action == "regex_replace" and column:
        return regex_replace(
            df, column,
            params.get("pattern", ""),
            params.get("replace", ""),
            params.get("case_sensitive", True),
        )
    
    # ── Phones / names ─────────────────────────────────────────────
    if action == "normalize_phone" and column:
        return normalize_phone_column(df, column)
    if action == "normalize_name_case" and column:
        return normalize_name_column(df, column, params.get("case", "upper"))
    if action == "clean_numeric_in_name" and column:
        return clean_numeric_in_name_column(df, column)
    if action == "drop_invalid_name_rows" and column:
        return drop_invalid_name_rows(df, column)
    if action == "flag_invalid_name" and column:
        return flag_invalid_name(df, column)

    return df.copy()