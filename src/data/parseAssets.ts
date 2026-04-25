import Papa from "papaparse";
import type { Asset, Side } from "../engine/types";

interface RawRow {
  record_type: string;
  feature_id: string;
  feature_name: string;
  side: string;
  subtype: string;
  location_context: string;
  geometry_type: string;
  notes: string;
  x_km: string;
  y_km: string;
  coordinates_km: string;
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function loadAssetsFromCsv(url: string): Promise<Asset[]> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load CSV: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  return parseAssetsFromCsvText(text);
}

export function parseAssetsFromCsvText(text: string): Asset[] {
  const parsed = Papa.parse<RawRow>(text, {
    header: true,
    skipEmptyLines: true,
  });
  const assets: Asset[] = [];
  for (const row of parsed.data) {
    if (row.record_type !== "location") continue;
    const side = row.side as Side;
    const t = row.subtype;
    if (t !== "air_base" && t !== "capital" && t !== "major_city") continue;
    const ctx = row.location_context;
    const context = ctx === "island" ? "island" : "mainland";
    const x = Number(row.x_km);
    const y = Number(row.y_km);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    assets.push({
      id: slug(row.feature_name),
      name: row.feature_name,
      side,
      type: t,
      context,
      posKm: { x, y },
    });
  }
  return assets;
}
