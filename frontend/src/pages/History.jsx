import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const scoreColor = (s) =>
  s >= 7 ? "text-green-400" : s >= 5 ? "text-yellow-400" : "text-red-400";

export default function History() {
  const { authFetch } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    authFetch("/reports")
      .then((res) => {
        if (!res.ok) throw new Error("bad response");
        return res.json();
      })
      .then(setReports)
      .catch(() => setError("Could not load reports. Is the backend running?"))
      .finally(() => setLoading(false));
  }, [authFetch]);

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">History</h1>

      {loading && <p className="text-slate-400">Loading...</p>}
      {error && <p className="text-red-400">{error}</p>}
      {!loading && !error && reports.length === 0 && (
        <p className="text-slate-400">No reports yet. Analyze an idea first.</p>
      )}

      <div className="space-y-3">
        {reports.map((r) => (
          <Link
            key={r._id}
            to={`/report/${r._id}`}
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-purple-500"
          >
            <div>
              <p className="font-medium">{r.idea}</p>
              <p className="text-xs text-slate-500">
                {new Date(r.createdAt).toLocaleString()}
              </p>
            </div>
            <span className={`text-2xl font-bold ${scoreColor(r.judge?.score)}`}>
              {r.judge?.score ?? "-"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}