import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
      <h1 className="font-serif text-2xl font-bold text-slate-900">
        Você fez login.
      </h1>
      <p className="text-sm text-slate-500">
        {user?.name} — {user?.email} ({user?.role})
      </p>

      {user?.role === "admin" && (
        <Link
          to="/admin/requests"
          className="text-sm font-semibold text-slate-900 hover:underline"
        >
          Ver solicitações de acesso
        </Link>
      )}

      <button
        onClick={handleLogout}
        className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Sair
      </button>
    </div>
  );
}

export default DashboardPage;
