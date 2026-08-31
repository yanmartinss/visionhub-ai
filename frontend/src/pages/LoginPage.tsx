import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import PasswordInput from "../components/PasswordInput";
import { ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [maintainSession, setMaintainSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(email, password);
      if (user.mustChangePassword) {
        navigate("/choose-password", { replace: true });
      } else if (user.role === "admin") {
        navigate("/admin/requests", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Não foi possível entrar.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="p-6">
          <h2 className="font-serif text-xl font-bold">Controle de Acesso</h2>
          <div className="mt-4 border-t border-slate-200" />

          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="text-xs font-bold uppercase tracking-wide text-slate-700"
              >
                Endereço de E-mail
              </label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="operador@visionhub.ai"
                  className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs font-bold uppercase tracking-wide text-slate-700"
                >
                  Senha
                </label>
                <a
                  href="#"
                  className="text-xs font-medium text-slate-500 hover:text-slate-900"
                >
                  Esqueceu?
                </a>
              </div>
              <PasswordInput
                id="password"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                placeholder="••••••••"
                withLockIcon
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={maintainSession}
                onChange={(event) => setMaintainSession(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Manter Sessão
            </label>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? "Entrando…" : "Entrar"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>

        <div className="flex items-center justify-center gap-2 bg-slate-50 py-2.5 text-xs font-medium text-emerald-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          Túnel Criptografado Ponta a Ponta Ativo
        </div>

        <div className="py-4 text-center text-sm">
          <span className="text-slate-500">Precisa de acesso? </span>
          <Link
            to="/register"
            className="font-semibold text-slate-900 hover:underline"
          >
            Solicitar ao Administrador do Sistema
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}

export default LoginPage;
