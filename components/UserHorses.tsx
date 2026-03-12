"use client";

import { useEffect, useRef } from "react";
import Matter from "matter-js";
import type { UserHorseData } from "@/hooks/useComboStorage";

type CornerPosition = "bl" | "tl" | "br" | "tr";

interface UserHorsesProps {
  imageUrl: string;
  userHorses: Record<string, UserHorseData>;
  lastUpdate: { username: string; timestamp: number } | null;
  corner?: CornerPosition;
}

const EMOTE_ASPECT_RATIO = 64 / 26; // width / height
const BASE_HEIGHT = 50;
const HEIGHT_INCREMENT = 50;
const MAX_HEIGHT = 500;
const EDGE_PADDING = 30;

function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace(/^#/, "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

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
    case r: hue = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
    case g: hue = ((b - r) / d + 2) * 60; break;
    case b: hue = ((r - g) / d + 4) * 60; break;
  }
  return hue;
}

function getHorseDimensions(count: number) {
  const height = Math.min(BASE_HEIGHT + (count - 1) * HEIGHT_INCREMENT, MAX_HEIGHT);
  const width = height * EMOTE_ASPECT_RATIO;
  return { width, height };
}

interface HorseBody {
  username: string;
  body: Matter.Body;
  element: HTMLDivElement;
  count: number;
}

export function UserHorses({ imageUrl, userHorses, lastUpdate, corner = "bl" }: UserHorsesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const horseBodiesRef = useRef<Map<string, HorseBody>>(new Map());
  const animationRef = useRef<number>(0);
  const lastUpdateRef = useRef<{ username: string; timestamp: number } | null>(null);

  // Initialize physics engine (runs once)
  useEffect(() => {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    const engine = Matter.Engine.create({ gravity: { x: 0, y: 1 } });
    engineRef.current = engine;

    const wallThickness = 50;
    const walls = [
      // Floor (raised 40px to leave room for username badge below the horse)
      Matter.Bodies.rectangle(screenW / 2, screenH - 40 + wallThickness / 2, screenW * 2, wallThickness, { isStatic: true }),
      // Left wall
      Matter.Bodies.rectangle(-wallThickness / 2 + EDGE_PADDING, screenH / 2, wallThickness, screenH * 2, { isStatic: true }),
      // Right wall
      Matter.Bodies.rectangle(screenW + wallThickness / 2 - EDGE_PADDING, screenH / 2, wallThickness, screenH * 2, { isStatic: true }),
    ];
    Matter.Composite.add(engine.world, walls);

    const runner = Matter.Runner.create();
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);

    // rAF loop — sync DOM to physics positions
    const updatePositions = () => {
      for (const [, hb] of horseBodiesRef.current) {
        const { width: w, height: h } = getHorseDimensions(hb.count);
        hb.element.style.transform = `translate(${hb.body.position.x - w / 2}px, ${hb.body.position.y - h / 2}px)`;
      }
      animationRef.current = requestAnimationFrame(updatePositions);
    };
    animationRef.current = requestAnimationFrame(updatePositions);

    return () => {
      cancelAnimationFrame(animationRef.current);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
      horseBodiesRef.current.forEach(({ element }) => element.remove());
      horseBodiesRef.current.clear();
    };
  }, []);

  // Sync React state → physics world
  useEffect(() => {
    if (!engineRef.current || !containerRef.current) return;
    const engine = engineRef.current;
    const container = containerRef.current;

    const currentUsernames = new Set(Object.keys(userHorses || {}));

    // Remove horses that were deleted (12hr expiry or cleared)
    for (const [username, hb] of horseBodiesRef.current) {
      if (!currentUsernames.has(username)) {
        Matter.Composite.remove(engine.world, hb.body);
        hb.element.remove();
        horseBodiesRef.current.delete(username);
      }
    }

    // Add or update each horse
    for (const [username, data] of Object.entries(userHorses || {})) {
      const { width, height } = getHorseDimensions(data.count);
      const hue = hexToHue(data.color);
      const textColor = getContrastColor(data.color);
      const existing = horseBodiesRef.current.get(username);

      if (existing) {
        // Size changed — replace physics body at same position/velocity
        if (existing.count !== data.count) {
          const pos = { ...existing.body.position };
          const vel = { ...existing.body.velocity };

          Matter.Composite.remove(engine.world, existing.body);

          const newBody = Matter.Bodies.rectangle(
            pos.x, pos.y,
            width * 0.4, height * 0.6,
            { restitution: 0.2, friction: 0.8, frictionAir: 0.02, inertia: Infinity }
          );
          Matter.Body.setVelocity(newBody, vel);
          Matter.Composite.add(engine.world, newBody);

          existing.body = newBody;
          existing.count = data.count;

          // Update visuals
          const imgEl = existing.element.querySelector(".horse-img") as HTMLDivElement;
          if (imgEl) {
            imgEl.style.width = `${width}px`;
            imgEl.style.height = `${height}px`;
            imgEl.style.filter = `hue-rotate(${hue}deg) saturate(1.5) brightness(1.1)`;
          }
          const badge = existing.element.querySelector(".horse-badge") as HTMLDivElement;
          if (badge) {
            badge.style.backgroundColor = data.color;
            badge.style.color = textColor;
            badge.innerHTML = `${username}<span style="margin-left:4px;opacity:0.75">\u00d7${data.count}</span>`;
          }
        }
      } else {
        // Brand new horse — spawn from the top
        const screenW = window.innerWidth;
        const x = EDGE_PADDING + width / 2 + Math.random() * (screenW - 2 * EDGE_PADDING - width);
        const y = -height;

        const body = Matter.Bodies.rectangle(
          x, y,
          width * 0.4, height * 0.6,
          { restitution: 0.2, friction: 0.8, frictionAir: 0.02, inertia: Infinity }
        );
        Matter.Composite.add(engine.world, body);

        // DOM element
        const element = document.createElement("div");
        element.className = "absolute will-change-transform";

        const imgContainer = document.createElement("div");
        imgContainer.className = "horse-img";
        imgContainer.style.width = `${width}px`;
        imgContainer.style.height = `${height}px`;
        imgContainer.style.filter = `hue-rotate(${hue}deg) saturate(1.5) brightness(1.1)`;
        imgContainer.style.transition = "width 0.3s ease-out, height 0.3s ease-out";

        const img = document.createElement("img");
        img.src = imageUrl;
        img.alt = "";
        img.crossOrigin = "anonymous";
        img.className = "h-full w-full object-contain";
        imgContainer.appendChild(img);
        element.appendChild(imgContainer);

        // Username badge
        const badge = document.createElement("div");
        badge.className = "horse-badge";
        Object.assign(badge.style, {
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          marginTop: "4px",
          whiteSpace: "nowrap",
          borderRadius: "9999px",
          padding: "4px 12px",
          fontSize: "14px",
          fontWeight: "bold",
          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.3)",
          backgroundColor: data.color,
          color: textColor,
        });
        badge.innerHTML = `${username}<span style="margin-left:4px;opacity:0.75">\u00d7${data.count}</span>`;
        element.appendChild(badge);

        container.appendChild(element);
        horseBodiesRef.current.set(username, { username, body, element, count: data.count });
      }
    }
  }, [userHorses, imageUrl]);

  // Jump impulse when a user cheers again
  useEffect(() => {
    if (!lastUpdate || lastUpdate === lastUpdateRef.current) return;
    if (lastUpdateRef.current && lastUpdate.timestamp === lastUpdateRef.current.timestamp) return;
    lastUpdateRef.current = lastUpdate;

    const hb = horseBodiesRef.current.get(lastUpdate.username);
    if (hb) {
      Matter.Body.applyForce(hb.body, hb.body.position, { x: 0, y: -0.15 });
    }
  }, [lastUpdate]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
    />
  );
}
