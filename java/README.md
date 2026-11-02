# Java reference CLI

This directory is a standalone Java 17+ example of Tracify's illustrative
risk-index formula for a **fixed 90-day synthetic aggregate snapshot**. It is
not a web backend and is not connected to the React application. All incident
counts, casualty counts, time windows and infrastructure descriptions here
are demonstration fixtures, not official records.

The TypeScript application discovers clusters from individual observations;
this CLI simply scores 18 predeclared junction aggregates. Each aggregate's
score, status and rank are recomputed before printing. The critical-junction
section uses those same values and prints up to three results.

## Compile and verify

From the project root, with Node and a JDK on PATH:

```sh
npm run test:java
java -cp java/target/classes com.tracify.Main
```

The check compiles main and test sources and verifies an independent formula
fixture (66.0), zero incidents, sorted ranks and critical-status consistency.
No third-party Java dependencies are required.

Alternatively, with Maven installed:

```sh
cd java
mvn package
java -jar target/tracify-bengaluru-1.0.0.jar
```

The explicit assert-style reference test is run by `npm run test:java`; Maven
packages the CLI but does not run this custom main-method check automatically.

The formula matches the TypeScript calculator with `selected_days = 90`.
These are design weights, not official BTP/IRC calibration, and the score is
not a crash probability. Java's sample recency is fixed at its snapshot and
does not pretend to be a live feed.
