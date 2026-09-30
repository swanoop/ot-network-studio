# OT Network Studio

A lightweight workspace for designing and experimenting with **OT, ICS and hybrid IT/OT network architectures**.

Built for homelabs and architecture sketches, OT Network Studio provides OT-aware components, zones, protocol metadata and asset information in a simple local-first interface.

## Features

- Drag-and-drop network design canvas
- OT / ICS component library
- IEC 62443-style zones
- Security Level Target (SL-T) metadata
- Purdue level assignment
- Industrial protocol tagging
- IP, VLAN, vendor, model, zone and criticality fields
- Asset inventory view
- Reusable architecture templates
- Local browser autosave
- JSON import and export
- PNG export
- Dark and light themes

## Component library

| Area | Examples |
| --- | --- |
| Control | PLC, PAC, RTU, DCS, HMI, SCADA, historian, engineering workstation |
| Safety | Safety PLC, SIS controller, SIS engineering station, ESD |
| Field | Sensors, actuators, VFDs, IEDs, protection relays, smart meters |
| Network | Industrial switches, industrial firewalls, routers, VPN gateways, data diodes |
| Security | OT IDS, jump hosts, remote access, SIEM, syslog, NAC, PKI |
| Edge / IIoT | Condition monitoring, IIoT gateways, protocol gateways |

## Protocols

Modbus TCP / RTU · OPC UA · DNP3 · IEC 60870-5-104 · IEC 61850 · PROFINET · EtherNet/IP · PROFIBUS · BACnet/IP · MQTT · HART · CAN / CAN FD · Serial · TCP/IP

## Templates

- Purdue-style OT network
- Electrical substation
- Remote process / RTU site

## Run locally

```bash
git clone https://github.com/swanoop/ot-network-studio.git
cd ot-network-studio
npm install
npm run dev
```

Production build:

```bash
npm run build
```

The production output is a static application and does not require a backend, database or cloud service.

## Optional CLI

```bash
python tools/otns_cli.py validate project.otns.json
python tools/otns_cli.py summary project.otns.json
python tools/otns_cli.py report project.otns.json --output report.md
```

## Scope

OT Network Studio is a design and documentation tool. It does not scan networks or communicate with industrial devices.
