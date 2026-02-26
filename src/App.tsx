import { useEffect, useState } from "react";
import { ThemeContext, useThemeProvider, useTheme } from "./hooks/useTheme";
import { DashboardPage } from "./pages/DashboardPage";
import { api } from "./api";

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="px-2 py-1 rounded border border-slate-300 text-xs text-slate-600 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-100"
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}

export function App() {
  const themeValue = useThemeProvider();
  const [publishedAt, setPublishedAt] = useState<string | null>(null);

  useEffect(() => {
    api.getExportedAt().then(setPublishedAt).catch(() => {});
  }, []);

  return (
    <ThemeContext value={themeValue}>
      <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <header className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
              Quovy Benchmarks
            </span>
            {publishedAt && (
              <span className="text-[10px] text-slate-400 dark:text-slate-600">
                Published {new Date(publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
              </span>
            )}
          </div>
          <ThemeToggle />
        </header>
        <main className="p-4">
          <DashboardPage />
        </main>
      </div>
    </ThemeContext>
  );
}
