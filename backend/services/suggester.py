"""Suggester – issues → actionable suggestions.

Every issue type maps to a suggestion carrying a `variants` array —
a menu of cleaning actions the user can pick from. The first variant
marked `recommended: True` is the default if the user just clicks Approve.

Actions must match the dispatch keys in `applier.py`.
"""
from typing import Any
import hashlib


def _stable_id(rule_id: str, column: str | None) -> str:
    """Deterministic 8-char ID derived from rule + column."""
    key = f"{rule_id}|{column or ''}"
    return hashlib.md5(key.encode("utf-8")).hexdigest()[:8]


def _variant(
    action: str,
    label: str,
    params: dict | None = None,
    recommended: bool = False,
) -> dict:
    """Helper to build a variant dict."""
    v: dict[str, Any] = {"action": action, "label": label}
    if params:
        v["params"] = params
    if recommended:
        v["recommended"] = True
    return v


def issues_to_suggestions(issues: list[dict[str, Any]]) -> list[dict[str, Any]]:
    suggestions: list[dict[str, Any]] = []

    for issue in issues:
        t = issue["type"]
        rule_id = issue.get("rule_id") or t
        column = issue.get("column")
        sid = _stable_id(rule_id, column)

        # ═══════════════════════════════════════════════════════════════
        # MISSING VALUES
        # ═══════════════════════════════════════════════════════════════
        if t == "high_nulls":
            null_pct = issue.get("null_pct", 0)
            variants = [
                _variant("fill_null_with_median", "Fill with median", recommended=True),
                _variant("fill_null_with_mean", "Fill with mean"),
                _variant("fill_null_with_mode", "Fill with mode"),
                _variant("fill_null_forward", "Forward fill (uses previous value)"),
                _variant("fill_null_backward", "Backward fill (uses next value)"),
                _variant("fill_null_interpolate", "Interpolate between values"),
                _variant("fill_null_with_constant", "Fill with constant…",
                         {"value": "(missing)"}),
                _variant("flag_null_as_column", "Add flag column (keeps nulls)"),
                _variant("drop_null_rows", "Drop rows with missing values"),
            ]
            suggestions.append({
                "id": sid,
                "rule_id": rule_id,
                "issue_type": t,
                "column": column,
                "severity": issue.get("severity", "medium"),
                "title": f"Handle missing values in '{column}'",
                "description": issue.get("message"),
                "variants": variants,
                "proposed_action": "fill_null_with_median",
                "action_label": "Fill with median",
                "null_pct": null_pct,
                "status": "pending",
            })

        # ═══════════════════════════════════════════════════════════════
        # COLUMN-LEVEL EMPTINESS
        # ═══════════════════════════════════════════════════════════════
        elif t == "mostly_empty_column":
            null_pct = issue.get("null_pct", 0)
            variants = [
                _variant("drop_column", "Drop this column", recommended=True),
                _variant("fill_null_with_median", "Keep column, fill with median"),
                _variant("fill_null_with_mode", "Keep column, fill with mode"),
                _variant("fill_null_with_constant", "Keep column, fill with constant",
                         {"value": "(missing)"}),
                _variant("flag_null_as_column", "Keep column, add flag column"),
            ]
            suggestions.append({
                "id": sid,
                "rule_id": rule_id,
                "issue_type": t,
                "column": column,
                "severity": "high",
                "title": f"Handle mostly-empty column '{column}'",
                "description": issue.get("message"),
                "variants": variants,
                "proposed_action": "drop_column",
                "action_label": "Drop this column",
                "null_pct": null_pct,
                "status": "pending",
            })

        elif t == "empty_column":
            suggestions.append({
                "id": sid,
                "rule_id": rule_id,
                "issue_type": t,
                "column": column,
                "severity": "high",
                "title": f"Drop empty column '{column}'",
                "description": issue.get("message"),
                "variants": [
                    _variant("drop_column", "Drop this column", recommended=True),
                ],
                "proposed_action": "drop_column",
                "action_label": "Drop this column",
                "status": "pending",
            })

        # ═══════════════════════════════════════════════════════════════
        # ROW-LEVEL EMPTINESS
        # ═══════════════════════════════════════════════════════════════
        elif t == "empty_rows":
            suggestions.append({
                "id": sid,
                "rule_id": rule_id,
                "issue_type": t,
                "column": None,
                "severity": "low",
                "title": "Remove empty rows",
                "description": issue.get("message"),
                "variants": [
                    _variant("drop_empty_rows", "Drop empty rows", recommended=True),
                ],
                "proposed_action": "drop_empty_rows",
                "action_label": "Drop empty rows",
                "status": "pending",
            })

        # ═══════════════════════════════════════════════════════════════
        # DUPLICATES
        # ═══════════════════════════════════════════════════════════════
        elif t == "duplicate_rows":
            dup_count = issue.get("duplicate_count", 0)
            variants = [
                _variant("drop_duplicates_keep_first", "Keep first occurrence", recommended=True),
                _variant("drop_duplicates_keep_last", "Keep last occurrence"),
                _variant("drop_duplicates_all", "Remove all duplicate rows"),
                _variant("flag_duplicates", "Just flag duplicates (add column)"),
            ]
            suggestions.append({
                "id": sid,
                "rule_id": rule_id,
                "issue_type": t,
                "column": None,
                "severity": "medium",
                "title": "Remove duplicate rows",
                "description": issue.get("message"),
                "variants": variants,
                "proposed_action": "drop_duplicates_keep_first",
                "action_label": "Drop duplicates",
                "duplicate_count": dup_count,
                "status": "pending",
            })

        # ═══════════════════════════════════════════════════════════════
        # TYPE / FORMAT
        # ═══════════════════════════════════════════════════════════════
        elif t == "numeric_as_text":
            variants = [
                _variant("to_numeric", "Convert to number", recommended=True),
                _variant("to_numeric_keep_text", "Add numeric column, keep original text"),
                _variant("to_integer", "Convert to integer (drop decimals)"),
            ]
            suggestions.append({
                "id": sid,
                "rule_id": rule_id,
                "issue_type": t,
                "column": column,
                "severity": "low",
                "title": f"Convert '{column}' to numeric",
                "description": issue.get("message"),
                "variants": variants,
                "proposed_action": "to_numeric",
                "action_label": "Convert column to number",
                "status": "pending",
            })

        # ═══════════════════════════════════════════════════════════════
        # TEXT STANDARDIZATION
        # ═══════════════════════════════════════════════════════════════
        elif t == "whitespace":
            variants = [
                _variant("trim", "Trim leading/trailing spaces", recommended=True),
                _variant("collapse_spaces", "Trim + collapse internal spaces"),
            ]
            suggestions.append({
                "id": sid,
                "rule_id": rule_id,
                "issue_type": t,
                "column": column,
                "severity": "low",
                "title": f"Trim spaces in '{column}'",
                "description": issue.get("message"),
                "variants": variants,
                "proposed_action": "trim",
                "action_label": "Trim whitespace",
                "status": "pending",
            })

        # ═══════════════════════════════════════════════════════════════
        # PHONE
        # ═══════════════════════════════════════════════════════════════
        elif t == "phone_format":
            suggestions.append({
                "id": sid,
                "rule_id": rule_id,
                "issue_type": t,
                "column": column,
                "severity": "medium",
                "title": f"Normalize phone numbers in '{column}'",
                "description": issue.get("message"),
                "variants": [
                    _variant("normalize_phone", "Add normalized column (0XXXXXXXXX)",
                             recommended=True),
                ],
                "proposed_action": "normalize_phone",
                "action_label": "Add normalized column",
                "status": "pending",
            })

        # ═══════════════════════════════════════════════════════════════
        # NAME CASE
        # ═══════════════════════════════════════════════════════════════
        elif t == "name_case":
            variants = [
                _variant("normalize_name_case", "UPPERCASE",
                         {"case": "upper"}, recommended=True),
                _variant("normalize_name_case", "lowercase",
                         {"case": "lower"}),
                _variant("normalize_name_case", "Title Case",
                         {"case": "title"}),
                _variant("normalize_name_case", "Sentence case",
                         {"case": "sentence"}),
                _variant("trim", "Trim + collapse spaces only"),
            ]
            suggestions.append({
                "id": sid,
                "rule_id": rule_id,
                "issue_type": t,
                "column": column,
                "severity": "low",
                "title": f"Normalize name capitalization in '{column}'",
                "description": issue.get("message"),
                "variants": variants,
                "proposed_action": "normalize_name_case",
                "action_label": "Normalize case",
                "status": "pending",
            })

        # ═══════════════════════════════════════════════════════════════
        # NUMERIC-IN-NAME
        # ═══════════════════════════════════════════════════════════════
        elif t == "numeric_in_name":
            invalid_count = issue.get("invalid_count", 0)
            variants = [
                _variant("clean_numeric_in_name", "Replace with '(missing)'",
                         recommended=True),
                _variant("drop_invalid_name_rows", "Drop those rows"),
                _variant("flag_invalid_name", "Add flag column (keep rows)"),
            ]
            suggestions.append({
                "id": sid,
                "rule_id": rule_id,
                "issue_type": t,
                "column": column,
                "severity": "medium",
                "title": f"Clean invalid values in '{column}'",
                "description": issue.get("message"),
                "variants": variants,
                "proposed_action": "clean_numeric_in_name",
                "action_label": "Replace with '(missing)'",
                "invalid_count": invalid_count,
                "samples": issue.get("samples", []),
                "status": "pending",
            })

        # ═══════════════════════════════════════════════════════════════
        # OUTLIERS
        # ═══════════════════════════════════════════════════════════════
        elif t == "outliers":
            variants = [
                _variant("flag_outliers_iqr", "Flag with IQR method (1.5×)", recommended=True),
                _variant("flag_outliers_iqr", "Flag with IQR method (3×, stricter)",
                         {"multiplier": 3.0}),
                _variant("flag_outliers_zscore", "Flag with Z-score (3σ)",
                         {"threshold": 3.0}),
                _variant("winsorize", "Cap extreme values at 1% / 99%",
                         {"lower_q": 0.01, "upper_q": 0.99}),
            ]
            suggestions.append({
                "id": sid,
                "rule_id": rule_id,
                "issue_type": t,
                "column": column,
                "severity": "medium",
                "title": f"Handle outliers in '{column}'",
                "description": issue.get("message"),
                "variants": variants,
                "proposed_action": "flag_outliers_iqr",
                "action_label": "Flag outliers",
                "status": "pending",
            })

        # ═══════════════════════════════════════════════════════════════
        # CATEGORY VARIANTS
        # ═══════════════════════════════════════════════════════════════
        elif t == "category_variants":
            mapping = issue.get("mapping", {})
            variant_count = issue.get("variant_count", len(mapping))
            suggestions.append({
                "id": sid,
                "rule_id": rule_id,
                "issue_type": t,
                "column": column,
                "severity": "low",
                "title": f"Standardize categories in '{column}'",
                "description": issue.get("message"),
                "variants": [
                    _variant("apply_category_mapping",
                             f"Merge {variant_count} variant(s) into canonical form",
                             {"mapping": mapping}, recommended=True),
                    _variant("trim", "Just trim whitespace"),
                ],
                "proposed_action": "apply_category_mapping",
                "action_label": "Merge variants",
                "status": "pending",
            })

        # ═══════════════════════════════════════════════════════════════
        # DATES
        # ═══════════════════════════════════════════════════════════════
        elif t == "dates_inconsistent":
            suggestions.append({
                "id": sid,
                "rule_id": rule_id,
                "issue_type": t,
                "column": column,
                "severity": "medium",
                "title": f"Standardize dates in '{column}'",
                "description": issue.get("message"),
                "variants": [
                    _variant("to_datetime_iso", "Convert to ISO format (YYYY-MM-DD)",
                             {"dayfirst": False}, recommended=True),
                    _variant("to_datetime_iso", "Convert to ISO format (day-first)",
                             {"dayfirst": True}),
                    _variant("to_datetime", "Convert to datetime type (keep display)"),
                ],
                "proposed_action": "to_datetime_iso",
                "action_label": "Convert to ISO date",
                "status": "pending",
            })

        # ═══════════════════════════════════════════════════════════════
        # VALIDATION
        # ═══════════════════════════════════════════════════════════════
        elif t == "validation_failed":
            params = issue.get("params", {})
            rule_kind = issue.get("validation_kind", "unknown")
            suggestions.append({
                "id": sid,
                "rule_id": rule_id,
                "issue_type": t,
                "column": column,
                "severity": "medium",
                "title": f"Validation failed in '{column}'",
                "description": issue.get("message"),
                "variants": [
                    _variant("flag_validation", "Add flag column", params, recommended=True),
                ],
                "proposed_action": "flag_validation",
                "action_label": "Flag invalid rows",
                "status": "pending",
            })

    return suggestions