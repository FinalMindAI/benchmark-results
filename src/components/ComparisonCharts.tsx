import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  LineChart,
  Line,
} from "recharts";
import { useTheme } from "../hooks/useTheme";
import { api, type RunRow, type CatalogModel, type FileResultRow } from "../api";
import { getModelLogoUrl } from "./ModelBadge";

// Bloomberg-style muted palette
const CHART_COLORS = [
  "#ff8c00", // amber/orange (primary highlight)
  "#4a90d9", // steel blue
  "#e05050", // muted red
  "#50b050", // muted green
  "#b07cc8", // muted purple
  "#d4a843", // gold
  "#5cb8b2", // teal
  "#c0c0c0", // silver
];

const TOOLTIP_STYLE_DARK = {
  background: "#1a1a1a",
  border: "1px solid #333",
  borderRadius: 0,
  fontSize: 11,
  color: "#ccc",
  padding: "4px 8px",
};

const TOOLTIP_STYLE_LIGHT = {
  background: "#fff",
  border: "1px solid #ddd",
  borderRadius: 0,
  fontSize: 11,
  color: "#111",
  padding: "4px 8px",
};

function getLabel(run: RunRow) {
  const model = run.model.includes("/") ? run.model.split("/").pop()! : run.model;
  return model.length > 28 ? model.slice(0, 26) + "..." : model;
}

function chartColors(isDark: boolean) {
  return {
    grid: isDark ? "#333" : "#e0e0e0",
    text: isDark ? "#888" : "#666",
    tooltip: isDark ? TOOLTIP_STYLE_DARK : TOOLTIP_STYLE_LIGHT,
  };
}

function ScoreComparisonChart({ runs, isDark }: { runs: RunRow[]; isDark: boolean }) {
  const data = runs.map((r, i) => ({
    name: getLabel(r),
    score: r.avg_score != null ? Math.round(r.avg_score * 100) : 0,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const c = chartColors(isDark);

  return (
    <div>
      <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider text-gray-500 dark:text-gray-500">
        Avg Accuracy
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 12, bottom: 36, left: 4 }} barSize={32}>
          <CartesianGrid stroke={c.grid} vertical={false} strokeDasharray="" />
          <XAxis
            dataKey="name"
            tick={{ fill: c.text, fontSize: 10 }}
            angle={-20}
            textAnchor="end"
            height={50}
            axisLine={{ stroke: c.grid }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: c.text, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={c.tooltip}
            formatter={(value: number | undefined) => [`${value ?? 0}%`, "Score"]}
          />
          <Bar dataKey="score" radius={0}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DurationComparisonChart({ runs, isDark }: { runs: RunRow[]; isDark: boolean }) {
  const data = runs.map((r, i) => ({
    name: getLabel(r),
    duration: r.total_duration_ms != null ? +(r.total_duration_ms / 1000).toFixed(1) : 0,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const c = chartColors(isDark);

  return (
    <div>
      <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider text-gray-500 dark:text-gray-500">
        Duration (s)
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 12, bottom: 36, left: 4 }} barSize={32}>
          <CartesianGrid stroke={c.grid} vertical={false} strokeDasharray="" />
          <XAxis
            dataKey="name"
            tick={{ fill: c.text, fontSize: 10 }}
            angle={-20}
            textAnchor="end"
            height={50}
            axisLine={{ stroke: c.grid }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: c.text, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}s`}
          />
          <Tooltip
            contentStyle={c.tooltip}
            formatter={(value: number | undefined) => [`${value ?? 0}s`, "Duration"]}
          />
          <Bar dataKey="duration" radius={0}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function scoreColor(score: number, isDark: boolean): string {
  if (score >= 1) return isDark ? "#166534" : "#bbf7d0";
  if (score >= 0.9) return isDark ? "#14532d" : "#dcfce7";
  if (score >= 0.75) return isDark ? "#422006" : "#fef3c7";
  if (score >= 0.5) return isDark ? "#7c2d12" : "#fed7aa";
  return isDark ? "#7f1d1d" : "#fecaca";
}

function PerFileHeatmap({
  runs,
  filesByRun,
  isDark,
}: {
  runs: RunRow[];
  filesByRun: Map<string, FileResultRow[]>;
  isDark: boolean;
}) {
  const allFileIds = useMemo(() => {
    const ids = new Set<string>();
    for (const files of filesByRun.values()) {
      for (const f of files) ids.add(f.file_id);
    }
    return Array.from(ids).sort();
  }, [filesByRun]);

  if (allFileIds.length === 0) return null;

  const scoreMap = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const [runId, files] of filesByRun) {
      const inner = new Map<string, number>();
      for (const f of files) inner.set(f.file_id, f.score);
      map.set(runId, inner);
    }
    return map;
  }, [filesByRun]);

  const borderColor = isDark ? "#333" : "#e0e0e0";

  return (
    <div>
      <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider text-gray-500 dark:text-gray-500">
        Per-File Scores
      </h3>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", fontSize: 10, width: "100%" }}>
          <thead>
            <tr>
              <th style={{ padding: "3px 6px", textAlign: "left", color: isDark ? "#888" : "#666", borderBottom: `1px solid ${borderColor}`, position: "sticky", left: 0, background: isDark ? "#111" : "#fff", zIndex: 1 }}>
                Model
              </th>
              {allFileIds.map((fid) => (
                <th key={fid} style={{ padding: "3px 4px", textAlign: "center", color: isDark ? "#888" : "#666", borderBottom: `1px solid ${borderColor}`, whiteSpace: "nowrap" }}>
                  {fid}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => {
              const scores = scoreMap.get(run.id);
              return (
                <tr key={run.id}>
                  <td style={{ padding: "3px 6px", whiteSpace: "nowrap", borderBottom: `1px solid ${borderColor}`, position: "sticky", left: 0, background: isDark ? "#111" : "#fff", zIndex: 1, color: isDark ? "#ccc" : "#333" }}>
                    {getLabel(run)}
                  </td>
                  {allFileIds.map((fid) => {
                    const score = scores?.get(fid);
                    const pct = score != null ? Math.round(score * 100) : null;
                    return (
                      <td
                        key={fid}
                        style={{
                          padding: "3px 4px",
                          textAlign: "center",
                          borderBottom: `1px solid ${borderColor}`,
                          background: score != null ? scoreColor(score, isDark) : "transparent",
                          color: isDark ? "#eee" : "#111",
                          fontWeight: score != null && score >= 1 ? 600 : 400,
                        }}
                      >
                        {pct != null ? `${pct}` : "\u2014"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function computeRunCost(run: RunRow, model: CatalogModel | undefined): number | null {
  if (!model?.costPer1MTokens) return null;
  const inp = run.total_input_tokens ?? 0;
  const out = run.total_output_tokens ?? 0;
  if (inp === 0 && out === 0) return null;
  return (inp / 1_000_000) * model.costPer1MTokens.input +
         (out / 1_000_000) * model.costPer1MTokens.output;
}

function CostVsPerformanceChart({
  runs,
  modelMap,
  isDark,
}: {
  runs: RunRow[];
  modelMap: Map<string, CatalogModel>;
  isDark: boolean;
}) {
  const data = runs
    .map((r, i) => {
      const model = modelMap.get(r.model);
      const cost = computeRunCost(r, model);
      if (cost == null || r.avg_score == null) return null;
      return {
        name: getLabel(r),
        displayName: model?.displayName ?? getLabel(r),
        cost: +cost.toFixed(4),
        score: Math.round(r.avg_score * 100),
        fill: CHART_COLORS[i % CHART_COLORS.length],
        logoUrl: model ? getModelLogoUrl(model) : undefined,
      };
    })
    .filter(Boolean) as { name: string; displayName: string; cost: number; score: number; fill: string; logoUrl?: string }[];

  if (data.length < 2) return null;

  const c = chartColors(isDark);

  return (
    <div>
      <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider text-gray-500 dark:text-gray-500">
        Cost vs Accuracy
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <ScatterChart margin={{ top: 4, right: 12, bottom: 16, left: 4 }}>
          <CartesianGrid stroke={c.grid} strokeDasharray="" />
          <XAxis
            dataKey="cost"
            type="number"
            name="Cost"
            tick={{ fill: c.text, fontSize: 10 }}
            axisLine={{ stroke: c.grid }}
            tickLine={false}
            tickFormatter={(v) => `$${v}`}
            label={{ value: "Cost ($)", position: "insideBottom", offset: -8, fill: c.text, fontSize: 10 }}
          />
          <YAxis
            dataKey="score"
            type="number"
            name="Score"
            domain={[0, 100]}
            tick={{ fill: c.text, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <ZAxis range={[100, 100]} />
          <Tooltip
            contentStyle={c.tooltip}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const item = payload[0]?.payload as { displayName?: string; cost?: number; score?: number } | undefined;
              if (!item) return null;
              return (
                <div style={c.tooltip}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{item.displayName}</div>
                  <div>Accuracy: {item.score}%</div>
                  <div>Cost: ${item.cost}</div>
                </div>
              );
            }}
          />
          <Scatter
            data={data}
            shape={(props: { cx?: number; cy?: number; payload?: { logoUrl?: string; fill?: string } }) => {
              const { cx = 0, cy = 0, payload } = props;
              const size = 24;
              if (payload?.logoUrl) {
                return (
                  <g>
                    <rect x={cx - size / 2 - 2} y={cy - size / 2 - 2} width={size + 4} height={size + 4} fill={isDark ? "#1a1a1a" : "#fff"} stroke={payload.fill ?? "#ff8c00"} strokeWidth={1.5} />
                    <image
                      href={payload.logoUrl}
                      x={cx - size / 2}
                      y={cy - size / 2}
                      width={size}
                      height={size}
                    />
                  </g>
                );
              }
              return <rect x={cx - 5} y={cy - 5} width={10} height={10} fill={payload?.fill ?? "#ff8c00"} />;
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

function PerformanceByReleaseDateChart({
  runs,
  modelMap,
  isDark,
}: {
  runs: RunRow[];
  modelMap: Map<string, CatalogModel>;
  isDark: boolean;
}) {
  const bestByModel = new Map<string, { score: number; releaseDate: string; name: string; logoUrl: string }>();
  for (const r of runs) {
    const model = modelMap.get(r.model);
    if (!model?.releaseDate || r.avg_score == null) continue;
    const existing = bestByModel.get(r.model);
    if (!existing || r.avg_score > existing.score) {
      bestByModel.set(r.model, {
        score: Math.round(r.avg_score * 100),
        releaseDate: model.releaseDate,
        name: model.displayName,
        logoUrl: getModelLogoUrl(model),
      });
    }
  }

  const data = Array.from(bestByModel.values())
    .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))
    .map((d) => ({
      ...d,
      dateTs: new Date(d.releaseDate).getTime(),
      dateLabel: new Date(d.releaseDate).toLocaleDateString("en-US", { year: "numeric", month: "short" }),
    }));

  if (data.length < 2) return null;

  const c = chartColors(isDark);

  return (
    <div>
      <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider text-gray-500 dark:text-gray-500">
        Accuracy by Release Date
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 4, right: 12, bottom: 16, left: 4 }}>
          <CartesianGrid stroke={c.grid} vertical={false} strokeDasharray="" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fill: c.text, fontSize: 10 }}
            axisLine={{ stroke: c.grid }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: c.text, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={c.tooltip}
            formatter={(value: number | undefined) => [`${value ?? 0}%`, "Accuracy"]}
            labelFormatter={(_, payload) => {
              const item = payload?.[0]?.payload as { name?: string; releaseDate?: string } | undefined;
              return item ? `${item.name} (${item.releaseDate})` : "";
            }}
          />
          <Line
            type="linear"
            dataKey="score"
            stroke="#ff8c00"
            strokeWidth={1.5}
            dot={(props: { cx?: number; cy?: number; payload?: { logoUrl?: string } }) => {
              const { cx = 0, cy = 0, payload } = props;
              const size = 20;
              if (payload?.logoUrl) {
                return (
                  <g key={`${cx}-${cy}`}>
                    <rect x={cx - size / 2 - 1} y={cy - size / 2 - 1} width={size + 2} height={size + 2} fill={isDark ? "#1a1a1a" : "#fff"} stroke="#ff8c00" strokeWidth={1} />
                    <image
                      href={payload.logoUrl}
                      x={cx - size / 2}
                      y={cy - size / 2}
                      width={size}
                      height={size}
                    />
                  </g>
                );
              }
              return <rect key={`${cx}-${cy}`} x={cx - 4} y={cy - 4} width={8} height={8} fill="#ff8c00" />;
            }}
            activeDot={{ r: 6, fill: "#ff8c00" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function CostEfficiencyChart({
  runs,
  modelMap,
  isDark,
}: {
  runs: RunRow[];
  modelMap: Map<string, CatalogModel>;
  isDark: boolean;
}) {
  const data = runs
    .map((r, i) => {
      const model = modelMap.get(r.model);
      const cost = computeRunCost(r, model);
      if (cost == null || cost === 0 || r.avg_score == null) return null;
      const scorePct = Math.round(r.avg_score * 100);
      const efficiency = +(scorePct / cost).toFixed(1);
      return {
        name: getLabel(r),
        efficiency,
        fill: CHART_COLORS[i % CHART_COLORS.length],
      };
    })
    .filter(Boolean) as { name: string; efficiency: number; fill: string }[];

  if (data.length < 2) return null;

  data.sort((a, b) => b.efficiency - a.efficiency);

  const c = chartColors(isDark);

  return (
    <div>
      <h3 className="text-xs font-semibold mb-2 uppercase tracking-wider text-gray-500 dark:text-gray-500">
        Cost Efficiency (pts/$)
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid stroke={c.grid} horizontal={false} strokeDasharray="" />
          <XAxis
            type="number"
            tick={{ fill: c.text, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: c.text, fontSize: 10 }}
            width={110}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={c.tooltip}
            formatter={(value: number | undefined) => [`${value ?? 0} pts/$`, "Efficiency"]}
          />
          <Bar dataKey="efficiency" radius={0} barSize={18}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SummaryCards({ runs }: { runs: RunRow[] }) {
  const best = runs.reduce((a, b) =>
    (a.avg_score ?? 0) >= (b.avg_score ?? 0) ? a : b
  );
  const fastest = runs.reduce((a, b) =>
    (a.total_duration_ms ?? Infinity) <= (b.total_duration_ms ?? Infinity) ? a : b
  );

  const avgScore = runs.reduce((sum, r) => sum + (r.avg_score ?? 0), 0) / runs.length;

  return (
    <div className="grid grid-cols-3 gap-px bg-gray-200 dark:bg-[#333] border border-gray-200 dark:border-[#333]">
      <div className="bg-white dark:bg-[#111] px-3 py-2">
        <div className="text-[9px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-600">Best Accuracy</div>
        <div className="text-lg font-bold mt-0.5 text-gray-900 dark:text-gray-100">{Math.round((best.avg_score ?? 0) * 100)}%</div>
        <div className="text-[10px] text-gray-500 dark:text-gray-500 truncate">{getLabel(best)}</div>
      </div>
      <div className="bg-white dark:bg-[#111] px-3 py-2">
        <div className="text-[9px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-600">Fastest</div>
        <div className="text-lg font-bold mt-0.5 text-gray-900 dark:text-gray-100">
          {fastest.total_duration_ms != null ? `${(fastest.total_duration_ms / 1000).toFixed(1)}s` : "\u2014"}
        </div>
        <div className="text-[10px] text-gray-500 dark:text-gray-500 truncate">{getLabel(fastest)}</div>
      </div>
      <div className="bg-white dark:bg-[#111] px-3 py-2">
        <div className="text-[9px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-600">Avg Score</div>
        <div className="text-lg font-bold mt-0.5 text-gray-900 dark:text-gray-100">{Math.round(avgScore * 100)}%</div>
        <div className="text-[10px] text-gray-500 dark:text-gray-500">{runs.length} runs</div>
      </div>
    </div>
  );
}

export function ComparisonCharts({
  runs,
  modelMap,
}: {
  runs: RunRow[];
  modelMap: Map<string, CatalogModel>;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [filesByRun, setFilesByRun] = useState<Map<string, FileResultRow[]>>(new Map());

  useEffect(() => {
    api.getFileScores().then((allScores) => {
      const map = new Map<string, FileResultRow[]>();
      const runIds = new Set(runs.map((r) => r.id));
      for (const [runId, files] of Object.entries(allScores)) {
        if (runIds.has(runId)) map.set(runId, files);
      }
      setFilesByRun(map);
    }).catch(() => {});
  }, [runs]);

  return (
    <div className="space-y-3 mt-3">
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-gray-200 dark:bg-[#333]" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-500">
          Comparison
        </h2>
        <div className="h-px flex-1 bg-gray-200 dark:bg-[#333]" />
      </div>

      <SummaryCards runs={runs} />

      <div className="grid grid-cols-2 gap-px bg-gray-200 dark:bg-[#333] border border-gray-200 dark:border-[#333]">
        <div className="bg-white dark:bg-[#111] p-3">
          <ScoreComparisonChart runs={runs} isDark={isDark} />
        </div>
        <div className="bg-white dark:bg-[#111] p-3">
          <DurationComparisonChart runs={runs} isDark={isDark} />
        </div>
        <div className="bg-white dark:bg-[#111] p-3">
          <CostVsPerformanceChart runs={runs} modelMap={modelMap} isDark={isDark} />
        </div>
        <div className="bg-white dark:bg-[#111] p-3">
          <PerformanceByReleaseDateChart runs={runs} modelMap={modelMap} isDark={isDark} />
        </div>
        <div className="bg-white dark:bg-[#111] p-3">
          <CostEfficiencyChart runs={runs} modelMap={modelMap} isDark={isDark} />
        </div>
      </div>

      {filesByRun.size > 0 && (
        <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] p-3">
          <PerFileHeatmap runs={runs} filesByRun={filesByRun} isDark={isDark} />
        </div>
      )}
    </div>
  );
}
