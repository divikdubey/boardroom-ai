import ScoreMeter from "./ScoreMeter";

function ListCard({ title, items, style }) {
  return (
    <div className={`rounded-xl border p-4 ${style.border} ${style.bg}`}>
      <h4 className={`mb-2 font-semibold ${style.title}`}>{title}</h4>
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-200">
        {(items || []).map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export default function VerdictPanel({ verdict }) {
  return (
    <div className="mt-8 rounded-2xl border border-purple-500/40 bg-purple-500/5 p-6">
      <div className="flex flex-col items-center gap-6 md:flex-row">
        <ScoreMeter score={verdict.score} />
        <div>
          <p className="text-sm uppercase tracking-wide text-purple-400">
            Final verdict
          </p>
          <p className="mt-1 text-xl font-semibold">{verdict.verdict}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <ListCard
          title="Strengths"
          items={verdict.strengths}
          style={{ border: "border-green-500/40", bg: "bg-green-500/5", title: "text-green-400" }}
        />
        <ListCard
          title="Risks"
          items={verdict.risks}
          style={{ border: "border-red-500/40", bg: "bg-red-500/5", title: "text-red-400" }}
        />
        <ListCard
          title="Next steps"
          items={verdict.nextSteps}
          style={{ border: "border-blue-500/40", bg: "bg-blue-500/5", title: "text-blue-400" }}
        />
      </div>
    </div>
  );
}