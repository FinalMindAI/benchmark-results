import { useEffect, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type Column,
} from "@tanstack/react-table";
import { api, type CatalogModel, type RunRow } from "../api";
import { ScoreBadge } from "../components/ScoreBadge";
import { ComparisonCharts } from "../components/ComparisonCharts";
import { ModelBadge } from "../components/ModelBadge";

function formatDuration(ms: number | null) {
  if (ms == null) return "\u2014";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function formatShortDate(iso?: string) {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short" });
}

function formatCost(run: RunRow, model: CatalogModel | undefined): string {
  if (!model?.costPer1MTokens) return "\u2014";
  const inputTokens = run.total_input_tokens ?? 0;
  const outputTokens = run.total_output_tokens ?? 0;
  if (inputTokens === 0 && outputTokens === 0) return "\u2014";
  const cost =
    (inputTokens / 1_000_000) * model.costPer1MTokens.input +
    (outputTokens / 1_000_000) * model.costPer1MTokens.output;
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}

function truncatePrompt(text: string | undefined, max = 72) {
  if (!text) return "\u2014";
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}...`;
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "completed"
      ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
      : status === "running"
        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300";
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${color}`}>{status}</span>;
}

function SortIcon({ direction }: { direction: false | "asc" | "desc" }) {
  if (!direction) return null;
  return <span className="sort-indicator">{direction === "asc" ? "\u25B2" : "\u25BC"}</span>;
}

function ColumnFilter<T>({ column }: { column: Column<T, unknown> }) {
  const columnFilterValue = column.getFilterValue() as string | undefined;
  const values = Array.from(
    new Set(column.getFacetedRowModel().rows.map((r) => String(r.getValue(column.id) ?? ""))),
  ).sort();

  if (values.length <= 1) return null;

  return (
    <select
      value={columnFilterValue ?? ""}
      onChange={(e) => column.setFilterValue(e.target.value || undefined)}
      onClick={(e) => e.stopPropagation()}
      className="mt-1 w-full px-1 py-0.5 rounded border border-slate-300 bg-white text-[10px] font-normal dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
    >
      <option value="">All</option>
      {values.map((v) => (
        <option key={v} value={v}>
          {v}
        </option>
      ))}
    </select>
  );
}

export function DashboardPage() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [sorting, setSorting] = useState<SortingState>([{ id: "started_at", desc: true }]);
  const [modelMap, setModelMap] = useState<Map<string, CatalogModel>>(new Map());

  useEffect(() => {
    api.getRuns().then(setRuns).finally(() => setLoading(false));
    api
      .getCatalog()
      .then((catalog) => {
        const map = new Map<string, CatalogModel>();
        for (const m of catalog.models) map.set(m.id, m);
        setModelMap(map);
      })
      .catch(() => {});
  }, []);

  const columns = useMemo<ColumnDef<RunRow, any>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            className="accent-blue-600"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
            className="accent-blue-600"
          />
        ),
        enableSorting: false,
        enableColumnFilter: false,
        size: 40,
      },
      {
        accessorKey: "model",
        header: "Model",
        cell: ({ row }) => {
          const model = modelMap.get(row.original.model);
          return model ? <ModelBadge model={model} /> : row.original.model;
        },
        enableColumnFilter: true,
        size: 220,
      },
      { accessorKey: "provider", header: "Provider", enableColumnFilter: true, size: 130 },
      { accessorKey: "dataset", header: "Dataset", enableColumnFilter: true, size: 140 },
      { accessorKey: "prompt_version", header: "Prompt", enableColumnFilter: true, size: 95 },
      {
        accessorKey: "prompt_preview",
        header: "Prompt Text",
        cell: ({ getValue }) => truncatePrompt(getValue() as string, 100),
        enableColumnFilter: false,
        size: 280,
      },
      { accessorKey: "schema_version", header: "Schema", enableColumnFilter: true, size: 90 },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => <StatusBadge status={(getValue() as string) ?? "unknown"} />,
        enableColumnFilter: true,
        size: 110,
      },
      {
        accessorKey: "avg_score",
        header: "Avg Score",
        cell: ({ row }) => <ScoreBadge score={row.original.avg_score} />,
        sortingFn: "basic",
        enableColumnFilter: false,
        size: 110,
      },
      {
        id: "cost",
        header: "Cost",
        accessorFn: (row) => formatCost(row, modelMap.get(row.model)),
        cell: ({ row }) => {
          const model = modelMap.get(row.original.model);
          const cost = formatCost(row.original, model);
          if (!model?.costPer1MTokens || cost === "\u2014") return cost;
          const tooltip = `$${model.costPer1MTokens.input}/M in \u00B7 $${model.costPer1MTokens.output}/M out`;
          return (
            <span className="css-tooltip" data-tip={tooltip}>
              {cost}
            </span>
          );
        },
        enableColumnFilter: false,
        size: 95,
      },
      {
        id: "released",
        header: "Released",
        accessorFn: (row) => formatShortDate(modelMap.get(row.model)?.releaseDate),
        enableColumnFilter: false,
        size: 105,
      },
      {
        id: "files",
        header: "Files",
        accessorFn: (row) => `${row.completed_files ?? 0}/${row.total_files ?? 0}`,
        enableColumnFilter: false,
        size: 90,
      },
      {
        accessorKey: "total_duration_ms",
        header: "Duration",
        cell: ({ getValue }) => formatDuration(getValue() as number | null),
        enableColumnFilter: false,
        size: 110,
      },
      {
        accessorKey: "started_at",
        header: "Date",
        cell: ({ getValue }) => formatDate(getValue() as string),
        enableColumnFilter: false,
        size: 190,
      },
    ],
    [modelMap],
  );

  const table = useReactTable({
    data: runs,
    columns,
    state: { sorting, globalFilter, columnFilters, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true,
    initialState: { pagination: { pageSize: 50 } },
  });

  const selectedRuns = useMemo(() => {
    return table.getSelectedRowModel().rows.map((r) => r.original);
  }, [table.getSelectedRowModel().rows]);

  const filteredRuns = useMemo(() => {
    return table.getFilteredRowModel().rows.map((r) => r.original);
  }, [table.getFilteredRowModel().rows]);

  const chartRuns = selectedRuns.length >= 2 ? selectedRuns : filteredRuns;

  if (loading) return <p className="text-gray-500">Loading results...</p>;
  if (!runs.length) return <p className="text-gray-500">No benchmark runs found.</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Benchmark Results</h1>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Filter..."
            className="w-56 px-2 py-1 rounded border border-slate-300 bg-white text-xs dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />

          {columnFilters.length > 0 && (
            <button
              onClick={() => setColumnFilters([])}
              className="px-2 py-1 rounded border border-slate-300 text-xs text-slate-600 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
            >
              Clear filters ({columnFilters.length})
            </button>
          )}

          {selectedRuns.length > 0 && (
            <button
              onClick={() => setRowSelection({})}
              className="px-2 py-1 rounded border border-slate-300 text-xs text-slate-600 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
            >
              Clear ({selectedRuns.length})
            </button>
          )}
        </div>
      </div>

      <div className="ts-table-wrap" style={{ maxHeight: chartRuns.length >= 2 ? "420px" : "calc(100vh - 120px)", overflow: "auto" }}>
        <table className="ts-table">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    data-sortable={header.column.getCanSort()}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder ? null : (
                      <>
                        <div>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <SortIcon direction={header.column.getIsSorted()} />
                        </div>
                        {header.column.getCanFilter() && (
                          <ColumnFilter column={header.column} />
                        )}
                      </>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                data-selected={row.getIsSelected()}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {table.getPageCount() > 1 && (
          <div className="ts-pagination">
            <span>
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()} — {runs.length} rows
            </span>
            <div className="flex gap-1">
              <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Prev</button>
              <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</button>
            </div>
          </div>
        )}
      </div>

      {chartRuns.length >= 2 && <ComparisonCharts runs={chartRuns} modelMap={modelMap} />}
    </div>
  );
}
