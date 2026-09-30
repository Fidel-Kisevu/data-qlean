"""Suggester – issues → actionable suggestions."""
from typing import Any
import hashlib


def _stable_id(rule_id: str, column: str | None) -> str:
    """Deterministic 8-char ID derived from rule + column."""
    key = f"{rule_id}|{column or ''}"
    return hashlib.md5(key.encode("utf-8")).hexdigest()[:8]


def issues_to_suggestions(issues: list[dict[str, Any]]) -> list[dict[str, Any]]:
    suggestions = []
    for issue in issues:
        t = issue["type"]
        rule_id = issue.get("rule_id") or t
        column = issue.get("column")
        sid = _stable_id(rule_id, column)

        if t == "high_nulls":
            suggestions.append({
                "id": sid,
                "rule_id": issue.get("rule_id"),
                "issue_type": t,
                "column": column,
                "severity": issue.get("severity", "medium"),
                "title": f"Handle missing values in '{column}'",
                "description": issue.get("message"),
                "proposed_action": "fill_null_with_placeholder",
                "action_label": "Fill missing with '(missing)'",
                "status": "pending",
            })
        elif t == "mostly_empty_column":
            suggestions.append({
                "id": sid,
                "rule_id": issue.get("rule_id"),
                "issue_type": t,
                "column": column,
                "severity": "high",
                "title": f"Drop mostly-empty column '{column}'",
                "description": issue.get("message"),
                "proposed_action": "drop_column",
                "action_label": "Drop this column",
                "status": "pending",
            })
        elif t == "empty_column":
            suggestions.append({
                "id": sid,
                "rule_id": issue.get("rule_id"),
                "issue_type": t,
                "column": column,
                "severity": "high",
                "title": f"Drop empty column '{column}'",
                "description": issue.get("message"),
                "proposed_action": "drop_column",
                "action_label": "Drop this column",
                "status": "pending",
            })
        elif t == "empty_rows":
            suggestions.append({
                "id": sid,
                "rule_id": issue.get("rule_id"),
                "issue_type": t,
                "column": None,
                "severity": "low",
                "title": "Remove empty rows",
                "description": issue.get("message"),
                "proposed_action": "drop_empty_rows",
                "action_label": "Drop empty rows",
                "status": "pending",
            })
        elif t == "duplicate_rows":
            suggestions.append({
                "id": sid,
                "rule_id": issue.get("rule_id"),
                "issue_type": t,
                "column": None,
                "severity": "medium",
                "title": "Remove duplicate rows",
                "description": issue.get("message"),
                "proposed_action": "drop_duplicates",
                "action_label": "Drop duplicate rows",
                "status": "pending",
            })
        elif t == "numeric_as_text":
            suggestions.append({
                "id": sid,
                "rule_id": issue.get("rule_id"),
                "issue_type": t,
                "column": column,
                "severity": "low",
                "title": f"Convert '{column}' to numeric",
                "description": issue.get("message"),
                "proposed_action": "to_numeric",
                "action_label": "Convert column to number",
                "status": "pending",
            })
        elif t == "whitespace":
            suggestions.append({
                "id": sid,
                "rule_id": issue.get("rule_id"),
                "issue_type": t,
                "column": column,
                "severity": "low",
                "title": f"Trim spaces in '{column}'",
                "description": issue.get("message"),
                "proposed_action": "trim",
                "action_label": "Trim whitespace",
                "status": "pending",
            })
        elif t == "phone_format":
            suggestions.append({
                "id": sid,
                "rule_id": issue.get("rule_id"),
                "issue_type": t,
                "column": column,
                "severity": "medium",
                "title": f"Normalize phone numbers in '{column}'",
                "description": issue.get("message"),
                "proposed_action": "normalize_phone",
                "action_label": "Add normalized column",
                "status": "pending",
            })
        elif t == "name_case":
            suggestions.append({
                "id": sid,
                "rule_id": issue.get("rule_id"),
                "issue_type": t,
                "column": column,
                "severity": "low",
                "title": f"Normalize name capitalization in '{column}'",
                "description": issue.get("message"),
                "proposed_action": "normalize_name_case",
                "action_label": "Add normalized column",
                "status": "pending",
            })
        elif t == "numeric_in_name":
            suggestions.append({
                "id": sid,
                "rule_id": issue.get("rule_id"),
                "issue_type": t,
                "column": column,
                "severity": "medium",
                "title": f"Clean invalid values in '{column}'",
                "description": issue.get("message"),
                "proposed_action": "clean_numeric_in_name",
                "action_label": "Replace with '(missing)'",
                "status": "pending",
            })
    return suggestions