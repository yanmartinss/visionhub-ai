import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import PasswordInput from "../components/PasswordInput";
import { apiFetch, ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

function ChoosePasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { refresh } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirm) {
      setError("As senhas não conferem.");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch("/users/me/password", {
        method: "PATCH",
        body: { newPassword },
      });
      await refresh();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro inesperado.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col items-center bg-slate-50 px-6 py-6 text-center">
          <KeyRound className="h-6 w-6 text-slate-500" />
          <h2 className="mt-2 font-serif text-xl font-bold">Definir Senha</h2>
          <p className="mt-1 text-sm text-slate-500">
            Este é seu primeiro acesso. Escolha uma senha para continuar.
          </p>
        </div>

        <form className="space-y-4 p-6" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="newPassword"
              className="text-xs font-bold uppercase tracking-wide text-slate-700"
            >
              Nova Senha
            </label>
            <PasswordInput
              id="newPassword"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label
              htmlFor="confirm"
              className="text-xs font-bold uppercase tracking-wide text-slate-700"
            >
              Confirmar Senha
            </label>
            <PasswordInput
              id="confirm"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-slate-900 py-2.5 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting ? "Salvando…" : "Salvar e Entrar"}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}

export default ChoosePasswordPage;
