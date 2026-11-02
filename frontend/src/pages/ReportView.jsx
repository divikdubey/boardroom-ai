import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AGENTS } from "../agentsConfig";
import AgentCard from "../components/AgentCard";
import VerdictPanel from "../components/VerdictPanel";

export default function ReportView() {
  const { id } = useParams();
  const { authFetch } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    authFetch(`/reports/${id}`)
      .then((res) => {
        if (res.status === 404) throw new Error("This report was not found.");
        if (!res.ok) throw new Error("Could not load the report.");
        return res.json();
      })
      .then(setReport)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, authFetch]);

  if (loading) return <p className="text-slate-400">Loading...</p>;
  if (error) {
    return (
      <div>
        <p className="text-red-400">{error}</p>
        <Link to="/history" className="text-purple-400 hover:underline">
          ← History
        </Link>
      </div>
    );
  }

  const judge = report.judge;
  const structured = judge && judge.score !== undefined;

  const stateFor = (key) => {
    if (key === "judge") {
      return {
        text: structured ? "Verdict ready, see below." : judge?.raw ?? "",
        status: "done",
      };
    }
    return { text: report[key] ?? "", status: "done" };
  };

  return (
    <div>
      <Link to="/history" className="text-sm text-purple-400 hover:underline">
        ← History
      </Link>
      <h1 className="mt-3 text-2xl font-bold">{report.idea}</h1>
      <p className="mb-6 text-xs text-slate-500">
        {new Date(report.createdAt).toLocaleString()}
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {AGENTS.map((a) => (
          <div key={a.key} className={a.key === "judge" ? "md:col-span-2" : ""}>
            <AgentCard name={a.name} style={a.style} state={stateFor(a.key)} />
          </div>
        ))}
      </div>

      {structured && <VerdictPanel verdict={judge} />}
    </div>
  );
}