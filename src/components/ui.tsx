"use client";

type ButtonProps = React.ComponentProps<"button"> & { variant?: "primary" | "ghost" | "danger" };

export function Button({ variant = "ghost", className = "", ...rest }: ButtonProps) {
  const styles = {
    primary: "bg-sky-500 text-white hover:bg-sky-400 disabled:bg-sky-500/40",
    ghost: "bg-white/5 text-neutral-200 hover:bg-white/10 ring-1 ring-white/10",
    danger: "bg-transparent text-red-300 hover:bg-red-500/10 ring-1 ring-red-400/20",
  }[variant];
  return (
    <button
      type="button"
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
      {...rest}
    />
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium tracking-wide text-neutral-400 uppercase">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg bg-neutral-900 px-3 py-2 text-sm text-neutral-100 ring-1 ring-white/10 outline-none placeholder:text-neutral-600 focus:ring-sky-500";

export function TextInput(props: React.ComponentProps<"input">) {
  return <input {...props} className={`${inputClass} ${props.className ?? ""}`} />;
}

export function TextArea(props: React.ComponentProps<"textarea">) {
  return (
    <textarea
      {...props}
      className={`${inputClass} resize-y leading-relaxed ${props.className ?? ""}`}
    />
  );
}
