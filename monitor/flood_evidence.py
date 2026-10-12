"""Evidence-only flood monitoring for Uthai Hospital; NEVER issues evacuation/safety verdicts.

No credentials, external packages or active services. External text is untrusted data.
"""
from __future__ import annotations
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from urllib.parse import urlsplit, urlunsplit
from xml.etree import ElementTree
import math
import re

BANGKOK = timezone(timedelta(hours=7))
AREA = ("พระนครศรีอยุธยา", "อยุธยา")
DISTRICT = "อุทัย"
WATER_WORDS = ("น้ำท่วม", "น้ำล้น", "ระดับน้ำ", "น้ำหลาก", "น้ำสูง", "น้ำป่า",
               "การระบายน้ำ", "เตือนภัยน้ำ", "น้ำเจ้าพระยา", "น้ำเพิ่ม")
# This is a content cue, not a verified geocode, flood depth or emergency status.
MAX_NEWS_AGE = timedelta(hours=48)


def _utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        raise ValueError("timezone-aware datetime required")
    return value.astimezone(timezone.utc)


def _valid_link(raw: str) -> str | None:
    try:
        p = urlsplit(raw.strip())
        if p.scheme != "https" or not p.hostname or p.username or p.password:
            return None
        if p.port not in (None, 443):
            return None
        return urlunsplit(("https", p.netloc, p.path or "/", "", ""))
    except (ValueError, AttributeError):
        return None


def read_rss(xml_data: bytes, *, max_items: int = 40) -> list[dict]:
    """Safely parse a bounded RSS feed; publication date is not observation time."""
    if len(xml_data) > 1_000_000:
        raise ValueError("RSS over size limit")
    if b"<!DOCTYPE" in xml_data.upper() or b"<!ENTITY" in xml_data.upper():
        raise ValueError("DTD/ENTITY not allowed")
    root = ElementTree.fromstring(xml_data)
    items = root.findall("./channel/item")
    entries: list[dict] = []
    for item in items[:max_items]:
        title = (item.findtext("title") or "").strip()[:300]
        link = _valid_link(item.findtext("link") or "")
        published = (item.findtext("pubDate") or "").strip()
        source = item.find("source")
        source_name = ((source.text or "") if source is not None else "").strip()[:100]
        if not title or not link:
            continue
        entries.append({"title": title, "url": link, "published_at": published,
                        "publisher_label": source_name, "feed_type": "AGGREGATOR_UNVERIFIED"})
    return entries


def relevant_news(entries: list[dict], *, now: datetime) -> list[dict]:
    """Locality match is textual and unverified; never imply flood is confirmed."""
    now = _utc(now)
    seen = set()
    candidates = []
    for entry in entries[:150]:
        if not isinstance(entry, dict):
            continue
        title = str(entry.get("title") or "")[:300].strip()
        url = _valid_link(str(entry.get("url") or ""))
        if not title or not url:
            continue
        area = any(x in title for x in AREA)
        district = DISTRICT in title
        water = any(w in title for w in WATER_WORDS)
        try:
            published = _utc(parsedate_to_datetime(str(entry.get("published_at") or "")))
        except (TypeError, ValueError, IndexError):
            continue
        if published > now + timedelta(minutes=5) or now - published > MAX_NEWS_AGE:
            continue
        if not (area and water):
            continue  # "อุทัย" alone could mean Uthai Thani; not enough
        dedup = re.sub(r"\W+", "", title).casefold()
        if dedup in seen:
            continue
        seen.add(dedup)
        candidates.append({
            "title": title, "url": url,
            "publisher_label": str(entry.get("publisher_label") or "")[:100],
            "published_at": published.isoformat(),
            "matched_area": "AYUTTHAYA",
            "matched_district_text": district,
            "type": "UNVERIFIED_NEWS_CUE",
            "review_required": True
        })
    return candidates


def discharge_outlook(payload: dict, *, lat: float, lon: float) -> dict:
    """Modelled river *discharge*, not local water level, inundation or flood risk."""
    if not (math.isfinite(lat) and math.isfinite(lon) and -90 <= lat <= 90 and -180 <= lon <= 180):
        raise ValueError("invalid coordinates")
    unavailable = {"status": "UNAVAILABLE", "type": "MODELLED",
                   "local_risk": None, "river_mapping_verified": False,
                   "unit": "m³/s", "series": [], "source": "Open-Meteo / GloFAS"}
    if not isinstance(payload, dict) or payload.get("error") is True:
        return unavailable
    days = payload.get("daily")
    if not isinstance(days, dict):
        return unavailable
    # Do not attach m³/s units to unlabelled or unexpectedly changed source data.
    if payload.get("daily_units", {}).get("river_discharge") != "m³/s":
        return unavailable
    times, vals = days.get("time"), days.get("river_discharge")
    if not isinstance(times, list) or not isinstance(vals, list) or len(times) != len(vals):
        return unavailable
    observations = []
    for date, value in zip(times[:10], vals[:10]):
        try:
            datetime.strptime(date, "%Y-%m-%d")
        except (TypeError, ValueError):
            continue
        if type(value) not in (int, float) or not math.isfinite(value) or value < 0:
            continue
        observations.append({"date": date, "river_discharge_m3s": value})
    if not observations:
        return unavailable
    return {**unavailable, "status": "AVAILABLE", "series": observations,
            "grid_lat": payload.get("latitude"), "grid_lon": payload.get("longitude"),
            "warning": "5-km GloFAS river grid unverified for local Uthai Hospital; forecast ≠ local flood status"}


def review_packet(*, news: list[dict], forecast: dict, collected_at: datetime) -> dict:
    """Never produces LOW/NORMAL/SAFE or an automatically issued local flood warning."""
    now = _utc(collected_at)
    cues = relevant_news(news, now=now)
    return {"area": "Uthai District, Phra Nakhon Si Ayutthaya",
            "collected_at": now.isoformat(),
            "hospital_flood_status": "UNAVAILABLE",
            "hospital_risk_level": None,
            "decision": "REVIEW_REQUIRED" if cues else "NOT_ASSESSED",
            "news_cues": cues[:20], "news_count": len(cues),
            "flood_model": forecast,
            "requires_verified_water_gauge_and_thresholds": True,
            "note": "No report is not proof of safety. AI/news cannot override official flood warnings."}
