# Security boundary and threat model

StrataSignal 0.1 is a **local, single-operator analytical prototype**. It has no web server, customer login, shared storage or tenant boundary. It is not represented as a production SaaS or certified security product.

## Assets and trust boundaries

Customer purchase quantities, supplier links, inventory, unit costs and documentary manifests are sensitive commercial records. They remain on the operator's machine. Inputs are untrusted data even when supplied by a customer. The machine, installed Python packages, operator account and report template are trusted execution dependencies.

Only synthetic demonstrations belong in this repository. Client inputs and reports belong in ignored private directories with restricted access. The application does not encrypt files, manage accounts, establish lawful processing terms, verify data ownership or configure backup/retention. Output files are readable by the receiving user; share them only through the customer's approved process.

## Implemented controls

| Threat | Control | Practical limit |
|---|---|---|
| Script injection through document labels or input text | Inert JSON encodes angle brackets; UI renders with `textContent`; script/style CSP hashes; no `unsafe-inline`, eval or remote resources | A compromised local template/package or modified HTML can remove these protections |
| Exfiltration or SSRF through metadata | No network client, arbitrary URL field, remote model or automatic download in the shipped application; report CSP blocks connections | Operator-initiated sharing and compromised OS/package behavior are outside this boundary |
| Ambiguous or malformed inputs | Duplicate JSON keys/IDs and unknown fields fail closed; finite bounded numbers, typed dates, referential checks and consistent per-material stock/demand | Input declarations can still be intentionally false |
| Resource exhaustion | 4 MiB JSON, bounded row counts; 512 MiB/5M-line streaming public CSV importer; max 1,000 logistic iterations; 64 MiB file digest | No sandbox for document parsing is claimed; documents are only read as byte streams |
| Path injection / overwriting another file | Input IDs never form paths; fixed report filenames; new output directory only; exclusive creation with no symlink following where supported | Explicit parent paths are trusted operator choices; full transactional rollback is not implemented |
| Other local users reading fresh outputs | POSIX directory mode 0700 and file mode 0600, subject to OS semantics | Windows ACLs, encrypted storage, authorized account access and later copies require environment configuration |
| Tampering with results | Input SHA-256 plus output hashes in a manifest | The manifest is not signed, externally anchored or append-only; it does not prove authenticity |
| Model leakage and misleading scores | Matured labels, chronological purge/holdout, order-time features, baseline gate, OOD/minimum-data abstention, explicit synthetic/experimental labels | Statistical calibration, stability, poisoning resistance and business utility are not established by these tests |
| External serialized-model code execution | No pickle/joblib loading or remote model artifact support | The optional installed ML libraries remain part of the software supply chain |

The app does not parse PDF/Office/XMP content, run OCR, follow document URLs, execute macros, validate digital signatures, check sanctions or certify mineral origins. A suspicious metadata pattern produces a review task, not an accusation.

## Deployment before a shared service

Before considering a hosted service, design authentication/MFA, per-tenant authorization enforced server-side, encrypted transport/storage, key/secret management, upload isolation and scanning, request quotas, audit events, scoped access, retention/deletion, recovery testing and incident response. Independently test those controls. None are made necessary merely to open the local synthetic demo; none are claimed to exist in this MVP.

Dependency versions used for verification are recorded in `requirements-ml.txt`. Pinned versions support reproducibility and do not themselves establish absence of vulnerabilities. The verification document records the dependency advisory checks performed on 6 November 2026. An external penetration test has not been conducted.

For responsible disclosure, use GitHub's private reporting feature if enabled; otherwise contact the repository owner through an existing trusted channel. Do not post customer data, exploitation payloads with secrets or private procurement reports in public issues.
