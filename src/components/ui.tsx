"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  size?: "md" | "sm";
};

const VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700 border border-blue-600",
  secondary: "bg-rose-600 text-white hover:bg-rose-700 border border-rose-600",
  outline:
    "bg-transparent text-blue-700 border border-blue-400 hover:bg-blue-50",
  ghost:
    "bg-transparent text-charcoal-500 border border-transparent hover:text-charcoal-800",
};

export function Button({
  children,
  onClick,
  href,
  variant = "primary",
  type = "button",
  disabled,
  className = "",
  size = "md",
}: ButtonProps) {
  const pad = size === "sm" ? "px-4 py-2 text-xs" : "px-6 py-3 text-sm";
  const base = `inline-flex items-center justify-center gap-2 tracking-widest uppercase font-medium transition-colors rounded-sm text-center min-h-[44px] disabled:opacity-40 disabled:pointer-events-none ${pad} ${VARIANTS[variant]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={base}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={base}>
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white border border-cream-300 rounded-sm shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs sm:text-sm tracking-[0.3em] uppercase text-charcoal-400">
      {children}
    </p>
  );
}

export function Divider() {
  return <div className="mx-auto w-16 h-px bg-blue-400 my-4" />;
}
