#!/usr/bin/env node
/*
 * OT Network Studio CLI — runs the same analysis engine as the web app.
 *
 *   npm run otns -- check   project.otns.json [--fail-on high] [--json]
 *   npm run otns -- summary project.otns.json
 *   npm run otns -- matrix  project.otns.json [--cross-zone] [-o rules.csv]
 *   npm run otns -- report  project.otns.json [-o report.md]
 *   npm run otns -- export  project.otns.json --what inventory|conduits|zones|findings [-o file.csv]
 *   npm run otns -- template <id> [-o file.otns.json]     (list ids with: template list)
 *
 * Exit codes: 0 ok, 1 findings at/above --fail-on, 2 usage or input error.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { normaliseProject, toPersisted } from "../src/engine/migrate";
import { analyse, conduitsCsv, findingsCsv, inventoryCsv, markdownReport, matrixCsv, zonesCsv } from "../src/engine/exporters";
import { buildRuleMatrix } from "../src/engine/matrix";
import { SEVERITY_ORDER, countBySeverity, type Severity } from "../src/engine/rules";
import { TEMPLATES } from "../src/data/templates";

const args = process.argv.slice(2);
const command = args[0];
const flag = (name: string) => args.includes(name);
const option = (...names: string[]) => {
  for (const n of names) { const i = args.indexOf(n); if (i >= 0 && args[i + 1]) return args[i + 1]; }
  return undefined;
};

function usage(code = 2): never {
  console.error("usage: otns <check|summary|matrix|report|export|template> <project.otns.json|template-id> [options]");
  process.exit(code);
}

function out(text: string) {
  const file = option("-o", "--output");
  if (file) { writeFileSync(file, text, "utf8"); console.error(`wrote ${file}`); }
  else process.stdout.write(text.endsWith("\n") ? text : text + "\n");
}

if (!command || command === "-h" || command === "--help") usage(command ? 0 : 2);

if (command === "template") {
  const id = args[1];
  if (!id || id === "list") {
    for (const t of TEMPLATES) console.log(`${t.id.padEnd(18)} ${t.name}  [${t.sector}]`);
    process.exit(0);
  }
  const t = TEMPLATES.find((x) => x.id === id);
  if (!t) { console.error(`unknown template: ${id}`); process.exit(2); }
  out(JSON.stringify(toPersisted(t.name, t.nodes, t.edges, t.description), null, 2));
  process.exit(0);
}

const file = args[1];
if (!file) usage();
let project;
try {
  const result = normaliseProject(JSON.parse(readFileSync(file, "utf8")));
  project = result.project;
  for (const w of result.warnings) console.error(`warning: ${w}`);
} catch (error) {
  console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(2);
}

const analysis = analyse(project);

switch (command) {
  case "check": {
    const failOn = (option("--fail-on") ?? "critical") as Severity;
    if (!SEVERITY_ORDER.includes(failOn)) { console.error(`--fail-on must be one of ${SEVERITY_ORDER.join(", ")}`); process.exit(2); }
    if (flag("--json")) out(JSON.stringify({ score: analysis.score, counts: countBySeverity(analysis.findings), findings: analysis.findings }, null, 2));
    else {
      const counts = countBySeverity(analysis.findings);
      console.log(`${project.name}: score ${analysis.score}/100 · ${SEVERITY_ORDER.map((s) => `${counts[s]} ${s}`).join(" · ")}`);
      for (const f of analysis.findings) console.log(`  [${f.severity.toUpperCase().padEnd(8)}] ${f.ruleId}  ${f.message}`);
    }
    const threshold = SEVERITY_ORDER.indexOf(failOn);
    const failing = analysis.findings.filter((f) => SEVERITY_ORDER.indexOf(f.severity) <= threshold).length;
    process.exit(failing > 0 ? 1 : 0);
  }
  case "summary": {
    const counts = countBySeverity(analysis.findings);
    const { model } = analysis;
    out([
      `Project:   ${project.name}`,
      `Assets:    ${model.assets.size}`,
      `Zones:     ${model.zones.size}`,
      `Flows:     ${model.flows.length} enabled (${model.allEdges.filter((e) => e.data.kind === "flow").length} total)`,
      `Links:     ${model.links.length} enabled`,
      `Conduits:  ${analysis.conduits.length}`,
      `Rules:     ${analysis.matrix.length} firewall rule rows`,
      `Score:     ${analysis.score}/100`,
      `Findings:  ${SEVERITY_ORDER.map((s) => `${counts[s]} ${s}`).join(", ")}`
    ].join("\n"));
    break;
  }
  case "matrix":
    out(matrixCsv(buildRuleMatrix(analysis.model, { crossZoneOnly: flag("--cross-zone") })));
    break;
  case "report":
    out(markdownReport(project, analysis));
    break;
  case "export": {
    const what = option("--what");
    const map: Record<string, () => string> = {
      inventory: () => inventoryCsv(analysis.model),
      conduits: () => conduitsCsv(analysis.conduits),
      zones: () => zonesCsv(analysis.zones),
      findings: () => findingsCsv(analysis.findings),
      matrix: () => matrixCsv(analysis.matrix)
    };
    if (!what || !map[what]) { console.error(`--what must be one of ${Object.keys(map).join(", ")}`); process.exit(2); }
    out(map[what]());
    break;
  }
  default:
    usage();
}
