import { useEffect, useState } from "react";

export default function ScoreMeter({ score }) {
  const value = Math.max(0, Math.min(10, Number(score) || 0));
  const [shown, setShown] = useState(0);

  // Pehle 0 se shuru, phir asli score tak bharta hai (animation)
  useEffect(() => {
    const t = setTimeout(() => setShown(value), 100);
    return () => clearTimeout(t);
  }, [value]);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - shown / 10);
  const color = value >= 7 ? "#4ade80" : value >= 5 ? "#facc15" : "#f87171";

  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={radius} fill="none"
          stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>{value}</span>
        <span className="text-xs text-slate-400">out of 10</span>
      </div>
    </div>
  );
}