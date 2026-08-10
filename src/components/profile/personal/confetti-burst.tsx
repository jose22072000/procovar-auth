"use client";

import { useEffect, useState } from "react";

const COLORS = ["#7c3aed", "#c026d3", "#f59e0b", "#10b981", "#3b82f6"];

// Lightweight celebration — no npm dependency. Renders ~28 falling pieces once
// `fire` flips to true, then clears itself.
export function ConfettiBurst({ fire }: { fire: boolean }) {
    const [pieces, setPieces] = useState<number[]>([]);

    useEffect(() => {
        if (!fire) return;
        setPieces(Array.from({ length: 28 }, (_, i) => i));
        const t = setTimeout(() => setPieces([]), 1800);
        return () => clearTimeout(t);
    }, [fire]);

    if (pieces.length === 0) return null;

    return (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
            <style>{`
                @keyframes qb-confetti-fall {
                    0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
                }
            `}</style>
            {pieces.map((i) => {
                const left = (i * 37) % 100;
                const delay = (i % 7) * 60;
                const dur = 1200 + (i % 5) * 160;
                return (
                    <span
                        key={i}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: `${left}%`,
                            width: 8,
                            height: 12,
                            background: COLORS[i % COLORS.length],
                            borderRadius: 2,
                            animation: `qb-confetti-fall ${dur}ms ${delay}ms ease-in forwards`,
                        }}
                    />
                );
            })}
        </div>
    );
}
