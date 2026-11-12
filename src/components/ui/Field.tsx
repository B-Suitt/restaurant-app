import {
  cloneElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

const control =
  // 16 px: con menos, iOS hace zoom al enfocar el campo.
  "w-full min-h-12 rounded-sm border border-border bg-surface p-3 text-lg text-ink " +
  "placeholder:text-muted outline-none transition-[border-color,box-shadow] " +
  "focus-visible:border-ink focus-visible:ring-3 focus-visible:ring-primary/25 aria-invalid:border-primary " +
  "disabled:bg-surface-muted disabled:text-muted";

type ControlProps = {
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  /** Un solo control: <Input />, <Textarea /> o <Select /> */
  children: ReactElement<ControlProps>;
};

/** Etiqueta + control + ayuda o error. Conecta id, aria-invalid y aria-describedby. */
export function Field({ label, hint, error, className, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className={cn("flex w-full flex-col gap-1.75", className)}>
      <label htmlFor={id} className="text-md font-semibold text-ink">
        {label}
      </label>
      {cloneElement(children, {
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": message ? messageId : undefined,
      })}
      {message && (
        <p id={messageId} className={cn("text-sm", error ? "text-primary" : "text-muted")}>
          {message}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(control, "min-h-24 resize-y", className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative w-full">
      <select className={cn(control, "appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
    </div>
  );
}
