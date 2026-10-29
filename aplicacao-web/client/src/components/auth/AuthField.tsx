import { Eye, EyeOff } from "lucide-react";
import { type InputHTMLAttributes, useState } from "react";

type AuthFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className" | "id"
> & {
  id: string;
  label: string;
  error?: string | null;
  /** Mostra o botão para exibir/ocultar o valor (campos de senha). */
  revealable?: boolean;
};

/** Campo sublinhado usado nas telas de acesso (login e redefinição). */
export function AuthField({
  id,
  label,
  error,
  revealable = false,
  type = "text",
  ...inputProps
}: AuthFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const errorId = `${id}-error`;

  return (
    <div>
      <label className="block" htmlFor={id}>
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-olive">
          {label}
        </span>
        <span className="relative mt-2 block">
          <input
            id={id}
            type={revealable && revealed ? "text" : type}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className={`peer h-11 w-full border-0 border-b bg-transparent px-0 text-base text-graphite outline-none placeholder:text-graphite/30 focus-visible:outline-none ${
              error ? "border-destructive" : "border-olive/45"
            } ${revealable ? "pr-11" : ""}`}
            {...inputProps}
          />
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-field transition-transform duration-300 ease-out peer-focus:scale-x-100"
          />
          {revealable ? (
            <button
              type="button"
              onClick={() => setRevealed(current => !current)}
              aria-label={revealed ? "Ocultar senha" : "Mostrar senha"}
              title={revealed ? "Ocultar senha" : "Mostrar senha"}
              className="absolute bottom-2 right-0 grid h-8 w-8 place-items-center text-olive transition-colors hover:text-field focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-field"
            >
              {revealed ? (
                <EyeOff aria-hidden="true" className="h-4 w-4" />
              ) : (
                <Eye aria-hidden="true" className="h-4 w-4" />
              )}
            </button>
          ) : null}
        </span>
      </label>
      {error ? (
        <p id={errorId} className="mt-2 text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
