# Verification report

Verified locally on **2 November 2026** using Windows, Node.js 24.21.0,
TypeScript 7.0.2, JDK 21, Chrome and Firebase demo emulators.

| Check | Result |
| --- | --- |
| Strict TypeScript check | Passed |
| Production Vite build | Passed |
| Domain, CSV and IndexedDB tests | 16 passed |
| Desktop browser workflows | 5 passed |
| Mobile Chrome emulation workflows | 5 passed |
| Firestore and Storage security-rule groups | 5 passed |
| Cloud signup / verification / evidence workflow | 1 passed |
| Java reference formula, ranking and status checks | Passed |
| Production dependency audit | 0 reported vulnerabilities |

Browser checks cover clustering controls, filtering, theme changes, report
creation, attachment persistence across reload, deletion, CSV preview and
import, duplicate IDs, export, every view, dialog keyboard behavior and
horizontal overflow. Screenshots were inspected on desktop and mobile.
The regular browser suite runs against the built static application. Cloud
browser tests use a separate Vite server configured only for demo emulators.

Security tests verify both allowed and denied requests: anonymous and
unverified access, cross-account reads/writes/deletes, schema bypasses,
forged verified status, future or invalid timestamps, legacy profile paths,
oversized or active-content uploads, private evidence and overwrite rejection.

Cloud browser verification creates a temporary emulator account, applies the
emulator verification code, submits a report with a PNG attachment, reloads,
signs back into the private workspace and retrieves the original evidence.
No real Firebase project was contacted or deployed.

## Dependency audit boundary

The locked production dependency graph has zero reported advisories. A
compatible `@grpc/grpc-js` override fixes the vulnerable transitive version
pulled by Firebase's Node implementation.

The full development-tool graph reports **16 moderate advisories**, all in
the Firebase CLI dependency chain (including glob/minimatch, OpenTelemetry
and UUID). No high or critical advisories were reported in the full graph.
These packages are used for development/emulators/deployment tooling and are
not included in the static browser application. The CLI is pinned. Replacing
its transitive dependencies with incompatible major versions or downgrading
the CLI to an old release solely to silence `npm audit` was not treated as a
verified fix. Reassess with a supported upstream CLI update. CI audits the
production graph at high severity.

## Practical limits

- Browser coverage is Chrome plus mobile emulation, not physical Android/iOS
  devices or Safari/Firefox.
- Cloud tests use emulators. Real-project authentication providers, domains,
  billing, CORS, rules deployment and hosting need project-specific setup.
- No licensed incident-level Bengaluru dataset was obtainable and verified
  during this upgrade. Bundled data is explicitly synthetic.
- This software has no predictive-accuracy evaluation or official risk-model
  calibration. Synthetic fixtures verify behavior, not road-safety accuracy.
- User-supplied media types are bounded by MIME/size rules, not by forensic
  file inspection or malware scanning. Public media sharing is not offered.

Reproduce the checks with the commands in README. Network-dependent tiles
and fonts may be unavailable in restricted environments; the application
shows a basemap notice and retains its analytical overlays and directory.
