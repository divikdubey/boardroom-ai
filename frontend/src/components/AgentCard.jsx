export default function AgentCard({ name, style, state }) {
  const { text, status } = state;

  return (
    <div className={`rounded-xl border p-4 ${style.border} ${style.bg}`}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className={`font-semibold ${style.title}`}>{name}</h3>
        <span className="text-xs text-slate-400">
          {status === "idle" && "waiting"}
          {status === "typing" && "typing..."}
          {status === "done" && "done"}
        </span>
      </div>
      <p className="whitespace-pre-wrap text-sm text-slate-200">{text}</p>
    </div>
  );
}