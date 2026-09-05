import { useState } from "react";
import { apiFetch, ApiError } from "../lib/api";

type Role = "manager" | "employee";

type CreateUserResult = {
  emailDelivered: boolean;
};

function CreateUserPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("employee");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setShowConfirm(true);
  }

  async function confirmAndSubmit() {
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const res = await apiFetch<CreateUserResult>("/users/register", {
        method: "POST",
        body: { name, email, role },
      });
      setNotice(
        res.emailDelivered
          ? "Usuário criado. A senha temporária foi enviada por e-mail."
          : "Usuário criado, mas o e-mail com a senha temporária não pôde ser enviado.",
      );
      setName("");
      setEmail("");
      setRole("employee");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao criar usuário.");
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-md">
        <h1 className="mb-6 font-serif text-2xl font-bold text-slate-900">
          Cadastrar Usuário
        </h1>

        {notice && (
          <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
            {notice}
          </p>
        )}

        <form
          className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
          onSubmit={handleSubmit}
        >
          <div>
            <label
              htmlFor="name"
              className="text-xs font-bold uppercase tracking-wide text-slate-700"
            >
              Nome Completo
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
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
              htmlFor="role"
              className="text-xs font-bold uppercase tracking-wide text-slate-700"
            >
              Papel
            </label>
            <select
              id="role"
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
              className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              <option value="employee">Funcionário</option>
              <option value="manager">Gestor</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-slate-900 py-2.5 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {submitting ? "Cadastrando…" : "Cadastrar Usuário"}
          </button>
        </form>

        {showConfirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
            onClick={() => !submitting && setShowConfirm(false)}
          >
            <div
              className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              onClick={(event) => event.stopPropagation()}
            >
              <h2 className="font-serif text-lg font-bold text-slate-900">
                Confirmar e-mail
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                A senha temporária será enviada para{" "}
                <span className="font-semibold">{email}</span>. Está correto?
              </p>

              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={confirmAndSubmit}
                  className="flex-1 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {submitting ? "Enviando…" : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default CreateUserPage;
