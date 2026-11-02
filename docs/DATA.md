# Data provenance

The default data is **synthetic**. It is generated deterministically by
`src/data/sampleData.ts`, with a fixed snapshot at 2026-10-31 23:59:59 IST.
Approximate coordinates describe 18 named Bengaluru junctions. Individual
locations are perturbed slightly to exercise the clustering algorithm.
Timestamps, incidents, fatalities, injuries, vehicles, weather and road
conditions are invented. There are no real scene photographs or verified
police records bundled with the app.

The generator produces 175 observations: 172 near junctions and three isolated
observations. With a 300 m radius and minimum count of three, there are 16
clusters and seven noise observations before filtering. These are software
fixtures, not road-safety findings. Generated incident values can be reused
under CC0-1.0; third-party data and basemaps retain their own terms.

## External data

No official accident-data feed is connected. Research during this upgrade
located the [OpenCity Bengaluru road-crashes catalogue](https://data.opencity.in/dataset/bengaluru-road-crashes-data),
but access to the resource returned HTTP 403, so its data, exact schema and
licensing could not be validated or incorporated. Do not imply that the demo
represents that dataset.

For a real analysis, obtain a dataset with incident-level latitude, longitude,
timestamps, casualty fields and a license permitting the intended use. Keep a
copy of its source documentation, date accessed, original field definitions,
coverage period, and any coordinate transformations. Convert records into the
CSV schema in README. Do not geocode city-level aggregates into invented
incident locations.

## Provenance categories

| Category | Meaning | Accuracy status |
| --- | --- | --- |
| synthetic | Generated demonstration observations | Invented |
| imported | Records supplied through CSV with source attribution | Unverified |
| community | User-entered observations and optional media | Unverified |

There is no in-app moderation authority or client-settable verified status.
Cloud rules enforce `verification: unverified` on every creation. Treat imported
source names and license labels as user-provided metadata. Before publishing
an analysis, independently verify both the observations and reuse rights.

## Known biases

- Reporting intensity is not traffic exposure: busy or better monitored roads
  can produce more records without a higher per-trip crash probability.
- A source may report the same incident under different IDs. The importer
  prevents duplicate IDs, but cannot resolve event identity across sources.
- Missing locations, rounding, approximate junction centers, timezone errors
  and coverage gaps can change clusters substantially.
- Filtering by severity, provenance or text changes the population analyzed.
- Short observation windows can exaggerate the 90-day equivalent frequency.
- Weather counts are descriptive; no causal or exposure-adjusted conclusion is
  justified.
- Sample data supports algorithm and application tests. It cannot establish
  accuracy of a model for real-world safety decisions.

## Maps

Leaflet displays OpenStreetMap tiles with required attribution. The incident
overlays work when tiles fail, but the basemap requires network access.
Standard OpenStreetMap tiles are provided under a
[usage policy](https://operations.osmfoundation.org/policies/tiles/). They are
appropriate for modest interactive use, not bulk downloading, offline tile
prefetching or an unlimited high-traffic deployment. Use a suitable tile
provider for a larger public service.
