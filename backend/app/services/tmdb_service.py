import os
import base64
import json
from dataclasses import dataclass, field
from datetime import date
from typing import Any, Literal

import httpx
from dotenv import load_dotenv


load_dotenv()

TMDB_API_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"
MediaType = Literal["movie", "tv"]


class TmdbConfigurationError(RuntimeError):
    pass


class TmdbNotFoundError(RuntimeError):
    pass


class TmdbUnavailableError(RuntimeError):
    pass


@dataclass(frozen=True)
class TmdbTitle:
    tmdb_id: int
    type: MediaType
    name: str
    year: int | None
    poster_url: str | None
    overview: str | None
    genre_ids: list[int] = field(default_factory=list)
    genres: list[str] = field(default_factory=list)
    runtime_minutes: int | None = None


def get_image_url(poster_path: str | None) -> str | None:
    if not poster_path:
        return None
    normalized_path = poster_path if poster_path.startswith("/") else f"/{poster_path}"
    return f"{TMDB_IMAGE_BASE_URL}{normalized_path}"


def _year(value: object) -> int | None:
    if not isinstance(value, str) or len(value) < 4:
        return None
    try:
        return date.fromisoformat(value).year
    except ValueError:
        try:
            return int(value[:4])
        except ValueError:
            return None


class TmdbService:
    def __init__(
        self,
        token: str | None = None,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self._token = token or os.getenv("TMDB_READ_ACCESS_TOKEN")
        self._api_key = os.getenv("TMDB_API_KEY") or self._api_key_from_token(self._token)
        self._transport = transport

    @staticmethod
    def _api_key_from_token(token: str | None) -> str | None:
        if not token:
            return None
        try:
            payload_segment = token.split(".")[1]
            padding = "=" * (-len(payload_segment) % 4)
            payload = json.loads(base64.urlsafe_b64decode(payload_segment + padding))
        except (IndexError, ValueError, TypeError, json.JSONDecodeError):
            return None
        audience = payload.get("aud") if isinstance(payload, dict) else None
        return audience if isinstance(audience, str) and audience else None

    def _request(self, path: str, params: dict[str, object] | None = None) -> dict[str, Any]:
        if not self._token and not self._api_key:
            raise TmdbConfigurationError("TMDb is not configured on the backend")

        try:
            request_params = dict(params or {})
            if not self._token and self._api_key:
                request_params["api_key"] = self._api_key
            with httpx.Client(
                base_url=TMDB_API_BASE_URL,
                headers={
                    **({"Authorization": f"Bearer {self._token}"} if self._token else {}),
                    "Accept": "application/json",
                },
                timeout=10,
                transport=self._transport,
            ) as client:
                response = client.get(path, params=request_params)
                if response.status_code == 401 and self._api_key and self._token:
                    fallback_params = {**request_params, "api_key": self._api_key}
                    response = client.get(
                        path,
                        params=fallback_params,
                        headers={"Accept": "application/json"},
                    )
                if response.status_code == 404:
                    raise TmdbNotFoundError("TMDb title not found")
                response.raise_for_status()
                payload = response.json()
        except TmdbNotFoundError:
            raise
        except (httpx.HTTPError, ValueError) as exc:
            raise TmdbUnavailableError("TMDb is temporarily unavailable") from exc

        if not isinstance(payload, dict):
            raise TmdbUnavailableError("TMDb returned an unexpected response")
        return payload

    def search_titles(self, query: str) -> list[TmdbTitle]:
        payload = self._request(
            "/search/multi",
            {"query": query, "include_adult": "false", "language": "en-US", "page": 1},
        )
        results = payload.get("results")
        if not isinstance(results, list):
            return []

        titles: list[TmdbTitle] = []
        for item in results:
            if not isinstance(item, dict) or item.get("media_type") not in ("movie", "tv"):
                continue
            media_type: MediaType = item["media_type"]
            normalized = self._normalize(item, media_type)
            if normalized is not None:
                titles.append(normalized)
        return titles

    def get_trending_titles(self) -> list[TmdbTitle]:
        payload = self._request(
            "/trending/all/week",
            {"language": "en-US", "page": 1},
        )
        results = payload.get("results")
        if not isinstance(results, list):
            return []

        titles: list[TmdbTitle] = []
        for item in results:
            if not isinstance(item, dict) or item.get("media_type") not in ("movie", "tv"):
                continue
            media_type: MediaType = item["media_type"]
            normalized = self._normalize(item, media_type)
            if normalized is not None:
                titles.append(normalized)
        return titles

    def get_title_details(self, media_type: MediaType, tmdb_id: int) -> TmdbTitle:
        payload = self._request(f"/{media_type}/{tmdb_id}", {"language": "en-US"})
        normalized = self._normalize(payload, media_type, include_details=True)
        if normalized is None:
            raise TmdbNotFoundError("TMDb title not found")
        return normalized

    @staticmethod
    def _normalize(
        item: dict[str, Any],
        media_type: MediaType,
        include_details: bool = False,
    ) -> TmdbTitle | None:
        tmdb_id = item.get("id")
        name = item.get("title") if media_type == "movie" else item.get("name")
        if not isinstance(tmdb_id, int) or not isinstance(name, str) or not name.strip():
            return None

        release_date = item.get("release_date") if media_type == "movie" else item.get("first_air_date")
        raw_genre_ids = item.get("genre_ids")
        genre_ids = [value for value in raw_genre_ids if isinstance(value, int)] if isinstance(raw_genre_ids, list) else []
        genres: list[str] = []
        if include_details and isinstance(item.get("genres"), list):
            genres = [
                genre["name"]
                for genre in item["genres"]
                if isinstance(genre, dict) and isinstance(genre.get("name"), str)
            ]
            genre_ids = [
                genre["id"]
                for genre in item["genres"]
                if isinstance(genre, dict) and isinstance(genre.get("id"), int)
            ]

        runtime: int | None = None
        if include_details:
            if media_type == "movie" and isinstance(item.get("runtime"), int):
                runtime = item["runtime"]
            elif media_type == "tv" and isinstance(item.get("episode_run_time"), list):
                runtime = next(
                    (value for value in item["episode_run_time"] if isinstance(value, int)),
                    None,
                )

        overview = item.get("overview")
        return TmdbTitle(
            tmdb_id=tmdb_id,
            type=media_type,
            name=name.strip(),
            year=_year(release_date),
            poster_url=get_image_url(item.get("poster_path") if isinstance(item.get("poster_path"), str) else None),
            overview=overview.strip() if isinstance(overview, str) and overview.strip() else None,
            genre_ids=genre_ids,
            genres=genres,
            runtime_minutes=runtime,
        )
