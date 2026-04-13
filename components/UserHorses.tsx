"use client";

import { useEffect, useRef } from "react";
import Matter from "matter-js";
import type { UserCreatureData } from "@/hooks/useComboStorage";

const SHRINK_RATE_MS = 60 * 60 * 1000; // 1 unit per hour

const EMOTE_ASPECT_RATIO = 64 / 26; // width / height
const UNIT_HEIGHT = 30; // height per 1x unit
const EDGE_PADDING = 30;

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

/**
 * Compute the current visual multiplier for a creature.
 * Base = 1x, each redemption adds +1x, shrinks at 1x/hour, min 1x.
 */
const MAX_MULTIPLIER = 3;

function getCurrentMultiplier(bonusUnits: number | undefined, bonusSince: number | undefined, now: number): number {
  if (bonusUnits == null || bonusSince == null) return 0;
  const elapsed = (now - bonusSince) / SHRINK_RATE_MS;
  return Math.min(MAX_MULTIPLIER, Math.max(0, bonusUnits - elapsed));
}

function getDimensionsForMultiplier(multiplier: number, sizeScale: number) {
  const height = UNIT_HEIGHT * multiplier * sizeScale;
  const width = height * EMOTE_ASPECT_RATIO;
  return { width, height };
}

function getMinDimensions(sizeScale: number) {
  return getDimensionsForMultiplier(0, sizeScale);
}

/**
 * Start a CSS transition from current size to min size.
 * Duration = time until bonus reaches 0 (currentBonus * SHRINK_RATE_MS).
 */
function applyShrinkTransition(
  imgEl: HTMLDivElement,
  currentWidth: number,
  currentHeight: number,
  minWidth: number,
  minHeight: number,
  remainingMs: number,
) {
  // Set current size immediately with no transition
  imgEl.style.transition = "none";
  imgEl.style.width = `${currentWidth}px`;
  imgEl.style.height = `${currentHeight}px`;

  // On next frame, apply transition to min size
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const durationMs = Math.max(remainingMs, 0);
      imgEl.style.transition = `width ${durationMs}ms linear, height ${durationMs}ms linear`;
      imgEl.style.width = `${minWidth}px`;
      imgEl.style.height = `${minHeight}px`;
    });
  });
}

interface CreatureBody {
  key: string;
  body: Matter.Body;
  element: HTMLDivElement;
  count: number; // total redemptions — to detect new cheers
  sizeScale: number;
  lastTimeOffset: number;
  bonusUnits: number;
  bonusSince: number;
  lastBodyHeight: number;
}

interface CreatureGroup {
  imageUrl: string;
  creatures: Record<string, UserCreatureData>;
  lastUpdate: { username: string; timestamp: number } | null;
  sizeScale?: number;
}

interface PhysicsCreaturesProps {
  groups: CreatureGroup[];
  showBounds?: boolean;
  timeOffset?: number;
}

export function PhysicsCreatures({ groups, showBounds = false, timeOffset = 0 }: PhysicsCreaturesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const bodiesRef = useRef<Map<string, CreatureBody>>(new Map());
  const animationRef = useRef<number>(0);
  const lastUpdatesRef = useRef<Map<number, { username: string; timestamp: number }>>(new Map());
  const showBoundsRef = useRef(showBounds);
  showBoundsRef.current = showBounds;
  const timeOffsetRef = useRef(timeOffset);
  timeOffsetRef.current = timeOffset;

  // Initialize shared physics engine (runs once)
  useEffect(() => {
    let screenW = window.innerWidth;
    let screenH = window.innerHeight;

    const engine = Matter.Engine.create({ gravity: { x: 0, y: 1 } });
    engineRef.current = engine;

    const wallThickness = 50;
    const walls = [
      Matter.Bodies.rectangle(screenW / 2, screenH + wallThickness / 2, screenW * 2, wallThickness, { isStatic: true }),
      Matter.Bodies.rectangle(-wallThickness / 2 + EDGE_PADDING, screenH / 2, wallThickness, screenH * 2, { isStatic: true }),
      Matter.Bodies.rectangle(screenW + wallThickness / 2 - EDGE_PADDING, screenH / 2, wallThickness, screenH * 2, { isStatic: true }),
    ];
    const [floor, leftWall, rightWall] = walls;
    Matter.Composite.add(engine.world, walls);

    const handleResize = () => {
      const newW = window.innerWidth;
      const newH = window.innerHeight;

      Matter.Body.setPosition(floor, { x: newW / 2, y: newH + wallThickness / 2 });
      Matter.Body.setPosition(leftWall, { x: -wallThickness / 2 + EDGE_PADDING, y: newH / 2 });
      Matter.Body.setPosition(rightWall, { x: newW + wallThickness / 2 - EDGE_PADDING, y: newH / 2 });

      const minX = EDGE_PADDING;
      const maxX = newW - EDGE_PADDING;
      for (const [, cb] of bodiesRef.current) {
        const pos = cb.body.position;
        let impulseX = 0;

        if (pos.x < minX) {
          impulseX = 0.05;
          Matter.Body.setPosition(cb.body, { x: minX + 10, y: pos.y });
        } else if (pos.x > maxX) {
          impulseX = -0.05;
          Matter.Body.setPosition(cb.body, { x: maxX - 10, y: pos.y });
        }

        if (pos.y > newH) {
          Matter.Body.setPosition(cb.body, { x: pos.x, y: newH - 50 });
          Matter.Body.setVelocity(cb.body, { x: cb.body.velocity.x, y: 0 });
        }

        if (impulseX !== 0) {
          Matter.Body.applyForce(cb.body, cb.body.position, { x: impulseX, y: -0.02 });
        }
      }

      screenW = newW;
      screenH = newH;
    };

    window.addEventListener("resize", handleResize);

    const runner = Matter.Runner.create();
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);

    let frameCount = 0;
    const HITBOX_UPDATE_INTERVAL = 120; // every ~120 frames (~2 seconds)

    const updatePositions = () => {
      frameCount++;

      // Periodically replace physics bodies to match shrinking visual size
      if (frameCount % HITBOX_UPDATE_INTERVAL === 0 && engineRef.current) {
        const now = Date.now() + timeOffsetRef.current;
        for (const [, cb] of bodiesRef.current) {
          const mult = getCurrentMultiplier(cb.bonusUnits, cb.bonusSince, now);
          const { width: currentW, height: currentH } = getDimensionsForMultiplier(mult, cb.sizeScale);
          const targetBodyH = currentH;

          // Only replace if changed by more than 10%
          if (Math.abs(targetBodyH - cb.lastBodyHeight) / cb.lastBodyHeight > 0.1) {
            const pos = { ...cb.body.position };
            const vel = { ...cb.body.velocity };

            Matter.Composite.remove(engineRef.current.world, cb.body);

            const newBody = Matter.Bodies.rectangle(
              pos.x, pos.y,
              currentW * 0.4, targetBodyH,
              { restitution: 0.2, friction: 0.8, frictionAir: 0.02, inertia: Infinity }
            );
            Matter.Body.setVelocity(newBody, vel);
            Matter.Composite.add(engineRef.current.world, newBody);

            cb.body = newBody;
            cb.lastBodyHeight = targetBodyH;
          }
        }
      }

      const bodies = Array.from(bodiesRef.current.values());
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          const a = bodies[i].body;
          const b = bodies[j].body;
          const overlapX = Math.min(a.bounds.max.x, b.bounds.max.x) - Math.max(a.bounds.min.x, b.bounds.min.x);
          const overlapY = Math.min(a.bounds.max.y, b.bounds.max.y) - Math.max(a.bounds.min.y, b.bounds.min.y);
          if (overlapX > 0 && overlapY > 0) {
            const dx = b.position.x - a.position.x;
            const dy = b.position.y - a.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const nx = dx / dist;
            const ny = dy / dist;
            const penetration = Math.min(overlapX, overlapY);
            const strength = penetration * 0.002;
            Matter.Body.setPosition(a, {
              x: a.position.x - nx * penetration * 0.3,
              y: a.position.y - ny * penetration * 0.3,
            });
            Matter.Body.setPosition(b, {
              x: b.position.x + nx * penetration * 0.3,
              y: b.position.y + ny * penetration * 0.3,
            });
            Matter.Body.applyForce(a, a.position, { x: -nx * strength, y: -ny * strength });
            Matter.Body.applyForce(b, b.position, { x: nx * strength, y: ny * strength });
          }
        }
      }

      for (const [, cb] of bodiesRef.current) {
        // Use lastBodyHeight for positioning (matches current physics body)
        const visualH = cb.lastBodyHeight;
        const visualW = visualH * EMOTE_ASPECT_RATIO;
        cb.element.style.transform = `translate(${cb.body.position.x - visualW / 2}px, ${cb.body.position.y - cb.lastBodyHeight / 2}px)`;
      }

      // Debug: draw physics bounds
      const canvas = canvasRef.current;
      if (canvas && showBoundsRef.current) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          canvas.width = screenW;
          canvas.height = screenH;
          ctx.clearRect(0, 0, screenW, screenH);
          ctx.strokeStyle = "rgba(0, 255, 0, 0.8)";
          ctx.lineWidth = 2;
          for (const [, cb] of bodiesRef.current) {
            const { bounds } = cb.body;
            ctx.strokeRect(
              bounds.min.x, bounds.min.y,
              bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y,
            );
          }
          ctx.strokeStyle = "rgba(255, 0, 0, 0.5)";
          for (const wall of walls) {
            const { bounds } = wall;
            ctx.strokeRect(
              bounds.min.x, bounds.min.y,
              bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y,
            );
          }
        }
      } else if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      animationRef.current = requestAnimationFrame(updatePositions);
    };
    animationRef.current = requestAnimationFrame(updatePositions);

    return () => {
      window.removeEventListener("resize", handleResize);
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

    const currentKeys = new Set<string>();
    groups.forEach((group, groupIdx) => {
      for (const username of Object.keys(group.creatures || {})) {
        currentKeys.add(`${groupIdx}:${username}`);
      }
    });

    for (const [key, cb] of bodiesRef.current) {
      if (!currentKeys.has(key)) {
        Matter.Composite.remove(engine.world, cb.body);
        cb.element.remove();
        bodiesRef.current.delete(key);
      }
    }

    const now = Date.now() + timeOffset;

    groups.forEach((group, groupIdx) => {
      const scale = group.sizeScale ?? 1;
      const { width: minW, height: minH } = getMinDimensions(scale);

      for (const [username, data] of Object.entries(group.creatures || {})) {
        const key = `${groupIdx}:${username}`;
        const hue = hexToHue(data.color);
        const existing = bodiesRef.current.get(key);

        // Compute current visual size from bonus model
        const currentMult = getCurrentMultiplier(data.bonusUnits, data.bonusSince, now);
        const { width: currentW, height: currentH } = getDimensionsForMultiplier(currentMult, scale);
        const currentBodyH = currentH;

        // Time remaining until bonus shrinks to 0 (reaches 1x base)
        const currentBonus = Math.max(0, currentMult - 1);
        const remainingMs = currentBonus * SHRINK_RATE_MS;

        if (existing) {
          // Re-apply shrink when timeOffset changes (dev time warp)
          if (existing.lastTimeOffset !== timeOffset && existing.count === data.count) {
            existing.lastTimeOffset = timeOffset;
            existing.bonusUnits = data.bonusUnits;
            existing.bonusSince = data.bonusSince;

            // Update hitbox
            if (Math.abs(currentBodyH - existing.lastBodyHeight) > 5) {
              const pos = { ...existing.body.position };
              const vel = { ...existing.body.velocity };
              Matter.Composite.remove(engine.world, existing.body);
              const newBody = Matter.Bodies.rectangle(
                pos.x, pos.y,
                currentW * 0.4, currentBodyH,
                { restitution: 0.2, friction: 0.8, frictionAir: 0.02, inertia: Infinity }
              );
              Matter.Body.setVelocity(newBody, vel);
              Matter.Composite.add(engine.world, newBody);
              existing.body = newBody;
              existing.lastBodyHeight = currentBodyH;
            }
            const imgEl = existing.element.querySelector(".creature-img") as HTMLDivElement;
            if (imgEl) {
              applyShrinkTransition(imgEl, currentW, currentH, minW, minH, remainingMs);
            }
          }

          // New cheer — count increased
          if (existing.count !== data.count) {
            // New full size after the cheer
            const newMult = getCurrentMultiplier(data.bonusUnits, data.bonusSince, now);
            const { width: newW, height: newH } = getDimensionsForMultiplier(newMult, scale);
            const newBodyH = newH;
            const newBonus = Math.max(0, newMult - 1);
            const newRemainingMs = newBonus * SHRINK_RATE_MS;

            const pos = { ...existing.body.position };
            const vel = { ...existing.body.velocity };

            Matter.Composite.remove(engine.world, existing.body);

            const newBody = Matter.Bodies.rectangle(
              pos.x, pos.y,
              newW * 0.4, newBodyH,
              { restitution: 0.2, friction: 0.8, frictionAir: 0.02, inertia: Infinity }
            );
            Matter.Body.setVelocity(newBody, vel);
            Matter.Composite.add(engine.world, newBody);

            existing.body = newBody;
            existing.count = data.count;
            existing.sizeScale = scale;
            existing.lastTimeOffset = timeOffset;
            existing.bonusUnits = data.bonusUnits;
            existing.bonusSince = data.bonusSince;
            existing.lastBodyHeight = newBodyH;

            // Push nearby creatures away
            for (const [otherKey, otherCb] of bodiesRef.current) {
              if (otherKey === key) continue;
              const dx = otherCb.body.position.x - pos.x;
              const dy = otherCb.body.position.y - pos.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist < 300) {
                const strength = 0.4 * (1 - dist / 300);
                const nx = dist > 0 ? dx / dist : (Math.random() - 0.5);
                const ny = dist > 0 ? dy / dist : -1;
                Matter.Body.applyForce(otherCb.body, otherCb.body.position, {
                  x: nx * strength,
                  y: ny * strength - 0.1,
                });
              }
            }

            const imgEl = existing.element.querySelector(".creature-img") as HTMLDivElement;
            if (imgEl) {
              imgEl.style.filter = `hue-rotate(${hue}deg) saturate(1.5) brightness(1.1)`;
              applyShrinkTransition(imgEl, newW, newH, minW, minH, newRemainingMs);
            }
          }
        } else {
          // New creature
          const screenW = window.innerWidth;
          const x = EDGE_PADDING + currentW / 2 + Math.random() * (screenW - 2 * EDGE_PADDING - currentW);
          const y = -currentBodyH;

          const body = Matter.Bodies.rectangle(
            x, y,
            currentW * 0.4, currentBodyH,
            { restitution: 0.2, friction: 0.8, frictionAir: 0.02, inertia: Infinity }
          );
          Matter.Composite.add(engine.world, body);

          const element = document.createElement("div");
          element.className = "absolute will-change-transform";

          const imgContainer = document.createElement("div");
          imgContainer.className = "creature-img";
          imgContainer.style.filter = `hue-rotate(${hue}deg) saturate(1.5) brightness(1.1)`;

          applyShrinkTransition(imgContainer, currentW, currentH, minW, minH, remainingMs);

          const img = document.createElement("img");
          img.src = group.imageUrl;
          img.alt = "";
          img.crossOrigin = "anonymous";
          img.className = "h-full w-full object-contain";
          imgContainer.appendChild(img);
          element.appendChild(imgContainer);

          container.appendChild(element);
          bodiesRef.current.set(key, {
            key, body, element,
            count: data.count,
            sizeScale: scale,
            lastTimeOffset: timeOffset,
            bonusUnits: data.bonusUnits,
            bonusSince: data.bonusSince,
            lastBodyHeight: currentBodyH,
          });
        }
      }
    });
  }, [groups, timeOffset]);

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
    <>
      <div
        ref={containerRef}
        className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
      />
      {showBounds && (
        <canvas
          ref={canvasRef}
          className="pointer-events-none fixed inset-0 z-40"
        />
      )}
    </>
  );
}
