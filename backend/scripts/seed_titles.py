import json
import os
from typing import Any

from dotenv import load_dotenv
from sqlmodel import Session, create_engine, select

from app.models.title import Title


def main() -> None:
    # Load env (so DATABASE_URL works when running the script)
    load_dotenv()

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set. Did you create backend/.env?")

    # Create engine for this script run
    engine = create_engine(database_url, echo=False)

    # Load JSON seed data
    seeds_path = os.path.join(os.path.dirname(__file__), "..", "seeds", "titles.json")
    seeds_path = os.path.abspath(seeds_path)

    with open(seeds_path, "r", encoding="utf-8") as f:
        data: list[dict[str, Any]] = json.load(f)

    inserted = 0
    skipped = 0

    # Insert rows (skip duplicates)
    with Session(engine) as session:
        for item in data:
            tmdb_id = item.get("tmdb_id")

            existing = None
            if tmdb_id is not None:
                existing = session.exec(select(Title).where(Title.tmdb_id == tmdb_id)).first()
            else:
                # fallback dedupe if no tmdb_id
                existing = session.exec(
                    select(Title).where(
                        (Title.name == item["name"])
                        & (Title.type == item["type"])
                        & (Title.year == item.get("year"))
                    )
                ).first()

            if existing:
                skipped += 1
                continue

            title = Title(
                tmdb_id=tmdb_id,
                name=item["name"],
                type=item["type"],
                year=item.get("year"),
                poster_url=item.get("poster_url"),
                genres=item.get("genres"),
            )
            session.add(title)
            inserted += 1

        session.commit()

    print(f"Seed complete. Inserted={inserted}, Skipped={skipped}, Total={len(data)}")


if __name__ == "__main__":
    main()
