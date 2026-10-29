import type { AnalysisProgressEvent, AnalysisStage } from "@/lib/types";
import type { DocumentAudit } from "@/lib/document-audit";

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

export function AnalysisProgress({ events, recheck = false, stopped = false }: { events: AnalysisProgressEvent[]; recheck?: boolean; stopped?: boolean }) {
  if (!events.length) return null;
  const rows: Row[] = [];
  const stageIndexes = new Map<AnalysisStage, number>();
  let audit: DocumentAudit | undefined;
  for (const event of events) {
    if (event.type === "stage") {
      const index = stageIndexes.get(event.stage);
      if (index === undefined) {
        stageIndexes.set(event.stage, rows.length);
        rows.push({ kind: "stage", ...event });
      } else {
        rows[index] = { kind: "stage", ...event };
      }
    } else if (event.type === "tool") rows.push({ kind: "tool", ...event });
    else if (event.type === "document-audit") audit = event.audit;
  }

  return (
    <section className="analysis-progress" aria-label={recheck ? "Live recheck progress" : "Live analysis progress"}>
      <h3>{recheck ? "Rechecking the supplied record" : "Live investigation"}</h3>
      <ol aria-live="polite" aria-relevant="additions text">
        {rows.map((row, index) => row.kind === "stage" ? (
          <li className={`progress-stage progress-${row.phase}`} key={`stage-${row.stage}`}>
            <span aria-hidden="true">{row.phase === "completed" ? "✓" : row.phase === "failed" ? "!" : "·"}</span>
            <span>{stageLabels[row.stage]}</span>
            <small>{row.phase === "completed" ? `${((row.durationMs ?? 0) / 1000).toFixed(1)}s` : row.phase === "failed" ? "Stopped" : stopped ? "Stopped" : "Working"}</small>
          </li>
        ) : (
          <li className="progress-tool" key={`tool-${index}`}>
            <span aria-hidden="true">↳</span>
            <span>{row.summary}{row.sourceIds.length ? ` · ${row.sourceIds.length} ${row.sourceIds.length === 1 ? "source" : "sources"} referenced` : ""}</span>
          </li>
        ))}
      </ol>
      {audit ? <section aria-label="Early document review"><h4>What your records say so far</h4><p>These are attributed excerpts, not independently verified facts. {stopped ? "The review stopped before it finished; this is not a complete result." : "Research may still be running."}</p>{audit.records.length ? <dl>{audit.records.map((record, index) => <div key={`${record.documentId}-${record.label}-${index}`}><dt>{record.label}</dt><dd>{record.value}<blockquote>“{record.excerpt}”</blockquote><small>From {record.documentLabel} · {record.documentId}</small></dd></div>)}</dl> : <p>No attributed statements were extracted yet.</p>}{audit.companyReply ? <details><summary>Company reply you supplied</summary><blockquote style={{whiteSpace:"pre-wrap"}}>{audit.companyReply}</blockquote></details> : null}</section> : null}
      <p className="progress-note">This timeline shows stages that have started, completed, or stopped. A matched passage shows where wording was found; it does not establish that a claim is true.</p>
    </section>
  );
}
