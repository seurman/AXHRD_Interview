"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const PRAISE = ["Nice!", "Great!", "Awesome!", "완벽!", "좋아요!", "Impressive!"];

export function ComboBanner({ combo }: { combo: number }) {
  if (combo < 2) return null;
  return (
    <motion.div
      key={combo}
      initial={{ scale: 0.6, opacity: 0, y: 8 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      className="pointer-events-none fixed left-1/2 top-24 z-50 -translate-x-1/2"
    >
      <div className="rounded-full bg-gradient-to-r from-gold to-primary px-4 py-2 text-sm font-bold text-white shadow-lg">
        {combo}콤보!{combo >= 5 ? " Perfect" : combo >= 3 ? " Excellent" : ""}
      </div>
    </motion.div>
  );
}

export function PraiseToast({ show, text }: { show: boolean; text: string }) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.p
          key={text}
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8 }}
          className="pointer-events-none fixed left-1/2 top-36 z-50 -translate-x-1/2 rounded-xl bg-emerald-500/95 px-4 py-2 text-sm font-bold text-white shadow-md"
        >
          {text}
        </motion.p>
      ) : null}
    </AnimatePresence>
  );
}

export function XpFloat({ amount, show }: { amount: number; show: boolean }) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: -30 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="pointer-events-none fixed left-1/2 top-1/2 z-50 -translate-x-1/2 text-2xl font-black text-gold"
        >
          +{amount} XP
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}

/** 가벼운 색종이 — 외부 라이브러리 없이 CSS/모션 */
export function ConfettiBurst({ active }: { active: boolean }) {
  const [pieces, setPieces] = useState<
    Array<{ id: number; x: number; delay: number; color: string; rot: number }>
  >([]);

  useEffect(() => {
    if (!active) return;
    const colors = ["#E8B86D", "#2F6FED", "#34D399", "#F472B6", "#FBBF24"];
    setPieces(
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        x: (i / 28) * 100,
        delay: Math.random() * 0.25,
        color: colors[i % colors.length],
        rot: Math.random() * 360,
      })),
    );
  }, [active]);

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: p.rot }}
          animate={{ y: "110vh", opacity: 0.2, rotate: p.rot + 180 }}
          transition={{ duration: 1.6 + Math.random(), delay: p.delay, ease: "easeOut" }}
          className="absolute top-0 h-3 w-2 rounded-sm"
          style={{ background: p.color, left: 0 }}
        />
      ))}
    </div>
  );
}

export function pickPraise(combo: number): string {
  if (combo >= 5) return "Perfect!";
  if (combo >= 3) return "Excellent!";
  return PRAISE[Math.floor(Math.random() * PRAISE.length)];
}

export function HeartBreak({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={{ scale: 1.4, opacity: 1 }}
          animate={{ scale: 0.6, opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="pointer-events-none fixed left-1/2 top-1/3 z-50 -translate-x-1/2 rounded-full bg-rose-500 px-4 py-3 text-sm font-black text-white shadow-lg"
        >
          하트 -1
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
