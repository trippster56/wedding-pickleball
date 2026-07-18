"use client";

import { useEffect, useState } from "react";

const COLORS = ["#4a73a8", "#b83558", "#d9b45a", "#91baf2", "#e6758f", "#c69a3e"];

function Confetti() {
  const [pieces, setPieces] = useState<
    { left: number; delay: number; dur: number; color: string; rot: number }[]
  >([]);

  useEffect(() => {
    const arr = Array.from({ length: 90 }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 2.5,
      dur: 3 + Math.random() * 2.5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot: Math.random() * 360,
    }));
    setPieces(arr);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export function ChampionBanner({ name }: { name: string }) {
  return (
    <>
      <Confetti />
      <div className="relative bg-white border border-gold-400 rounded-sm shadow-sm px-6 py-8 text-center">
        <p className="text-xs tracking-[0.3em] uppercase text-gold-600">
          🏆 Champions
        </p>
        <div className="mx-auto w-16 h-px bg-gold-400 my-4" />
        <h2 className="font-serif text-3xl sm:text-4xl text-charcoal-900">
          {name}
        </h2>
        <p className="mt-3 text-charcoal-500 text-sm">
          Winners of the Callie &amp; Tripp Wedding Pickleball Tournament
        </p>
      </div>
    </>
  );
}
