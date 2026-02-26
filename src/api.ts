export type RunRow = {
  id: string;
  status: string;
  dataset: string;
  prompt_version: string;
  schema_version: string;
  harness: string;
  provider: string;
  model: string;
  total_files: number;
  completed_files: number;
  avg_score: number | null;
  total_duration_ms: number | null;
  started_at: string;
  finished_at: string | null;
  total_input_tokens?: number;
  total_output_tokens?: number;
  prompt_preview?: string;
};

export type CatalogProvider = {
  id: string;
  displayName: string;
  envKey: string;
  baseUrl?: string;
};

export type CatalogModel = {
  provider: string;
  id: string;
  displayName: string;
  family?: string;
  supportsStructuredOutput: boolean;
  active: boolean;
  releaseDate?: string;
  costPer1MTokens?: { input: number; output: number };
  contextWindow?: number;
  maxOutput?: number;
};

export type Catalog = {
  providers: CatalogProvider[];
  models: CatalogModel[];
};

export type FileResultRow = {
  file_id: string;
  score: number;
};

type StaticData = {
  exportedAt: string;
  catalog: Catalog;
  runs: RunRow[];
  fileScores: Record<string, FileResultRow[]>;
};

let cached: StaticData | null = null;

async function loadData(): Promise<StaticData> {
  if (cached) return cached;
  const res = await fetch("/data.json");
  cached = (await res.json()) as StaticData;
  return cached;
}

export const api = {
  getRuns: async () => (await loadData()).runs,
  getCatalog: async () => (await loadData()).catalog,
  getFileScores: async () => (await loadData()).fileScores,
  getExportedAt: async () => (await loadData()).exportedAt,
};
