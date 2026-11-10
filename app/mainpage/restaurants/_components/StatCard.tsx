"use client";

import React, { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: number;
  /** Shown as is instead of the animated number (exact decimals, e.g. revenue). */
  valueText?: string;
  suffix?: string;
  prefix?: string;
  trendText?: string;
  subText?: string;
  trendType?: "positive" | "neutral";
  chartColor?: "green" | "orange";
  chartPoints?: number[];
  delay?: number;
}

export function StatCard({
  icon,
  title,
  value,
  valueText,
  suffix = "",
  prefix = "",
  trendText,
  subText,
  trendType = "positive",
  chartColor = "green",
  chartPoints,
  delay = 0,
}: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isRendered, setIsRendered] = useState(false);

  // Number counting animation
  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1200; // 1.2s smooth count-up

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(easeOut * value));

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDisplayValue(value);
      }
    };

    const timer = setTimeout(() => {
      setIsRendered(true);
      requestAnimationFrame(step);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  // Generate SVG path for sparkline (only drawn when a series is given)
  const series = chartPoints && chartPoints.length > 1 ? chartPoints : [0, 0];
  const width = 160;
  const height = 44;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;

  const points = series.map((pt, i) => {
    const x = (i / (series.length - 1)) * width;
    const y = height - ((pt - min) / range) * (height - 12) - 6;
    return { x, y };
  });

  // Create smooth bezier curve string
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    const mx = (curr.x + next.x) / 2;
    pathD += ` C ${mx} ${curr.y}, ${mx} ${next.y}, ${next.x} ${next.y}`;
  }

  const fillD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  const strokeColor = chartColor === "green" ? "#2E7D32" : "#D96B27";
  const gradientId = `sparkline-grad-${title.replace(/\s+/g, "").toLowerCase()}`;

  return (
    <div className="group relative bg-white rounded-2xl border border-[#EDE7DC] hover:border-[#DECFC0] p-4.5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between overflow-hidden">
      {/* Top row: Icon & Title */}
      <div>
        <div className="flex items-center gap-2 mb-2 text-[#736D65]">
          <div className="p-1.5 rounded-lg bg-[#FAF7F2] text-[#B55234] border border-[#ECE7DC] group-hover:scale-105 transition-transform">
            {icon}
          </div>
          <span className="text-xs font-medium text-[#736D65]">{title}</span>
        </div>

        {/* Big Number */}
        <div className="text-2xl sm:text-[28px] font-extrabold text-[#1A1A1A] tracking-tight leading-none mt-1">
          {prefix}
          {valueText ?? displayValue.toLocaleString()}
          {suffix}
        </div>

        {/* Trend / Subtext */}
        <div className="mt-2 flex items-center gap-1.5">
          {trendText && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#2E7D32]">
              <ArrowUpRight className="w-3 h-3 text-[#2E7D32] stroke-[2.5]" />
              <span>{trendText}</span>
            </span>
          )}
          {subText && (
            <span className="text-[11px] text-[#7A746B] font-medium">
              {subText}
            </span>
          )}
        </div>
      </div>

      {/* Sparkline curve at bottom */}
      {chartPoints && chartPoints.length > 1 && (
      <div className="mt-3 relative h-10 w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={strokeColor}
                stopOpacity={chartColor === "green" ? 0.22 : 0.26}
              />
              <stop
                offset="100%"
                stopColor={strokeColor}
                stopOpacity={0.0}
              />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path
            d={fillD}
            fill={`url(#${gradientId})`}
            className={`transition-opacity duration-700 ${isRendered ? "opacity-100" : "opacity-0"}`}
          />

          {/* Line stroke with draw animation */}
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: 300,
              strokeDashoffset: isRendered ? 0 : 300,
              transition: "stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />

          {/* Animated pulsing dot on the end point */}
          {isRendered && points.length > 0 && (
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r="3.5"
              fill={strokeColor}
              className="animate-ping opacity-60 origin-center"
            />
          )}
          {isRendered && points.length > 0 && (
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r="2.5"
              fill={strokeColor}
            />
          )}
        </svg>
      </div>
      )}
    </div>
  );
}
