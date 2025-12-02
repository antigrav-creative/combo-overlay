"use client";

import { useEffect, useRef, useCallback } from "react";

export interface HeartSpawnRequest {
  id: number;
  color: string | null;
}

interface FallingHeartsProps {
  imageUrl: string;
  spawnQueue: HeartSpawnRequest[];
  sizeMultiplier?: number;
}

const BASE_SIZE = 50;
const MIN_SCALE = 1.5;
const MAX_SCALE = 5.0;
const FALL_DURATION_MIN = 3000; // 3 seconds minimum
const FALL_DURATION_MAX = 5000; // 5 seconds maximum

// Convert hex to hue for CSS filter
function hexToHue(hex: string): number {
  hex = hex.replace(/^#/, "");
  
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  
  if (max === min) return 0;
  
  let hue = 0;
  const d = max - min;
  
  switch (max) {
    case r:
      hue = ((g - b) / d + (g < b ? 6 : 0)) * 60;
      break;
    case g:
      hue = ((b - r) / d + 2) * 60;
      break;
    case b:
      hue = ((r - g) / d + 4) * 60;
      break;
  }
  
  return hue;
}

export function FallingHearts({ imageUrl, spawnQueue, sizeMultiplier = 1 }: FallingHeartsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const processedIdsRef = useRef<Set<number>>(new Set());

  const spawnHeart = useCallback((color: string | null) => {
    if (!containerRef.current) return;

    const screenWidth = window.innerWidth;
    const scale = (MIN_SCALE + Math.random() * (MAX_SCALE - MIN_SCALE)) * sizeMultiplier;
    const size = BASE_SIZE * scale;
    
    // Use user's color if available, otherwise random
    const hue = color ? hexToHue(color) : Math.random() * 360;
    
    // Random horizontal position with padding
    const x = size / 2 + Math.random() * (screenWidth - size);
    
    // Random fall duration
    const duration = FALL_DURATION_MIN + Math.random() * (FALL_DURATION_MAX - FALL_DURATION_MIN);
    
    // Random slight rotation for variety
    const rotation = -15 + Math.random() * 30;

    // Create heart element
    const element = document.createElement("div");
    element.className = "absolute";
    element.style.left = `${x}px`;
    element.style.top = `-${size}px`;
    element.style.width = `${size}px`;
    element.style.height = `${size}px`;
    element.style.filter = `hue-rotate(${hue}deg) saturate(1.5) brightness(1.1)`;
    element.style.transform = `rotate(${rotation}deg)`;
    element.style.transition = `top ${duration}ms linear, opacity 500ms ease-out`;
    element.style.willChange = "top, opacity";

    // SVG clip path for heart shape
    const svgClip = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svgClip.setAttribute("class", "absolute h-0 w-0");
    svgClip.innerHTML = `
      <defs>
        <clipPath id="heart-clip-${Date.now()}-${Math.random()}" clipPathUnits="objectBoundingBox">
          <path d="M0.5,0.15 C0.35,-0.05 0.05,0.05 0.05,0.35 C0.05,0.55 0.25,0.75 0.5,1 C0.75,0.75 0.95,0.55 0.95,0.35 C0.95,0.05 0.65,-0.05 0.5,0.15 Z" />
        </clipPath>
      </defs>
    `;
    element.appendChild(svgClip);

    const clipId = svgClip.querySelector("clipPath")?.id;

    // Heart container with clip
    const heartContainer = document.createElement("div");
    heartContainer.className = "h-full w-full";
    heartContainer.style.clipPath = `url(#${clipId})`;

    const img = document.createElement("img");
    img.src = imageUrl;
    img.alt = "";
    img.crossOrigin = "anonymous";
    img.className = "h-full w-full object-cover";
    heartContainer.appendChild(img);
    element.appendChild(heartContainer);

    containerRef.current.appendChild(element);

    // Force reflow to ensure initial styles are applied
    element.offsetHeight;

    // Start falling animation after a tiny delay
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        element.style.top = `calc(100vh + ${size}px)`;
      });
    });

    // Remove after animation completes
    setTimeout(() => {
      element.style.opacity = "0";
      setTimeout(() => {
        element.remove();
      }, 500);
    }, duration);
  }, [imageUrl, sizeMultiplier]);

  // Process spawn queue
  useEffect(() => {
    for (const request of spawnQueue) {
      if (!processedIdsRef.current.has(request.id)) {
        processedIdsRef.current.add(request.id);
        spawnHeart(request.color);
      }
    }
  }, [spawnQueue, spawnHeart]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 35 }}
    />
  );
}

