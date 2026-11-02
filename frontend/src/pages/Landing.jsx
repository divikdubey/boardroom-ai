import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AGENTS } from "../agentsConfig";

const ABOUT = {
  market: "Analyzes the audience, market size and demand.",
  competitors: "Finds real competitors using live web search.",
  critic: "Finds the weak spots. Its job is to explain why the idea could fail.",
  financial: "Estimates costs, revenue and the break-even point.",
  judge: "Weighs every report and gives a score and the final verdict.",
};

const STEPS = [
  "Write your startup idea",
  "5 AI experts discuss it live",
  "Get a score, risks and next steps",
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <span className="font-bold">Boardroom AI</span>
        {user ? (
          <Link to="/app" className="text-sm text-slate-400 hover:text-white">
            Open app
          </Link>
        ) : (
          <Link to="/login" className="text-sm text-slate-400 hover:text-white">
            Log in
          </Link>
        )}
      </header>

      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-4xl font-bold md:text-6xl">
          Your startup idea,
          <span className="text-purple-400"> grilled by AI experts.</span>
        </h1>
        <p className="mt-5 text-lg text-slate-400">
          A market researcher, competitor analyst, critic and financial planner
          discuss your idea live, and a judge gives the final verdict.
        </p>
        <Link
          to={user ? "/app" : "/signup"}
          className="mt-8 inline-block rounded-lg bg-purple-600 px-8 py-3 text-lg font-medium hover:bg-purple-500"
        >
          {user ? "Open analyzer →" : "Get started →"}
        </Link>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-16">
        <h2 className="mb-6 text-center text-2xl font-semibold">Meet the panel</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {AGENTS.map((a) => (
            <div
              key={a.key}
              className={`rounded-xl border p-4 ${a.style.border} ${a.style.bg}`}
            >
              <h3 className={`font-semibold ${a.style.title}`}>{a.name}</h3>
              <p className="mt-1 text-sm text-slate-300">{ABOUT[a.key]}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-20">
        <h2 className="mb-6 text-center text-2xl font-semibold">How it works</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-center"
            >
              <div className="mb-2 text-3xl font-bold text-purple-400">{i + 1}</div>
              <p className="text-sm text-slate-300">{s}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}