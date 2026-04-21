from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
INDEX_HTML = BASE_DIR / "index.html"

REQUIRED_MARKERS = [
    "var _preparedGamesNewestFirst = [];",
    "var _gamesByPlayer = {};",
    "function prepareGameForRender(game) {",
    "function buildPreparedGameCaches(games) {",
    "_paginationEl.addEventListener(\"click\", function(e) {",
    "_filterBarEl.addEventListener(\"click\", function(e) {",
]

LEGACY_MARKERS = [
    "games.reverse();",
    "games = games.filter(function(g) {",
    "var results = (g.results || []).slice().sort(function(a,b) { return a.place - b.place; });",
    "var prevBtn = document.getElementById(\"pagePrevBtn\");",
    "var clearBtn = document.getElementById(\"clearFilterBtn\");",
]


def main():
    content = INDEX_HTML.read_text(encoding="utf-8")
    for marker in REQUIRED_MARKERS:
        assert marker in content, f"Missing marker: {marker!r}"
    for marker in LEGACY_MARKERS:
        assert marker not in content, f"Legacy marker still present: {marker!r}"
    print("elo perf regressions: OK")


if __name__ == "__main__":
    main()
