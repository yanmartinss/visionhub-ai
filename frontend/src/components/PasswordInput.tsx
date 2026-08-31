import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  placeholder?: string;
  withLockIcon?: boolean;
};

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  placeholder,
  withLockIcon = false,
}: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative mt-1.5">
      {withLockIcon && (
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      )}
      <input
        id={id}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-md border border-slate-300 py-2 pr-10 text-sm placeholder:text-slate-400 focus:border-slate-500 focus:outline-none ${
          withLockIcon ? "pl-9" : "pl-3"
        }`}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default PasswordInput;
