"""Detector – quality issues.

Runs every detection rule against a working DataFrame. Each issue
produced here becomes a suggestion card in the UI.

Issue types (must match the variant actions in suggester.py + applier.py):
    high_nulls, mostly_empty_column, empty_column, empty_rows,
    duplicate_rows, numeric_as_text, whitespace, phone_format,
    name_case, numeric_in_name, outliers, category_variants,
    dates_inconsistent
"""
from typing import Any
import re
import pandas as pd

# ─── Thresholds ────────────────────────────────────────────────────────
MOSTLY_EMPTY_PCT = 90.0        # ≥90% missing → drop
HIGH_NULLS_PCT = 30.0          # 30–89% missing → fill
OUTLIER_IQR_MULTIPLIER = 1.5   # for detection message only
CATEGORY_MIN_SIMILARITY = 0.85 # for cluster detection
CATEGORY_MIN_VALUES = 3        # min unique values to check for clusters

# ─── Phone detection ───────────────────────────────────────────────────
PHONE_HEADER_RE = re.compile(r"phone|mobile|contact|tel", re.IGNORECASE)
KENYAN_LOCAL_RE = re.compile(r"^0[17]\d{8}$")
KENYAN_INTL_RE = re.compile(r"^\+?254[17]\d{8}$")

# ─── Name detection ────────────────────────────────────────────────────
NAME_HEADER_RE = re.compile(r"\bname\b|surname|first.?name|last.?name|full.?name", re.IGNORECASE)

# ─── Date detection ────────────────────────────────────────────────────
DATE_HEADER_RE = re.compile(r"date|_at$|_on$|when", re.IGNORECASE)

# ─── Columns that are derived — skip to prevent cascading rules ────────
DERIVED_SUFFIXES = (
    "_normalized", "_e164", "_raw", "_cleaned",
    "_outlier", "_was_missing", "_invalid", "_numeric", "_in_range", "_allowed",
)

# ─── Placeholder values treated as missing ─────────────────────────────
PLACEHOLDER_VALUES = {
    "n/a", "na", "n.a.", "none", "null", "nil", "-", "--", "---",
    "unknown", "unspecified", "not applicable", "tbd", "tba",
    "000", "999", "xxx", "xxxx",
}


# ═══════════════════════════════════════════════════════════════════════
# PHONE HELPERS
# ═══════════════════════════════════════════════════════════════════════

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


# ═══════════════════════════════════════════════════════════════════════
# NAME HELPERS
# ═══════════════════════════════════════════════════════════════════════

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


# ═══════════════════════════════════════════════════════════════════════
# DATE HELPERS
# ═══════════════════════════════════════════════════════════════════════

DATE_PATTERNS = [
    (re.compile(r"^\d{4}-\d{2}-\d{2}$"), "iso"),
    (re.compile(r"^\d{2}/\d{2}/\d{4}$"), "slash_dmy_or_mdy"),
    (re.compile(r"^\d{2}-\d{2}-\d{4}$"), "dash_dmy_or_mdy"),
    (re.compile(r"^\d{1,2}\s+\w{3,}\s+\d{4}$"), "month_name"),
    (re.compile(r"^\w{3,}\s+\d{1,2},?\s+\d{4}$"), "month_name_alt"),
]


def _classify_date(s: str) -> str:
    s = s.strip()
    if not s:
        return "empty"
    for pattern, name in DATE_PATTERNS:
        if pattern.match(s):
            return name
    # Try pandas parse as a last resort
    try:
        pd.to_datetime(s)
        return "other_parseable"
    except Exception:
        return "unparseable"


# ═══════════════════════════════════════════════════════════════════════
# CATEGORY HELPERS
# ═══════════════════════════════════════════════════════════════════════

def _cluster_categories(values: list[str], min_similarity: float = CATEGORY_MIN_SIMILARITY) -> dict[str, list[str]]:
    """Group similar values. Returns {canonical: [variants]}."""
    from difflib import SequenceMatcher

    sorted_values = sorted(set(values))
    clusters: list[list[str]] = []

    for v in sorted_values:
        placed = False
        for cluster in clusters:
            ratio = SequenceMatcher(None, v.lower(), cluster[0].lower()).ratio()
            if ratio >= min_similarity:
                cluster.append(v)
                placed = True
                break
        if not placed:
            clusters.append([v])

    return {c[0]: c for c in clusters if len(c) > 1}


# ═══════════════════════════════════════════════════════════════════════
# MAIN DETECTOR
# ═══════════════════════════════════════════════════════════════════════

def _is_derived(col_name: str) -> bool:
    return str(col_name).endswith(DERIVED_SUFFIXES)


def detect_issues(df: pd.DataFrame) -> list[dict[str, Any]]:
    issues: list[dict[str, Any]] = []

    # ═══════════════════════════════════════════════════════════════════
    # 1. COLUMN NULL RATE
    # ═══════════════════════════════════════════════════════════════════
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

    # ═══════════════════════════════════════════════════════════════════
    # 2. COMPLETELY EMPTY COLUMNS
    # ═══════════════════════════════════════════════════════════════════
    for col in df.columns:
        if len(df) > 0 and df[col].isna().all():
            issues.append({
                "rule_id": "EMPTY_COL",
                "type": "empty_column",
                "column": str(col),
                "severity": "high",
                "message": f"Column '{col}' is completely empty",
            })

    # ═══════════════════════════════════════════════════════════════════
    # 3. COMPLETELY EMPTY ROWS
    # ═══════════════════════════════════════════════════════════════════
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

    # ═══════════════════════════════════════════════════════════════════
    # 4. DUPLICATE ROWS
    # ═══════════════════════════════════════════════════════════════════
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

    # ═══════════════════════════════════════════════════════════════════
    # 5. NUMBERS STORED AS TEXT
    # ═══════════════════════════════════════════════════════════════════
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

    # ═══════════════════════════════════════════════════════════════════
    # 6. WHITESPACE
    # ═══════════════════════════════════════════════════════════════════
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

    # ═══════════════════════════════════════════════════════════════════
    # 7. PHONE FORMAT
    # ═══════════════════════════════════════════════════════════════════
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

        if len(formats) > 1 or unparseable > 0:
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

    # ═══════════════════════════════════════════════════════════════════
    # 8. NAME CASE
    # ═══════════════════════════════════════════════════════════════════
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

    # ═══════════════════════════════════════════════════════════════════
    # 9. NUMERIC IN NAME
    # ═══════════════════════════════════════════════════════════════════
    for col in df.columns:
        if _is_derived(col):
            continue
        if not NAME_HEADER_RE.search(str(col)):
            continue

        sample = df[col].dropna().astype(str).head(500)
        sample = sample[sample.apply(lambda v: bool(v.strip()))]
        if len(sample) == 0:
            continue

        invalid_values = [
            v for v in sample
            if _is_placeholder(v) or _is_numeric_name(v)
        ]
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

    # ═══════════════════════════════════════════════════════════════════
    # 10. OUTLIERS (numeric columns only)
    # ═══════════════════════════════════════════════════════════════════
    for col in df.columns:
        if _is_derived(col):
            continue
        # Try to parse as numeric
        numeric = pd.to_numeric(df[col], errors="coerce")
        valid_ratio = numeric.notna().mean()
        if valid_ratio < 0.8:
            continue
        if numeric.notna().sum() < 8:
            continue

        q1 = numeric.quantile(0.25)
        q3 = numeric.quantile(0.75)
        iqr = q3 - q1
        if iqr == 0 or pd.isna(iqr):
            continue

        lower = q1 - OUTLIER_IQR_MULTIPLIER * iqr
        upper = q3 + OUTLIER_IQR_MULTIPLIER * iqr
        outlier_mask = numeric.notna() & ((numeric < lower) | (numeric > upper))
        outlier_count = int(outlier_mask.sum())
        if outlier_count == 0:
            continue

        # Only fire if outliers are a small fraction (<10%) — otherwise it's a distribution issue
        if outlier_count / len(numeric.dropna()) >= 0.10:
            continue

        issues.append({
            "rule_id": "OUTLIERS",
            "type": "outliers",
            "column": str(col),
            "severity": "medium",
            "message": (
                f"Column '{col}' has {outlier_count} potential outlier(s) "
                f"outside [{lower:.2f}, {upper:.2f}]"
            ),
            "outlier_count": outlier_count,
            "lower_bound": float(lower),
            "upper_bound": float(upper),
        })

    # ═══════════════════════════════════════════════════════════════════
    # 11. CATEGORY VARIANTS (text columns with clustered values)
    # ═══════════════════════════════════════════════════════════════════
    for col in df.columns:
        if _is_derived(col):
            continue
        if df[col].dtype != "object":
            continue
        # Skip phone / name columns — they have their own rules
        if PHONE_HEADER_RE.search(str(col)) or NAME_HEADER_RE.search(str(col)):
            continue

        sample = df[col].dropna().astype(str)
        sample = sample[sample.str.strip().astype(bool)]
        if len(sample) < 20:
            continue

        unique_values = sample.unique().tolist()
        if len(unique_values) < CATEGORY_MIN_VALUES:
            continue
        # If nearly every value is unique, it's not a categorical column
        if len(unique_values) / len(sample) > 0.5:
            continue
        # Only look at columns with a reasonable number of unique values
        if len(unique_values) > 200:
            continue

        clusters = _cluster_categories(unique_values)
        if not clusters:
            continue

        # Build a flat mapping: variant → canonical
        flat_mapping: dict[str, str] = {}
        for canonical, variants in clusters.items():
            for v in variants:
                if v != canonical:
                    flat_mapping[v] = canonical

        if not flat_mapping:
            continue

        issues.append({
            "rule_id": "CATEGORY_VARIANTS",
            "type": "category_variants",
            "column": str(col),
            "severity": "low",
            "message": (
                f"Column '{col}' has {len(flat_mapping)} value(s) that look "
                f"like variants of {len(clusters)} canonical form(s)"
            ),
            "variant_count": len(flat_mapping),
            "mapping": flat_mapping,
        })

    # ═══════════════════════════════════════════════════════════════════
    # 12. INCONSISTENT DATE FORMATS
    # ═══════════════════════════════════════════════════════════════════
    for col in df.columns:
        if _is_derived(col):
            continue
        if df[col].dtype != "object":
            continue

        header_is_date = bool(DATE_HEADER_RE.search(str(col)))
        sample = df[col].dropna().astype(str).head(100)
        sample = sample[sample.str.strip().astype(bool)]
        if len(sample) < 5:
            continue

        # Classify each value
        classifications: dict[str, int] = {}
        for v in sample:
            c = _classify_date(v)
            classifications[c] = classifications.get(c, 0) + 1

        parseable = sum(
            count for k, count in classifications.items()
            if k not in {"empty", "unparseable"}
        )
        content_is_date = parseable / len(sample) >= 0.7
        if not (header_is_date or content_is_date):
            continue

        # Count distinct real formats (ignore empty)
        real_formats = {
            k: c for k, c in classifications.items()
            if k not in {"empty"}
        }
        if len(real_formats) <= 1:
            continue

        detail_parts = [f"{k}: {v}" for k, v in sorted(real_formats.items())]
        issues.append({
            "rule_id": "DATES_INCONSISTENT",
            "type": "dates_inconsistent",
            "column": str(col),
            "severity": "medium",
            "message": (
                f"Column '{col}' has mixed date formats "
                f"({', '.join(detail_parts)})"
            ),
            "formats": sorted(real_formats.keys()),
        })

    return issues