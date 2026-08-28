import { useState } from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import AuthLayout from "../components/AuthLayout";

function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [condominium, setCondominium] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    // TODO: enviar solicitação de acesso ao backend quando estiver disponível.
  }

  return (
    <AuthLayout>
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col items-center bg-slate-50 px-6 py-6 text-center">
          <Lock className="h-6 w-6 text-slate-500" />
          <h2 className="mt-2 font-serif text-xl font-bold">
            Solicitar Acesso
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Peça ao administrador para liberar seu acesso ao VisionHub AI.
          </p>
        </div>

        <form className="space-y-4 p-6" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="fullName"
              className="text-xs font-bold uppercase tracking-wide text-slate-700"
            >
              Nome Completo
            </label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Jane Doe"
              className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
            />
          </div>

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
              placeholder="jane@exemplo.com"
              className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="condominium"
              className="text-xs font-bold uppercase tracking-wide text-slate-700"
            >
              Condomínio / Unidade
            </label>
            <input
              id="condominium"
              type="text"
              value={condominium}
              onChange={(event) => setCondominium(event.target.value)}
              placeholder="Ex.: Residencial Aurora, Bloco 2"
              className="mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="message"
              className="text-xs font-bold uppercase tracking-wide text-slate-700"
            >
              Mensagem (opcional)
            </label>
            <textarea
              id="message"
              rows={3}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Conte ao administrador por que precisa de acesso."
              className="mt-1.5 w-full resize-none rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-slate-900 py-2.5 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-slate-800"
          >
            Enviar Solicitação
          </button>

          <p className="text-center text-sm">
            <Link
              to="/login"
              className="font-semibold text-slate-900 hover:underline"
            >
              Já tem uma conta? Entrar
            </Link>
          </p>
        </form>

        <div className="flex items-center justify-center gap-2 bg-slate-50 py-2.5 text-xs font-medium text-slate-500">
          <Lock className="h-3.5 w-3.5" />
          Conexão criptografada de ponta a ponta
        </div>
      </div>
    </AuthLayout>
  );
}

export default RegisterPage;
