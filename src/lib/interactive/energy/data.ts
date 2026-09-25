import snapshot from "../../../data/interactive/west-energy-bill/snapshot.json";
import sources from "../../../data/interactive/west-energy-bill/sources.json";
import { assertSnapshot, type EnergySnapshot } from "./model";
assertSnapshot(snapshot);
export const energyData: EnergySnapshot = snapshot;
export const energySources = sources;
export function energySource(id: string) {
  const source = sources.find((item) => item.id === id);
  if (!source) throw new Error(`Missing source: ${id}`);
  return source;
}
