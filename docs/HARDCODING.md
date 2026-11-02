# Fixed values and calculated results

Tracify is a rule-based geospatial analytics application. Its algorithms
calculate results from observations, while its demonstration data and model
assumptions use fixed values.

| Area | Fixed values | What changes with your records or controls |
| --- | --- | --- |
| Demo data | 18 approximate Bengaluru junction coordinates, a 31 October 2026 snapshot, deterministic generation rules | Reports and imported observations are stored separately as real user inputs; the demo is not a live feed |
| Clustering | Default radius 300 m and minimum count 3 | Both controls are adjustable; DBSCAN recomputes membership, noise and cluster count from filtered coordinates |
| Risk score | Frequency/severity/recency weights 35/45/20; casualty weights 5/2; 90-day normalization; frequency baseline 35; severity denominator 2.5; decay rate 0.082; thresholds 80/60 | Record counts, casualty totals, actual timestamp recency, components, scores and ranking are calculated |
| Temporal analysis | IST timezone and two-hour buckets | Cell counts and weather distributions are calculated from the selected records |
| Stopping-distance scenario | Gravity 9.81 m/s²; illustrative friction 0.75/0.42/0.28 | Speed and reaction time are adjustable and stopping distances are calculated |
| Map and location presets | Bengaluru fallback center, junction presets and OpenStreetMap tile URL | Imported coordinates can be anywhere; map bounds, overlays, selected clusters and opt-in device location change dynamically |
| Capacity and upload rules | 2,000 observations per workspace, 400 per cloud import, 5 MiB per attachment, category allowlists | The app validates actual submissions and uploaded files against these limits |
| Firebase | Local emulator host/ports and isolated demo project ID for tests | Real-project configuration comes from environment variables; cloud records and evidence belong to the signed-in account |
| Java reference | A separate, hard-coded synthetic aggregate fixture for 18 junctions | Scores, status and rank are recomputed from those aggregates; it does not ingest the web app's reports |

The scoring parameters are documented design choices, not weights learned
from a dataset or validated by a traffic authority. Synthetic observations
must not be presented as actual Bengaluru accident statistics. Identical
inputs and parameters should produce identical clustering results; this is
determinism, not a predefined answer.

Default city labels and timezone reflect the Bengaluru demonstration. The
CSV importer accepts valid worldwide latitude and longitude, but this does
not automatically adapt city branding, timezone or scoring calibration to
another region.

## Relevant source

- `src/data/sampleData.ts`: demonstration generator and location presets.
- `src/lib/analytics.ts`: DBSCAN, scoring, time aggregation and physics.
- `src/App.tsx`: default controls, city labels and scenario assumptions.
- `src/lib/validation.ts`, `firestore.rules`, `storage.rules`: validation limits.
- `src/firebase/config.ts`: environment-based configuration and emulator endpoints.
- `java/src/main/java/com/tracify/service/BangaloreTelemetryService.java`: Java fixture.

## Rename compatibility

The product, package, Java namespace, exported filenames, documentation and
test-project branding use Tracify. The browser database identifier
`accidentsense-v2` and theme key `accidentsense_theme` intentionally retain
their original names so existing local reports, attachments and preferences
remain available. Existing records retain their original source attribution;
new demo installations use the Tracify attribution. No data migration or
database deletion is performed by the rename.
