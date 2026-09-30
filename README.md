# OT Network Studio

OT Network Studio is a lightweight tool for designing and experimenting with OT, ICS and hybrid IT/OT network architectures.

It is intended for homelab use, architecture sketches and exploring different OT network layouts without needing to connect to a live industrial environment.

## Features

- Drag-and-drop network design canvas
- OT and ICS asset library
- PLC, RTU, HMI, SCADA, historian and engineering workstation components
- Safety PLC / SIS and field-device components
- Industrial switches, firewalls, jump hosts, IDS and remote-access components
- Purdue level assignment
- IEC 62443-style zones
- Security Level Target (SL-T) metadata
- Industrial protocol tagging
- IP, VLAN, vendor, model, zone and criticality fields
- Asset inventory view
- Reusable architecture templates
- Local browser autosave
- JSON import and export
- PNG export
- Dark and light themes

## Included protocols

The current protocol list includes:

- Modbus TCP / RTU
- OPC UA
- DNP3
- IEC 60870-5-104
- IEC 61850
- PROFINET
- EtherNet/IP
- PROFIBUS
- BACnet/IP
- MQTT
- HART
- CAN / CAN FD
- Serial
- TCP/IP

## Templates

Starter templates are included for:

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

## Optional CLI

A small Python utility is included for working with exported project files.

```bash
python tools/otns_cli.py validate project.otns.json
python tools/otns_cli.py summary project.otns.json
python tools/otns_cli.py report project.otns.json --output report.md
```

## Notes

OT Network Studio is a design and documentation tool. It does not scan networks, connect to industrial devices or validate whether a production architecture is secure, safe or compliant.
