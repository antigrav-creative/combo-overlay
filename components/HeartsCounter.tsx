"use client";

import { useEffect, useState } from "react";

interface HeartsCounterProps {
  count: number;
  imageUrl: string;
}

export function HeartsCounter({ count, imageUrl }: HeartsCounterProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [prevCount, setPrevCount] = useState(count);

  useEffect(() => {
    if (count !== prevCount) {
      setIsAnimating(true);
      setPrevCount(count);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [count, prevCount]);

  if (count === 0) return null;

  return (
    <div
      className={`
        fixed bottom-8 left-8 z-50
        flex items-center gap-3
        rounded-2xl bg-black/60 backdrop-blur-sm
        px-6 py-4
        text-white
        shadow-lg shadow-pink-500/20
        transition-transform duration-300
        ${isAnimating ? "scale-110" : "scale-100"}
      `}
    >
      {/* Heart shape with clipped emote */}
      <div
        className={`
          relative h-12 w-12
          transition-transform duration-300
          ${isAnimating ? "scale-125" : "scale-100"}
        `}
      >
        {/* SVG clip path definition */}
        <svg className="absolute h-0 w-0">
          <defs>
            <clipPath id="heart-clip" clipPathUnits="objectBoundingBox">
              <path d="M0.5,0.15 C0.35,-0.05 0.05,0.05 0.05,0.35 C0.05,0.55 0.25,0.75 0.5,1 C0.75,0.75 0.95,0.55 0.95,0.35 C0.95,0.05 0.65,-0.05 0.5,0.15 Z" />
            </clipPath>
          </defs>
        </svg>

        {/* Emote clipped to heart shape */}
        <div
          className="h-full w-full"
          style={{ clipPath: "url(#heart-clip)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover"
            crossOrigin="anonymous"
          />
        </div>
      </div>

      <span className="text-3xl font-bold tabular-nums">
        {count.toLocaleString()}
      </span>
    </div>
  );
}
