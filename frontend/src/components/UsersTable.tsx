import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../lib/api";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "manager" | "employee" | "admin";
  active: boolean;
  isMaster: boolean;
};

const ROLE_LABELS: Record<UserRow["role"], string> = {
  employee: "Funcionário",
  manager: "Gestor",
  admin: "Admin",
};

function UsersTable() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<UserRow[]>("/users")
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Erro ao carregar.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p className="text-sm text-slate-500">Carregando…</p>;
  if (error) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
        {error}
      </p>
    );
  }
  if (users.length === 0) {
    return <p className="text-sm text-slate-500">Nenhum usuário cadastrado.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Nome</th>
            <th className="px-4 py-3">E-mail</th>
            <th className="px-4 py-3">Papel</th>
            <th className="px-4 py-3">Master</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-3">{u.name}</td>
              <td className="px-4 py-3">{u.email}</td>
              <td className="px-4 py-3">{ROLE_LABELS[u.role]}</td>
              <td className="px-4 py-3">
                {u.role === "manager" ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.isMaster
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {u.isMaster ? "Principal" : "Secundário"}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    u.active
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {u.active ? "Ativo" : "Inativo"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default UsersTable;
