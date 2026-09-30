"""Flagger – enumerate individual cells that have quality issues."""
from typing import Any
import re
import pandas as pd

# Reuse the detection helpers from detector.py
from services.detector import (
    HIGH_NULLS_PCT,
    MOSTLY_EMPTY_PCT,
    KENYAN_LOCAL_RE,
    KENYAN_INTL_RE,
    PHONE_HEADER_RE,
    NAME_HEADER_RE,
    _clean_phone_string,
    _classify_phone,
    _is_alphabetic_name,
    _is_numeric_name,
    _is_placeholder,
)


def flag_cells(df: pd.DataFrame) -> list[dict[str, Any]]:
    """Return a list of {row, column, rule_id, severity} dicts.

    `row` is the 0-based index into the DataFrame. The frontend maps
    this to its own row index when rendering.
    """
    flags: list[dict[str, Any]] = []

    for col in df.columns:
        col_str = str(col)

        # Skip derived columns — we don't want to flag a "_normalized"
        # column that we created ourselves
        if col_str.endswith(("_normalized", "_e164", "_raw", "_cleaned")):
            continue

        series = df[col]

        # --- Null / high-null flags ---
        null_pct = float(series.isna().mean() * 100)
        if null_pct >= HIGH_NULLS_PCT:
            severity = "high" if null_pct >= 70 else "medium"
            for i in series.index[series.isna()]:
                flags.append({
                    "row": int(i),
                    "column": col_str,
                    "rule_id": "HIGH_NULLS",
                    "severity": severity,
                    "message": "Missing value",
                })

        # --- Numeric in name flags ---
        if NAME_HEADER_RE.search(col_str):
            for i, v in series.dropna().items():
                s = str(v).strip()
                if not s:
                    continue
                if _is_placeholder(s) or _is_numeric_name(s):
                    flags.append({
                        "row": int(i),
                        "column": col_str,
                        "rule_id": "NUMERIC_IN_NAME",
                        "severity": "medium",
                        "message": "Numeric or placeholder value in name column",
                    })

        # --- Phone format flags ---
        header_is_phone = bool(PHONE_HEADER_RE.search(col_str))
        sample = series.dropna().astype(str).head(200)
        content_is_phone = (
            len(sample) > 0
            and sample.apply(lambda v: _classify_phone(v) != "unparseable").mean() >= 0.5
        )
        if header_is_phone or content_is_phone:
            for i, v in series.dropna().items():
                cleaned = _clean_phone_string(str(v))
                # Flag anything that isn't already in local format
                if not re.fullmatch(r"0[17]\d{8}", cleaned):
                    flags.append({
                        "row": int(i),
                        "column": col_str,
                        "rule_id": "PHONE_FORMAT",
                        "severity": "medium",
                        "message": "Phone number not in local format (0XXXXXXXXX)",
                    })

        # --- Whitespace flags ---
        if series.dtype == "object":
            for i, v in series.dropna().items():
                s = str(v)
                if s != s.strip():
                    flags.append({
                        "row": int(i),
                        "column": col_str,
                        "rule_id": "WHITESPACE",
                        "severity": "low",
                        "message": "Leading or trailing whitespace",
                    })

        # --- Name case flags (only if the whole column is inconsistent) ---
        if NAME_HEADER_RE.search(col_str):
            sample = series.dropna().astype(str).head(200)
            sample = sample[sample.apply(lambda v: bool(v.strip()))]
            if len(sample) >= 5:
                alpha = sample.apply(_is_alphabetic_name)
                if alpha.mean() >= 0.5:
                    upper_vals = sample[alpha].apply(lambda v: v.isupper() or v.islower() or v.istitle())
                    # Flag anything not in title/upper/lower (mixed like "DeBora")
                    for i, v in series.dropna().items():
                        s = str(v).strip()
                        if not _is_alphabetic_name(s):
                            continue
                        letters = [c for c in s if c.isalpha()]
                        if not letters:
                            continue
                        is_upper = all(c.isupper() for c in letters)
                        is_lower = all(c.islower() for c in letters)
                        is_title = s.istitle()
                        if not (is_upper or is_lower or is_title):
                            flags.append({
                                "row": int(i),
                                "column": col_str,
                                "rule_id": "NAME_CASE",
                                "severity": "low",
                                "message": "Mixed capitalization",
                            })

    # --- Duplicate row flags ---
    dup_mask = df.duplicated(keep="first")
    if dup_mask.any():
        for i in df.index[dup_mask]:
            for col in df.columns:
                if str(col).endswith(("_normalized", "_e164", "_raw", "_cleaned")):
                    continue
                flags.append({
                    "row": int(i),
                    "column": str(col),
                    "rule_id": "DUP_ROWS",
                    "severity": "medium",
                    "message": "Duplicate row",
                })

    # --- Empty row flags ---
    empty_row_mask = df.isna().all(axis=1)
    if empty_row_mask.any():
        for i in df.index[empty_row_mask]:
            for col in df.columns:
                if str(col).endswith(("_normalized", "_e164", "_raw", "_cleaned")):
                    continue
                flags.append({
                    "row": int(i),
                    "column": str(col),
                    "rule_id": "EMPTY_ROWS",
                    "severity": "low",
                    "message": "Empty row",
                })

    return flags