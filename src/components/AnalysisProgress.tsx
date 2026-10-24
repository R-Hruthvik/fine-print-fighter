import type { AnalysisProgressEvent, AnalysisStage } from "@/lib/types";

const stageLabels: Record<AnalysisStage, string> = {
  extract: "Read the original document",
  plan: "Choose focused research questions",
  research: "Search public sources",
  rebuttal: "Investigate the company’s explanation",
  evaluate: "Check claims against retained passages",
  score: "Review what the record supports",
  draft: "Prepare a cited response",
  escalate: "Check possible next steps",
};

type Row =
  | { kind: "stage"; stage: AnalysisStage; phase: "started" | "completed" | "failed"; durationMs?: number }
  | { kind: "tool"; tool: string; summary: string; sourceIds: string[]; durationMs: number };

export function AnalysisProgress({ events, recheck = false }: { events: AnalysisProgressEvent[]; recheck?: boolean }) {
  if (!events.length) return null;
  const rows: Row[] = [];
  const stageIndexes = new Map<AnalysisStage, number>();
  for (const event of events) {
    if (event.type === "stage") {
      const index = stageIndexes.get(event.stage);
      if (index === undefined) {
        stageIndexes.set(event.stage, rows.length);
        rows.push({ kind: "stage", ...event });
      } else {
        rows[index] = { kind: "stage", ...event };
      }
    } else rows.push({ kind: "tool", ...event });
  }

  return (
    <section className="analysis-progress" aria-label={recheck ? "Live recheck progress" : "Live analysis progress"}>
      <h3>{recheck ? "Rechecking the supplied record" : "Live investigation"}</h3>
      <ol aria-live="polite" aria-relevant="additions text">
        {rows.map((row, index) => row.kind === "stage" ? (
          <li className={`progress-stage progress-${row.phase}`} key={`stage-${row.stage}`}>
            <span aria-hidden="true">{row.phase === "completed" ? "✓" : row.phase === "failed" ? "!" : "·"}</span>
            <span>{stageLabels[row.stage]}</span>
            <small>{row.phase === "completed" ? `${((row.durationMs ?? 0) / 1000).toFixed(1)}s` : row.phase === "failed" ? "Stopped" : "Working"}</small>
          </li>
        ) : (
          <li className="progress-tool" key={`tool-${index}`}>
            <span aria-hidden="true">↳</span>
            <span>{row.summary}{row.sourceIds.length ? ` · ${row.sourceIds.length} ${row.sourceIds.length === 1 ? "source" : "sources"} referenced` : ""}</span>
          </li>
        ))}
      </ol>
      <p className="progress-note">These are completed actions from this analysis. Objections appear only after their source passages are checked.</p>
    </section>
  );
}
