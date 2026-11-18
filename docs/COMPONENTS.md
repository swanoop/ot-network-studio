# Component catalogue

Generated from `src/data/catalog.ts`. Roles drive the analysis engine.

| Component | Category | Default Purdue | Roles |
|---|---|---|---|
| Router (`router`) | Network | 4 | infrastructure |
| Managed Switch (`switch`) | Network | 4 | infrastructure |
| Layer-3 Switch (`l3-switch`) | Network | 3 | infrastructure |
| Firewall (`firewall`) | Network | 4 | boundary, infrastructure |
| Industrial Firewall (`industrial-firewall`) | Network | 3 | boundary, infrastructure |
| Data Diode (`data-diode`) | Network | 3 | boundary, infrastructure, unidirectional |
| VPN Gateway (`vpn-gateway`) | Network | 4 | boundary, infrastructure, remoteEntry |
| Wireless AP (`wireless-ap`) | Network | 3 | infrastructure |
| Cellular Router (`cellular-router`) | Network | 3 | infrastructure, remoteEntry |
| Industrial Switch (`industrial-switch`) | Network | 2 | infrastructure |
| PRP/HSR RedBox (`redbox`) | Network | 1 | infrastructure |
| Serial Gateway (`serial-gateway`) | Network | 1 | infrastructure |
| PLC (`plc`) | OT Control | 1 | — |
| PAC (`pac`) | OT Control | 1 | — |
| RTU (`rtu`) | OT Control | 1 | — |
| DCS Controller (`dcs-controller`) | OT Control | 1 | — |
| HMI (`hmi`) | OT Control | 2 | — |
| SCADA Server (`scada`) | OT Control | 3 | — |
| Process Historian (`historian`) | OT Control | 3 | — |
| Engineering Workstation (`engineering-ws`) | OT Control | 3 | — |
| OPC UA Server (`opcua-server`) | OT Control | 3 | — |
| Protocol Gateway (`protocol-gateway`) | OT Control | 2 | — |
| Time Server (GNSS) (`time-server`) | OT Control | 2 | — |
| Safety PLC (`safety-plc`) | Safety / SIS | 1 | safety |
| SIS Controller (`sis-controller`) | Safety / SIS | 1 | safety |
| SIS Engineering Station (`sis-engineering`) | Safety / SIS | 2 | safety |
| ESD Panel (`esd-panel`) | Safety / SIS | 1 | safety |
| Sensor / Transmitter (`sensor`) | Field / Process | 0 | — |
| Actuator / Valve (`actuator`) | Field / Process | 0 | — |
| VFD / Drive (`vfd`) | Field / Process | 1 | — |
| Remote I/O (`remote-io`) | Field / Process | 1 | — |
| IED (`ied`) | Field / Process | 1 | — |
| Merging Unit (`merging-unit`) | Field / Process | 0 | — |
| Protection Relay (`protection-relay`) | Field / Process | 1 | — |
| Smart Meter (`smart-meter`) | Field / Process | 0 | — |
| Condition Monitor (`condition-monitor`) | Field / Process | 1 | — |
| IIoT Gateway (`iiot-gateway`) | Field / Process | 2 | — |
| TCMS CCU (`tcms-ccu`) | Rail | 2 | — |
| ETB Node (ETBN) (`etbn`) | Rail | 2 | infrastructure |
| ECN Switch (`ecn-switch`) | Rail | 2 | infrastructure |
| MVB Gateway (`mvb-gateway`) | Rail | 1 | — |
| Train-to-Ground Gateway (`train-gateway`) | Rail | 3 | boundary, infrastructure, remoteEntry |
| Traction Control Unit (`traction-control`) | Rail | 1 | — |
| Brake Control Unit (`brake-control`) | Rail | 1 | safety |
| Door Controller (`door-controller`) | Rail | 1 | — |
| ETCS Onboard (EVC) (`etcs-evc`) | Rail | 1 | safety |
| Passenger Information (`pis`) | Rail | 3 | — |
| CCTV / NVR (`cctv-nvr`) | Rail | 3 | — |
| Interlocking (`interlocking`) | Rail | 1 | safety |
| Object Controller (`object-controller`) | Rail | 0 | safety |
| Axle Counter Evaluator (`axle-counter`) | Rail | 0 | safety |
| Radio Block Centre (`rbc`) | Rail | 1 | safety |
| Traffic Management (`traffic-management`) | Rail | 3 | — |
| Maintainer Terminal (`maintainer-terminal`) | Rail | 2 | — |
| CBTC Zone Controller (`cbtc-zc`) | Rail | 1 | safety |
| Turbine Controller (`turbine-controller`) | Energy / Utilities | 1 | — |
| Power Plant Controller (`park-controller`) | Energy / Utilities | 2 | — |
| BESS Controller (`bess-controller`) | Energy / Utilities | 1 | — |
| Telemetry Outstation (`telemetry-outstation`) | Energy / Utilities | 1 | — |
| Pump Controller (`pump-controller`) | Energy / Utilities | 1 | — |
| Chemical Dosing Controller (`dosing-controller`) | Energy / Utilities | 1 | safety |
| OT IDS Sensor (`ids-sensor`) | Security | 3 | monitoring |
| Jump Host (`jump-host`) | Security | 3 | intermediary |
| Remote Access Server (`remote-access`) | Security | 3 | remoteEntry, intermediary |
| SIEM (`siem`) | Security | 4 | — |
| Syslog Server (`syslog`) | Security | 3 | — |
| Vulnerability Scanner (`vuln-scanner`) | Security | 4 | — |
| NAC Server (`nac`) | Security | 4 | — |
| PKI / CA (`pki`) | Security | 4 | — |
| Patch / AV Server (`patch-server`) | Security | 3 | — |
| Server (`server`) | Compute | 3 | — |
| Workstation (`workstation`) | Compute | 3 | — |
| Hypervisor (`hypervisor`) | Compute | 3 | — |
| Backup Appliance (`backup`) | Compute | 3 | — |
| AD / DNS (`ad-dns`) | Enterprise | 4 | — |
| DMZ Application (`dmz-app`) | Enterprise | 3 | intermediary |
| Cloud Service (`cloud-service`) | Enterprise | 5 | remoteEntry |
| Vendor / Third Party (`vendor-remote`) | Enterprise | 5 | remoteEntry |
| Enterprise Client (`enterprise-client`) | Enterprise | 4 | — |
| Internet / WAN (`internet`) | Enterprise | 5 | remoteEntry |
