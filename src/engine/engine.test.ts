import { describe, expect, it } from "vitest";
import type { AssetData, EdgeData, ProjectEdge, ProjectNode, ZoneData } from "../types";
import { TEMPLATES } from "../data/templates";
import { getAssetDefinition } from "../data/catalog";
import { buildModel, ipInSubnet, parseIPv4 } from "./model";
import { normaliseProject, toPersisted } from "./migrate";
import { runRules, postureScore } from "./rules";
import { buildConduits, buildRuleMatrix, buildZoneRegister } from "./matrix";
import { attackPath, simulate } from "./simulate";
import { analyse, csvCell, inventoryCsv, markdownReport, matrixCsv } from "./exporters";

// ---------- tiny builders ----------
const zone = (id: string, x: number, y: number, w: number, h: number, extra: Partial<ZoneData> = {}): ProjectNode => ({
  id, type: "zone", position: { x, y }, style: { width: w, height: h }, zIndex: -1,
  data: { kind: "zone", title: id, zoneType: "zone", securityLevelTarget: "SL 2", ...extra }
});
const asset = (id: string, type: string, x: number, y: number, extra: Partial<AssetData> = {}): ProjectNode => {
  const def = getAssetDefinition(type)!;
  return {
    id, type: "asset", position: { x, y },
    data: { kind: "asset", title: id, assetType: type, category: def.category, status: "online", protocols: [], purdueLevel: def.defaultPurdueLevel, criticality: "medium", ...extra }
  };
};
let n = 0;
const flow = (s: string, t: string, protocols: string[], extra: Partial<EdgeData> = {}): ProjectEdge => ({
  id: `e${++n}`, source: s, target: t, data: { kind: "flow", protocols, direction: "forward", enabled: true, ...extra }
});
const link = (s: string, t: string, extra: Partial<EdgeData> = {}): ProjectEdge => ({
  id: `l${++n}`, source: s, target: t, data: { kind: "link", protocols: [], direction: "bidirectional", media: "copper", redundancy: "none", enabled: true, ...extra }
});
const ruleIds = (nodes: ProjectNode[], edges: ProjectEdge[]) => runRules(buildModel(nodes, edges)).map((f) => f.ruleId);

// Two zones side by side: A (0..500) and B (600..1100)
const twoZones = () => [zone("A", 0, 0, 500, 300), zone("B", 600, 0, 500, 300)];

describe("model", () => {
  it("derives zone membership from geometry, smallest zone wins", () => {
    const nodes = [zone("outer", 0, 0, 1000, 600), zone("inner", 100, 100, 400, 300), asset("p", "plc", 150, 150), asset("h", "hmi", 700, 400), asset("x", "server", 2000, 2000)];
    const m = buildModel(nodes, []);
    expect(m.assets.get("p")!.zoneId).toBe("inner");
    expect(m.assets.get("h")!.zoneId).toBe("outer");
    expect(m.assets.get("x")!.zoneId).toBeUndefined();
    expect(m.zones.get("inner")!.parentId).toBe("outer");
  });

  it("classifies cross-zone edges and ignores disabled edges for analysis", () => {
    const nodes = [...twoZones(), asset("a", "scada", 50, 50), asset("b", "plc", 650, 50)];
    const m = buildModel(nodes, [flow("a", "b", ["Modbus TCP"]), flow("a", "b", ["OPC UA"], { enabled: false })]);
    expect(m.allEdges).toHaveLength(2);
    expect(m.flows).toHaveLength(1);
    expect(m.flows[0].crossZone).toBe(true);
  });

  it("parses IPv4 and checks subnets", () => {
    expect(parseIPv4("10.1.2.3/24")).toEqual({ address: 0x0a010203, prefix: 24 });
    expect(parseIPv4("300.1.1.1")).toBeNull();
    expect(parseIPv4("10.1.2")).toBeNull();
    expect(ipInSubnet(parseIPv4("10.1.2.99")!, parseIPv4("10.1.2.0/24")!)).toBe(true);
    expect(ipInSubnet(parseIPv4("10.1.3.1")!, parseIPv4("10.1.2.0/24")!)).toBe(false);
    expect(ipInSubnet(parseIPv4("10.63.4.1")!, parseIPv4("10.63.0.0/16")!)).toBe(true);
  });
});

describe("migration", () => {
  it("upgrades a v1 project", () => {
    const v1 = {
      schemaVersion: 1, name: "Old",
      nodes: [
        { id: "z", type: "zone", position: { x: 0, y: 0 }, style: { width: 400, height: 300 }, data: { kind: "zone", title: "Z", zoneType: "iec62443", securityLevelTarget: "SL 2" } },
        { id: "a", type: "asset", position: { x: 10, y: 10 }, data: { kind: "asset", title: "A", assetType: "ied", category: "Field / Process", status: "online", protocols: ["IEC 61850"], criticality: "high", zone: "Bay" } },
        { id: "b", type: "asset", position: { x: 200, y: 10 }, data: { kind: "asset", title: "B", assetType: "plc", category: "OT Control", status: "online", protocols: [], criticality: "medium" } }
      ],
      edges: [{ id: "e", source: "a", target: "b", label: "x", data: { protocols: ["IEC 61850"] } }, { id: "bad", source: "a", target: "nope" }]
    };
    const { project, warnings } = normaliseProject(v1);
    expect(project.schemaVersion).toBe(2);
    expect(project.nodes[0].data).toMatchObject({ kind: "zone", zoneType: "zone" });
    expect((project.nodes[1].data as AssetData).protocols).toEqual(["IEC 61850 MMS"]);
    expect(project.edges).toHaveLength(1);
    expect(project.edges[0].data).toMatchObject({ kind: "flow", direction: "forward", enabled: true, protocols: ["IEC 61850 MMS"] });
    expect(warnings.some((w) => w.includes("schema v1"))).toBe(true);
    expect(warnings.some((w) => w.includes('"zone" field'))).toBe(true);
    expect(warnings.some((w) => w.includes("edges[1] skipped"))).toBe(true);
  });

  it("rejects garbage", () => {
    expect(() => normaliseProject(null)).toThrow();
    expect(() => normaliseProject({ schemaVersion: 9, nodes: [], edges: [] })).toThrow(/schemaVersion/);
    expect(() => normaliseProject({ schemaVersion: 2, nodes: {}, edges: [] })).toThrow(/nodes/);
  });

  it("round-trips through toPersisted", () => {
    const t = TEMPLATES[0];
    const persisted = toPersisted(t.name, t.nodes, t.edges);
    const { project, warnings } = normaliseProject(JSON.parse(JSON.stringify(persisted)));
    expect(warnings).toEqual([]);
    expect(project.nodes).toHaveLength(t.nodes.length);
    expect(project.edges).toHaveLength(t.edges.length);
  });
});

describe("rules", () => {
  it("SEG-001: cross-zone flow without boundary is flagged; via firewall, endpoint firewall or physical path is OK", () => {
    const base = [...twoZones(), asset("a", "scada", 50, 50), asset("b", "plc", 650, 50), asset("fw", "industrial-firewall", 650, 180)];
    expect(ruleIds(base, [flow("a", "b", ["OPC UA"])])).toContain("SEG-001");
    expect(ruleIds(base, [flow("a", "b", ["OPC UA"], { via: ["fw"] })])).not.toContain("SEG-001");
    expect(ruleIds(base, [flow("a", "fw", ["OPC UA"])])).not.toContain("SEG-001");
    expect(ruleIds(base, [flow("a", "b", ["OPC UA"]), link("a", "fw"), link("fw", "b")])).not.toContain("SEG-001");
  });

  it("SEG-002: enterprise to control level", () => {
    const nodes = [zone("A", 0, 0, 1200, 300), asset("pc", "enterprise-client", 50, 50), asset("plc", "plc", 400, 50)];
    const f = runRules(buildModel(nodes, [flow("pc", "plc", ["Modbus TCP"])]));
    expect(f.find((x) => x.ruleId === "SEG-002")?.severity).toBe("high");
  });

  it("SEG-003: L4 ↔ L3 needs a DMZ intermediary", () => {
    const nodes = [zone("A", 0, 0, 1200, 300), asset("pc", "enterprise-client", 50, 50), asset("s", "scada", 400, 50), asset("r", "dmz-app", 700, 50)];
    expect(ruleIds(nodes, [flow("pc", "s", ["HTTPS"])])).toContain("SEG-003");
    expect(ruleIds(nodes, [flow("pc", "r", ["HTTPS"])])).not.toContain("SEG-003");
  });

  it("SAF-001/002/003: safety zoning and access", () => {
    const nodes = [zone("A", 0, 0, 1200, 300), asset("sis", "sis-controller", 50, 50), asset("plc", "plc", 300, 50), asset("pc", "enterprise-client", 600, 50)];
    const ids = ruleIds(nodes, [flow("plc", "sis", ["Modbus TCP"]), flow("sis", "pc", ["HTTPS"])]);
    expect(ids).toContain("SAF-001");
    expect(ids).toContain("SAF-002");
    expect(ids).toContain("SAF-003");
  });

  it("RA-001: remote entry straight to OT; downgraded through a protected conduit", () => {
    const nodes = [...twoZones(), asset("v", "vendor-remote", 50, 50), asset("e", "engineering-ws", 650, 50), asset("fw", "firewall", 650, 180)];
    const direct = runRules(buildModel(nodes, [flow("v", "e", ["RDP"])]));
    expect(direct.find((f) => f.ruleId === "RA-001")?.severity).toBe("high");
    const prot = runRules(buildModel(nodes, [flow("v", "e", ["RDP"], { via: ["fw"], encrypted: true, authenticated: true })]));
    expect(prot.find((f) => f.ruleId === "RA-001")?.severity).toBe("low");
  });

  it("PRO-001/002/003/004/005", () => {
    const nodes = [...twoZones(), asset("a", "scada", 50, 50), asset("b", "plc", 650, 50), asset("fw", "industrial-firewall", 650, 180), asset("d", "data-diode", 300, 50)];
    const ids = ruleIds(nodes, [
      flow("a", "b", ["Modbus TCP"], { via: ["fw"] }),
      flow("a", "b", ["IEC 61850 GOOSE"], { via: ["fw"] }),
      flow("a", "b", ["Telnet"], { via: ["fw"] }),
      flow("a", "d", ["SQL"], { direction: "bidirectional" }),
      flow("a", "b", ["TCP/IP"], { via: ["fw"] })
    ]);
    for (const id of ["PRO-001", "PRO-002", "PRO-003", "PRO-004", "PRO-005"]) expect(ids).toContain(id);
    // Encryption alone is not evidence of authentication.
    expect(ruleIds(nodes, [flow("a", "b", ["Modbus TCP"], { via: ["fw"], encrypted: true })])).toContain("PRO-001");
    expect(ruleIds(nodes, [flow("a", "b", ["Modbus TCP"], { via: ["fw"], encrypted: true, authenticated: true })])).not.toContain("PRO-001");
  });

  it("addressing rules", () => {
    const nodes = [zone("A", 0, 0, 1200, 300, { subnet: "10.0.0.0/24", vlan: "10" }),
      asset("a", "plc", 50, 50, { ip: "10.0.0.5" }), asset("b", "hmi", 300, 50, { ip: "10.0.0.5" }),
      asset("c", "hmi", 550, 50, { ip: "10.9.9.9", vlan: "20" }), asset("d", "hmi", 800, 50, { ip: "nonsense" })];
    const ids = ruleIds(nodes, []);
    expect(ids).toContain("ADR-001");
    expect(ids).toContain("ADR-002");
    expect(ids).toContain("ADR-003");
    expect(ids).toContain("ADR-004");
  });

  it("monitoring, capability, resilience and hygiene rules", () => {
    const nodes = [zone("A", 0, 0, 1200, 300, { securityLevelTarget: "SL 3" }), zone("Empty", 0, 400, 300, 200, { securityLevelTarget: undefined }),
      asset("p", "plc", 50, 50, { criticality: "critical", slCapability: "SL 1" }), asset("sw", "industrial-switch", 300, 50), asset("x", "server", 2000, 2000)];
    const findings = runRules(buildModel(nodes, [link("p", "sw")]));
    const ids = findings.map((f) => f.ruleId);
    for (const id of ["MON-001", "CAP-001", "RES-001", "SEG-004", "SEG-005", "HYG-001", "HYG-002"]) expect(ids).toContain(id);
    expect(findings.find((f) => f.ruleId === "CAP-001")?.severity).toBe("high");
  });

  it("score falls as findings grow", () => {
    expect(postureScore([])).toBe(100);
    const flawed = TEMPLATES.find((t) => t.id === "flawed-flat")!;
    const good = TEMPLATES.find((t) => t.id === "substation")!;
    expect(analyse(flawed).score).toBeLessThan(analyse(good).score);
  });
});

describe("deliverables", () => {
  it("builds a firewall matrix with ports and both directions for bidirectional flows", () => {
    const nodes = [...twoZones(), asset("a", "scada", 50, 50, { ip: "10.0.0.1/24" }), asset("b", "plc", 650, 50, { ip: "10.1.0.1" }), asset("fw", "industrial-firewall", 650, 180)];
    const m = buildModel(nodes, [flow("a", "b", ["Modbus TCP", "OPC UA"], { via: ["fw"] }), flow("a", "b", ["DNP3"], { direction: "bidirectional", via: ["fw"] }), flow("a", "b", ["S7comm"], { ports: "tcp/1102", via: ["fw"] })]);
    const rows = buildRuleMatrix(m);
    expect(rows).toHaveLength(5);
    expect(rows[0]).toMatchObject({ source: "a", destination: "b", protocol: "Modbus TCP", service: "tcp/502", sourceIp: "10.0.0.1", routedVia: "fw" });
    expect(rows[1].service).toBe("tcp/4840");
    expect(rows.filter((r) => r.protocol === "DNP3").map((r) => r.source)).toEqual(["a", "b"]);
    expect(rows.find((r) => r.protocol === "S7comm")!.service).toBe("tcp/1102");
  });

  it("groups cross-zone flows into conduits and builds the zone register", () => {
    const nodes = [...twoZones(), asset("a", "scada", 50, 50), asset("b", "plc", 650, 50), asset("c", "hmi", 650, 180), asset("fw", "industrial-firewall", 300, 180)];
    const m = buildModel(nodes, [flow("a", "b", ["Modbus TCP"], { via: ["fw"] }), flow("c", "a", ["OPC UA"], { via: ["fw"] })]);
    const conduits = buildConduits(m);
    expect(conduits).toHaveLength(1);
    expect(conduits[0]).toMatchObject({ id: "C-01", flowCount: 2, boundaryDevices: ["fw"], hasInsecure: true });
    const zones = buildZoneRegister(m, conduits);
    expect(zones.find((z) => z.id === "B")).toMatchObject({ assetCount: 2, conduitCount: 1 });
  });

  it("escapes CSV and neutralises formulas", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell("=cmd()")).toBe("'=cmd()");
    expect(csvCell(undefined)).toBe("");
  });

  it("exports CSV and Markdown for every template", () => {
    for (const t of TEMPLATES) {
      const a = analyse(t);
      expect(inventoryCsv(a.model).split("\r\n").length).toBeGreaterThan(2);
      expect(matrixCsv(a.matrix)).toContain("ALLOW");
      const report = markdownReport({ name: t.name, nodes: t.nodes, edges: t.edges }, a);
      expect(report).toContain("## Conduit register");
    }
  });
});

describe("simulation", () => {
  const nodes = [zone("A", 0, 0, 2000, 400), asset("ent", "enterprise-client", 50, 50), asset("fw", "firewall", 300, 50), asset("scada", "scada", 550, 50),
    asset("plc", "plc", 800, 50, { criticality: "critical" }), asset("d", "data-diode", 1050, 50), asset("cloud", "cloud-service", 1300, 50), asset("sis", "sis-controller", 1550, 50)];
  const edges = [flow("ent", "fw", ["HTTPS"]), flow("fw", "scada", ["OPC UA"]), flow("scada", "plc", ["Modbus TCP"]), flow("plc", "d", ["SQL"]), flow("d", "cloud", ["HTTPS"]),
    flow("sis", "plc", ["Modbus TCP"]), link("plc", "sis")];

  it("follows initiating direction in logical mode", () => {
    const r = simulate(buildModel(nodes, edges), ["ent"], { mode: "logical", boundaryHolds: false });
    expect(r.hops.get("plc")).toBe(3);
    expect(r.criticalReached).toEqual(["plc"]);
    expect(r.hops.has("sis")).toBe(false); // sis initiates to plc, not the other way
    expect(attackPath(r, "plc")).toEqual(["ent", "fw", "scada", "plc"]);
  });

  it("cannot go backwards through a diode", () => {
    const r = simulate(buildModel(nodes, edges), ["cloud"], { mode: "logical", boundaryHolds: false });
    expect(r.reached).toEqual([]);
  });

  it("stops at boundary devices when firewalls hold", () => {
    const r = simulate(buildModel(nodes, edges), ["ent"], { mode: "logical", boundaryHolds: true });
    expect(r.reached).toEqual(["fw"]);
  });

  it("uses links both ways in physical mode and ignores disabled edges", () => {
    const m = buildModel(nodes, edges);
    expect(simulate(m, ["plc"], { mode: "physical", boundaryHolds: false }).reached).toEqual(["sis"]);
    const disabled = edges.map((e) => (e.data?.kind === "link" ? { ...e, data: { ...e.data, enabled: false } } : e));
    expect(simulate(buildModel(nodes, disabled), ["plc"], { mode: "physical", boundaryHolds: false }).reached).toEqual([]);
  });
});

describe("templates", () => {
  it.each(TEMPLATES.map((t) => [t.id, t] as const))("%s is valid and fully zoned", (_id, t) => {
    const { warnings } = normaliseProject({ schemaVersion: 2, name: t.name, nodes: t.nodes, edges: t.edges });
    expect(warnings).toEqual([]);
    const m = buildModel(t.nodes, t.edges);
    const unzoned = [...m.assets.values()].filter((a) => !a.zoneId).map((a) => a.id);
    if (t.id === "flawed-flat") expect(unzoned).toEqual(["cam"]);
    else expect(unzoned).toEqual([]);
    expect(new Set(t.nodes.map((x) => x.id)).size).toBe(t.nodes.length);
    expect(new Set(t.edges.map((x) => x.id)).size).toBe(t.edges.length);
  });

  it("reference designs score well and the training design scores badly", () => {
    for (const t of TEMPLATES) {
      const findings = analyse(t).findings;
      const severe = findings.filter((f) => f.severity === "critical").length;
      if (t.id === "flawed-flat") expect(findings.length).toBeGreaterThan(20);
      else expect(severe).toBe(0);
    }
  });
});

// Regression cases for engineering correctness and release 2.0.1.
describe("engineering regression checks", () => {
  it("flags a cross-zone bypass even when the shortest physical path is firewalled", () => {
    const nodes = [...twoZones(), asset("src", "scada", 30, 30), asset("dst", "plc", 630, 30),
      asset("fw", "industrial-firewall", 320, 30), asset("s1", "industrial-switch", 100, 180), asset("s2", "industrial-switch", 350, 180)];
    const edges = [flow("src", "dst", ["Modbus TCP"], { via: ["fw"] }), link("src", "fw"), link("fw", "dst"),
      link("src", "s1"), link("s1", "s2"), link("s2", "dst")];
    const m = buildModel(nodes, edges);
    expect(runRules(m).map((f) => f.ruleId)).toContain("SEG-001");
    expect(buildRuleMatrix(m)[0].routedVia).toBe("UNVERIFIED (physical bypass)");
    expect(buildConduits(m)[0].boundaryDevices).toContain("UNVERIFIED (physical bypass)");
    expect(buildRuleMatrix(m)[0].comment).toContain("bypass");
    // Closing the bypass restores the expected result.
    expect(runRules(buildModel(nodes, edges.slice(0, -1))).map((f) => f.ruleId)).not.toContain("SEG-001");
  });

  it("does not allow via labels to override a directly cabled bypass", () => {
    const nodes = [...twoZones(), asset("src", "scada", 30, 30), asset("dst", "plc", 630, 30), asset("fw", "firewall", 320, 30)];
    expect(ruleIds(nodes, [flow("src", "dst", ["Modbus TCP"], { via: ["fw"] }), link("src", "dst")])).toContain("SEG-001");
  });

  it("preserves independent named conduits between identical zone pairs", () => {
    const nodes = [...twoZones(), asset("a", "scada", 30, 30), asset("b", "plc", 630, 30)];
    const m = buildModel(nodes, [flow("a", "b", ["Modbus TCP"], { conduit: "C-SCADA" }),
      flow("a", "b", ["HTTPS"], { conduit: "C-REMOTE" }), flow("a", "b", ["MQTT/TLS"])]);
    expect(buildConduits(m).map((c) => c.id).sort()).toEqual(["C-01", "C-REMOTE", "C-SCADA"]);
    expect(buildConduits(m).map((c) => c.flowCount)).toEqual([1, 1, 1]);
    expect(buildZoneRegister(m).find((z) => z.id === "A")?.conduitCount).toBe(3);
    expect(buildRuleMatrix(m).map((r) => r.conduit)).toEqual(["C-SCADA", "C-REMOTE", ""]);
  });

  it("never reuses an explicit conduit ID for generated identifiers", () => {
    const nodes = [...twoZones(), asset("a", "scada", 30, 30), asset("b", "plc", 630, 30)];
    const ids = buildConduits(buildModel(nodes, [flow("a", "b", ["HTTPS"], { conduit: "C-01" }), flow("a", "b", ["HTTPS"])])).map((c) => c.id);
    expect(ids.sort()).toEqual(["C-01", "C-02"]);
  });

  it("does not claim that unconfigured OPC UA, DNS, or plain Syslog is secured", () => {
    const nodes = [...twoZones(), asset("a", "scada", 30, 30), asset("b", "plc", 630, 30)];
    for (const p of ["OPC UA", "DNS", "Syslog"]) {
      const m = buildModel(nodes, [flow("a", "b", [p])]);
      expect(buildRuleMatrix(m)[0].secured).toBe(false);
      expect(runRules(m).map((f) => f.ruleId)).toContain("PRO-001");
    }
  });

  it("requires encryption and authentication for positive security assurance", () => {
    const nodes = [...twoZones(), asset("a", "scada", 30, 30), asset("b", "plc", 630, 30)];
    for (const fields of [{ encrypted: true }, { authenticated: true }]) {
      const m = buildModel(nodes, [flow("a", "b", ["Modbus TCP"], fields)]);
      expect(buildRuleMatrix(m)[0].secured).toBe(false);
      expect(buildConduits(m)[0].allProtected).toBe(false);
      expect(ruleIds(nodes, m.allEdges.map((e) => ({ id: e.id, source: e.source, target: e.target, data: e.data })))).toContain("PRO-001");
    }
    const secure = buildModel(nodes, [flow("a", "b", ["Modbus TCP"], { encrypted: true, authenticated: true })]);
    expect(buildRuleMatrix(secure)[0].secured).toBe(true);
    expect(buildConduits(secure)[0].allProtected).toBe(true);
    const tls = buildModel(nodes, [flow("a", "b", ["Syslog/TLS"])]);
    expect(buildRuleMatrix(tls)[0].secured).toBe(true);
    expect(buildConduits(tls)[0].allProtected).toBe(true);
  });

  it("treats authenticated-only DNP3-SA as not necessarily encrypted", () => {
    const nodes = [...twoZones(), asset("a", "scada", 30, 30), asset("b", "plc", 630, 30)];
    expect(buildRuleMatrix(buildModel(nodes, [flow("a", "b", ["DNP3-SA"])]))[0].secured).toBe(false);
  });

  it("rejects duplicate node and edge IDs rather than silently rewiring", () => {
    const nodes = [...twoZones(), asset("a", "plc", 30, 30)];
    const input = { schemaVersion: 2, nodes: [...nodes, nodes[2]], edges: [] };
    expect(() => normaliseProject(input)).toThrow(/Duplicate node id/);
    expect(() => normaliseProject({ schemaVersion: 2, nodes, edges: [flow("a", "a", ["TCP/IP"]),
      { id: `e${n}`, source: "a", target: "a" }] })).toThrow(/Duplicate edge id/);
  });

  it("warns and drops invalid zone endpoints and dangling connections", () => {
    const nodes = [...twoZones(), asset("a", "plc", 30, 30)];
    const result = normaliseProject({ schemaVersion: 2, nodes, edges: [{ id: "zone-edge", source: "A", target: "a" },
      { id: "dangling", source: "a", target: "missing" }] });
    expect(result.project.edges).toHaveLength(0);
    expect(result.warnings.join(" ")).toContain("edges must connect asset nodes");
    expect(result.warnings.join(" ")).toContain("unknown source/target");
  });

  it("rejects equal-sized zone nesting cycles and warns on overlap", () => {
    const nodes = [zone("Z1", 0, 0, 600, 400), zone("Z2", 0, 0, 600, 400), asset("a", "plc", 30, 30)];
    const model = buildModel(nodes, []);
    expect(model.zones.get("Z1")?.parentId).toBeUndefined();
    expect(model.zones.get("Z2")?.parentId).toBeUndefined();
    expect(runRules(model).map((f) => f.ruleId)).toContain("SEG-006");
    expect(normaliseProject({ schemaVersion: 2, nodes, edges: [] }).warnings.join(" ")).toContain("overlap without strict nesting");
  });

  it("flags a single critical link even if marked PRP, HSR or MRP", () => {
    const nodes = [asset("plc", "plc", 0, 0, { criticality: "critical" }), asset("sw", "industrial-switch", 230, 0)];
    for (const redundancy of ["PRP", "HSR", "MRP"] as const) {
      const ids = ruleIds(nodes, [link("plc", "sw", { redundancy })]);
      expect(ids).toContain("RES-001");
      expect(ids).toContain("RES-002");
    }
  });

  it("requires a valid HSR cycle and accepts complete rings", () => {
    const nodes = [asset("plc", "plc", 0, 0, { criticality: "critical" }), asset("sw1", "industrial-switch", 230, 0), asset("sw2", "industrial-switch", 460, 0)];
    const e1 = link("plc", "sw1", { redundancy: "HSR" });
    const e2 = link("plc", "sw2", { redundancy: "HSR" });
    const e3 = link("sw1", "sw2", { redundancy: "HSR" });
    expect(ruleIds(nodes, [e1, e2])).toContain("RES-002");
    expect(ruleIds(nodes, [e1, e2, e3])).not.toContain("RES-002");
  });

  it("accepts two PRP paths only with separate peers", () => {
    const nodes = [asset("plc", "plc", 0, 0, { criticality: "critical" }), asset("sw1", "industrial-switch", 230, 0), asset("sw2", "industrial-switch", 460, 0)];
    const ids = ruleIds(nodes, [link("plc", "sw1", { redundancy: "PRP" }), link("plc", "sw2", { redundancy: "PRP" })]);
    expect(ids).not.toContain("RES-001");
    expect(ids).not.toContain("RES-002");
  });

  it("requires parallel same-peer links for LAG", () => {
    const nodes = [asset("plc", "plc", 0, 0, { criticality: "critical" }), asset("sw1", "industrial-switch", 230, 0), asset("sw2", "industrial-switch", 460, 0)];
    expect(ruleIds(nodes, [link("plc", "sw1", { redundancy: "LAG" }), link("plc", "sw2", { redundancy: "LAG" })])).toContain("RES-002");
    const ids = ruleIds(nodes, [link("plc", "sw1", { redundancy: "LAG" }), link("plc", "sw1", { redundancy: "LAG" })]);
    expect(ids).not.toContain("RES-001");
    expect(ids).not.toContain("RES-002");
  });
});
