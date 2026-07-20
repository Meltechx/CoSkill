import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from routers import auth, projects, tasks, performance, users

settings.validate()
logger = logging.getLogger(__name__)

app = FastAPI(title="CoSkill API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
app.include_router(performance.router, prefix="/api/performance", tags=["performance"])
app.include_router(users.router, prefix="/api/users", tags=["users"])


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Log the full traceback and preserve CORS on unexpected failures."""
    logger.exception("Unhandled backend error for %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Check the backend logs for the traceback."},
        # Starlette's server-error middleware can otherwise render a raw 500
        # outside CORS middleware, which browsers misleadingly report as CORS.
        headers={"Access-Control-Allow-Origin": "*"},
    )


@app.get("/health")
async def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
