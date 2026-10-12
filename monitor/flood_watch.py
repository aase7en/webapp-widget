#!/usr/bin/env python3
"""Read-only one-shot water outlook + approved, supplied news evidence intake.

No scraping, unattended scheduling, alerts, credentials or AI calls by default.
News metadata comes ONLY from a user-supplied licensed/authorized local feed
export. This deliberately does not automatically fetch Google News (ToS risk).
"""
from __future__ import annotations
from datetime import datetime, timezone
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import URLError
from http.client import HTTPException
from xml.etree.ElementTree import ParseError
from pathlib import Path
import argparse
import json
import sys
from .flood_evidence import discharge_outlook, read_rss, review_packet
from .llm_triage import triage

FLOOD_BASE = "https://flood-api.open-meteo.com/v1/flood"


def get_bytes(url: str, *, timeout=12, limit=1_000_000) -> bytes:
    if not url.startswith(FLOOD_BASE + "?"):
        raise ValueError("endpoint not allowlisted")
    with urlopen(Request(url, headers={"User-Agent": "UthaiHospital-WaterEvidence/0.1"}),
                 timeout=timeout) as response:
        data = response.read(limit + 1)
    if len(data) > limit:
        raise ValueError("response over size limit")
    return data


def load_approved_news(path: str | None) -> list[dict]:
    if not path:
        return []
    p = Path(path).expanduser()
    if p.stat().st_size > 1_000_000:
        raise ValueError("news export is too large")
    source = p.read_bytes()
    if p.suffix.lower() in (".xml", ".rss"):
        try:
            return read_rss(source)
        except ParseError as exc:
            raise ValueError("invalid XML feed") from exc
    if p.suffix.lower() == ".json":
        data = json.loads(source)
        entries = data if isinstance(data, list) else data.get("items", []) if isinstance(data, dict) else []
        if not isinstance(entries, list):
            raise ValueError("news input must be a list")
        return entries[:150]
    raise ValueError("expected .json/.rss/.xml approved news export")


def one_shot(lat: float, lon: float, *, now: datetime,
             news_entries: list[dict] | None = None) -> dict:
    url = FLOOD_BASE + "?" + urlencode({
        "latitude": lat, "longitude": lon, "daily": "river_discharge",
        "past_days": 1, "forecast_days": 3, "timezone": "GMT"})
    forecast_error = None
    try:
        model = discharge_outlook(json.loads(get_bytes(url)), lat=lat, lon=lon)
    except (URLError, HTTPException, ValueError, OSError) as e:
        model = discharge_outlook(None, lat=lat, lon=lon)
        forecast_error = type(e).__name__
    report = review_packet(news=news_entries or [], forecast=model, collected_at=now)
    report["fetch_errors"] = {"flood_api": forecast_error}
    report["news_input_status"] = (
        "NOT_CONFIGURED" if news_entries is None else
        "APPROVED_EXPORT_EMPTY" if not news_entries else "APPROVED_EXPORT")
    report["sources"] = [
        {"name": "Open-Meteo Flood API / GloFAS", "type": "MODELLED",
         "url": "https://open-meteo.com/en/docs/flood-api"}
    ]
    return report


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lat", type=float, default=14.36147)
    ap.add_argument("--lon", type=float, default=100.64424)
    ap.add_argument("--news-file", help="Authorized publisher/agency RSS or JSON export (local file only)")
    ap.add_argument("--out", help="Private JSON destination; omitted means stdout only")
    ap.add_argument("--llm-provider", choices=("none", "gemini", "openrouter"), default="none",
                    help="Explicit cloud AI headline extraction; never determines flood risk")
    ap.add_argument("--llm-model", default="", help="Model ID from your provider account")
    args = ap.parse_args()
    try:
        entries = load_approved_news(args.news_file) if args.news_file else None
        result = one_shot(args.lat, args.lon, now=datetime.now(timezone.utc),
                          news_entries=entries)
        if args.llm_provider != "none":
            result["ai_review"] = triage(
                result["news_cues"], provider=args.llm_provider, model=args.llm_model)
        else:
            result["ai_review"] = {"status": "DISABLED", "items": []}
        output = json.dumps(result, ensure_ascii=False, indent=2)
        if args.out:
            target = Path(args.out).expanduser().resolve()
            if target.exists():
                raise FileExistsError("Refusing to overwrite an existing evidence report")
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(output + "\n", encoding="utf-8")
            print(json.dumps({"saved": str(target), "decision": result["decision"],
                              "hospital_flood_status": "UNAVAILABLE"}, ensure_ascii=False))
        else:
            print(output)
        return 0
    except (OSError, ValueError, ParseError):
        print("Monitor failed closed. Check source/input configuration.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
