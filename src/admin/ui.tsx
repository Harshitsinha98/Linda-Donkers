import { useEffect, type ReactNode } from "react";

export const input =
  "mt-1.5 w-full rounded-xl border border-forest/15 bg-white px-3.5 py-2.5 text-[0.95rem] text-ink outline-none focus:border-saffron";

export function Label({ text, hint, children, className = "" }: { text: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-forest/70">{text}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-forest/50">{hint}</span>}
    </label>
  );
}

export function Btn({
  children,
  onClick,
  kind = "primary",
  type = "button",
  disabled,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: "primary" | "dark" | "ghost" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  const styles = {
    primary: "bg-saffron text-white hover:bg-[#cf6420]",
    dark: "bg-forest text-linen hover:bg-ink",
    ghost: "border border-forest/20 text-forest hover:border-forest/50 bg-white",
    danger: "border border-red-300 text-red-700 hover:bg-red-50 bg-white",
  }[kind];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

export function Badge({ children, tone }: { children: ReactNode; tone: "green" | "amber" | "grey" | "red" | "blue" }) {
  const t = {
    green: "bg-green-100 text-green-800",
    amber: "bg-amber-100 text-amber-800",
    grey: "bg-stone-200 text-stone-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-sky-100 text-sky-800",
  }[tone];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${t}`}>{children}</span>;
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-3 sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`w-full ${wide ? "max-w-4xl" : "max-w-2xl"} rounded-3xl bg-cream p-5 shadow-2xl sm:p-8`}>
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 className="font-display text-2xl text-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-forest/20 text-lg">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ErrorNote({ text }: { text: string }) {
  if (!text) return null;
  return (
    <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
      {text}
    </p>
  );
}
