import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import AccessRequestsPanel from "../components/AccessRequestsPanel";

type Tab = "geral" | "solicitacoes";

function SettingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("geral");
  const isAdmin = user?.role === "admin";

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 font-serif text-2xl font-bold text-slate-900">
        Configurações
      </h1>

      <div className="mb-6 flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setTab("geral")}
          className={`cursor-pointer border-b-2 px-3 py-2 text-sm font-semibold ${
            tab === "geral"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Geral
        </button>
        {isAdmin && (
          <button
            onClick={() => setTab("solicitacoes")}
            className={`cursor-pointer border-b-2 px-3 py-2 text-sm font-semibold ${
              tab === "solicitacoes"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Solicitações
          </button>
        )}
      </div>

      {tab === "geral" && (
        <p className="text-sm text-slate-500">Em construção.</p>
      )}
      {tab === "solicitacoes" && isAdmin && <AccessRequestsPanel />}
    </div>
  );
}

export default SettingsPage;
