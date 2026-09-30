"""Detector – quality issues."""
from typing import Any
import pandas as pd

# Thresholds
MOSTLY_EMPTY_PCT = 90.0   # ≥90% missing → suggest drop
HIGH_NULLS_PCT = 30.0     # 30–89% missing → suggest fill


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

    return issues
