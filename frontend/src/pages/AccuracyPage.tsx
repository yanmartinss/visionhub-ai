import { useEffect, useState } from "react";
import { fetchAccuracy } from "../lib/stats-api";
import { EVENT_TYPE_INFO } from "../lib/eventTypes";
import { describeError } from "../lib/messages";
import { todayLocalDate } from "../lib/format";
import type { AccuracyCounts, AccuracyReport } from "../lib/types";
import { EventTypeBadge } from "../components/StatusBadge";

const CARD = "rounded-lg border border-slate-200 bg-white p-5";
const INPUT =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none";

function percent(precision: number | null): string {
  return precision === null ? "—" : `${Math.round(precision * 100)}%`;
}

function PrecisionBar({ counts }: { counts: AccuracyCounts }) {
  if (counts.precision === null) {
    return <span className="text-xs text-slate-400">Nada triado ainda</span>;
  }
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full bg-emerald-500"
          style={{ width: `${counts.precision * 100}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-slate-900">
        {percent(counts.precision)}
      </span>
    </div>
  );
}

function AccuracyPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState<AccuracyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAccuracy({ from, to })
      .then((data) => {
        if (cancelled) return;
        setReport(data);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(describeError(err, "Erro ao carregar a precisão."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  function changeDate(setter: (value: string) => void, value: string) {
    setter(value);
    setLoading(true);
  }

  const today = todayLocalDate();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-slate-900">
            Precisão por tipo
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Baseada na triagem: eventos resolvidos contra marcados como falso
            positivo. Eventos ainda não triados ficam de fora do cálculo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            aria-label="De"
            value={from}
            max={to || today}
            onChange={(ev) => changeDate(setFrom, ev.target.value)}
            className={INPUT}
          />
          <input
            type="date"
            aria-label="Até"
            value={to}
            min={from || undefined}
            max={today}
            onChange={(ev) => changeDate(setTo, ev.target.value)}
            className={INPUT}
          />
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {!report ? (
        <p className="py-12 text-center text-sm text-slate-500">
          {loading ? "Carregando…" : "Não foi possível carregar a precisão."}
        </p>
      ) : (
        <div className={loading ? "opacity-60" : undefined}>
          <section className={CARD}>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Precisão geral
            </p>
            <p className="mt-2 font-serif text-3xl font-bold text-slate-900">
              {percent(report.overall.precision)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {report.overall.resolved} confirmados ·{" "}
              {report.overall.falsePositive} falsos positivos ·{" "}
              {report.overall.unreviewed} sem triagem
            </p>
          </section>

          <section className={`${CARD} mt-6 overflow-x-auto`}>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4 font-bold">Tipo</th>
                  <th className="py-2 pr-4 text-right font-bold">Total</th>
                  <th className="py-2 pr-4 text-right font-bold">Confirmados</th>
                  <th className="py-2 pr-4 text-right font-bold">
                    Falsos positivos
                  </th>
                  <th className="py-2 pr-4 text-right font-bold">Sem triagem</th>
                  <th className="py-2 font-bold">Precisão</th>
                </tr>
              </thead>
              <tbody>
                {report.items.map((item) => (
                  <tr
                    key={item.type}
                    className="border-b border-slate-100 last:border-0"
                    aria-label={EVENT_TYPE_INFO[item.type].label}
                  >
                    <td className="py-2 pr-4">
                      <EventTypeBadge type={item.type} />
                    </td>
                    <td className="py-2 pr-4 text-right">{item.total}</td>
                    <td className="py-2 pr-4 text-right">{item.resolved}</td>
                    <td className="py-2 pr-4 text-right">
                      {item.falsePositive}
                    </td>
                    <td className="py-2 pr-4 text-right">{item.unreviewed}</td>
                    <td className="py-2">
                      <PrecisionBar counts={item} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      )}
    </div>
  );
}

export default AccuracyPage;
