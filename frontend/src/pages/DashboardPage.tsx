import { useAuth } from "../context/AuthContext";

function DashboardPage() {
  const { user } = useAuth();

  return (
    <>
      <h1 className="font-serif text-2xl font-bold text-slate-900">
        Você fez login.
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        {user?.name} — {user?.email} ({user?.role})
      </p>
    </>
  );
}

export default DashboardPage;
