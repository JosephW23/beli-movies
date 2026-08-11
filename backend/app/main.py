from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from app.api.comparisons import router as comparisons_router
from app.api.events import router as events_router
from app.api.health import router as health_router
from app.api.search import router as search_router
from app.api.social import router as social_router
from app.api.titles import router as titles_router
from app.api.users import router as users_router
from app.db.init_db import init_db
from fastapi import FastAPI


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    init_db()
    yield


app = FastAPI(title="WATCHD API", lifespan=lifespan)


app.include_router(health_router)
app.include_router(search_router)
app.include_router(titles_router)
app.include_router(users_router)
app.include_router(events_router)
app.include_router(social_router)
app.include_router(comparisons_router)
