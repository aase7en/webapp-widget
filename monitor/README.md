# Experimental water evidence watch — Hospital Uthai (not a flood warning service)

**Status: candidate/dry-run prototype, no scheduled job, no production warning integration.** This does NOT replace official announcements or local water gauges.

The goal is an independent evidence collection lane while waiting for GISTDA FloodCheck permission.

## Sources / limits

1. **GloFAS via Open-Meteo Flood API:** modelled **river discharge (m³/s)** (must include matching units), ~5-km grid and daily forecast, not water height and **not local flood depth or local hospital risk**. The nearest computed river cell is **unverified**. Never infer LOW/SAFE from discharge alone.
2. **Explicit authorized news export:** Accept a locally supplied publisher/agency RSS/XML feed export or JSON metadata list (title, URL, RFC-2822 `published_at`, optional publisher label). **No automatic Google News scraping**: the Google News service terms restrict automated monitoring. Classic GDELT has an open data license but API rate limits (including HTTP 429 in testing); a separate approved adapter and low-rate policy will be required before production ingestion. The team must verify the source's license/permission before enabling collection. News reports are unverified even if the URL is authentic; missing reports **do not mean no flooding**.
3. **Optional Gemini / OpenRouter:** cloud model can identify a headline *claim* to review, **never** confirm that the event occurred. The model does not browse online: the independent RSS collector retrieves headlines and a local schema validator rejects hallucinated references, non-verbatim quotes, unknown IDs, and safety verdicts. Free-model tiers/limits change. No default model/key, no automatic AI calls.

The standalone runner uses only Python standard library and never sends patient/operational data to external AI. Only up to eight **public news headlines** per AI call. Do not submit patient names, staff details, unpublished hospital facts or credentials.

## Run one shot

From repository root. On macOS if the system Python SSL certificate bundle is not found,
configure an existing **trusted** CA bundle (e.g. `SSL_CERT_FILE=/etc/ssl/cert.pem`) instead
of disabling TLS verification. Default news retrieval is OFF. Only explicitly
import agency/publisher metadata you are licensed or authorized to use.


```bash
python3 -B -m monitor.flood_watch --lat 14.36147 --lon 100.64424
# Optional: after verifying publisher/API terms, supply a local authorized export:
python3 -B -m monitor.flood_watch --news-file /private/authorized-bulletins.rss
python3 -B -m unittest discover -s tests -p 'test_*.py'
```

For a **private**, new evidence file (never commit raw fetched data):

```bash
python3 -B -m monitor.flood_watch --out "/private/storage/uthai-water-evidence-YYYYMMDD-HHMM.json"
```

On the authorized hospital Windows machine, an approved path can be under:

`L:\My Drive\A-Wiki-Data\hospital-uthai\webapp-widget\water-watch\reports\`

**Check folder permissions and Google Drive sync before use.** The script rejects overwriting an existing report. Outputs are evidence, not a clinical or evacuation decision.

Optional only after checking the provider's current **free tier**, data-use policy and securely configuring an API key on the trusted host (no key on GitHub Pages, client JavaScript, URL parameters, Git or log output):

```bash
# Set GEMINI_API_KEY or OPENROUTER_API_KEY in a private environment.
python3 -B -m monitor.flood_watch --llm-provider gemini --llm-model gemini-3.5-flash-lite
python3 -B -m monitor.flood_watch --llm-provider openrouter --llm-model openrouter/free
```

Model names are examples and depend on actual account access. The provider may return errors, unsupported JSON or a rate-limit failure, all yielding `ai_review.status = UNAVAILABLE`. No automatic fallback to paid models and no paid Search grounding is enabled.

## Data contract / human review

- `hospital_flood_status: "UNAVAILABLE"` and `hospital_risk_level: null` are **fixed** in this early prototype.
- `decision: "REVIEW_REQUIRED"` means **look at this news link**; it is not a flood warning level.
- `NOT_ASSESSED` means no usable recent headlines **were extracted**; it is not proof of safety.
- Imported news is scoped by matching headline text for Ayutthaya and water terms; `อุทัย` alone is geographically ambiguous. Deduplication is an aid, not verification.
- Store published time, fetched time and source link separately. Never present the published timestamp as observed water time.
- AI extracts only `FLOOD_CLAIM`, `WATER_LEVEL_CLAIM`, `PRECAUTION_CLAIM`, `OTHER` with *verbatim headline excerpt* and a matching source URL. Anything else is dropped. Cross-source corroboration must not assume multiple republications are independent.
- News and AI cannot downgrade or override official flood alerts.

## Before actual hospital alerts / unattended scheduling

- Confirm local river/gauge identity and official source licensing: HII/ThaiWater, RID, relevant provincial disaster-prevention agency, municipal announcements.
- Obtain actual water-level thresholds for the hospital and nearby approach roads; validate station proximity, water datum, delay, direction of flow and source timestamp.
- Add independent agency alert ingestion, deduplication by original bulletin ID, provenance and expiry.
- Add controlled caching, bounded cadence, source-health alerts, operator escalation, and **human approval** for any public alert.
- Keep local flood risk UNAVAILABLE if there is no validated gauge or an active official warning; never display green from a lack of news.
- Review Cloud LLM terms/security before enabling keys; Raspberry Pi can run the collector at the edge, but using Gemini/OpenRouter is **cloud inference**.
- Test outages, stale timestamps, mislocated river-grid selection, misleading headlines, prompt injection, false positives/negatives, and emergency-drill scenarios.
- Do not create time-based automation or publish to the LED merely because the collector passes unit tests.

References: <https://www.google.com/intl/en_us/terms_google_news.html>, <https://open-meteo.com/en/docs/flood-api>, <https://open-meteo.com/en/terms>, <https://openrouter.ai/pricing/>, <https://ai.google.dev/gemini-api/docs/rate-limits>.
