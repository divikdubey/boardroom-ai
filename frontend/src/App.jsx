import { Link, NavLink, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import AuthPage from "./pages/AuthPage";
import Home from "./pages/Home";
import History from "./pages/History";
import ReportView from "./pages/ReportView";

const linkClass = ({ isActive }) =>
  isActive ? "text-purple-400" : "text-slate-400 hover:text-white";

function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-slate-800 px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link to="/" className="font-bold">Boardroom AI</Link>
          <div className="flex items-center gap-4 text-sm">
            <NavLink to="/app" className={linkClass}>Analyze</NavLink>
            <NavLink to="/history" className={linkClass}>History</NavLink>
            <span className="text-slate-500">{user?.name}</span>
            <button onClick={handleLogout} className="text-slate-400 hover:text-white">
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-4 py-8">
        <Outlet />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<AuthPage mode="login" />} />
      <Route path="/signup" element={<AuthPage mode="signup" />} />

      {/* Ye teen page bina login ke nahi khulenge */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/app" element={<Home />} />
          <Route path="/history" element={<History />} />
          <Route path="/report/:id" element={<ReportView />} />
        </Route>
      </Route>

      <Route path="*" element={<p className="p-8 text-slate-400">Page nahi mila.</p>} />
    </Routes>
  );
}