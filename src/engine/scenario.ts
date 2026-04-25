import type { Scenario } from "./types";

export async function loadScenarioJson(url: string): Promise<Scenario> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to load scenario ${url}: ${res.status}`);
  }
  const json = (await res.json()) as Scenario;
  return json;
}
