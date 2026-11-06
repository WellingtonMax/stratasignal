# Security boundary and threat model

StrataSignal 0.3 is a **local, single-operator analytical prototype**. Its optional browser workbench runs a local HTTP server bound only to `127.0.0.1`. It has no hosted customer-data backend, customer login, shared storage or tenant boundary. It is not represented as a production SaaS or certified security product.

## Assets and trust boundaries

Customer purchase quantities, supplier links, inventory, unit costs and documentary manifests are sensitive commercial records. They remain on the operator's machine. Inputs are untrusted data even when supplied by a customer. The machine, installed Python packages, operator account and report template are trusted execution dependencies.

Only synthetic demonstrations belong in this repository. Client inputs and reports belong in ignored private directories with restricted access. The application does not encrypt files, manage accounts, establish lawful processing terms, verify data ownership or configure backup/retention. Output files are readable by the receiving user; share them only through the customer's approved process.

## Implemented controls

| Threat | Control | Practical limit |
|---|---|---|
| Script injection through document labels or input text | Inert report JSON encodes angle brackets; both UIs render labels with `textContent`; offline reports use script/style CSP hashes; workbench CSP permits its own assets/API only; no `unsafe-inline` or eval | A compromised local template/package or modified HTML can remove these protections |
| Exfiltration or SSRF through metadata | No remote model, URL resolver or automatic external data download; analysis performs no outbound network calls; report CSP blocks connections and local UI uses fixed relative API paths | Operator-initiated sharing and compromised OS/package behavior are outside this boundary |
| Ambiguous or malformed inputs | Duplicate JSON keys/IDs and unknown fields fail closed; finite bounded numbers, typed dates, referential checks and consistent per-material stock/demand | Input declarations can still be intentionally false |
| Resource exhaustion | 4 MiB JSON, bounded row counts; 512 MiB/5M-line streaming public CSV importer; max 1,000 logistic iterations; 64 MiB file digest | No sandbox for document parsing is claimed; documents are only read as byte streams |
| Path injection / overwriting another file | Input IDs never form paths; fixed report filenames; new output directory only; exclusive creation with no symlink following where supported | Explicit parent paths are trusted operator choices; full transactional rollback is not implemented |
| Other local users reading fresh outputs | POSIX directory mode 0700 and file mode 0600, subject to OS semantics | Windows ACLs, encrypted storage, authorized account access and later copies require environment configuration |
| Tampering with results | Input SHA-256 plus output hashes in a manifest | The manifest is not signed, externally anchored or append-only; it does not prove authenticity |
| Model leakage and misleading scores | Matured labels, chronological purge/holdout, order-time features, baseline gate, OOD/minimum-data abstention, explicit synthetic/experimental labels | Statistical calibration, stability, poisoning resistance and business utility are not established by these tests |
| External serialized-model code execution | No pickle/joblib loading or remote model artifact support | The optional installed ML libraries remain part of the software supply chain |

The app does not parse PDF/Office/XMP content, run OCR, follow document URLs, execute macros, validate digital signatures, check sanctions or certify mineral origins. A suspicious metadata pattern produces a review task, not an accusation.

## Local browser workbench

`serve` uses the Python standard-library HTTP server solely for a trusted-machine, single-operator tool. It is not a production server and must not be exposed through a reverse proxy, container port forwarding, tunnels or a shared host. There is no option to bind it to a public interface. The process stores one workspace in memory and writes no imported data automatically.

Each run generates a random access token. The printed browser URL carries it in `#access=...`, not an HTTP query string. JavaScript sends it only as a bearer header on fixed same-origin API routes. Neither browser storage nor server request logging is used. The fragment remains in the address for refresh and may remain in browser history; the printed URL, browser profile and local OS account are trusted. Other programs/users with access to this credential can act as the operator while the process runs. This is not multi-user authentication or protection against a compromised local machine.

The server validates the exact `Host` (`127.0.0.1:<port>`), rejects foreign/duplicate origins, requires the exact origin and token for mutations, and requires the token for API reads/exports. It emits no CORS grants. Duplicate framing headers and transfer encoding are rejected, JSON is mandatory, request bodies are limited to 16 MiB, and sockets time out after ten seconds. Static routes serve four fixed packaged assets, without directory listing or user-controlled paths. Responses are `no-store`, `nosniff`, frame-denied and use a restrictive CSP and no-referrer policy. Tests exercise these controls against an actual loopback HTTP server; an independent penetration test has not been performed.

Each selected UTF-8 input is limited to 4 MiB. Operational CSV mapping requires explicit column, decimal, date and allocation-unit choices; schema consistency and row limits still apply after conversion. Failed imports leave the previous valid workspace intact. Successful current imports clear the old baseline and report; scenarios carry the current input fingerprint to reject stale requests. Reset clears application references, not physical RAM, browser caches/history or downloads; secure erasure is not claimed.

The static online demo is built only from the hardcoded synthetic fixtures. It has no customer-data API and disables all private file imports. Its simulations run in browser memory; its ML numbers are precomputed demonstration results. Do not add customer records, secrets or local access tokens to this build. The deployment has no backend tenant boundary because it accepts no customer datasets.

Period comparison accepts two raw bundles under the same bounded schema, requires a matching declared portfolio ID and data kind, and rejects nonchronological cuts. This reduces accidental mixing; the ID is not authentication or a tenant access control. Both raw input hashes are retained. Specification-name changes suspend deltas. Signal disappearance never establishes verified remediation. The comparison uses the same local rendering and exclusive output controls and adds no network or runtime dependency.

## Deployment before a shared service

Before considering a hosted service, design authentication/MFA, per-tenant authorization enforced server-side, encrypted transport/storage, key/secret management, upload isolation and scanning, request quotas, audit events, scoped access, retention/deletion, recovery testing and incident response. Independently test those controls. None are made necessary merely to open the local synthetic demo; none are claimed to exist in this MVP.

Dependency versions used for verification are recorded in `requirements-ml.txt`. Pinned versions support reproducibility and do not themselves establish absence of vulnerabilities. The verification document records the dependency advisory checks performed on 6 November 2026. An external penetration test has not been conducted.

For responsible disclosure, use GitHub's private reporting feature if enabled; otherwise contact the repository owner through an existing trusted channel. Do not post customer data, exploitation payloads with secrets or private procurement reports in public issues.
