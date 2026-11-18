# OT Network Studio

A local-first engineering workbench for **OT, ICS and hybrid IT/OT network architectures**. You can draw a design, check it against IEC 62443-style rules, generate the zone and conduit registers and a firewall rule matrix, and simulate what an attacker could reach from any compromised asset.

Everything runs in the browser. There is no backend, account or telemetry.

## What it does

| Area | Capability |
| --- | --- |
| **Design** | Drag-and-drop canvas, 80 OT/IT/rail/energy components, resizable and nestable zones (zone, DMZ, safety, external). Zone membership comes from where assets sit. Moving a zone moves its contents (hold Alt to move it alone). |
| **Two layers** | **Flows**: logical communications with protocol, direction, ports, conduit, encryption and authentication. **Links**: physical media and redundancy (PRP, HSR, MRP, RSTP, DLR, LAG). Either layer can be shown or hidden. |
| **Design checks** | 29 rules across segmentation, safety, remote access, protocols, addressing, monitoring and resilience, with severity, explanation, fix and standard references ([docs/RULES.md](docs/RULES.md)). Findings appear live on the canvas, and there's an indicative posture score. |
| **Deliverables** | Firewall/ACL rule matrix with real ports, conduit register, zone register, asset inventory, findings list, and a full Markdown design report. |
| **Compromise simulation** | Pick one or more assets and trace reachability hop by hop over flows (respecting direction and data diodes), links, or both. Toggle "boundaries hold", step through hops and click any reached asset to see its attack path. |
| **What-if** | Switch any connection off and watch findings, score, rule matrix and attack paths update without deleting it. |
| **Protocol knowledge base** | 55 protocols with default ports, routability and security properties, from Modbus, DNP3 and IEC 104 through IEC 61850 GOOSE/SV/MMS, PROFINET, OPC UA, TRDP, MVB/WTB and EuroRadio to management protocols ([docs/PROTOCOLS.md](docs/PROTOCOLS.md)). |
| **Reference architectures** | Purdue site, IEC 61850 digital substation, water treatment and telemetry, wind farm, train TCMS (IEC 61375 / CLC/TS 50701), rail signalling (ETCS L2 + interlocking), and a deliberately insecure training network. |
| **Productivity** | Undo/redo, copy/paste across projects, duplicate, multi-select with bulk edit, multiple projects, keyboard shortcuts (`?`), dark/light themes. |
| **Import/export** | JSON (schema v2, with automatic v1 upgrade), PNG/SVG of the whole design, CSV for every register, and a Markdown report. |

## Run locally

```bash
git clone https://github.com/swanoop/ot-network-studio.git
cd ot-network-studio
npm install
npm run dev
```

| Command | Purpose |
| --- | --- |
| `npm test` | Engine, rule, simulation, migration and template tests (Vitest) |
| `npm run typecheck` | Type-check the app and the CLI |
| `npm run build` | Static production build in `dist/` |
| `npm run test:py` | Python CLI tests |

## Command line

The Node CLI uses **the same engine as the app**, so results match exactly.

```bash
npm run otns -- template list                          # reference architectures
npm run otns -- template rail-tcms -o rail.otns.json   # export one as a project file
npm run otns -- check rail.otns.json --fail-on high    # exit 1 if any high/critical finding
npm run otns -- check rail.otns.json --json            # machine-readable findings
npm run otns -- matrix rail.otns.json --cross-zone -o rules.csv
npm run otns -- report rail.otns.json -o report.md
npm run otns -- export rail.otns.json --what conduits -o conduits.csv
```

`check --fail-on` makes the tool usable as a design gate in CI. Keep architecture files in a repo and fail the pipeline when someone introduces a critical design flaw.

A dependency-free Python CLI is kept for quick validation, summaries and inventory/report exports where Node isn't available:

```bash
python tools/otns_cli.py validate project.otns.json
python tools/otns_cli.py summary  project.otns.json
python tools/otns_cli.py report   project.otns.json -o report.md
python tools/otns_cli.py inventory project.otns.json -o inventory.csv
```

## Modelling conventions

- **Zones.** An asset belongs to the smallest zone that contains its centre. A zone fully inside another zone is nested.
- **Flows.** A flow points from the initiator. `bidirectional` means both sides initiate. A cross-zone flow counts as passing a conduit if it ends on a boundary device (firewall, data diode, VPN gateway), lists one under *Routed via*, or its endpoints are joined by physical links through one.
- **Protection.** Mark a flow *encrypted* (TLS, IPsec, VPN) or *authenticated* (DNP3-SA, IEC 62351, a safety layer) to show that an otherwise insecure protocol is protected.
- **Roles.** Catalogue roles (boundary, unidirectional, safety, remote entry, intermediary, monitoring, infrastructure) drive the checks ([docs/COMPONENTS.md](docs/COMPONENTS.md)).
- **File format.** See the JSON Schema in [schema/otns-project.schema.json](schema/otns-project.schema.json).

## Architecture

```
src/
  types.ts            data model (schema v2)
  data/               component catalogue, protocol knowledge base, templates
  engine/             pure TypeScript, no React: shared by the app, the tests and the CLI
    model.ts          zone membership, nesting, cross-zone classification, IPv4 helpers
    rules.ts          rule catalogue and engine, posture score
    matrix.ts         firewall rule matrix, conduit and zone registers
    simulate.ts       compromise / reachability simulation
    exporters.ts      CSV and Markdown
    migrate.ts        validation and v1 → v2 migration
  state/              undo/redo, multi-project storage, design context
  components/         canvas nodes, inspector, panels, dialogs, table views
tools/
  otns.ts             Node CLI on the shared engine
  otns_cli.py         stdlib-only Python CLI
```

## Scope

OT Network Studio is a design, documentation and training tool. It doesn't scan networks or talk to industrial devices. Findings are automated checks against modelled metadata. They support an IEC 62443-3-2 risk assessment, a safety case or a compliance review, but don't replace them.
