"use client";

import { useEffect, useRef } from "react";
import Matter from "matter-js";
import type { UserHorseData } from "@/hooks/useComboStorage";

const EMOTE_ASPECT_RATIO = 64 / 26; // width / height
const BASE_HEIGHT = 50;
const HEIGHT_INCREMENT = 50;
const MAX_HEIGHT = 500;
const EDGE_PADDING = 30;
const BADGE_HEIGHT = 30;

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

function getCreatureDimensions(count: number, sizeScale: number = 1) {
  const height = Math.min((BASE_HEIGHT + (count - 1) * HEIGHT_INCREMENT) * sizeScale, MAX_HEIGHT * sizeScale);
  const width = height * EMOTE_ASPECT_RATIO;
  return { width, height };
}

interface CreatureBody {
  key: string; // unique key: "{type}:{username}"
  body: Matter.Body;
  element: HTMLDivElement;
  count: number;
  sizeScale: number;
}

interface CreatureGroup {
  imageUrl: string;
  creatures: Record<string, UserHorseData>;
  lastUpdate: { username: string; timestamp: number } | null;
  sizeScale?: number;
}

interface PhysicsCreaturesProps {
  groups: CreatureGroup[];
}

export function PhysicsCreatures({ groups }: PhysicsCreaturesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const bodiesRef = useRef<Map<string, CreatureBody>>(new Map());
  const animationRef = useRef<number>(0);
  const lastUpdatesRef = useRef<Map<number, { username: string; timestamp: number }>>(new Map());

  // Initialize shared physics engine (runs once)
  useEffect(() => {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    const engine = Matter.Engine.create({ gravity: { x: 0, y: 1 } });
    engineRef.current = engine;

    const wallThickness = 50;
    const walls = [
      Matter.Bodies.rectangle(screenW / 2, screenH + wallThickness / 2, screenW * 2, wallThickness, { isStatic: true }),
      Matter.Bodies.rectangle(-wallThickness / 2 + EDGE_PADDING, screenH / 2, wallThickness, screenH * 2, { isStatic: true }),
      Matter.Bodies.rectangle(screenW + wallThickness / 2 - EDGE_PADDING, screenH / 2, wallThickness, screenH * 2, { isStatic: true }),
    ];
    Matter.Composite.add(engine.world, walls);

    const runner = Matter.Runner.create();
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);

    const updatePositions = () => {
      for (const [, cb] of bodiesRef.current) {
        const { width: w } = getCreatureDimensions(cb.count, cb.sizeScale);
        const totalH = getCreatureDimensions(cb.count, cb.sizeScale).height + BADGE_HEIGHT;
        cb.element.style.transform = `translate(${cb.body.position.x - w / 2}px, ${cb.body.position.y - totalH / 2}px)`;
      }
      animationRef.current = requestAnimationFrame(updatePositions);
    };
    animationRef.current = requestAnimationFrame(updatePositions);

    return () => {
      cancelAnimationFrame(animationRef.current);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
      bodiesRef.current.forEach(({ element }) => element.remove());
      bodiesRef.current.clear();
    };
  }, []);

  // Sync all groups into the shared physics world
  useEffect(() => {
    if (!engineRef.current || !containerRef.current) return;
    const engine = engineRef.current;
    const container = containerRef.current;

    // Build set of all current keys
    const currentKeys = new Set<string>();
    groups.forEach((group, groupIdx) => {
      for (const username of Object.keys(group.creatures || {})) {
        currentKeys.add(`${groupIdx}:${username}`);
      }
    });

    // Remove bodies that no longer exist
    for (const [key, cb] of bodiesRef.current) {
      if (!currentKeys.has(key)) {
        Matter.Composite.remove(engine.world, cb.body);
        cb.element.remove();
        bodiesRef.current.delete(key);
      }
    }

    // Add or update each creature
    groups.forEach((group, groupIdx) => {
      const scale = group.sizeScale ?? 1;

      for (const [username, data] of Object.entries(group.creatures || {})) {
        const key = `${groupIdx}:${username}`;
        const { width, height } = getCreatureDimensions(data.count, scale);
        const totalHeight = height + BADGE_HEIGHT;
        const hue = hexToHue(data.color);
        const textColor = getContrastColor(data.color);
        const existing = bodiesRef.current.get(key);

        if (existing) {
          if (existing.count !== data.count) {
            const pos = { ...existing.body.position };
            const vel = { ...existing.body.velocity };

            Matter.Composite.remove(engine.world, existing.body);

            const newBody = Matter.Bodies.rectangle(
              pos.x, pos.y,
              width * 0.4, totalHeight * 0.6,
              { restitution: 0.2, friction: 0.8, frictionAir: 0.02, inertia: Infinity }
            );
            Matter.Body.setVelocity(newBody, vel);
            Matter.Composite.add(engine.world, newBody);

            existing.body = newBody;
            existing.count = data.count;
            existing.sizeScale = scale;

            const imgEl = existing.element.querySelector(".creature-img") as HTMLDivElement;
            if (imgEl) {
              imgEl.style.width = `${width}px`;
              imgEl.style.height = `${height}px`;
              imgEl.style.filter = `hue-rotate(${hue}deg) saturate(1.5) brightness(1.1)`;
            }
            const badge = existing.element.querySelector(".creature-badge") as HTMLDivElement;
            if (badge) {
              badge.style.backgroundColor = data.color;
              badge.style.color = textColor;
              badge.innerHTML = `${username}<span style="margin-left:4px;opacity:0.75">\u00d7${data.count}</span>`;
            }
          }
        } else {
          const screenW = window.innerWidth;
          const x = EDGE_PADDING + width / 2 + Math.random() * (screenW - 2 * EDGE_PADDING - width);
          const y = -totalHeight;

          const body = Matter.Bodies.rectangle(
            x, y,
            width * 0.4, totalHeight * 0.6,
            { restitution: 0.2, friction: 0.8, frictionAir: 0.02, inertia: Infinity }
          );
          Matter.Composite.add(engine.world, body);

          const element = document.createElement("div");
          element.className = "absolute will-change-transform";

          const imgContainer = document.createElement("div");
          imgContainer.className = "creature-img";
          imgContainer.style.width = `${width}px`;
          imgContainer.style.height = `${height}px`;
          imgContainer.style.filter = `hue-rotate(${hue}deg) saturate(1.5) brightness(1.1)`;
          imgContainer.style.transition = "width 0.3s ease-out, height 0.3s ease-out";

          const img = document.createElement("img");
          img.src = group.imageUrl;
          img.alt = "";
          img.crossOrigin = "anonymous";
          img.className = "h-full w-full object-contain";
          imgContainer.appendChild(img);
          element.appendChild(imgContainer);

          const badge = document.createElement("div");
          badge.className = "creature-badge";
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
          bodiesRef.current.set(key, { key, body, element, count: data.count, sizeScale: scale });
        }
      }
    });
  }, [groups]);

  // Jump impulses when users cheer again
  useEffect(() => {
    groups.forEach((group, groupIdx) => {
      if (!group.lastUpdate) return;
      const prev = lastUpdatesRef.current.get(groupIdx);
      if (prev && prev.timestamp === group.lastUpdate.timestamp) return;
      lastUpdatesRef.current.set(groupIdx, group.lastUpdate);

      const key = `${groupIdx}:${group.lastUpdate.username}`;
      const cb = bodiesRef.current.get(key);
      if (cb) {
        Matter.Body.applyForce(cb.body, cb.body.position, { x: 0, y: -0.15 });
      }
    });
  }, [groups]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
    />
  );
}
