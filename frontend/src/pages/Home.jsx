import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { streamAnalysis } from "../streamAnalysis";
import { AGENTS } from "../agentsConfig";
import AgentCard from "../components/AgentCard";
import VerdictPanel from "../components/VerdictPanel";

const makeInitial = () =>
  Object.fromEntries(AGENTS.map((a) => [a.key, { text: "", status: "idle" }]));

// Plain text or { raw } results become readable text
function formatResult(result) {
  if (typeof result === "string") return result;
  return result?.raw ?? JSON.stringify(result);
}

export default function Home() {
  const { authFetch } = useAuth();
  const [idea, setIdea] = useState("");
  const [agents, setAgents] = useState(makeInitial());
  const [verdict, setVerdict] = useState(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [reportId, setReportId] = useState(null);
  const abortRef = useRef(null);

  // Leaving the page cancels the running stream
  useEffect(() => () => abortRef.current?.abort(), []);

  const update = (key, patch) =>
    setAgents((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));

  function handleEvent(event, data) {
    switch (event) {
      case "agent_start":
        update(data.agent, { status: "typing" });
        break;

      case "token":
        setAgents((prev) => ({
          ...prev,
          [data.agent]: {
            ...prev[data.agent],
            text: prev[data.agent].text + data.text,
            status: "typing",
          },
        }));
        break;

      case "agent_done": {
        const structured =
          data.agent === "judge" && data.result && data.result.score !== undefined;
        if (structured) setVerdict(data.result);
        update(data.agent, {
          text: structured ? "Verdict ready, see below." : formatResult(data.result),
          status: "done",
        });
        break;
      }

      case "saved":
        setReportId(data.id);
        break;

      case "error":
        setError(data.message || "Something went wrong");
        break;

      default:
        break;
    }
  }

  async function start() {
    if (!idea.trim() || running) return;

    setAgents(makeInitial());
    setVerdict(null);
    setError("");
    setReportId(null);
    setRunning(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamAnalysis(authFetch, idea.trim(), handleEvent, controller.signal);
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message || "Connection lost. Is the backend running?");
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold">Analyze your idea</h1>
      <p className="mb-6 text-slate-400">
        Your startup idea, grilled by 4 AI experts.
      </p>

      <textarea
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        placeholder="Describe your startup idea..."
        rows={3}
        className="w-full rounded-lg border border-slate-700 bg-slate-900 p-3 outline-none focus:border-purple-500"
      />
      <button
        onClick={start}
        disabled={running || !idea.trim()}
        className="mt-3 rounded-lg bg-purple-600 px-5 py-2 font-medium hover:bg-purple-500 disabled:opacity-50"
      >
        {running ? "Analyzing..." : "Analyze"}
      </button>

      {error && <p className="mt-3 text-red-400">{error}</p>}
      {reportId && (
        <p className="mt-3 text-sm">
          <Link to={`/report/${reportId}`} className="text-purple-400 hover:underline">
            Report saved. Open it on its own page →
          </Link>
        </p>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {AGENTS.map((a) => (
          <div key={a.key} className={a.key === "judge" ? "md:col-span-2" : ""}>
            <AgentCard name={a.name} style={a.style} state={agents[a.key]} />
          </div>
        ))}
      </div>

      {verdict && <VerdictPanel verdict={verdict} />}
    </div>
  );
}