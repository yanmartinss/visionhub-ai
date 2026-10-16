import type { EventStatus } from "../lib/types";

const OPTIONS: { value: EventStatus; label: string }[] = [
  { value: "pending", label: "Pendente" },
  { value: "inProgress", label: "Em andamento" },
  { value: "resolved", label: "Resolvido" },
  { value: "falsePositive", label: "Falso positivo" },
];

// Triage control for an event; any role may use it (`PATCH /events/:id`).
// The caller does the request and refreshes its own list.
function EventStatusSelect({
  value,
  label,
  disabled,
  onChange,
}: {
  value: EventStatus;
  label: string;
  disabled?: boolean;
  onChange: (status: EventStatus) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(ev) => onChange(ev.target.value as EventStatus)}
      className="w-32 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs focus:border-slate-500 focus:outline-none disabled:opacity-60"
    >
      {OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export default EventStatusSelect;
