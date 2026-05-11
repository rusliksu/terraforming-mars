from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
INDEX_HTML = BASE_DIR / "index.html"


def main():
    content = INDEX_HTML.read_text(encoding="utf-8")
    required_markers = [
        "function getGameHost(record) {",
        'source === "knightbyte" || source === "server"',
        'return "Knightbyte";',
        "var host = getGameHost(game);",
        "var host = getGameHost(record);",
        "var serverText = getGameServerLabel(g);",
    ]
    for marker in required_markers:
        assert marker in content, f"Missing marker: {marker!r}"
    print("elo server source labels: OK")


if __name__ == "__main__":
    main()
