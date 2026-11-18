# Changelog

## 2.0.0

A ground-up upgrade from a diagramming tool to an engineering workbench.

### Fixed
- Zones can now be resized (they had no resizer).
- Connections can be edited: protocol, direction, ports, conduit, encryption, authentication, "routed via", media and redundancy. Previously every edge was fixed as "TCP/IP".
- Zone membership is real. It's derived from placement instead of a free-text field that didn't match the zones (the shipped templates disagreed with their own zone names).
- Import is validated and migrated instead of trusted. Bad edges and duplicate ids are reported rather than corrupting the canvas.
- Nodes can be connected from all four sides.
- The asset `status` field is now shown on nodes.

### Added
- Rule engine with 29 design checks, live findings on the canvas, a findings drawer and view, and a posture score.
- Firewall rule matrix with real ports, plus conduit and zone registers.
- Compromise simulation (logical, physical and combined modes), hop stepping, attack paths, and a "boundaries hold" option.
- What-if switch on every connection.
- Separate flow and link layers with visibility toggles.
- Protocol knowledge base (55 protocols), with IEC 61850 split into MMS, GOOSE, SV and R-GOOSE, and rail protocols (TRDP, MVB, WTB, EuroRadio).
- Catalogue grown from 48 to 80 components, including rail and energy/utilities categories and role flags.
- New templates: digital substation, water treatment, wind farm, train TCMS, rail signalling, and a flawed training network. The Purdue template was rebuilt.
- Undo/redo, copy/paste (works across projects), duplicate, select all, multi-select bulk edit.
- Multiple projects in the browser, with description, duplicate and delete.
- Moving a zone moves its contents (Alt to move it alone).
- Exports: whole-diagram PNG and SVG, Markdown design report, CSV for inventory, rules, conduits, zones and findings.
- Node CLI sharing the app's engine (`check --fail-on`, `matrix`, `report`, `export`, `template`).
- JSON Schema for the v2 file format, plus generated docs for rules, protocols and components.
- Vitest suite for the engine, Python CLI tests, and CI running tests, type-checks, build and template design gates.

### Changed
- Project schema v1 → v2. v1 files and the old browser autosave are upgraded automatically.
- Python CLI understands v2, derives zone membership and adds inventory CSV export.

### v2.0.1 reliability hardening (release candidate)

- Detect cross-zone bypasses across alternative physical paths, not only the shortest route.
- Preserve explicit conduit identities across the engineering registers and exports.
- Classify protocol security conservatively, requiring both encryption and authentication before reporting a flow as secured.
- Reject duplicate node/edge IDs and warn on invalid edge endpoints or ambiguous zone geometry during import.
- Check redundant attachments and minimum ring/PRP/LAG topologies instead of trusting labels alone.
- Use reproducible `npm ci` in CI once the generated npm lockfile is committed.

The diagram is not a substitute for verified network reachability, firewall configuration, or functional-safety assurance.
