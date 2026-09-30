from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import get_settings
from api.changes import router as changes_router
from api.projects import router as projects_router
from api.undo import router as undo_router
from api.flags import router as flags_router

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Data Qlean – Clean messy CSV/Excel data with suggestions you control",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "ok"}


from api import (  # noqa: E402
    upload,
    profile,
    data_view,
    quality,
    suggestions,
    transform,
    export,
    undo,
)

app.include_router(upload.router, prefix="/upload", tags=["Upload"])
app.include_router(profile.router, prefix="/profile", tags=["Profile"])
app.include_router(data_view.router, prefix="/data", tags=["Data"])
app.include_router(quality.router, prefix="/quality", tags=["Quality"])
app.include_router(suggestions.router, prefix="/suggestions", tags=["Suggestions"])
app.include_router(transform.router, prefix="/transform", tags=["Transform"])
app.include_router(export.router, prefix="/export", tags=["Export"])
app.include_router(changes_router, prefix="/changes", tags=["Changes"])
app.include_router(undo_router, prefix="/undo", tags=["Undo"])
app.include_router(projects_router, prefix="/projects", tags=["Projects"])
app.include_router(flags_router, prefix="/flags", tags=["Flags"])