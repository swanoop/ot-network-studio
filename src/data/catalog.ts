import type { AssetDefinition, AssetRoles } from "../types";

export { PROTOCOLS } from "./protocols";

const BOUNDARY: AssetRoles = { boundary: true, infrastructure: true };
const INFRA: AssetRoles = { infrastructure: true };
const SAFETY: AssetRoles = { safety: true };

export const ASSET_CATALOG: AssetDefinition[] = [
  // Network
  { type: "router", label: "Router", short: "RTR", category: "Network", description: "Layer-3 routing device", defaultPurdueLevel: 4, roles: INFRA },
  { type: "switch", label: "Managed Switch", short: "SW", category: "Network", description: "Managed Ethernet switch", defaultPurdueLevel: 4, roles: INFRA },
  { type: "l3-switch", label: "Layer-3 Switch", short: "L3", category: "Network", description: "Routing-capable switch (ACLs are not a firewall)", defaultPurdueLevel: 3, roles: INFRA },
  { type: "firewall", label: "Firewall", short: "FW", category: "Network", description: "Enterprise or perimeter firewall", defaultPurdueLevel: 4, roles: BOUNDARY },
  { type: "industrial-firewall", label: "Industrial Firewall", short: "IFW", category: "Network", description: "OT-aware segmentation firewall with DPI", defaultPurdueLevel: 3, roles: BOUNDARY },
  { type: "data-diode", label: "Data Diode", short: "DD", category: "Network", description: "Hardware-enforced unidirectional gateway", defaultPurdueLevel: 3, roles: { ...BOUNDARY, unidirectional: true } },
  { type: "vpn-gateway", label: "VPN Gateway", short: "VPN", category: "Network", description: "Site-to-site or remote-access VPN endpoint", defaultPurdueLevel: 4, roles: { ...BOUNDARY, remoteEntry: true } },
  { type: "wireless-ap", label: "Wireless AP", short: "AP", category: "Network", description: "Wireless access point", defaultPurdueLevel: 3, roles: INFRA },
  { type: "cellular-router", label: "Cellular Router", short: "4G", category: "Network", description: "4G/5G WAN router for remote sites", defaultPurdueLevel: 3, roles: { ...INFRA, remoteEntry: true } },
  { type: "industrial-switch", label: "Industrial Switch", short: "ISW", category: "Network", description: "Rugged managed industrial Ethernet switch", defaultPurdueLevel: 2, roles: INFRA },
  { type: "redbox", label: "PRP/HSR RedBox", short: "RBX", category: "Network", description: "Redundancy box for PRP/HSR networks", defaultPurdueLevel: 1, roles: INFRA },
  { type: "serial-gateway", label: "Serial Gateway", short: "SER", category: "Network", description: "Serial-to-IP gateway", defaultProtocols: ["Modbus RTU", "Modbus TCP"], defaultPurdueLevel: 1, roles: INFRA },

  // OT control
  { type: "plc", label: "PLC", short: "PLC", category: "OT Control", description: "Programmable logic controller", defaultProtocols: ["Modbus TCP"], defaultPurdueLevel: 1 },
  { type: "pac", label: "PAC", short: "PAC", category: "OT Control", description: "Programmable automation controller", defaultProtocols: ["EtherNet/IP"], defaultPurdueLevel: 1 },
  { type: "rtu", label: "RTU", short: "RTU", category: "OT Control", description: "Remote terminal unit", defaultProtocols: ["DNP3"], defaultPurdueLevel: 1 },
  { type: "dcs-controller", label: "DCS Controller", short: "DCS", category: "OT Control", description: "Distributed control system controller", defaultPurdueLevel: 1 },
  { type: "hmi", label: "HMI", short: "HMI", category: "OT Control", description: "Operator human-machine interface", defaultPurdueLevel: 2 },
  { type: "scada", label: "SCADA Server", short: "SCADA", category: "OT Control", description: "Supervisory control and data acquisition server", defaultPurdueLevel: 3 },
  { type: "historian", label: "Process Historian", short: "HIST", category: "OT Control", description: "Process and telemetry historian", defaultPurdueLevel: 3 },
  { type: "engineering-ws", label: "Engineering Workstation", short: "EWS", category: "OT Control", description: "Control engineering workstation", defaultPurdueLevel: 3 },
  { type: "opcua-server", label: "OPC UA Server", short: "OPC", category: "OT Control", description: "OPC UA aggregation or server endpoint", defaultProtocols: ["OPC UA"], defaultPurdueLevel: 3 },
  { type: "protocol-gateway", label: "Protocol Gateway", short: "GW", category: "OT Control", description: "Industrial protocol translation gateway", defaultPurdueLevel: 2 },
  { type: "time-server", label: "Time Server (GNSS)", short: "TIME", category: "OT Control", description: "GNSS-disciplined PTP/NTP grandmaster", defaultProtocols: ["PTP (IEEE 1588)", "NTP"], defaultPurdueLevel: 2 },

  // Safety
  { type: "safety-plc", label: "Safety PLC", short: "SPLC", category: "Safety / SIS", description: "Safety-rated programmable controller", defaultPurdueLevel: 1, roles: SAFETY },
  { type: "sis-controller", label: "SIS Controller", short: "SIS", category: "Safety / SIS", description: "Safety instrumented system logic solver", defaultPurdueLevel: 1, roles: SAFETY },
  { type: "sis-engineering", label: "SIS Engineering Station", short: "SIS-E", category: "Safety / SIS", description: "Safety-system engineering workstation", defaultPurdueLevel: 2, roles: SAFETY },
  { type: "esd-panel", label: "ESD Panel", short: "ESD", category: "Safety / SIS", description: "Emergency shutdown panel", defaultPurdueLevel: 1, roles: SAFETY },

  // Field / process
  { type: "sensor", label: "Sensor / Transmitter", short: "SEN", category: "Field / Process", description: "Field sensor or transmitter", defaultProtocols: ["HART"], defaultPurdueLevel: 0 },
  { type: "actuator", label: "Actuator / Valve", short: "ACT", category: "Field / Process", description: "Controlled actuator or valve", defaultPurdueLevel: 0 },
  { type: "vfd", label: "VFD / Drive", short: "VFD", category: "Field / Process", description: "Variable-frequency or motor drive", defaultProtocols: ["PROFINET"], defaultPurdueLevel: 1 },
  { type: "remote-io", label: "Remote I/O", short: "RIO", category: "Field / Process", description: "Distributed I/O station", defaultProtocols: ["PROFINET"], defaultPurdueLevel: 1 },
  { type: "ied", label: "IED", short: "IED", category: "Field / Process", description: "Intelligent electronic device", defaultProtocols: ["IEC 61850 MMS"], defaultPurdueLevel: 1 },
  { type: "merging-unit", label: "Merging Unit", short: "MU", category: "Field / Process", description: "IEC 61850 process-bus merging unit", defaultProtocols: ["IEC 61850 SV"], defaultPurdueLevel: 0 },
  { type: "protection-relay", label: "Protection Relay", short: "REL", category: "Field / Process", description: "Electrical protection relay", defaultProtocols: ["IEC 61850 MMS", "IEC 61850 GOOSE"], defaultPurdueLevel: 1 },
  { type: "smart-meter", label: "Smart Meter", short: "MTR", category: "Field / Process", description: "Metering device", defaultPurdueLevel: 0 },
  { type: "condition-monitor", label: "Condition Monitor", short: "CM", category: "Field / Process", description: "Condition-monitoring or telemetry unit", defaultProtocols: ["CAN"], defaultPurdueLevel: 1 },
  { type: "iiot-gateway", label: "IIoT Gateway", short: "IIOT", category: "Field / Process", description: "Industrial edge or IIoT gateway", defaultProtocols: ["MQTT/TLS"], defaultPurdueLevel: 2 },

  // Rail
  { type: "tcms-ccu", label: "TCMS CCU", short: "CCU", category: "Rail", description: "Train Control & Management System central control unit", defaultProtocols: ["TRDP", "MVB"], defaultPurdueLevel: 2 },
  { type: "etbn", label: "ETB Node (ETBN)", short: "ETBN", category: "Rail", description: "Ethernet Train Backbone node / consist router (IEC 61375-2-5)", defaultProtocols: ["TRDP"], defaultPurdueLevel: 2, roles: INFRA },
  { type: "ecn-switch", label: "ECN Switch", short: "ECN", category: "Rail", description: "Ethernet Consist Network switch (IEC 61375-3-4)", defaultPurdueLevel: 2, roles: INFRA },
  { type: "mvb-gateway", label: "MVB Gateway", short: "MVBG", category: "Rail", description: "MVB ↔ ECN gateway for legacy subsystems", defaultProtocols: ["MVB", "TRDP"], defaultPurdueLevel: 1 },
  { type: "train-gateway", label: "Train-to-Ground Gateway", short: "TGW", category: "Rail", description: "Mobile router for wayside/cellular communications", defaultProtocols: ["HTTPS", "MQTT/TLS"], defaultPurdueLevel: 3, roles: { ...BOUNDARY, remoteEntry: true } },
  { type: "traction-control", label: "Traction Control Unit", short: "TCU", category: "Rail", description: "Traction converter controller", defaultProtocols: ["TRDP", "CAN"], defaultPurdueLevel: 1 },
  { type: "brake-control", label: "Brake Control Unit", short: "BCU", category: "Rail", description: "Brake electronics, safety-related", defaultProtocols: ["MVB"], defaultPurdueLevel: 1, roles: SAFETY },
  { type: "door-controller", label: "Door Controller", short: "DCU", category: "Rail", description: "Passenger door control unit", defaultProtocols: ["TRDP"], defaultPurdueLevel: 1 },
  { type: "etcs-evc", label: "ETCS Onboard (EVC)", short: "EVC", category: "Rail", description: "ETCS European Vital Computer, SIL 4", defaultProtocols: ["Subset-037 (EuroRadio)"], defaultPurdueLevel: 1, roles: SAFETY },
  { type: "pis", label: "Passenger Information", short: "PIS", category: "Rail", description: "Passenger information and displays", defaultProtocols: ["HTTPS"], defaultPurdueLevel: 3 },
  { type: "cctv-nvr", label: "CCTV / NVR", short: "CCTV", category: "Rail", description: "On-board or station video recording", defaultPurdueLevel: 3 },
  { type: "interlocking", label: "Interlocking", short: "IXL", category: "Rail", description: "Electronic/computer-based interlocking, SIL 4", defaultProtocols: ["Interlocking proprietary"], defaultPurdueLevel: 1, roles: SAFETY },
  { type: "object-controller", label: "Object Controller", short: "OC", category: "Rail", description: "Trackside object controller for signals and points", defaultProtocols: ["Interlocking proprietary"], defaultPurdueLevel: 0, roles: SAFETY },
  { type: "axle-counter", label: "Axle Counter Evaluator", short: "AXC", category: "Rail", description: "Train-detection evaluator", defaultPurdueLevel: 0, roles: SAFETY },
  { type: "rbc", label: "Radio Block Centre", short: "RBC", category: "Rail", description: "ETCS Level 2 RBC, SIL 4", defaultProtocols: ["Subset-037 (EuroRadio)"], defaultPurdueLevel: 1, roles: SAFETY },
  { type: "traffic-management", label: "Traffic Management", short: "TMS", category: "Rail", description: "Traffic management / ARS / control-centre system", defaultPurdueLevel: 3 },
  { type: "maintainer-terminal", label: "Maintainer Terminal", short: "MT", category: "Rail", description: "Signalling technician diagnostic terminal", defaultPurdueLevel: 2 },
  { type: "cbtc-zc", label: "CBTC Zone Controller", short: "ZC", category: "Rail", description: "CBTC wayside zone controller, SIL 4", defaultPurdueLevel: 1, roles: SAFETY },

  // Energy / utilities
  { type: "turbine-controller", label: "Turbine Controller", short: "WTC", category: "Energy / Utilities", description: "Wind-turbine controller", defaultProtocols: ["IEC 61400-25", "Modbus TCP"], defaultPurdueLevel: 1 },
  { type: "park-controller", label: "Power Plant Controller", short: "PPC", category: "Energy / Utilities", description: "Plant/park-level controller for grid-code compliance", defaultProtocols: ["Modbus TCP"], defaultPurdueLevel: 2 },
  { type: "bess-controller", label: "BESS Controller", short: "BESS", category: "Energy / Utilities", description: "Battery storage energy management controller", defaultProtocols: ["Modbus TCP"], defaultPurdueLevel: 1 },
  { type: "telemetry-outstation", label: "Telemetry Outstation", short: "OS", category: "Energy / Utilities", description: "Water/wastewater telemetry outstation", defaultProtocols: ["DNP3"], defaultPurdueLevel: 1 },
  { type: "pump-controller", label: "Pump Controller", short: "PMP", category: "Energy / Utilities", description: "Pumping station controller", defaultProtocols: ["Modbus TCP"], defaultPurdueLevel: 1 },
  { type: "dosing-controller", label: "Chemical Dosing Controller", short: "DOSE", category: "Energy / Utilities", description: "Chemical dosing control, safety-relevant", defaultProtocols: ["Modbus TCP"], defaultPurdueLevel: 1, roles: SAFETY },

  // Security
  { type: "ids-sensor", label: "OT IDS Sensor", short: "IDS", category: "Security", description: "Passive OT network monitoring sensor", defaultPurdueLevel: 3, roles: { monitoring: true } },
  { type: "jump-host", label: "Jump Host", short: "JMP", category: "Security", description: "Controlled administrative access host", defaultProtocols: ["RDP", "SSH"], defaultPurdueLevel: 3, roles: { intermediary: true } },
  { type: "remote-access", label: "Remote Access Server", short: "RAS", category: "Security", description: "Managed vendor/remote access broker", defaultPurdueLevel: 3, roles: { remoteEntry: true, intermediary: true } },
  { type: "siem", label: "SIEM", short: "SIEM", category: "Security", description: "Security information and event management", defaultPurdueLevel: 4 },
  { type: "syslog", label: "Syslog Server", short: "LOG", category: "Security", description: "Central log collector", defaultProtocols: ["Syslog/TLS"], defaultPurdueLevel: 3 },
  { type: "vuln-scanner", label: "Vulnerability Scanner", short: "VULN", category: "Security", description: "Assessment platform; use with OT-safe procedures", defaultPurdueLevel: 4 },
  { type: "nac", label: "NAC Server", short: "NAC", category: "Security", description: "Network access control service", defaultPurdueLevel: 4 },
  { type: "pki", label: "PKI / CA", short: "PKI", category: "Security", description: "Certificate authority or PKI service", defaultPurdueLevel: 4 },
  { type: "patch-server", label: "Patch / AV Server", short: "WSUS", category: "Security", description: "Patch and antivirus staging server", defaultPurdueLevel: 3 },

  // Compute
  { type: "server", label: "Server", short: "SRV", category: "Compute", description: "Physical or virtual server", defaultPurdueLevel: 3 },
  { type: "workstation", label: "Workstation", short: "WS", category: "Compute", description: "General workstation", defaultPurdueLevel: 3 },
  { type: "hypervisor", label: "Hypervisor", short: "HV", category: "Compute", description: "Virtualisation host", defaultPurdueLevel: 3 },
  { type: "backup", label: "Backup Appliance", short: "BKP", category: "Compute", description: "Backup and recovery system", defaultPurdueLevel: 3 },

  // Enterprise
  { type: "ad-dns", label: "AD / DNS", short: "AD", category: "Enterprise", description: "Identity and naming services", defaultProtocols: ["LDAPS", "Kerberos", "DNS"], defaultPurdueLevel: 4 },
  { type: "dmz-app", label: "DMZ Application", short: "DMZ", category: "Enterprise", description: "Broker, proxy or replica in an industrial DMZ", defaultPurdueLevel: 3, roles: { intermediary: true } },
  { type: "cloud-service", label: "Cloud Service", short: "CLD", category: "Enterprise", description: "External cloud or analytics service", defaultProtocols: ["HTTPS"], defaultPurdueLevel: 5, roles: { remoteEntry: true } },
  { type: "vendor-remote", label: "Vendor / Third Party", short: "3P", category: "Enterprise", description: "External vendor or OEM support party", defaultPurdueLevel: 5, roles: { remoteEntry: true } },
  { type: "enterprise-client", label: "Enterprise Client", short: "PC", category: "Enterprise", description: "Corporate user endpoint", defaultPurdueLevel: 4 },
  { type: "internet", label: "Internet / WAN", short: "WAN", category: "Enterprise", description: "Untrusted external network", defaultPurdueLevel: 5, roles: { remoteEntry: true } }
];

export const CATEGORY_ORDER = [
  "OT Control",
  "Safety / SIS",
  "Field / Process",
  "Rail",
  "Energy / Utilities",
  "Network",
  "Security",
  "Compute",
  "Enterprise"
] as const;

const BY_TYPE = new Map(ASSET_CATALOG.map((item) => [item.type, item]));

export function getAssetDefinition(type: string): AssetDefinition | undefined {
  return BY_TYPE.get(type);
}

export function rolesOf(assetType: string): AssetRoles {
  return BY_TYPE.get(assetType)?.roles ?? {};
}
