"""Detector – quality issues."""
from typing import Any
import re
import pandas as pd

# Thresholds
MOSTLY_EMPTY_PCT = 90.0   # ≥90% missing → suggest drop
HIGH_NULLS_PCT = 30.0     # 30–89% missing → suggest fill

# Phone detection
PHONE_HEADER_RE = re.compile(r"phone|mobile|contact|tel", re.IGNORECASE)
KENYAN_LOCAL_RE = re.compile(r"^0[17]\d{8}$")
KENYAN_INTL_RE = re.compile(r"^\+?254[17]\d{8}$")

# Name detection
NAME_HEADER_RE = re.compile(r"\bname\b|surname|first.?name|last.?name|full.?name", re.IGNORECASE)

# Columns that are already derived — skip to prevent cascading rules
DERIVED_SUFFIXES = ("_normalized", "_e164", "_raw", "_cleaned")

# Placeholder values that should be treated as missing
PLACEHOLDER_VALUES = {
    "n/a", "na", "n.a.", "none", "null", "nil", "-", "--", "---",
    "unknown", "unspecified", "not applicable", "tbd", "tba",
    "000", "999", "xxx", "xxxx",
}


# ---------- Phone helpers ----------

def _clean_phone_string(s: str) -> str:
    s = s.replace("O", "0").replace("o", "0").strip()
    if "/" in s:
        s = s.split("/")[0].strip()
    if "," in s:
        s = s.split(",")[0].strip()
    s = re.sub(r"[^\d+]", "", s)
    return s


def _classify_phone(s: str) -> str:
    cleaned = _clean_phone_string(s)
    if KENYAN_LOCAL_RE.match(cleaned):
        return "local"
    if cleaned.startswith("+254") and KENYAN_INTL_RE.match(cleaned):
        return "international"
    if cleaned.startswith("254") and KENYAN_INTL_RE.match("+" + cleaned):
        return "bare-254"
    return "unparseable"


def _looks_like_phone(s: str) -> bool:
    if not isinstance(s, str):
        return False
    return _classify_phone(s) != "unparseable"


# ---------- Name helpers ----------

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


def _is_alphabetic_name(s: str) -> bool:
    s = s.strip()
    if not s or _is_placeholder(s):
        return False
    if _is_numeric_name(s):
        return False
    letters = sum(c.isalpha() or c in " '-." for c in s)
    return letters / len(s) >= 0.7


def _case_class(s: str) -> str:
    s = s.strip()
    letters = [c for c in s if c.isalpha()]
    if not letters:
        return "other"
    if all(c.isupper() for c in letters):
        return "upper"
    if all(c.islower() for c in letters):
        return "lower"
    return "mixed"


def _is_derived(col_name: str) -> bool:
    """True if the column is already a derived/normalized column."""
    return str(col_name).endswith(DERIVED_SUFFIXES)


# ---------- Main detector ----------

def detect_issues(df: pd.DataFrame) -> list[dict[str, Any]]:
    issues: list[dict[str, Any]] = []

    # --- Column: mostly empty / high nulls ---
    for col in df.columns:
        null_pct = float(df[col].isna().mean() * 100)

        if null_pct >= MOSTLY_EMPTY_PCT:
            issues.append({
                "rule_id": "MOSTLY_EMPTY",
                "type": "mostly_empty_column",
                "column": str(col),
                "severity": "high",
                "message": f"Column '{col}' is {null_pct:.1f}% empty — likely not useful",
                "null_pct": round(null_pct, 1),
            })
        elif null_pct >= HIGH_NULLS_PCT:
            issues.append({
                "rule_id": "HIGH_NULLS",
                "type": "high_nulls",
                "column": str(col),
                "severity": "high" if null_pct >= 70 else "medium",
                "message": f"Column '{col}' has {null_pct:.1f}% missing values",
                "null_pct": round(null_pct, 1),
            })

    # --- Column: completely empty ---
    for col in df.columns:
        if len(df) > 0 and df[col].isna().all():
            issues.append({
                "rule_id": "EMPTY_COL",
                "type": "empty_column",
                "column": str(col),
                "severity": "high",
                "message": f"Column '{col}' is completely empty",
            })

    # --- Row: completely empty ---
    empty_rows = int(df.isna().all(axis=1).sum())
    if empty_rows > 0:
        issues.append({
            "rule_id": "EMPTY_ROWS",
            "type": "empty_rows",
            "column": None,
            "severity": "low",
            "message": f"{empty_rows} completely empty row(s) found",
            "empty_count": empty_rows,
        })

    # --- Row: duplicates ---
    dup_count = int(df.duplicated().sum())
    if dup_count > 0:
        issues.append({
            "rule_id": "DUP_ROWS",
            "type": "duplicate_rows",
            "column": None,
            "severity": "medium",
            "message": f"{dup_count} fully duplicate row(s) found",
            "duplicate_count": dup_count,
        })

    # --- Column: numbers stored as text ---
    for col in df.columns:
        if _is_derived(col):
            continue
        if df[col].dtype == "object":
            sample = df[col].dropna().astype(str).head(80)
            if len(sample) == 0:
                continue
            numeric_like = sample.str.match(r"^-?\d+(\.\d+)?$").mean()
            if numeric_like >= 0.8:
                issues.append({
                    "rule_id": "NUM_AS_TEXT",
                    "type": "numeric_as_text",
                    "column": str(col),
                    "severity": "low",
                    "message": f"Column '{col}' looks numeric but is stored as text",
                })

    # --- Column: whitespace ---
    for col in df.columns:
        if _is_derived(col):
            continue
        if df[col].dtype == "object":
            s = df[col].dropna().astype(str)
            if len(s) == 0:
                continue
            needs_trim = (s != s.str.strip()).any()
            if needs_trim:
                issues.append({
                    "rule_id": "WHITESPACE",
                    "type": "whitespace",
                    "column": str(col),
                    "severity": "low",
                    "message": f"Column '{col}' has leading/trailing spaces",
                })

    # --- Column: phone format consistency ---
    for col in df.columns:
        if _is_derived(col):
            continue
        header_is_phone = bool(PHONE_HEADER_RE.search(str(col)))
        sample = df[col].dropna().astype(str).head(200)
        if len(sample) == 0:
            continue

        phone_like_ratio = sample.apply(_looks_like_phone).mean()
        content_is_phone = phone_like_ratio >= 0.5

        if not (header_is_phone or content_is_phone):
            continue

        formats: dict[str, int] = {}
        unparseable = 0
        for v in sample:
            cls = _classify_phone(v)
            if cls == "unparseable":
                unparseable += 1
            else:
                formats[cls] = formats.get(cls, 0) + 1

        format_count = len(formats)

        if format_count > 1 or unparseable > 0:
            detail_parts = [f"{k}: {v}" for k, v in sorted(formats.items())]
            if unparseable:
                detail_parts.append(f"unparseable: {unparseable}")
            issues.append({
                "rule_id": "PHONE_FORMAT",
                "type": "phone_format",
                "column": str(col),
                "severity": "medium",
                "message": (
                    f"Column '{col}' has mixed phone formats "
                    f"({', '.join(detail_parts)})"
                ),
                "formats": sorted(formats.keys()),
                "unparseable_count": unparseable,
            })

    # --- Column: name case consistency ---
    for col in df.columns:
        if _is_derived(col):
            continue
        if not NAME_HEADER_RE.search(str(col)):
            continue

        sample = df[col].dropna().astype(str).head(200)
        sample = sample[sample.apply(lambda v: bool(v.strip()))]
        if len(sample) < 5:
            continue

        alpha_ratio = sample.apply(_is_alphabetic_name).mean()
        if alpha_ratio < 0.5:
            continue

        cases: dict[str, int] = {}
        for v in sample:
            if not _is_alphabetic_name(v):
                continue
            c = _case_class(v)
            cases[c] = cases.get(c, 0) + 1

        upper = cases.get("upper", 0)
        lower = cases.get("lower", 0)
        mixed = cases.get("mixed", 0)
        total_alpha = upper + lower + mixed

        if total_alpha == 0:
            continue

        # Fire only if there's real variety or the column is entirely upper/lower
        needs_fix = (
            (upper > 0 and (lower > 0 or mixed > 0)) or
            (lower > 0 and mixed > 0) or
            (upper / total_alpha >= 0.9) or
            (lower / total_alpha >= 0.9)
        )

        if needs_fix:
            parts = []
            if upper: parts.append(f"{upper} ALL CAPS")
            if lower: parts.append(f"{lower} lowercase")
            if mixed: parts.append(f"{mixed} mixed")
            issues.append({
                "rule_id": "NAME_CASE",
                "type": "name_case",
                "column": str(col),
                "severity": "low",
                "message": (
                    f"Column '{col}' has inconsistent capitalization "
                    f"({', '.join(parts)})"
                ),
                "upper_count": upper,
                "lower_count": lower,
                "mixed_count": mixed,
            })

    # --- Column: invalid values in name column ---
    for col in df.columns:
        if _is_derived(col):
            continue
        if not NAME_HEADER_RE.search(str(col)):
            continue

        sample = df[col].dropna().astype(str).head(500)
        sample = sample[sample.apply(lambda v: bool(v.strip()))]
        if len(sample) == 0:
            continue

        invalid_values = []
        for v in sample:
            if _is_placeholder(v) or _is_numeric_name(v):
                invalid_values.append(v)

        invalid_count = len(invalid_values)
        invalid_ratio = invalid_count / len(sample)

        if invalid_count > 0 and invalid_ratio < 0.5:
            preview = ", ".join(invalid_values[:5])
            if invalid_count > 5:
                preview += f", … (+{invalid_count - 5} more)"
            issues.append({
                "rule_id": "NUMERIC_IN_NAME",
                "type": "numeric_in_name",
                "column": str(col),
                "severity": "medium",
                "message": (
                    f"Column '{col}' has {invalid_count} invalid value(s) "
                    f"(numbers or placeholders): {preview}"
                ),
                "invalid_count": invalid_count,
                "samples": invalid_values[:5],
            })

    return issues