export interface CpiMonth { month: string; gasoline: number; electricity: number; utilityGas: number; }
export const pulseSeries = [
  { key: "gasoline", name: "Gasoline", color: "#D94E3D", weight: 3.5 },
  { key: "utilityGas", name: "Utility gas", color: "#4A5D44", weight: 2.2 },
  { key: "electricity", name: "Electricity", color: "#92B9C9", weight: 2.2 },
] as const;
export const monthNames = ["Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
export function rebaseCpi(rows: CpiMonth[]): CpiMonth[] {
  if (rows.length !== 7 || rows.some((r, i) => r.month !== `2026-${String(i + 2).padStart(2, "0")}` ||
    pulseSeries.some(({ key }) => !Number.isFinite(r[key]) || r[key] <= 0))) throw new Error("Expected seven complete, positive monthly BLS observations, February–August 2026");
  return rows.map(r => ({ month: r.month, gasoline: r.gasoline / rows[0].gasoline * 100,
    electricity: r.electricity / rows[0].electricity * 100, utilityGas: r.utilityGas / rows[0].utilityGas * 100 }));
}
export const pulseChange = (value: number) => `${value >= 100 ? "+" : "−"}${Math.abs(value - 100).toFixed(1)}%`;

/** One geometry source for the responsive article and final static download. */
export function pulseSvg(raw: CpiMonth[], id: string, compact = false) {
  const rows = rebaseCpi(raw);
  const values = rows.flatMap(r => pulseSeries.map(s => r[s.key]));
  const min = Math.min(95, Math.floor((Math.min(...values) - 2) / 5) * 5);
  const max = Math.ceil((Math.max(...values) + 2) / 5) * 5;
  const width = compact ? 360 : 1000, height = compact ? 390 : 560;
  const left = compact ? 38 : 54, right = compact ? 337 : 755;
  const top = compact ? 65 : 72, bottom = compact ? 342 : 478;
  const x = (i: number) => left + (right - left) * i / 6;
  const y = (v: number) => bottom - (v - min) / (max - min) * (bottom - top);
  const f = (v: number) => v.toFixed(2);
  const size = compact ? 14 : 18;
  const text = (tx: number, ty: number, value: string, attrs = "") => `<text x="${f(tx)}" y="${f(ty)}" ${attrs}>${value}</text>`;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" class="pulse-chart pulse-chart--${compact ? "mobile" : "desktop"}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${id}-title ${id}-desc" style="--pulse-origin:${left}px">
    <title id="${id}-title">West-region consumer energy prices after February 2026</title>
    <desc id="${id}-desc">Monthly CPI-U indexes, not seasonally adjusted; February 2026 equals 100. Gasoline jumps ${pulseChange(rows[1].gasoline)} in March and reaches ${rows[6].gasoline.toFixed(1)} in August. Utility gas reaches ${rows[6].utilityGas.toFixed(1)} and electricity ${rows[6].electricity.toFixed(1)}. These are observed changes, not estimates of the disruption’s causal effect.</desc>
    <defs><clipPath id="${id}-clip"><rect class="pulse-reveal" x="${left}" y="0" width="${right-left+3}" height="${height}" /></clipPath></defs>
    <g font-family="Georgia, 'Times New Roman', serif" font-size="${size}" fill="#6B6E6A">`;
  for (let tick = 100; tick < max; tick += 10) {
    svg += `<line x1="${left}" x2="${right}" y1="${f(y(tick))}" y2="${f(y(tick))}" stroke="#D9D9D2" stroke-width="${tick === 100 ? 1.5 : .75}" opacity="${tick === 100 ? 1 : .65}"/>`;
    svg += text(left - 12, y(tick) + 5, String(tick), `text-anchor="end" ${tick === 100 ? 'fill="#252824"' : ''}`);
  }
  rows.forEach((_, i) => { if (!compact || ![2,4].includes(i)) svg += text(x(i), bottom + 30, monthNames[i], 'text-anchor="middle"'); });
  const eventX = x(.48);
  svg += `<line x1="${f(eventX)}" x2="${f(eventX)}" y1="58" y2="${bottom}" stroke="#6B6E6A" stroke-width="1" stroke-dasharray="3 5" opacity=".6"/>`;
  svg += text(eventX + 8, 23, "Disruption begins", `font-size="${compact ? 12 : 15}"`);
  svg += text(eventX + 8, 44, "Feb. 28", `font-size="${compact ? 13 : 16}" fill="#252824"`);
  svg += `<g clip-path="url(#${id}-clip)">`;
  for (const series of [...pulseSeries].reverse()) {
    const d = rows.map((row, i) => `${i ? "L" : "M"}${f(x(i))} ${f(y(row[series.key]))}`).join(" ");
    // Thin ink underlay keeps Alpine Lake legible on Summit Snow without changing its palette.
    if (series.key === "electricity") svg += `<path d="${d}" fill="none" stroke="#252824" stroke-opacity=".5" stroke-width="3.4" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
    svg += `<path data-pulse-series="${series.key}" d="${d}" fill="none" stroke="${series.color}" stroke-width="${series.weight}" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
  }
  svg += `</g><circle cx="${left}" cy="${f(y(100))}" r="3" fill="#F4F4F0" stroke="#4A5D44" stroke-width="1.5"/>`;
  for (const series of pulseSeries) {
    const endpoint = rows[6][series.key];
    svg += `<circle class="pulse-end" cx="${right}" cy="${f(y(endpoint))}" r="${series.key === "gasoline" ? 4 : 3}" fill="${series.color}" stroke="${series.key === "electricity" ? '#252824' : series.color}" stroke-width=".7"/>`;
    if (!compact) {
      const labelY = y(endpoint) + (series.key === "utilityGas" ? -5 : series.key === "electricity" ? 16 : -9);
      const color = series.key === "electricity" ? "#252824" : series.key === "gasoline" ? "#252824" : series.color;
      svg += `<g class="pulse-end-label" fill="${color}">`;
      svg += `<path d="M${right+7} ${f(y(endpoint))}L${right+20} ${f(labelY-5)}H${right+28}" fill="none" stroke="${series.color}" stroke-width="1.3"/>`;
      svg += text(right + 36, labelY, series.name, 'font-size="20"');
      svg += text(right + 36, labelY + 25, `${pulseChange(endpoint)}${series.key === "gasoline" ? " since Feb." : ""}`, 'font-size="21" font-weight="700"');
      svg += `</g>`;
    }
  }
  if (!compact) {
    svg += `<g class="pulse-annotation" fill="#252824"><circle cx="${f(x(1))}" cy="${f(y(rows[1].gasoline))}" r="3"/>`;
    svg += text(x(1)+17, y(rows[1].gasoline)+28, `${pulseChange(rows[1].gasoline)} in March`, 'font-size="17"');
    svg += `</g>`;
  }
  return svg + `</g></svg>`;
}
