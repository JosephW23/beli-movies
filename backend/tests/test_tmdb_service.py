import unittest

import httpx

from app.services.tmdb_service import TmdbService, get_image_url


class TmdbServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            if request.url.path.endswith("/discover/movie"):
                return httpx.Response(
                    200,
                    json={
                        "results": [
                            {
                                "id": 286217,
                                "title": "The Martian",
                                "release_date": "2015-09-30",
                                "poster_path": "/the-martian.jpg",
                                "genre_ids": [18, 878, 12],
                                "popularity": 88.5,
                                "vote_average": 7.7,
                            }
                        ]
                    },
                )
            if request.url.path.endswith("/trending/all/week"):
                return httpx.Response(
                    200,
                    json={
                        "results": [
                            {
                                "id": 157336,
                                "media_type": "movie",
                                "title": "Interstellar",
                                "release_date": "2014-11-05",
                                "poster_path": "/interstellar.jpg",
                            },
                            {"id": 1, "media_type": "person", "name": "Someone"},
                        ]
                    },
                )
            if request.url.path.endswith("/search/multi"):
                return httpx.Response(
                    200,
                    json={
                        "results": [
                            {
                                "id": 157336,
                                "media_type": "movie",
                                "title": "Interstellar",
                                "release_date": "2014-11-05",
                                "poster_path": "/interstellar.jpg",
                                "overview": "A team travels through a wormhole.",
                                "genre_ids": [12, 18, 878],
                            },
                            {
                                "id": 1396,
                                "media_type": "tv",
                                "name": "Breaking Bad",
                                "first_air_date": "2008-01-20",
                                "poster_path": "/breaking-bad.jpg",
                                "overview": "A chemistry teacher changes course.",
                                "genre_ids": [18, 80],
                            },
                            {"id": 1, "media_type": "person", "name": "Someone"},
                        ]
                    },
                )
            if request.url.path.endswith("/movie/157336"):
                return httpx.Response(
                    200,
                    json={
                        "id": 157336,
                        "title": "Interstellar",
                        "release_date": "2014-11-05",
                        "poster_path": "/interstellar.jpg",
                        "overview": "A team travels through a wormhole.",
                        "genres": [{"id": 12, "name": "Adventure"}],
                        "runtime": 169,
                    },
                )
            if request.url.path.endswith("/tv/1396"):
                return httpx.Response(
                    200,
                    json={
                        "id": 1396,
                        "name": "Breaking Bad",
                        "first_air_date": "2008-01-20",
                        "poster_path": "/breaking-bad.jpg",
                        "overview": "A chemistry teacher changes course.",
                        "genres": [{"id": 18, "name": "Drama"}],
                        "episode_run_time": [47],
                    },
                )
            return httpx.Response(404)

        self.service = TmdbService(
            token="test-token",
            transport=httpx.MockTransport(handler),
        )

    def test_search_normalizes_movies_and_tv_and_filters_people(self) -> None:
        results = self.service.search_titles("interstellar")

        self.assertEqual([title.type for title in results], ["movie", "tv"])
        self.assertEqual(results[0].name, "Interstellar")
        self.assertEqual(results[0].year, 2014)
        self.assertEqual(results[1].name, "Breaking Bad")
        self.assertTrue(results[0].poster_url.endswith("/interstellar.jpg"))

    def test_movie_details_include_genres_and_runtime(self) -> None:
        details = self.service.get_title_details("movie", 157336)

        self.assertEqual(details.genres, ["Adventure"])
        self.assertEqual(details.runtime_minutes, 169)

    def test_tv_details_use_tv_fields(self) -> None:
        details = self.service.get_title_details("tv", 1396)

        self.assertEqual(details.name, "Breaking Bad")
        self.assertEqual(details.year, 2008)
        self.assertEqual(details.genres, ["Drama"])
        self.assertEqual(details.runtime_minutes, 47)

    def test_image_url_handles_missing_and_relative_paths(self) -> None:
        self.assertIsNone(get_image_url(None))
        self.assertEqual(
            get_image_url("poster.jpg"),
            "https://image.tmdb.org/t/p/w500/poster.jpg",
        )

    def test_trending_returns_watchable_titles_with_posters(self) -> None:
        results = self.service.get_trending_titles()

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].name, "Interstellar")
        self.assertIsNotNone(results[0].poster_url)

    def test_discover_normalizes_genre_candidates(self) -> None:
        results = self.service.discover_titles("movie", [878, 12])

        self.assertEqual(results[0].name, "The Martian")
        self.assertEqual(results[0].genre_ids, [18, 878, 12])
        self.assertEqual(results[0].popularity, 88.5)


if __name__ == "__main__":
    unittest.main()
