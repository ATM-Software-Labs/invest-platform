"""Build a compact US-listed snapshot from NASDAQ Trader open files."""
from __future__ import annotations

import json
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "src" / "universe" / "us-listed.json"
NASDAQ = "https://www.nasdaqtrader.com/dynamic/SymDir/nasdaqlisted.txt"
OTHER = "https://www.nasdaqtrader.com/dynamic/SymDir/otherlisted.txt"
VENUE = {"Q": "NASDAQ", "G": "NASDAQ", "S": "NASDAQ", "N": "NYSE", "A": "NYSEAM", "P": "ARCA", "Z": "BATS", "V": "IEX"}


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "invest-platform/1.1"})
    with urllib.request.urlopen(req, timeout=30) as res:
        return res.read().decode("latin-1")


def parse_nasdaq(text: str) -> list[list[str]]:
    rows: list[list[str]] = []
    for line in text.splitlines()[1:]:
        if line.startswith("File Creation"):
            continue
        p = line.split("|")
        if len(p) < 8 or p[3] == "Y":
            continue
        rows.append([p[0].strip(), p[1].strip()[:80], "NASDAQ"])
    return rows


def parse_other(text: str) -> list[list[str]]:
    rows: list[list[str]] = []
    for line in text.splitlines()[1:]:
        if line.startswith("File Creation"):
            continue
        p = line.split("|")
        if len(p) < 8 or p[6] == "Y":
            continue
        rows.append([p[0].strip(), p[1].strip()[:80], VENUE.get(p[2], p[2])])
    return rows


def main() -> None:
    listed = parse_nasdaq(fetch(NASDAQ)) + parse_other(fetch(OTHER))
    seen: set[str] = set()
    out: list[list[str]] = []
    for ticker, name, venue in listed:
        key = ticker.upper()
        if not key or key in seen:
            continue
        seen.add(key)
        out.append([ticker, name, venue])
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {len(out)} symbols -> {OUT}")


if __name__ == "__main__":
    main()
