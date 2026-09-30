from fastapi import APIRouter, HTTPException

from services.loader import list_projects, delete_project, read_project_meta

router = APIRouter()


@router.get("")
def get_projects():
    return {"projects": list_projects()}


@router.get("/{session_id}")
def get_project(session_id: str):
    meta = read_project_meta(session_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Project not found")
    return meta


@router.delete("/{session_id}")
def remove_project(session_id: str):
    meta = read_project_meta(session_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Project not found")
    delete_project(session_id)
    return {"ok": True, "deleted": session_id}