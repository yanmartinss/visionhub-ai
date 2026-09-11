import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

type Condominium = {
  id: string;
  name: string;
  cep: string | null;
  street: string | null;
  neighborhood: string | null;
  number: string | null;
  city: string | null;
  state: string | null;
};

type Feedback = { type: "ok" | "err"; text: string } | null;
type CepLookup = "idle" | "loading" | "not-found";

type ViaCepResponse = {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

const labelClass = "text-xs font-bold uppercase tracking-wide text-slate-700";
const inputClass =
  "mt-1.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none";

function GeneralSettingsPanel() {
  const { user, refresh } = useAuth();
  const canEditCondominium =
    user?.role === "manager" || user?.role === "admin";

  const [name, setName] = useState(user?.name ?? "");

  const [condoName, setCondoName] = useState("");
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [number, setNumber] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");

  const [cepLookup, setCepLookup] = useState<CepLookup>("idle");
  const [loadingCondo, setLoadingCondo] = useState(canEditCondominium);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    if (!canEditCondominium) return;
    let cancelled = false;
    apiFetch<Condominium | null>("/condominium")
      .then((data) => {
        if (cancelled || !data) return;
        setCondoName(data.name);
        setCep(data.cep ?? "");
        setStreet(data.street ?? "");
        setNeighborhood(data.neighborhood ?? "");
        setNumber(data.number ?? "");
        setCity(data.city ?? "");
        setState(data.state ?? "");
      })
      .catch(() => {
        // sem condomínio ainda — deixa os campos vazios
      })
      .finally(() => {
        if (!cancelled) setLoadingCondo(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canEditCondominium]);

  useEffect(() => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) {
      setCepLookup("idle");
      return;
    }

    let cancelled = false;
    setCepLookup("loading");

    fetch(`https://viacep.com.br/ws/${digits}/json/`)
      .then((res) => res.json())
      .then((data: ViaCepResponse) => {
        if (cancelled) return;
        if (data.erro) {
          setCepLookup("not-found");
          return;
        }
        setStreet(data.logradouro ?? "");
        setNeighborhood(data.bairro ?? "");
        setCity(data.localidade ?? "");
        setState(data.uf ?? "");
        setCepLookup("idle");
      })
      .catch(() => {
        if (!cancelled) setCepLookup("not-found");
      });

    return () => {
      cancelled = true;
    };
  }, [cep]);

  async function saveAll(event: React.FormEvent) {
    event.preventDefault();

    if (!name.trim()) {
      setFeedback({ type: "err", text: "O nome não pode ficar vazio." });
      return;
    }
    if (canEditCondominium && !condoName.trim()) {
      setFeedback({
        type: "err",
        text: "O nome do condomínio não pode ficar vazio.",
      });
      return;
    }

    setSaving(true);
    setFeedback(null);
    try {
      await apiFetch("/users/me", {
        method: "PATCH",
        body: { name: name.trim() },
      });

      if (canEditCondominium) {
        await apiFetch("/condominium", {
          method: "PATCH",
          body: {
            name: condoName.trim(),
            cep: cep.trim() || null,
            street: street.trim() || null,
            neighborhood: neighborhood.trim() || null,
            number: number.trim() || null,
            city: city.trim() || null,
            state: state.trim() || null,
          },
        });
      }

      await refresh();
      setFeedback({ type: "ok", text: "Alterações salvas." });
    } catch (err) {
      setFeedback({
        type: "err",
        text: err instanceof ApiError ? err.message : "Erro ao salvar.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={saveAll}
      className="max-w-xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
    >
      <div className="p-6">
        <h2 className="font-serif text-lg font-bold text-slate-900">Perfil</h2>
        <p className="mt-1 text-sm text-slate-500">
          Como seu nome aparece para o resto da equipe.
        </p>

        <div className="mt-4">
          <label htmlFor="profile-name" className={labelClass}>
            Nome
          </label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {canEditCondominium && (
        <div className="border-t border-slate-200 p-6">
          <h2 className="font-serif text-lg font-bold text-slate-900">
            Condomínio
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Dados do condomínio monitorado por este sistema.
          </p>

          {loadingCondo ? (
            <p className="mt-4 text-sm text-slate-500">Carregando…</p>
          ) : (
            <>
              <div className="mt-4">
                <label htmlFor="condo-name" className={labelClass}>
                  Nome
                </label>
                <input
                  id="condo-name"
                  type="text"
                  value={condoName}
                  onChange={(event) => setCondoName(event.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="mt-4">
                <label htmlFor="condo-cep" className={labelClass}>
                  CEP
                </label>
                <input
                  id="condo-cep"
                  type="text"
                  inputMode="numeric"
                  value={cep}
                  onChange={(event) => setCep(event.target.value)}
                  placeholder="Opcional — preenche o endereço abaixo"
                  className={inputClass}
                />
                {cepLookup === "loading" && (
                  <p className="mt-1 text-xs text-slate-500">Buscando endereço…</p>
                )}
                {cepLookup === "not-found" && (
                  <p className="mt-1 text-xs text-amber-600">
                    CEP não encontrado — preencha o endereço manualmente.
                  </p>
                )}
              </div>

              <div className="mt-4">
                <label htmlFor="condo-street" className={labelClass}>
                  Endereço
                </label>
                <input
                  id="condo-street"
                  type="text"
                  value={street}
                  onChange={(event) => setStreet(event.target.value)}
                  placeholder="Opcional"
                  className={inputClass}
                />
              </div>

              <div className="mt-4">
                <label htmlFor="condo-number" className={labelClass}>
                  Número
                </label>
                <input
                  id="condo-number"
                  type="text"
                  value={number}
                  onChange={(event) => setNumber(event.target.value)}
                  placeholder="Opcional"
                  className={inputClass}
                />
              </div>

              <div className="mt-4">
                <label htmlFor="condo-neighborhood" className={labelClass}>
                  Bairro
                </label>
                <input
                  id="condo-neighborhood"
                  type="text"
                  value={neighborhood}
                  onChange={(event) => setNeighborhood(event.target.value)}
                  placeholder="Opcional"
                  className={inputClass}
                />
              </div>

              <div className="mt-4">
                <label htmlFor="condo-city" className={labelClass}>
                  Cidade
                </label>
                <input
                  id="condo-city"
                  type="text"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="Opcional"
                  className={inputClass}
                />
              </div>

              <div className="mt-4">
                <label htmlFor="condo-state" className={labelClass}>
                  Estado
                </label>
                <input
                  id="condo-state"
                  type="text"
                  value={state}
                  onChange={(event) => setState(event.target.value)}
                  placeholder="Opcional"
                  className={inputClass}
                />
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 px-6 py-4">
        <p
          className={`text-sm ${
            feedback
              ? feedback.type === "ok"
                ? "text-emerald-700"
                : "text-red-600"
              : "invisible"
          }`}
        >
          {feedback?.text ?? "placeholder"}
        </p>
        <button
          type="submit"
          disabled={saving || loadingCondo}
          className="shrink-0 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}

export default GeneralSettingsPanel;
