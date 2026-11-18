"""Tests for the stdlib Python CLI. Run: python -m unittest discover -s tools"""

import json
import tempfile
import unittest
from pathlib import Path

import otns_cli as cli

V2 = {
    "schemaVersion": 2,
    "name": "Test",
    "nodes": [
        {"id": "z1", "type": "zone", "position": {"x": 0, "y": 0}, "style": {"width": 600, "height": 300},
         "data": {"kind": "zone", "title": "Control", "zoneType": "zone", "securityLevelTarget": "SL 2"}},
        {"id": "z2", "type": "zone", "position": {"x": 20, "y": 20}, "style": {"width": 250, "height": 200},
         "data": {"kind": "zone", "title": "Safety", "zoneType": "safety", "securityLevelTarget": "SL 3"}},
        {"id": "a", "type": "asset", "position": {"x": 40, "y": 60},
         "data": {"kind": "asset", "title": "SIS", "assetType": "sis-controller", "category": "Safety / SIS", "protocols": [], "criticality": "critical"}},
        {"id": "b", "type": "asset", "position": {"x": 350, "y": 60},
         "data": {"kind": "asset", "title": "=PLC", "assetType": "plc", "category": "OT Control", "protocols": ["Modbus TCP"], "criticality": "high"}},
        {"id": "c", "type": "asset", "position": {"x": 1000, "y": 1000},
         "data": {"kind": "asset", "title": "Loose", "assetType": "server", "category": "Compute", "protocols": [], "criticality": "low"}},
    ],
    "edges": [
        {"id": "e1", "source": "a", "target": "b", "data": {"kind": "flow", "protocols": ["Modbus TCP"], "direction": "forward", "enabled": True}},
        {"id": "e2", "source": "a", "target": "b", "data": {"kind": "link", "protocols": [], "direction": "bidirectional", "enabled": True}},
    ],
}


class CliTests(unittest.TestCase):
    def test_valid_v2(self):
        self.assertEqual(cli.validate_project(V2), [])

    def test_invalid(self):
        bad = json.loads(json.dumps(V2))
        bad["edges"][0]["target"] = "missing"
        bad["edges"][1]["data"]["kind"] = "cable"
        bad["nodes"][0]["data"]["securityLevelTarget"] = "SL 9"
        errors = cli.validate_project(bad)
        self.assertTrue(any("unknown target" in e for e in errors))
        self.assertTrue(any("'flow' or 'link'" in e for e in errors))
        self.assertTrue(any("securityLevelTarget" in e for e in errors))

    def test_v1_still_valid(self):
        v1 = {"schemaVersion": 1, "name": "Old", "nodes": [], "edges": []}
        self.assertEqual(cli.validate_project(v1), [])

    def test_membership_smallest_zone_wins(self):
        self.assertEqual(cli.zone_membership(V2), {"a": "Safety", "b": "Control", "c": None})

    def test_summary_and_report(self):
        summary = cli.project_summary(V2)
        self.assertIn("Flows: 1", summary)
        self.assertIn("Links: 1", summary)
        self.assertIn("Unzoned: 1", summary)
        report = cli.markdown_report(V2)
        self.assertIn("| Safety | safety | SL 3 |", report)

    def test_inventory_csv_neutralises_formulas(self):
        text = cli.inventory_csv(V2)
        self.assertIn("'=PLC", text)

    def test_main_exit_codes(self):
        with tempfile.TemporaryDirectory() as tmp:
            good = Path(tmp) / "good.json"
            good.write_text(json.dumps(V2), encoding="utf-8")
            self.assertEqual(cli.main(["validate", str(good)]), 0)
            bad = Path(tmp) / "bad.json"
            bad.write_text("{not json", encoding="utf-8")
            self.assertEqual(cli.main(["summary", str(bad)]), 2)
            out = Path(tmp) / "r.md"
            self.assertEqual(cli.main(["report", str(good), "-o", str(out)]), 0)
            self.assertTrue(out.read_text(encoding="utf-8").startswith("# Test"))


if __name__ == "__main__":
    unittest.main()
