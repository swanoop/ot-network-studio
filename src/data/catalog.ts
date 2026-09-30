import type { AssetDefinition } from "../types";

export const PROTOCOLS = [
  "TCP/IP",
  "Modbus TCP",
  "Modbus RTU",
  "OPC UA",
  "DNP3",
  "IEC 60870-5-104",
  "IEC 61850",
  "PROFINET",
  "EtherNet/IP",
  "PROFIBUS",
  "BACnet/IP",
  "MQTT",
  "HART",
  "CAN",
  "CAN FD",
  "Serial"
] as const;

export const ASSET_CATALOG: AssetDefinition[] = [
  { type: "router", label: "Router", short: "RTR", category: "Network", description: "Layer-3 routing device", defaultPurdueLevel: 4 },
  { type: "switch", label: "Managed Switch", short: "SW", category: "Network", description: "Managed Ethernet switch", defaultPurdueLevel: 4 },
  { type: "l3-switch", label: "Layer-3 Switch", short: "L3", category: "Network", description: "Routing-capable switch", defaultPurdueLevel: 4 },
  { type: "firewall", label: "Firewall", short: "FW", category: "Network", description: "Enterprise or perimeter firewall", defaultPurdueLevel: 4 },
  { type: "vpn-gateway", label: "VPN Gateway", short: "VPN", category: "Network", description: "Site or remote-access VPN endpoint", defaultPurdueLevel: 4 },
  { type: "wireless-ap", label: "Wireless AP", short: "AP", category: "Network", description: "Wireless access point", defaultPurdueLevel: 4 },
  { type: "industrial-switch", label: "Industrial Switch", short: "ISW", category: "Network", description: "Rugged industrial Ethernet switch", defaultPurdueLevel: 2 },
  { type: "industrial-firewall", label: "Industrial Firewall", short: "IFW", category: "Network", description: "OT-aware segmentation firewall", defaultPurdueLevel: 3 },
  { type: "data-diode", label: "Data Diode", short: "DD", category: "Network", description: "Unidirectional security gateway", defaultPurdueLevel: 3 },
  { type: "serial-gateway", label: "Serial Gateway", short: "SER", category: "Network", description: "Serial-to-IP gateway", defaultProtocols: ["Modbus RTU", "Modbus TCP"], defaultPurdueLevel: 1 },

  { type: "plc", label: "PLC", short: "PLC", category: "OT Control", description: "Programmable logic controller", defaultProtocols: ["Modbus TCP"], defaultPurdueLevel: 1 },
  { type: "pac", label: "PAC", short: "PAC", category: "OT Control", description: "Programmable automation controller", defaultProtocols: ["EtherNet/IP"], defaultPurdueLevel: 1 },
  { type: "rtu", label: "RTU", short: "RTU", category: "OT Control", description: "Remote terminal unit", defaultProtocols: ["DNP3"], defaultPurdueLevel: 1 },
  { type: "dcs-controller", label: "DCS Controller", short: "DCS", category: "OT Control", description: "Distributed control system controller", defaultPurdueLevel: 1 },
  { type: "hmi", label: "HMI", short: "HMI", category: "OT Control", description: "Operator human-machine interface", defaultPurdueLevel: 2 },
  { type: "scada", label: "SCADA Server", short: "SCADA", category: "OT Control", description: "Supervisory control and data acquisition server", defaultPurdueLevel: 3 },
  { type: "historian", label: "Process Historian", short: "HIST", category: "OT Control", description: "Process and telemetry historian", defaultPurdueLevel: 3 },
  { type: "engineering-ws", label: "Engineering Workstation", short: "EWS", category: "OT Control", description: "Control engineering workstation", defaultPurdueLevel: 3 },
  { type: "opcua-server", label: "OPC UA Server", short: "OPC", category: "OT Control", description: "OPC UA aggregation/server endpoint", defaultProtocols: ["OPC UA"], defaultPurdueLevel: 3 },
  { type: "protocol-gateway", label: "Protocol Gateway", short: "GW", category: "OT Control", description: "Industrial protocol translation gateway", defaultPurdueLevel: 2 },

  { type: "safety-plc", label: "Safety PLC", short: "SPLC", category: "Safety / SIS", description: "Safety-rated programmable controller", defaultPurdueLevel: 1 },
  { type: "sis-controller", label: "SIS Controller", short: "SIS", category: "Safety / SIS", description: "Safety instrumented system controller", defaultPurdueLevel: 1 },
  { type: "sis-engineering", label: "SIS Engineering Station", short: "SIS-E", category: "Safety / SIS", description: "Safety-system engineering workstation", defaultPurdueLevel: 3 },
  { type: "esd-panel", label: "ESD Panel", short: "ESD", category: "Safety / SIS", description: "Emergency shutdown panel", defaultPurdueLevel: 1 },

  { type: "sensor", label: "Sensor / Transmitter", short: "SEN", category: "Field / Process", description: "Field sensor or transmitter", defaultProtocols: ["HART"], defaultPurdueLevel: 0 },
  { type: "actuator", label: "Actuator / Valve", short: "ACT", category: "Field / Process", description: "Controlled actuator or valve", defaultPurdueLevel: 0 },
  { type: "vfd", label: "VFD / Drive", short: "VFD", category: "Field / Process", description: "Variable-frequency or motor drive", defaultProtocols: ["PROFINET"], defaultPurdueLevel: 1 },
  { type: "ied", label: "IED", short: "IED", category: "Field / Process", description: "Intelligent electronic device", defaultProtocols: ["IEC 61850"], defaultPurdueLevel: 1 },
  { type: "protection-relay", label: "Protection Relay", short: "REL", category: "Field / Process", description: "Electrical protection relay", defaultProtocols: ["IEC 61850"], defaultPurdueLevel: 1 },
  { type: "smart-meter", label: "Smart Meter", short: "MTR", category: "Field / Process", description: "Metering device", defaultPurdueLevel: 0 },
  { type: "condition-monitor", label: "Condition Monitor", short: "CM", category: "Field / Process", description: "Condition-monitoring or telemetry unit", defaultProtocols: ["CAN"], defaultPurdueLevel: 0 },
  { type: "iiot-gateway", label: "IIoT Gateway", short: "IIOT", category: "Field / Process", description: "Industrial edge or IIoT gateway", defaultProtocols: ["MQTT"], defaultPurdueLevel: 2 },

  { type: "ids-sensor", label: "OT IDS Sensor", short: "IDS", category: "Security", description: "Passive OT network monitoring sensor", defaultPurdueLevel: 3 },
  { type: "jump-host", label: "Jump Host", short: "JMP", category: "Security", description: "Controlled administrative access host", defaultPurdueLevel: 3 },
  { type: "remote-access", label: "Remote Access Server", short: "RAS", category: "Security", description: "Managed vendor/remote access point", defaultPurdueLevel: 3 },
  { type: "siem", label: "SIEM", short: "SIEM", category: "Security", description: "Security information and event management", defaultPurdueLevel: 4 },
  { type: "syslog", label: "Syslog Server", short: "LOG", category: "Security", description: "Central log collector", defaultPurdueLevel: 4 },
  { type: "vuln-scanner", label: "Vulnerability Scanner", short: "VULN", category: "Security", description: "Assessment platform; use with OT-safe procedures", defaultPurdueLevel: 4 },
  { type: "nac", label: "NAC Server", short: "NAC", category: "Security", description: "Network access control service", defaultPurdueLevel: 4 },
  { type: "pki", label: "PKI / CA", short: "PKI", category: "Security", description: "Certificate authority or PKI service", defaultPurdueLevel: 4 },

  { type: "server", label: "Server", short: "SRV", category: "Compute", description: "Physical or virtual server", defaultPurdueLevel: 4 },
  { type: "workstation", label: "Workstation", short: "WS", category: "Compute", description: "General workstation", defaultPurdueLevel: 4 },
  { type: "hypervisor", label: "Hypervisor", short: "HV", category: "Compute", description: "Virtualisation host", defaultPurdueLevel: 4 },
  { type: "backup", label: "Backup Appliance", short: "BKP", category: "Compute", description: "Backup and recovery system", defaultPurdueLevel: 4 },

  { type: "ad-dns", label: "AD / DNS", short: "AD", category: "Enterprise", description: "Identity and naming services", defaultPurdueLevel: 4 },
  { type: "dmz-app", label: "DMZ Application", short: "DMZ", category: "Enterprise", description: "Broker, proxy or application in an industrial DMZ", defaultPurdueLevel: 3 },
  { type: "cloud-service", label: "Cloud Service", short: "CLD", category: "Enterprise", description: "External cloud or analytics service", defaultPurdueLevel: 5 },
  { type: "enterprise-client", label: "Enterprise Client", short: "PC", category: "Enterprise", description: "Corporate user endpoint", defaultPurdueLevel: 4 }
];

export const CATEGORY_ORDER = [
  "OT Control",
  "Safety / SIS",
  "Field / Process",
  "Network",
  "Security",
  "Compute",
  "Enterprise"
] as const;

export function getAssetDefinition(type: string) {
  return ASSET_CATALOG.find((item) => item.type === type);
}
