import type { ButtonHTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "soft" | "link";
type ButtonSize = "md" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-normal transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary " +
  "disabled:pointer-events-none disabled:opacity-50 cursor-pointer";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  secondary: "border border-border bg-surface text-ink hover:bg-surface-muted",
  soft: "bg-primary-soft text-primary hover:bg-primary/15",
  link: "text-primary hover:underline underline-offset-2",
};

const sizes: Record<ButtonSize, string> = {
  md: "h-13 px-4.5 rounded-lg text-base",
  icon: "size-11 rounded-md",
};

/** Clases del botón, para usarlas también en <Link>. */
export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  // La variante "link" no tiene alto ni padding de botón.
  return cn(base, variants[variant], variant !== "link" && sizes[size], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
};

export function Button({
  variant,
  size,
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, className })}
      {...props}
    >
      {loading && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
