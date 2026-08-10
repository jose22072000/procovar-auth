"use client";

import { useEffect, useRef } from "react";

interface SparklineProps {
    data: number[];
    color: string;
    width?: number;
    height?: number;
}

export function Sparkline({ data, color, width = 80, height = 28 }: SparklineProps) {
    const pathRef = useRef<SVGPathElement>(null);
    const areaRef = useRef<SVGPathElement>(null);

    if (data.length < 2) {
        return <svg width={width} height={height} />;
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const pad = 2;
    const w = width - pad * 2;
    const h = height - pad * 2;

    const pts = data.map((v, i) => ({
        x: pad + (i / (data.length - 1)) * w,
        y: pad + h - ((v - min) / range) * h,
    }));

    const linePath = pts
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
        .join(' ');

    const areaPath =
        `M ${pts[0].x.toFixed(1)} ${(pad + h).toFixed(1)} ` +
        pts.map(p => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') +
        ` L ${pts[pts.length - 1].x.toFixed(1)} ${(pad + h).toFixed(1)} Z`;

    const gradId = `sg-${color.replace('#', '')}`;

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
        const el = pathRef.current;
        if (!el) return;
        const len = el.getTotalLength();
        el.style.strokeDasharray = `${len}`;
        el.style.strokeDashoffset = `${len}`;
        el.style.transition = 'none';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                el.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(0.4,0,0.2,1)';
                el.style.strokeDashoffset = '0';
            });
        });
        if (areaRef.current) {
            areaRef.current.style.opacity = '0';
            areaRef.current.style.transition = 'opacity 1.1s ease-in-out';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (areaRef.current) areaRef.current.style.opacity = '1';
                });
            });
        }
    }, [data.join(',')]);

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                </linearGradient>
            </defs>
            <path ref={areaRef} d={areaPath} fill={`url(#${gradId})`} style={{ opacity: 0 }} />
            <path
                ref={pathRef}
                d={linePath}
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
