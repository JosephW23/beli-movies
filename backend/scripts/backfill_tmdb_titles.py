from sqlmodel import Session, select

from app.db.session import engine
from app.models.title import Title
from app.services.tmdb_service import TmdbService, TmdbTitle


def _search_name(title: Title) -> str:
    return title.name.removesuffix(" (US)")


def _best_match(title: Title, results: list[TmdbTitle]) -> TmdbTitle | None:
    candidates = [result for result in results if result.type == title.type]
    if not candidates:
        return None

    search_name = _search_name(title).casefold()
    exact_name = [result for result in candidates if result.name.casefold() == search_name]
    exact_year = [result for result in exact_name if result.year == title.year]
    year_match = [result for result in candidates if result.year == title.year]
    return next(iter(exact_year or year_match or exact_name or candidates), None)


def main() -> None:
    tmdb = TmdbService()
    updated = 0
    skipped = 0

    with Session(engine) as session:
        titles = session.exec(select(Title).order_by(Title.id)).all()
        for title in titles:
            needs_metadata = (
                not title.poster_url
                or "placeholder.com" in title.poster_url
                or title.overview is None
            )
            if not needs_metadata:
                continue

            match = _best_match(title, tmdb.search_titles(_search_name(title)))
            if match is None:
                print(f"Skipped: {title.name} (no {title.type} match)")
                skipped += 1
                continue
            details = tmdb.get_title_details(match.type, match.tmdb_id)
            duplicate = session.exec(
                select(Title).where(
                    Title.tmdb_id == details.tmdb_id,
                    Title.type == details.type,
                    Title.id != title.id,
                )
            ).first()
            if duplicate is not None:
                print(f"Skipped: {title.name} (already stored as title {duplicate.id})")
                skipped += 1
                continue

            title.tmdb_id = details.tmdb_id
            title.name = details.name
            title.year = details.year
            title.poster_url = details.poster_url
            title.genres = ",".join(details.genres) or title.genres
            title.overview = details.overview
            title.runtime_minutes = details.runtime_minutes
            session.add(title)
            updated += 1
            print(f"Updated: {title.name} ({title.type}, {title.year})")

        session.commit()

    print(f"Backfill complete. Updated={updated}, Skipped={skipped}")


if __name__ == "__main__":
    main()
