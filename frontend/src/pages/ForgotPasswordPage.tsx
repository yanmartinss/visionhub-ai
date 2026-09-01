import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, KeyRound } from "lucide-react";
import AuthLayout from "../components/AuthLayout";
import { apiFetch, ApiError } from "../lib/api";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: { email },
      });
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Não foi possível enviar.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col items-center bg-slate-50 px-6 py-6 text-center">
          <KeyRound className="h-6 w-6 text-slate-500" />
          <h2 className="mt-2 font-serif text-xl font-bold">Recuperar Senha</h2>
          <p className="mt-1 text-sm text-slate-500">
            Informe seu e-mail e enviaremos um link para redefinir sua senha.
          </p>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            <h3 className="font-serif text-lg font-bold text-slate-900">
              Verifique seu e-mail
            </h3>
            <p className="text-sm text-slate-500">
              Se esse e-mail estiver cadastrado, você receberá um link para
              redefinir sua senha em instantes.
            </p>
            <Link
              to="/login"
              className="mt-2 font-semibold text-slate-900 hover:underline"
            >
              Voltar para o login
            </Link>
          </div>
        ) : (
          <form className="space-y-4 p-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="text-xs font-bold uppercase tracking-wide text-slate-700"
              >
                Endereço de E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="operador@visionhub.ai"
                className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-slate-900 py-2.5 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? "Enviando…" : "Enviar Link de Recuperação"}
            </button>

            <p className="text-center text-sm">
              <Link
                to="/login"
                className="font-semibold text-slate-900 hover:underline"
              >
                Voltar para o login
              </Link>
            </p>
          </form>
        )}

        <div className="flex items-center justify-center gap-2 bg-slate-50 py-2.5 text-xs font-medium text-slate-500">
          <KeyRound className="h-3.5 w-3.5" />
          Conexão criptografada de ponta a ponta
        </div>
      </div>
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
