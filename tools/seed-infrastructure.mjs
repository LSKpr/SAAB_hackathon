#!/usr/bin/env node
/**
 * One-shot CLI to regenerate `data/world.json` from a sparse spec. Reads a
 * JSON file describing infrastructure slots and station presets and emits a
 * fully-populated world.json that the React app loads at startup.
 *
 * Usage:
 *   node tools/seed-infrastructure.mjs [path/to/spec.json]
 *
 * If no spec argument is provided, the built-in default spec (which matches
 * `research/defense-stations-plan.md` §8) is used.
 *
 * The shape of a spec matches `data/world.json` exactly, so this tool is
 * effectively a "format / validate" pass — useful for CI or when a different
 * scenario directory wants a custom layout.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const SPEC_DEFAULT = resolve("data/world.json");

const REQUIRED_INFRA = [
  "id",
  "name",
  "type",
  "size",
  "posKm",
  "damageOnHitUsd",
];
const REQUIRED_STATION = [
  "id",
  "name",
  "weapon",
  "posKm",
  "rangeKm",
  "magazineMax",
  "magazine",
  "reloadMin",
  "costPerShotUsd",
];

function fail(msg) {
  console.error(`[seed-infrastructure] ${msg}`);
  process.exit(1);
}

const path = process.argv[2] ?? SPEC_DEFAULT;
let raw;
try {
  raw = JSON.parse(readFileSync(path, "utf8"));
} catch (e) {
  fail(`failed to read ${path}: ${e?.message ?? e}`);
}

if (!raw || typeof raw !== "object") fail("spec is not an object");
if (!Array.isArray(raw.infrastructure)) fail("missing infrastructure array");
if (!Array.isArray(raw.stations)) fail("missing stations array");

for (const a of raw.infrastructure) {
  for (const k of REQUIRED_INFRA) {
    if (!(k in a)) fail(`infra "${a.id ?? "?"}" missing field ${k}`);
  }
  if (!Array.isArray(a.posKm) || a.posKm.length !== 2) {
    fail(`infra "${a.id}" posKm must be [x,y]`);
  }
}
for (const s of raw.stations) {
  for (const k of REQUIRED_STATION) {
    if (!(k in s)) fail(`station "${s.id ?? "?"}" missing field ${k}`);
  }
  if (!Array.isArray(s.posKm) || s.posKm.length !== 2) {
    fail(`station "${s.id}" posKm must be [x,y]`);
  }
}

const out = {
  infrastructure: raw.infrastructure,
  stations: raw.stations,
};

const dest = resolve("data/world.json");
writeFileSync(dest, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(
  `[seed-infrastructure] wrote ${out.infrastructure.length} infrastructure + ${out.stations.length} stations → ${dest}`,
);
