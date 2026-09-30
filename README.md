# OT Network Studio

**OT Network Studio** is a personal project for designing, documenting and experimenting with operational technology (OT), industrial control system (ICS) and hybrid IT/OT network architectures.

I originally wanted a flexible way to sketch the OT cybersecurity networks I was building and studying as part of my own homelab work. General-purpose diagramming tools can draw boxes and lines, but they do not naturally understand things such as PLCs, RTUs, safety systems, industrial firewalls, Purdue levels, IEC 62443-style zones, OT protocols or the engineering context around those assets.

So I built the tool I wanted to use myself.

The aim is not to reproduce a commercial network-design suite. OT Network Studio is intended to be a lightweight, heavily customisable workbench where an OT practitioner, student or homelab enthusiast can quickly model an architecture, attach useful engineering metadata, explore segmentation ideas and keep a portable record of a design.

> **Personal project:** OT Network Studio is independently developed as a personal homelab and learning project. It is not affiliated with, endorsed by, or developed for any employer, client, product vendor or standards organisation.

## What it does

The current application provides a drag-and-drop canvas for building OT and industrial network diagrams with an asset catalogue that understands common OT/ICS concepts rather than treating every device as a generic network node.

You can:

- build OT, ICS and hybrid IT/OT network diagrams
- create IEC 62443-style zones and record Security Level Targets (SL-T)
- assign Purdue levels to assets
- model common control and field equipment
- tag assets and connections with industrial protocols
- record IP addresses, VLANs, vendors, models, zones and criticality
- switch from the architecture canvas to an asset inventory
- start from reusable OT architecture templates
- save projects locally in the browser
- export and import portable project JSON
- export diagrams as PNG images
- use the application in dark or light mode
- analyse saved project files with the optional Python command-line tool

## OT / ICS component library

The built-in library includes common **control and operations** assets such as PLCs, PACs, RTUs, DCS controllers, HMIs, SCADA servers, process historians, engineering workstations, OPC UA servers and industrial protocol gateways.

It also includes **safety and SIS** components such as safety PLCs, SIS controllers, SIS engineering stations and ESD components; **field/process assets** such as sensors, actuators, VFDs, IEDs, protection relays, smart meters, condition-monitoring devices and IIoT gateways; and **network/security infrastructure** such as industrial switches, industrial firewalls, data diodes, VPN gateways, serial gateways, OT IDS sensors, jump hosts, remote-access systems, SIEM, syslog, NAC and PKI.

General compute and enterprise systems are included as well, allowing IT/OT boundaries and industrial DMZ architectures to be represented in the same project.

## Industrial protocol metadata

Assets and connections can be associated with protocols including Modbus TCP/RTU, OPC UA, DNP3, IEC 60870-5-104, IEC 61850, PROFINET, EtherNet/IP, PROFIBUS, BACnet/IP, MQTT, HART, CAN/CAN FD, serial communications and standard TCP/IP.

Protocol tags are descriptive design metadata. OT Network Studio does **not** generate or transmit industrial protocol traffic.

## Architecture templates

Starter templates are included for:

- a generic Purdue-style OT site
- an electrical substation / IEC 61850-style architecture
- a remote process site using SCADA, RTU and telemetry components

Templates are starting points rather than prescribed reference architectures. Everything can be moved, renamed and customised.

## Project philosophy

**OT-first, not vendor-first.**  
The core model uses generic industrial asset types so diagrams are useful across rail, energy, manufacturing, utilities, oil and gas, building automation and other cyber-physical environments.

**Customisable rather than prescriptive.**  
The designer should help describe the architecture you are investigating rather than force every network into one model.

**Local-first.**  
Projects are stored locally and can be exported as JSON. The application does not require a backend account, database or hosted API.

**Safe by design.**  
This is a modelling and documentation tool. It does not discover live devices, scan networks, alter PLCs or communicate with industrial equipment.

**Useful outside the UI.**  
The project format is intentionally straightforward so diagrams can also be inspected, validated or transformed using scripts and future tooling.

## Technology

The project uses different languages only where they have a useful role:

- **TypeScript / React** — interactive browser application
- **CSS** — application design system
- **Python** — optional offline CLI for validating, summarising and reporting on exported project files
- **HTML** — static application entry point

The Python component is not required to run the web application. I have deliberately avoided adding Java or another language purely to increase the language count on GitHub; additional languages should be introduced only where they provide a genuine architectural benefit.

## Running the web application

Requirements for development:

- Node.js 20+ recommended
- npm

```bash
git clone https://github.com/swanoop/ot-network-studio.git
cd ot-network-studio
npm install
npm run dev
```

For a production build:

```bash
npm run build
```

The resulting `dist/` directory is a static application. It does not need an application server, database, Python service or external API. It can be hosted by any ordinary static web server.

## Optional Python CLI

The CLI uses only the Python standard library.

Validate an exported project:

```bash
python tools/otns_cli.py validate my-architecture.otns.json
```

Print a project summary:

```bash
python tools/otns_cli.py summary my-architecture.otns.json
```

Generate a Markdown inventory report:

```bash
python tools/otns_cli.py report my-architecture.otns.json --output architecture-report.md
```

The browser application does not call the Python CLI and has no dependency on it.

## Standalone and dependency model

OT Network Studio is designed to be **self-contained at runtime**.

The browser application has no required backend service, database, authentication provider, cloud platform, third-party API, telemetry service or industrial-device connection.

The source project does use open-source npm packages during development and compilation. Those packages are bundled into the production build. In other words, Node.js is needed to **build** the application, not to operate a deployed static build.

The optional Python CLI is completely separate and currently uses no third-party Python packages.

## Current scope and future direction

OT Network Studio is primarily an architecture and documentation tool. It does not currently attempt to determine whether a design is compliant, secure or safe.

Potential extensions include richer conduit modelling, trust-boundary and data-flow annotations, connection-rule validation, zone-to-zone communication analysis, custom component packs, asset import/export, SBOM references, cyber-risk and threat annotations, remote-access path analysis, project comparison/diff, architecture linting, mapping design elements to IEC 62443 concepts, richer engineering reports and offline/PWA packaging.

## Engineering and safety note

A diagram produced by OT Network Studio is not a security assessment, safety case or standards-compliance determination.

Industrial and cyber-physical systems can have safety, operational and availability consequences that are not captured by a drawing. Production architectures should be reviewed using the organisation's engineering process, threat model, risk assessment methodology, applicable standards and system-specific safety constraints.

## Status

The project is under active personal development. Interfaces, project-file fields and component definitions may change while the model matures.

Feedback, ideas and technically useful contributions are welcome.
