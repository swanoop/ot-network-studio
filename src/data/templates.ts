/*
 * Reference architectures. Each one is a realistic starting point, not a
 * certified design. Run the Findings view on each: the reference designs
 * deliberately keep a few genuine, discussable findings, and the "Flat
 * network" template is full of them for training.
 */
import type { ArchitectureTemplate, AssetData, EdgeData, ProjectEdge, ProjectNode, ZoneData } from "../types";
import { getAssetDefinition } from "./catalog";

const COL = (i: number) => 80 + i * 240;

class Builder {
  nodes: ProjectNode[] = [];
  edges: ProjectEdge[] = [];
  private n = 0;

  zone(id: string, title: string, x: number, y: number, width: number, height: number, extra: Partial<ZoneData> = {}) {
    this.nodes.push({
      id, type: "zone", position: { x, y }, zIndex: -1, style: { width, height },
      data: { kind: "zone", title, zoneType: "zone", ...extra }
    });
    return this;
  }

  asset(id: string, assetType: string, x: number, y: number, title?: string, extra: Partial<AssetData> = {}) {
    const def = getAssetDefinition(assetType);
    if (!def) throw new Error(`Template uses unknown asset type ${assetType}`);
    this.nodes.push({
      id, type: "asset", position: { x, y },
      data: {
        kind: "asset", title: title ?? def.label, assetType, category: def.category, status: "online",
        protocols: [...(def.defaultProtocols ?? [])], purdueLevel: def.defaultPurdueLevel, criticality: "medium", ...extra
      }
    });
    return this;
  }

  flow(source: string, target: string, protocols: string[], extra: Partial<EdgeData> = {}) {
    this.edges.push({
      id: `f${++this.n}-${source}-${target}`, source, target, type: "smoothstep",
      data: { kind: "flow", protocols, direction: "forward", enabled: true, ...extra }
    });
    return this;
  }

  link(source: string, target: string, extra: Partial<EdgeData> = {}) {
    this.edges.push({
      id: `l${++this.n}-${source}-${target}`, source, target, type: "smoothstep",
      data: { kind: "link", protocols: [], direction: "bidirectional", media: "copper", redundancy: "none", enabled: true, ...extra }
    });
    return this;
  }

  build(id: string, name: string, sector: string, description: string): ArchitectureTemplate {
    return { id, name, sector, description, nodes: this.nodes, edges: this.edges };
  }
}

// ---------------------------------------------------------------------------
// 1. Purdue-style manufacturing / process site
// ---------------------------------------------------------------------------
function purdue(): ArchitectureTemplate {
  const b = new Builder();
  const W = 1460;
  b.zone("z-ent", "Enterprise (L4)", 40, 30, W, 170, { securityLevelTarget: "SL 1", subnet: "10.10.0.0/24", vlan: "10" })
    .zone("z-ext", "External / Internet", 1540, 30, 480, 170, { zoneType: "external" })
    .zone("z-dmz", "Industrial DMZ (L3.5)", 40, 230, W, 170, { zoneType: "dmz", securityLevelTarget: "SL 2", subnet: "10.20.0.0/24", vlan: "20" })
    .zone("z-ops", "Site Operations (L3)", 40, 430, W, 170, { securityLevelTarget: "SL 2", subnet: "10.30.0.0/24", vlan: "30" })
    .zone("z-cell", "Cell / Area Zone (L0–L2)", 40, 630, W, 360, { securityLevelTarget: "SL 2", subnet: "10.40.0.0/24", vlan: "40" })
    .zone("z-sis", "Safety Zone (SIS)", 1540, 630, 480, 360, { zoneType: "safety", securityLevelTarget: "SL 3", subnet: "10.50.0.0/24", vlan: "50" });

  b.asset("ent", "enterprise-client", COL(0), 80, "Enterprise Client", { ip: "10.10.0.50" })
    .asset("ad", "ad-dns", COL(1), 80, "Corporate AD / DNS", { ip: "10.10.0.10" })
    .asset("siem", "siem", COL(2), 80, "Corporate SIEM", { ip: "10.10.0.20" })
    .asset("cloud", "cloud-service", 1570, 80, "Cloud Analytics")
    .asset("vendor", "vendor-remote", 1790, 80, "OEM Support");

  b.asset("fw1", "firewall", COL(0), 280, "IT/OT Firewall", { ip: "10.20.0.1", criticality: "high" })
    .asset("jump", "jump-host", COL(1), 280, "Jump Host", { ip: "10.20.0.10", criticality: "high" })
    .asset("rep", "dmz-app", COL(2), 280, "Historian Replica", { ip: "10.20.0.20" })
    .asset("ras", "remote-access", COL(3), 280, "Vendor Access Broker", { ip: "10.20.0.30", protocols: ["HTTPS", "RDP"] })
    .asset("patch", "patch-server", COL(4), 280, "Patch / AV Staging", { ip: "10.20.0.40" })
    .asset("log", "syslog", COL(5), 280, "Log Forwarder", { ip: "10.20.0.50" });

  b.asset("ifw", "industrial-firewall", COL(0), 480, "OT Firewall", { ip: "10.30.0.1", criticality: "high" })
    .asset("scada", "scada", COL(1), 480, "SCADA Server", { ip: "10.30.0.10", criticality: "high", protocols: ["OPC UA", "S7comm"] })
    .asset("hist", "historian", COL(2), 480, "Process Historian", { ip: "10.30.0.20", protocols: ["OPC UA", "SQL"] })
    .asset("ews", "engineering-ws", COL(3), 480, "Engineering Workstation", { ip: "10.30.0.30", criticality: "high", protocols: ["S7comm", "RDP"] })
    .asset("ids", "ids-sensor", COL(4), 480, "OT IDS Sensor", { ip: "10.30.0.40" });

  b.asset("isw", "industrial-switch", COL(0), 680, "Cell Switch", { ip: "10.40.0.2", protocols: ["SNMPv3"] })
    .asset("hmi", "hmi", COL(1), 680, "Operator HMI", { ip: "10.40.0.10", criticality: "high", protocols: ["OPC UA", "S7comm"] })
    .asset("plc", "plc", COL(2), 680, "Process PLC", { ip: "10.40.0.20", criticality: "critical", protocols: ["S7comm", "PROFINET"], vendor: "Siemens", model: "S7-1500", slCapability: "SL 2" })
    .asset("rio", "remote-io", COL(3), 680, "Remote I/O", { ip: "10.40.0.30" })
    .asset("sensor", "sensor", COL(1), 860, "Pressure Transmitter")
    .asset("vfd", "vfd", COL(2), 860, "Pump Drive", { ip: "10.40.0.40" })
    .asset("act", "actuator", COL(3), 860, "Control Valve", { protocols: ["HART"] });

  b.asset("sfw", "industrial-firewall", 1570, 680, "Safety Firewall", { ip: "10.50.0.1", criticality: "high" })
    .asset("splc", "safety-plc", 1790, 680, "Safety PLC (SIS)", { ip: "10.50.0.10", criticality: "critical", protocols: ["Modbus TCP"] })
    .asset("sise", "sis-engineering", 1790, 860, "SIS Engineering Station", { ip: "10.50.0.20" });

  // Flows
  b.flow("ent", "rep", ["HTTPS"], { via: ["fw1"], conduit: "C-ENT-DMZ" })
    .flow("jump", "ad", ["LDAPS", "Kerberos"], { via: ["fw1"], conduit: "C-ENT-DMZ" })
    .flow("vendor", "ras", ["HTTPS"], { via: ["fw1"], encrypted: true, authenticated: true, notes: "MFA, approval workflow, session recording" })
    .flow("ras", "jump", ["RDP"])
    .flow("rep", "cloud", ["HTTPS"], { via: ["fw1"] })
    .flow("log", "siem", ["Syslog/TLS"], { via: ["fw1"] })
    .flow("jump", "ews", ["RDP"], { via: ["ifw"], conduit: "C-DMZ-OPS" })
    .flow("hist", "rep", ["SQL"], { via: ["ifw"], conduit: "C-DMZ-OPS", notes: "One-way replication; replica serves enterprise users" })
    .flow("ews", "patch", ["HTTPS"], { via: ["ifw"], conduit: "C-DMZ-OPS" })
    .flow("ids", "log", ["Syslog/TLS"], { via: ["ifw"], conduit: "C-DMZ-OPS" })
    .flow("scada", "plc", ["S7comm"], { via: ["ifw"], conduit: "C-OPS-CELL", notes: "DPI on the OT firewall restricts S7 functions" })
    .flow("ews", "plc", ["S7comm"], { via: ["ifw"], conduit: "C-OPS-CELL" })
    .flow("hist", "scada", ["OPC UA"])
    .flow("hmi", "scada", ["OPC UA"], { via: ["ifw"], conduit: "C-OPS-CELL" })
    .flow("hmi", "plc", ["S7comm"])
    .flow("plc", "vfd", ["PROFINET"])
    .flow("plc", "rio", ["PROFINET"])
    .flow("rio", "sensor", ["HART"])
    .flow("rio", "act", ["HART"])
    .flow("splc", "hmi", ["Modbus TCP"], { via: ["sfw"], conduit: "C-SIS", notes: "Status only; SIS initiates. Firewall allows FC 16 to HMI tags only." })
    .flow("sise", "splc", ["TCP/IP"], { ports: "tcp/1000-1005", notes: "Vendor engineering protocol; key-switch protected" });

  // Physical links
  b.link("fw1", "ifw", { media: "fibre" })
    .link("ifw", "isw", { media: "fibre" })
    .link("isw", "hmi")
    .link("isw", "plc", { redundancy: "MRP", notes: "MRP ring" })
    .link("isw", "rio", { redundancy: "MRP" })
    .link("isw", "vfd")
    .link("ids", "isw", { notes: "SPAN of cell switch" })
    .link("ids", "sfw", { notes: "SPAN of safety firewall inside port" })
    .link("sfw", "isw", { media: "fibre" })
    .link("sfw", "splc")
    .link("sfw", "sise");

  return b.build("purdue-site", "Purdue-style OT site", "Manufacturing / process",
    "Enterprise, industrial DMZ, operations, cell/area and a dedicated SIS zone, with brokered remote access and a historian replica.");
}

// ---------------------------------------------------------------------------
// 2. IEC 61850 digital substation
// ---------------------------------------------------------------------------
function substation(): ArchitectureTemplate {
  const b = new Builder();
  b.zone("z-cc", "Grid Control Centre (utility WAN)", 40, 30, 740, 170, { zoneType: "external", subnet: "10.200.0.0/24" })
    .zone("z-dmz", "Substation Access DMZ", 820, 30, 740, 170, { zoneType: "dmz", securityLevelTarget: "SL 2", subnet: "172.16.5.0/24", vlan: "5" })
    .zone("z-sas", "Substation Automation System (station + process bus)", 40, 240, 1520, 370, { securityLevelTarget: "SL 3", subnet: "172.16.10.0/24", vlan: "10" });

  b.asset("ems", "scada", COL(0), 80, "EMS / SCADA", { ip: "10.200.0.10", criticality: "high", protocols: ["IEC 60870-5-104"] })
    .asset("eng-c", "enterprise-client", COL(1), 80, "Protection Engineer", { ip: "10.200.0.50", purdueLevel: 4 })
    .asset("sfw", "industrial-firewall", 850, 80, "Substation Firewall", { ip: "172.16.5.1", criticality: "high" })
    .asset("jump", "jump-host", 1090, 80, "Substation Jump Host", { ip: "172.16.5.10" })
    .asset("ids", "ids-sensor", 1330, 80, "Substation IDS", { ip: "172.16.5.20" });

  b.asset("gw", "protocol-gateway", COL(0), 290, "Station Gateway", { ip: "172.16.10.5", criticality: "critical", protocols: ["IEC 60870-5-104", "IEC 61850 MMS"], slCapability: "SL 3" })
    .asset("hmi", "hmi", COL(1), 290, "Station HMI", { ip: "172.16.10.10", criticality: "high", protocols: ["IEC 61850 MMS"] })
    .asset("ews", "engineering-ws", COL(2), 290, "Station Engineering PC", { ip: "172.16.10.20", purdueLevel: 2, protocols: ["IEC 61850 MMS", "RDP"] })
    .asset("time", "time-server", COL(3), 290, "GNSS Grandmaster", { ip: "172.16.10.30", criticality: "high" })
    .asset("swa", "industrial-switch", COL(4), 290, "Station Bus LAN A", { ip: "172.16.10.2" })
    .asset("swb", "industrial-switch", COL(5), 290, "Station Bus LAN B", { ip: "172.16.10.3" })
    .asset("rel1", "protection-relay", COL(0), 470, "Line Protection Relay", { ip: "172.16.10.101", criticality: "critical", slCapability: "SL 2" })
    .asset("rel2", "protection-relay", COL(1), 470, "Transformer Protection", { ip: "172.16.10.102", criticality: "critical", slCapability: "SL 2" })
    .asset("bcu", "ied", COL(2), 470, "Bay Control Unit", { ip: "172.16.10.110", criticality: "high", protocols: ["IEC 61850 MMS", "IEC 61850 GOOSE"] })
    .asset("mu1", "merging-unit", COL(3), 470, "Merging Unit – Line", { ip: "172.16.10.201", criticality: "high" })
    .asset("mu2", "merging-unit", COL(4), 470, "Merging Unit – TX", { ip: "172.16.10.202", criticality: "high" })
    .asset("pbsw", "industrial-switch", COL(5), 470, "Process Bus Switch", { ip: "172.16.10.4" });

  b.flow("ems", "gw", ["IEC 60870-5-104"], { via: ["sfw"], encrypted: true, conduit: "C-WAN", notes: "IPsec tunnel terminated on the substation firewall" })
    .flow("eng-c", "jump", ["RDP"], { via: ["sfw"], encrypted: true })
    .flow("jump", "ews", ["RDP"], { via: ["sfw"] })
    .flow("gw", "rel1", ["IEC 61850 MMS"])
    .flow("gw", "rel2", ["IEC 61850 MMS"])
    .flow("gw", "bcu", ["IEC 61850 MMS"])
    .flow("hmi", "bcu", ["IEC 61850 MMS"])
    .flow("ews", "rel1", ["IEC 61850 MMS"])
    .flow("ews", "rel2", ["IEC 61850 MMS"])
    .flow("rel1", "rel2", ["IEC 61850 GOOSE"], { direction: "bidirectional", notes: "Interlocking / breaker-failure GOOSE" })
    .flow("bcu", "rel1", ["IEC 61850 GOOSE"])
    .flow("mu1", "rel1", ["IEC 61850 SV"])
    .flow("mu2", "rel2", ["IEC 61850 SV"])
    .flow("time", "rel1", ["PTP (IEEE 1588)"])
    .flow("time", "mu1", ["PTP (IEEE 1588)"]);

  b.link("sfw", "swa", { media: "fibre" })
    .link("ids", "swa", { notes: "SPAN" })
    .link("gw", "swa", { media: "fibre", redundancy: "PRP" }).link("gw", "swb", { media: "fibre", redundancy: "PRP" })
    .link("rel1", "swa", { media: "fibre", redundancy: "PRP" }).link("rel1", "swb", { media: "fibre", redundancy: "PRP" })
    .link("rel2", "swa", { media: "fibre", redundancy: "PRP" }).link("rel2", "swb", { media: "fibre", redundancy: "PRP" })
    .link("bcu", "swa", { media: "fibre", redundancy: "PRP" })
    .link("hmi", "swa").link("ews", "swa").link("time", "swa")
    .link("mu1", "pbsw", { media: "fibre", redundancy: "HSR" }).link("mu2", "pbsw", { media: "fibre", redundancy: "HSR" })
    .link("rel1", "pbsw", { media: "fibre", redundancy: "HSR" }).link("rel2", "pbsw", { media: "fibre", redundancy: "HSR" });

  return b.build("substation", "Digital substation (IEC 61850)", "Energy / transmission",
    "Control-centre link over IEC 104 in an IPsec tunnel, an access DMZ with jump host, PRP station bus and HSR process bus with GOOSE and SV.");
}

// ---------------------------------------------------------------------------
// 3. Water treatment works with telemetry outstations
// ---------------------------------------------------------------------------
function water(): ArchitectureTemplate {
  const b = new Builder();
  b.zone("z-corp", "Corporate IT", 40, 30, 500, 170, { securityLevelTarget: "SL 1", subnet: "10.1.0.0/24" })
    .zone("z-dmz", "Telemetry DMZ", 580, 30, 980, 170, { zoneType: "dmz", securityLevelTarget: "SL 2", subnet: "10.5.0.0/24" })
    .zone("z-scada", "Regional SCADA", 40, 240, 1520, 170, { securityLevelTarget: "SL 2", subnet: "10.10.0.0/24" })
    .zone("z-wtw", "Treatment Works Control", 40, 450, 980, 360, { securityLevelTarget: "SL 2", subnet: "10.20.0.0/24" })
    .zone("z-dose", "Chemical Dosing (safety)", 1060, 450, 500, 360, { zoneType: "safety", securityLevelTarget: "SL 3", subnet: "10.25.0.0/24" })
    .zone("z-out", "Remote Outstations (cellular)", 40, 850, 980, 190, { securityLevelTarget: "SL 2", subnet: "10.30.0.0/16" });

  b.asset("corp", "enterprise-client", COL(0), 80, "Asset Planner", { ip: "10.1.0.50" })
    .asset("fw", "firewall", 610, 80, "Corporate Firewall", { ip: "10.5.0.1", criticality: "high" })
    .asset("rep", "dmz-app", 850, 80, "Telemetry Replica", { ip: "10.5.0.10" })
    .asset("ras", "remote-access", 1090, 80, "Contractor Access", { ip: "10.5.0.20", protocols: ["HTTPS"] })
    .asset("vpn", "vpn-gateway", 1330, 80, "Telemetry VPN Concentrator", { ip: "10.5.0.30", criticality: "high", protocols: ["IEC 62351 / IPsec tunnel"] });

  b.asset("ifw", "industrial-firewall", COL(0), 290, "SCADA Firewall", { ip: "10.10.0.1", criticality: "high" })
    .asset("scada", "scada", COL(1), 290, "Telemetry SCADA", { ip: "10.10.0.10", criticality: "high", protocols: ["DNP3-SA", "OPC UA"] })
    .asset("hist", "historian", COL(2), 290, "Historian", { ip: "10.10.0.20" })
    .asset("ews", "engineering-ws", COL(3), 290, "Engineering Workstation", { ip: "10.10.0.30" })
    .asset("ids", "ids-sensor", COL(4), 290, "OT IDS", { ip: "10.10.0.40" })
    .asset("time", "time-server", COL(5), 290, "NTP Server", { ip: "10.10.0.50", protocols: ["NTP"] });

  b.asset("isw", "industrial-switch", COL(0), 500, "Works Ring Switch", { ip: "10.20.0.2" })
    .asset("plc", "plc", COL(1), 500, "Filtration PLC", { ip: "10.20.0.10", criticality: "critical", protocols: ["Modbus TCP", "OPC UA"] })
    .asset("hmi", "hmi", COL(2), 500, "Works HMI", { ip: "10.20.0.20", criticality: "high" })
    .asset("pump", "pump-controller", COL(3), 500, "High-Lift Pumps", { ip: "10.20.0.30", criticality: "high" })
    .asset("turb", "sensor", COL(1), 680, "Turbidity Analyser")
    .asset("valve", "actuator", COL(2), 680, "Filter Valve");

  b.asset("dfw", "industrial-firewall", 1090, 500, "Dosing Firewall", { ip: "10.25.0.1" })
    .asset("dose", "dosing-controller", 1330, 500, "Chlorine Dosing", { ip: "10.25.0.10", criticality: "critical", protocols: ["OPC UA"] })
    .asset("esd", "esd-panel", 1330, 680, "Dosing ESD", { criticality: "critical" });

  b.asset("cell", "cellular-router", COL(0), 900, "Cellular Router", { ip: "10.30.1.1" })
    .asset("os", "telemetry-outstation", COL(1), 900, "Reservoir Outstation", { ip: "10.30.1.10", criticality: "high", protocols: ["DNP3-SA"] })
    .asset("pstn", "pump-controller", COL(2), 900, "Booster Pump Station", { ip: "10.30.1.20", protocols: ["Modbus RTU"] })
    .asset("lvl", "sensor", COL(3), 900, "Reservoir Level");

  b.flow("corp", "rep", ["HTTPS"], { via: ["fw"] })
    .flow("hist", "rep", ["SQL"], { via: ["ifw"] })
    .flow("ras", "ews", ["RDP"], { via: ["ifw"], encrypted: true, authenticated: true, notes: "Time-bound contractor access with MFA" })
    .flow("scada", "os", ["DNP3-SA"], { via: ["ifw", "vpn"], encrypted: true, conduit: "C-TELEMETRY", notes: "Private APN plus IPsec" })
    .flow("scada", "plc", ["OPC UA"], { via: ["ifw"] })
    .flow("hist", "scada", ["OPC UA"])
    .flow("ews", "plc", ["Modbus TCP"], { via: ["ifw"], notes: "Programming access. Finding expected: consider Modbus/TCP Security." })
    .flow("hmi", "plc", ["Modbus TCP"])
    .flow("plc", "pump", ["Modbus TCP"])
    .flow("plc", "turb", ["HART"])
    .flow("plc", "valve", ["HART"])
    .flow("dose", "hmi", ["OPC UA"], { via: ["dfw"], notes: "Status publish only" })
    .flow("esd", "dose", ["Serial"], { notes: "Hard-wired trip" })
    .flow("os", "pstn", ["Modbus RTU"])
    .flow("os", "lvl", ["HART"])
    .flow("time", "plc", ["NTP"], { via: ["ifw"] })
    .flow("ids", "hist", ["Syslog/TLS"]);

  b.link("fw", "ifw", { media: "fibre" }).link("fw", "rep").link("ids", "fw", { notes: "SPAN of DMZ leg" }).link("ifw", "isw", { media: "fibre" }).link("isw", "plc", { redundancy: "RSTP" }).link("isw", "hmi").link("isw", "pump")
    .link("ids", "isw", { notes: "SPAN" }).link("ids", "dfw", { notes: "SPAN" }).link("dfw", "isw").link("dfw", "dose")
    .link("vpn", "cell", { media: "cellular" }).link("cell", "os").link("ids", "cell", { notes: "TAP on outstation uplink" });

  return b.build("water", "Water treatment and telemetry", "Water / wastewater",
    "Regional telemetry SCADA, a treatment works, a separately zoned chemical-dosing safety function and cellular outstations over a VPN.");
}

// ---------------------------------------------------------------------------
// 4. Wind farm with substation, PPC and OEM access
// ---------------------------------------------------------------------------
function windFarm(): ArchitectureTemplate {
  const b = new Builder();
  b.zone("z-ext", "Third parties (external)", 40, 30, 740, 170, { zoneType: "external" })
    .zone("z-dmz", "Wind Farm DMZ", 820, 30, 740, 170, { zoneType: "dmz", securityLevelTarget: "SL 2", subnet: "10.60.0.0/24" })
    .zone("z-scada", "Wind Farm SCADA", 40, 240, 1520, 170, { securityLevelTarget: "SL 2", subnet: "10.61.0.0/24" })
    .zone("z-sub", "Substation & Plant Control", 40, 450, 740, 360, { securityLevelTarget: "SL 3", subnet: "10.62.0.0/24" })
    .zone("z-wtg", "Turbine Network", 820, 450, 740, 360, { securityLevelTarget: "SL 2", subnet: "10.63.0.0/16" });

  b.asset("dno", "internet", COL(0), 80, "DNO / TSO Control", { purdueLevel: 5 })
    .asset("oem", "vendor-remote", COL(1), 80, "Turbine OEM Centre")
    .asset("vpn", "vpn-gateway", 850, 80, "Perimeter VPN Firewall", { ip: "10.60.0.1", criticality: "high" })
    .asset("jump", "jump-host", 1090, 80, "OEM Jump Host", { ip: "10.60.0.10" })
    .asset("broker", "dmz-app", 1330, 80, "Data Broker", { ip: "10.60.0.20", protocols: ["MQTT/TLS", "HTTPS"] });

  b.asset("ifw", "industrial-firewall", COL(0), 290, "OT Core Firewall", { ip: "10.61.0.1", criticality: "high" })
    .asset("scada", "scada", COL(1), 290, "Farm SCADA", { ip: "10.61.0.10", criticality: "high", protocols: ["IEC 61400-25", "Modbus TCP"] })
    .asset("hist", "historian", COL(2), 290, "Farm Historian", { ip: "10.61.0.20" })
    .asset("ews", "engineering-ws", COL(3), 290, "Farm Engineering PC", { ip: "10.61.0.30" })
    .asset("ids", "ids-sensor", COL(4), 290, "OT IDS", { ip: "10.61.0.40" });

  b.asset("rtu", "rtu", COL(0), 500, "Grid Interface RTU", { ip: "10.62.0.10", criticality: "critical", protocols: ["IEC 60870-5-104"] })
    .asset("ppc", "park-controller", COL(1), 500, "Power Plant Controller", { ip: "10.62.0.20", criticality: "critical" })
    .asset("bess", "bess-controller", COL(2), 500, "BESS Controller", { ip: "10.62.0.30", criticality: "high" })
    .asset("rel", "protection-relay", COL(0), 680, "Grid Protection Relay", { ip: "10.62.0.40", criticality: "critical" })
    .asset("meter", "smart-meter", COL(1), 680, "Revenue Meter", { ip: "10.62.0.50", protocols: ["IEC 61850 MMS"] })
    .asset("ssw", "industrial-switch", COL(2), 680, "Substation Switch", { ip: "10.62.0.2" });

  b.asset("ring", "industrial-switch", 850, 500, "Collector Ring Switch", { ip: "10.63.0.2" })
    .asset("wtg1", "turbine-controller", 1090, 500, "WTG-01 Controller", { ip: "10.63.1.10", criticality: "high" })
    .asset("wtg2", "turbine-controller", 1330, 500, "WTG-02 Controller", { ip: "10.63.2.10", criticality: "high" })
    .asset("wtg3", "turbine-controller", 1090, 680, "WTG-03 Controller", { ip: "10.63.3.10", criticality: "high" })
    .asset("cms", "condition-monitor", 1330, 680, "Drivetrain CMS", { ip: "10.63.9.10", protocols: ["MQTT/TLS"] });

  b.flow("dno", "rtu", ["IEC 60870-5-104"], { via: ["vpn", "ifw"], encrypted: true, authenticated: true, conduit: "C-GRID", notes: "Grid-code telecontrol over an authenticated IPsec tunnel" })
    .flow("oem", "jump", ["HTTPS"], { via: ["vpn"], encrypted: true, authenticated: true })
    .flow("jump", "scada", ["RDP"], { via: ["ifw"] })
    .flow("hist", "broker", ["MQTT/TLS"], { via: ["ifw"] })
    .flow("scada", "wtg1", ["IEC 61400-25"], { via: ["ifw"], authenticated: true, encrypted: true, notes: "IEC 62351-4 TLS profile" })
    .flow("scada", "wtg2", ["IEC 61400-25"], { via: ["ifw"], authenticated: true, encrypted: true })
    .flow("scada", "wtg3", ["IEC 61400-25"], { via: ["ifw"], authenticated: true, encrypted: true })
    .flow("ppc", "wtg1", ["Modbus TCP"], { via: ["ifw"], notes: "Set-point dispatch; finding expected" })
    .flow("ppc", "bess", ["Modbus TCP"])
    .flow("rtu", "ppc", ["IEC 60870-5-104"])
    .flow("rel", "rtu", ["IEC 61850 MMS"])
    .flow("meter", "rtu", ["IEC 61850 MMS"])
    .flow("scada", "ppc", ["OPC UA"], { via: ["ifw"] })
    .flow("cms", "hist", ["MQTT/TLS"], { via: ["ifw"] })
    .flow("ews", "scada", ["RDP"])
    .flow("ids", "hist", ["Syslog/TLS"]);

  b.link("vpn", "ifw", { media: "fibre" }).link("ifw", "ring", { media: "fibre" })
    .link("ring", "wtg1", { media: "fibre", redundancy: "RSTP" }).link("ring", "wtg2", { media: "fibre", redundancy: "RSTP" }).link("ring", "wtg3", { media: "fibre", redundancy: "RSTP" })
    .link("ifw", "ssw", { media: "fibre" }).link("ssw", "ppc", { redundancy: "RSTP" }).link("ssw", "rtu", { redundancy: "RSTP" }).link("ssw", "bess").link("ssw", "rel").link("ssw", "meter")
    .link("ids", "ring", { notes: "SPAN" }).link("ids", "ssw", { notes: "SPAN" }).link("ids", "vpn", { notes: "SPAN of DMZ leg" });

  return b.build("wind-farm", "Wind farm and grid connection", "Energy / renewables",
    "Turbine collector ring, power-plant controller and BESS, grid-operator telecontrol and OEM remote access via a jump host.");
}

// ---------------------------------------------------------------------------
// 5. Rolling stock: TCMS and on-board networks (IEC 61375, CLC/TS 50701)
// ---------------------------------------------------------------------------
function trainTcms(): ArchitectureTemplate {
  const b = new Builder();
  b.zone("z-ground", "Wayside / Ground Systems", 40, 30, 740, 170, { zoneType: "external" })
    .zone("z-wifi", "Passenger Wi-Fi", 820, 30, 500, 170, { zoneType: "external" })
    .zone("z-t2g", "Train-to-Ground Boundary", 40, 240, 1280, 170, { zoneType: "dmz", securityLevelTarget: "SL 2", subnet: "10.128.0.0/24" })
    .zone("z-pass", "Passenger & Comfort (ECN service)", 40, 450, 500, 360, { securityLevelTarget: "SL 1", subnet: "10.128.10.0/24", vlan: "110" })
    .zone("z-tcms", "TCMS Control (ECN control)", 580, 450, 980, 360, { securityLevelTarget: "SL 2", subnet: "10.128.20.0/24", vlan: "120" })
    .zone("z-sil", "Safety-Related Subsystems (SIL)", 1600, 450, 500, 360, { zoneType: "safety", securityLevelTarget: "SL 3", subnet: "10.128.30.0/24", vlan: "130" });

  b.asset("fleet", "cloud-service", COL(0), 80, "Fleet Maintenance Cloud")
    .asset("oem", "vendor-remote", COL(1), 80, "OEM Diagnostics")
    .asset("inet", "internet", COL(2), 80, "Internet")
    .asset("ap", "wireless-ap", 850, 80, "Passenger Wi-Fi AP", { ip: "10.128.40.2", purdueLevel: undefined, notes: "Passenger network: outside the OT model" });

  b.asset("tgw", "train-gateway", COL(0), 290, "Train-to-Ground Gateway", { ip: "10.128.0.1", criticality: "high", protocols: ["HTTPS", "MQTT/TLS", "IEC 62351 / IPsec tunnel"] })
    .asset("ofw", "industrial-firewall", COL(1), 290, "Onboard Firewall", { ip: "10.128.0.2", criticality: "high" })
    .asset("diag", "server", COL(2), 290, "Onboard Diagnostics Server", { ip: "10.128.0.10", protocols: ["TRDP", "MQTT/TLS"] })
    .asset("ids", "ids-sensor", COL(3), 290, "Onboard IDS", { ip: "10.128.0.20" });

  b.asset("pis", "pis", 70, 500, "Passenger Information", { ip: "10.128.10.10" })
    .asset("cctv", "cctv-nvr", 310, 500, "CCTV NVR", { ip: "10.128.10.20" });

  b.asset("ecn", "ecn-switch", 610, 500, "ECN Switch (Car A)", { ip: "10.128.20.2" })
    .asset("etbn", "etbn", 850, 500, "ETBN (Consist Router)", { ip: "10.128.20.1", criticality: "high" })
    .asset("ccu", "tcms-ccu", 1090, 500, "TCMS CCU", { ip: "10.128.20.10", criticality: "critical", slCapability: "SL 2" })
    .asset("ddu", "hmi", 1330, 500, "Driver Display Unit", { ip: "10.128.20.20", criticality: "high", protocols: ["TRDP"] })
    .asset("dcu", "door-controller", 610, 680, "Door Control Unit", { ip: "10.128.20.30", criticality: "high" })
    .asset("tcu", "traction-control", 850, 680, "Traction Control Unit", { ip: "10.128.20.40", criticality: "high" })
    .asset("mvbg", "mvb-gateway", 1090, 680, "MVB Gateway (legacy)", { ip: "10.128.20.50" })
    .asset("cm", "condition-monitor", 1330, 680, "Bogie Condition Monitor", { ip: "10.128.20.60", protocols: ["CAN", "TRDP"], notes: "CAN signals can be stimulated with RailCAN for testing" });

  b.asset("diode", "data-diode", 1630, 500, "Safety Status Gateway (one-way)", { ip: "10.128.30.1", criticality: "high" })
    .asset("bcu", "brake-control", 1850, 500, "Brake Control Unit", { ip: "10.128.30.10", criticality: "critical" })
    .asset("evc", "etcs-evc", 1850, 680, "ETCS Onboard (EVC)", { ip: "10.128.30.20", criticality: "critical" });

  // Flows
  b.flow("diag", "fleet", ["MQTT/TLS"], { via: ["tgw"], conduit: "C-T2G" })
    .flow("oem", "diag", ["HTTPS"], { via: ["tgw"], encrypted: true, authenticated: true, notes: "Certificate-based, depot-only window" })
    .flow("ap", "inet", ["HTTPS"], { via: ["tgw"], notes: "Passenger traffic is isolated from the ECN" })
    .flow("pis", "diag", ["HTTPS"], { via: ["ofw"], notes: "Pulls timetable and media cached by the onboard server" })
    .flow("ccu", "diag", ["TRDP"], { via: ["ofw"], conduit: "C-TCMS-T2G", notes: "Finding expected: TRDP has no built-in security" })
    .flow("cm", "diag", ["TRDP"], { via: ["ofw"], conduit: "C-TCMS-T2G" })
    .flow("ccu", "pis", ["TRDP"], { via: ["ofw"], notes: "Location and next-stop data" })
    .flow("ddu", "ccu", ["TRDP"], { direction: "bidirectional" })
    .flow("ccu", "dcu", ["TRDP"])
    .flow("ccu", "tcu", ["TRDP"])
    .flow("ccu", "mvbg", ["TRDP"], { direction: "bidirectional" })
    .flow("tcu", "cm", ["CAN"])
    .flow("ccu", "etbn", ["TRDP"], { direction: "bidirectional", notes: "Train inauguration and train-wide process data" })
    .flow("bcu", "ccu", ["TRDP"], { via: ["diode"], notes: "Brake status published one-way. Brake demand is hard-wired." })
    .flow("evc", "ccu", ["TRDP"], { via: ["diode"] })
    .flow("evc", "ddu", ["TRDP"], { via: ["diode"], notes: "DMI data one-way" });

  b.link("tgw", "ofw").link("ofw", "diag").link("ofw", "ecn", { media: "copper" }).link("ofw", "pis").link("ofw", "cctv").link("ap", "tgw", { media: "copper" })
    .link("ecn", "etbn", { redundancy: "LAG" }).link("ecn", "ccu", { redundancy: "LAG" }).link("ecn", "ddu").link("ecn", "dcu").link("ecn", "tcu").link("ecn", "mvbg").link("ecn", "cm")
    .link("diode", "ecn").link("diode", "bcu").link("diode", "evc")
    .link("ids", "ofw", { notes: "SPAN of all inside ports" }).link("ids", "ecn", { notes: "SPAN" });

  return b.build("rail-tcms", "Train TCMS and on-board networks", "Rail / rolling stock",
    "IEC 61375 ECN/ETB, TCMS CCU, safety subsystems behind a one-way gateway, passenger services split from control, and train-to-ground via a gateway (CLC/TS 50701 style zoning).");
}

// ---------------------------------------------------------------------------
// 6. Rail wayside signalling (ETCS Level 2 + interlocking)
// ---------------------------------------------------------------------------
function signalling(): ArchitectureTemplate {
  const b = new Builder();
  b.zone("z-train", "Trains (radio)", 40, 30, 500, 170, { zoneType: "external" })
    .zone("z-cc", "Rail Operating Centre", 580, 30, 980, 170, { securityLevelTarget: "SL 2", subnet: "10.70.0.0/24" })
    .zone("z-dmz", "Signalling DMZ", 40, 240, 1520, 170, { zoneType: "dmz", securityLevelTarget: "SL 2", subnet: "10.71.0.0/24" })
    .zone("z-vital", "Interlocking & RBC (SIL 4)", 40, 450, 740, 360, { zoneType: "safety", securityLevelTarget: "SL 3", subnet: "10.72.0.0/24" })
    .zone("z-track", "Trackside Objects (SIL 4)", 820, 450, 740, 360, { zoneType: "safety", securityLevelTarget: "SL 3", subnet: "10.73.0.0/24" })
    .zone("z-maint", "Maintenance", 40, 850, 740, 170, { securityLevelTarget: "SL 2", subnet: "10.74.0.0/24" });

  b.asset("evc", "etcs-evc", COL(0), 80, "ETCS Onboard (EVC)", { criticality: "critical" })
    .asset("tms", "traffic-management", 610, 80, "Traffic Management", { ip: "10.70.0.10", criticality: "high" })
    .asset("sw", "hmi", 850, 80, "Signaller Workstation", { ip: "10.70.0.20", criticality: "high", purdueLevel: 3 })
    .asset("logr", "historian", 1090, 80, "Event Recorder", { ip: "10.70.0.30" })
    .asset("ids", "ids-sensor", 1330, 80, "Signalling IDS", { ip: "10.70.0.40" });

  b.asset("rng", "vpn-gateway", COL(0), 290, "GSM-R / FRMCS Gateway", { ip: "10.71.0.1", criticality: "high" })
    .asset("vfw", "industrial-firewall", COL(1), 290, "Vital Boundary Firewall", { ip: "10.71.0.2", criticality: "high" })
    .asset("tfw", "industrial-firewall", COL(2), 290, "Trackside Boundary Firewall", { ip: "10.71.0.3", criticality: "high" })
    .asset("jump", "jump-host", COL(3), 290, "Maintenance Jump Host", { ip: "10.71.0.10" })
    .asset("log", "syslog", COL(4), 290, "Log Collector", { ip: "10.71.0.20" });

  b.asset("ixl", "interlocking", COL(0), 500, "Computer-Based Interlocking", { ip: "10.72.0.10", criticality: "critical", slCapability: "SL 3" })
    .asset("rbc", "rbc", COL(1), 500, "Radio Block Centre", { ip: "10.72.0.20", criticality: "critical", slCapability: "SL 3" })
    .asset("vsw", "industrial-switch", COL(0), 680, "Vital LAN Switch", { ip: "10.72.0.2" });

  b.asset("oc1", "object-controller", 850, 500, "Object Controller – Points", { ip: "10.73.0.10", criticality: "critical" })
    .asset("oc2", "object-controller", 1090, 500, "Object Controller – Signals", { ip: "10.73.0.11", criticality: "critical" })
    .asset("axc", "axle-counter", 1330, 500, "Axle Counter Evaluator", { ip: "10.73.0.20", criticality: "critical" })
    .asset("tsw", "industrial-switch", 850, 680, "Trackside Ring Switch", { ip: "10.73.0.2" });

  b.asset("mt", "maintainer-terminal", COL(0), 900, "Maintainer Terminal", { ip: "10.74.0.10" })
    .asset("ews", "engineering-ws", COL(1), 900, "Data Prep Workstation", { ip: "10.74.0.20" });

  b.flow("evc", "rbc", ["Subset-037 (EuroRadio)"], { direction: "bidirectional", via: ["rng"], authenticated: true, notes: "EuroRadio safe connection (MAC-protected)" })
    .flow("tms", "ixl", ["Interlocking proprietary"], { via: ["vfw"], authenticated: true, notes: "Route-setting requests; EN 50159 safety layer. Finding expected: non-safety initiates." })
    .flow("ixl", "sw", ["Interlocking proprietary"], { via: ["vfw"], authenticated: true, notes: "Indications" })
    .flow("ixl", "rbc", ["Interlocking proprietary"], { direction: "bidirectional", authenticated: true })
    .flow("ixl", "oc1", ["Interlocking proprietary"], { direction: "bidirectional", via: ["tfw"], authenticated: true })
    .flow("ixl", "oc2", ["Interlocking proprietary"], { direction: "bidirectional", via: ["tfw"], authenticated: true })
    .flow("axc", "ixl", ["Interlocking proprietary"], { via: ["tfw"], authenticated: true })
    .flow("ixl", "logr", ["Syslog/TLS"], { via: ["vfw"] })
    .flow("sw", "tms", ["HTTPS"], { direction: "bidirectional" })
    .flow("mt", "jump", ["RDP"], { via: ["tfw"] })
    .flow("jump", "axc", ["HTTPS"], { via: ["tfw"], notes: "Read-only diagnostics. Finding expected." })
    .flow("ews", "jump", ["SFTP"], { via: ["tfw"] })
    .flow("log", "logr", ["Syslog/TLS"], { via: ["vfw"] })
    .flow("ids", "log", ["Syslog/TLS"], { via: ["vfw"] });

  b.link("rng", "vfw", { media: "fibre" }).link("vfw", "vsw", { media: "fibre" }).link("vsw", "ixl", { redundancy: "PRP" }).link("vsw", "rbc", { redundancy: "PRP" })
    .link("tfw", "tsw", { media: "fibre" }).link("tsw", "oc1", { media: "fibre", redundancy: "RSTP" }).link("tsw", "oc2", { media: "fibre", redundancy: "RSTP" }).link("tsw", "axc", { media: "fibre", redundancy: "RSTP" })
    .link("ids", "vfw", { notes: "SPAN" }).link("ids", "tfw", { notes: "SPAN" }).link("ids", "vsw", { notes: "SPAN" }).link("ids", "tsw", { notes: "SPAN" });

  return b.build("rail-signalling", "Rail signalling (ETCS L2 + interlocking)", "Rail / infrastructure",
    "SIL 4 interlocking and RBC in a vital zone, trackside object controllers behind their own boundary, EuroRadio over GSM-R/FRMCS and brokered maintainer access.");
}

// ---------------------------------------------------------------------------
// 7. Training: deliberately flawed flat network
// ---------------------------------------------------------------------------
function flawed(): ArchitectureTemplate {
  const b = new Builder();
  b.zone("z-flat", "Plant Network (flat)", 40, 30, 1240, 560, { subnet: "192.168.1.0/24" })
    .zone("z-net", "Internet", 1320, 30, 500, 360, { zoneType: "external" });

  b.asset("pc", "enterprise-client", COL(0), 80, "Office PC", { ip: "192.168.1.50" })
    .asset("ews", "engineering-ws", COL(1), 80, "Engineering Laptop", { ip: "192.168.1.60", protocols: ["Modbus TCP", "Telnet"], criticality: "high" })
    .asset("scada", "scada", COL(2), 80, "SCADA", { ip: "192.168.1.10", criticality: "high" })
    .asset("hist", "historian", COL(3), 80, "Historian", { ip: "192.168.1.10" })
    .asset("ap", "wireless-ap", COL(4), 80, "Wi-Fi AP", { ip: "192.168.1.2", protocols: ["HTTP"] })
    .asset("sw", "switch", COL(0), 260, "Core Switch", { ip: "192.168.1.1", purdueLevel: 3, protocols: ["Telnet", "SNMPv2c"] })
    .asset("plc", "plc", COL(1), 260, "Main PLC", { ip: "192.168.1.100", criticality: "critical", slCapability: "SL 1" })
    .asset("sis", "sis-controller", COL(2), 260, "SIS Controller", { ip: "192.168.1.110", criticality: "critical" })
    .asset("hmi", "hmi", COL(3), 260, "Panel HMI", { ip: "192.168.1.120" })
    .asset("diode", "data-diode", COL(4), 260, "Data Diode", { ip: "192.168.1.200" })
    .asset("vfd", "vfd", COL(1), 440, "Drive", { ip: "192.168.1.130" })
    .asset("cam", "workstation", 1100, 650, "Forgotten Test PC", { ip: "10.0.0.5/24" })
    .asset("tv", "vendor-remote", 1350, 80, "Vendor (remote tool)")
    .asset("cloud", "cloud-service", 1350, 260, "Cloud Dashboard");

  b.flow("pc", "scada", ["HTTP"])
    .flow("tv", "ews", ["TCP/IP"], { notes: "Unmanaged remote-desktop tool" })
    .flow("ews", "plc", ["Modbus TCP"])
    .flow("ews", "sw", ["Telnet"])
    .flow("pc", "plc", ["Modbus TCP"])
    .flow("scada", "sis", ["Modbus TCP"], { direction: "bidirectional" })
    .flow("plc", "cloud", ["MQTT"])
    .flow("cloud", "hmi", ["HTTP"])
    .flow("hist", "diode", ["SQL"], { direction: "bidirectional" })
    .flow("plc", "vfd", ["PROFINET"])
    .flow("scada", "plc", ["Modbus TCP"]);

  b.link("sw", "pc").link("sw", "ews").link("sw", "scada").link("sw", "hist").link("sw", "plc").link("sw", "sis")
    .link("sw", "hmi").link("ap", "sw", { media: "wireless" }).link("ap", "sis", { media: "wireless", notes: "Someone bridged the SIS for convenience" });

  return b.build("flawed-flat", "Training: flat network (deliberately insecure)", "Training",
    "A realistic bad design with flat zoning, direct vendor access, SIS on the plant LAN, clear-text management, a misused diode and duplicate addresses. Find and fix the issues.");
}

export const TEMPLATES: ArchitectureTemplate[] = [
  purdue(),
  substation(),
  water(),
  windFarm(),
  trainTcms(),
  signalling(),
  flawed()
];
