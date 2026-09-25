import type { Metric, MetricId } from "./model.ts";

/** State codes, never source row order, join the three dated measures. */
export function statePriceRows(metrics: Metric[]) {
  const keyed = new Map(
    metrics.map((m) => [m.id, new Map(m.rows.map((r) => [r.code, r]))]),
  );
  const base = keyed.get("gasoline");
  if (!base) throw new Error("Missing gasoline data");
  return [...base.values()]
    .map((row) => {
      const values = {} as Record<MetricId, number>;
      for (const id of ["gasoline", "diesel", "electricity"] as const) {
        const match = keyed.get(id)?.get(row.code);
        if (!match || match.name !== row.name)
          throw new Error(`Missing or mismatched ${id}: ${row.code}`);
        values[id] = match.value;
      }
      return { code: row.code, name: row.name, ...values };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** A common fuel-price axis preserves orientation when switching products.
 * Collision lanes use the narrowest plot width, so every state remains visible. */
export function fuelDistribution(
  metrics: Metric[],
  id: "gasoline" | "diesel",
  code: string,
) {
  const fuels = metrics.filter((m) => m.id !== "electricity");
  const values = fuels.flatMap((m) => m.rows.map((r) => r.value));
  const min = Math.floor(Math.min(...values) * 2) / 2;
  const max = Math.ceil(Math.max(...values) * 2) / 2;
  const metric = fuels.find((m) => m.id === id)!;
  const sorted = [...metric.rows].sort(
    (a, b) => a.value - b.value || a.code.localeCompare(b.code),
  );
  const laneEnds: number[] = [];
  const dots = sorted.map((row) => {
    const x = ((row.value - min) / (max - min)) * 100;
    let lane = laneEnds.findIndex((end) => x - end >= 4.5);
    if (lane < 0) lane = laneEnds.length;
    laneEnds[lane] = x;
    return { ...row, x, lane };
  });
  const selected = dots.find((r) => r.code === code);
  if (!selected) throw new Error(`Unknown state: ${code}`);
  return {
    metric,
    min,
    max,
    dots,
    selected,
    low: sorted[0],
    high: sorted.at(-1)!,
    rank: sorted.findIndex((r) => r.code === code) + 1,
  };
}
