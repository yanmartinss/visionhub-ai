import type { ReactNode } from "react";
import Logo from "./Logo";

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col bg-white bg-[size:24px_24px] text-slate-900"
      style={{
        backgroundImage:
          "linear-gradient(to right, #f1f5f9 1px, transparent 1px), linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)",
      }}
    >
      <main className="flex flex-1 flex-col items-center px-4 py-12">
        <div className="flex flex-col items-center">
          <Logo className="h-11 w-11 text-slate-900" />
          <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight">
            VisionHub AI
          </h1>
          <p className="mt-1 text-sm italic text-emerald-700">
            Precisão em Missão Crítica
          </p>
        </div>

        <div className="mt-8 w-full max-w-md">{children}</div>
      </main>

      {/* <footer className="flex flex-col items-center gap-2 border-t border-slate-200 px-6 py-4 text-xs text-slate-500 sm:flex-row sm:justify-between">
        <p>© 2024 VisionHub AI. Precisão em Missão Crítica.</p>
        <nav className="flex gap-4 font-medium text-slate-700">
          <a href="#" className="hover:text-slate-900">
            Política de Privacidade
          </a>
          <a href="#" className="hover:text-slate-900">
            Termos de Serviço
          </a>
          <a href="#" className="hover:text-slate-900">
            Arquitetura de Segurança
          </a>
          <a href="#" className="hover:text-slate-900">
            Suporte
          </a>
        </nav>
      </footer> */}
    </div>
  );
}

export default AuthLayout;
