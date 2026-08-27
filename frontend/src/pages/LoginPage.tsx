import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Lock, Mail, ShieldCheck } from 'lucide-react'
import AuthLayout from '../components/AuthLayout'

function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [maintainSession, setMaintainSession] = useState(false)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    // TODO: integrar com autenticação no backend quando estiver disponível.
  }

  return (
    <AuthLayout>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
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
                  Credencial de Segurança
                </label>
                <a href="#" className="text-xs font-medium text-slate-500 hover:text-slate-900">
                  Esqueceu?
                </a>
              </div>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none"
                />
              </div>
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

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Autenticar
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
          <Link to="/register" className="font-semibold text-slate-900 hover:underline">
            Solicitar ao Administrador do Sistema
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}

export default LoginPage
