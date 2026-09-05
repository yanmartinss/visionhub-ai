import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Menu, Settings, X } from "lucide-react";
import Logo from "./Logo";
import { useAuth } from "../context/AuthContext";

type NavLeaf = {
  to: string;
  label: string;
};

type NavModule = {
  label: string;
  children: NavLeaf[];
};

type NavEntry = NavLeaf | NavModule;

function isModule(entry: NavEntry): entry is NavModule {
  return "children" in entry;
}

function useNavEntries(): NavEntry[] {
  const { user } = useAuth();
  const entries: NavEntry[] = [{ to: "/dashboard", label: "Início" }];

  if (user?.role === "manager" || user?.role === "admin") {
    entries.push({
      label: "Cadastros",
      children: [{ to: "/users/new", label: "Cadastrar Usuário" }],
    });
  }

  return entries;
}

function AppLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const entries = useNavEntries();

  const [openModules, setOpenModules] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      for (const entry of entries) {
        if (
          isModule(entry) &&
          entry.children.some((c) => c.to === location.pathname)
        ) {
          initial[entry.label] = true;
        }
      }
      return initial;
    },
  );

  function toggleModule(label: string) {
    setOpenModules((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <Logo className="h-7 w-7" />
          <span className="font-serif text-lg font-bold text-slate-900">
            VisionHub AI
          </span>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
          className="cursor-pointer rounded-md p-2 text-slate-700 hover:bg-slate-100"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 md:static md:z-auto md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2">
            <Logo className="h-8 w-8" />
            <span className="font-serif text-lg font-bold text-slate-900">
              VisionHub AI
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
            className="cursor-pointer rounded-md p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {entries.map((entry) => {
            if (!isModule(entry)) {
              const active = location.pathname === entry.to;
              return (
                <Link
                  key={entry.to}
                  to={entry.to}
                  onClick={() => setOpen(false)}
                  className={`block rounded-md px-3 py-2 text-sm font-medium ${
                    active
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {entry.label}
                </Link>
              );
            }

            const expanded = Boolean(openModules[entry.label]);
            return (
              <div key={entry.label}>
                <button
                  onClick={() => toggleModule(entry.label)}
                  className="flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  {entry.label}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      expanded ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {expanded && (
                  <div className="mt-1 space-y-1 pl-3">
                    {entry.children.map((child) => {
                      const active = location.pathname === child.to;
                      return (
                        <Link
                          key={child.to}
                          to={child.to}
                          onClick={() => setOpen(false)}
                          className={`block rounded-md px-3 py-2 text-sm font-medium ${
                            active
                              ? "bg-slate-900 text-white"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 px-5 py-4">
          <div className="flex items-center justify-between">
            <p className="truncate text-xs text-slate-500">
              {user?.name} ({user?.role})
            </p>
            <Link
              to="/settings"
              onClick={() => setOpen(false)}
              aria-label="Configurações"
              className={`cursor-pointer rounded-md p-1.5 ${
                location.pathname === "/settings"
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>

          <button
            onClick={handleLogout}
            className="-mx-2 mt-2 flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 px-4 py-6 md:px-8 md:py-10">{children}</main>
    </div>
  );
}

export default AppLayout;
