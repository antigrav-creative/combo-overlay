"use client";

import { useEffect, useRef, useCallback } from "react";
import Matter from "matter-js";

export interface SpawnRequest {
  id: number;
  color: string | null;
}

interface PhysicsCanvasProps {
  imageUrl: string;
  spawnQueue: SpawnRequest[];
  clearKey: number; // Increment to clear all horses
}

interface BodyData {
  body: Matter.Body;
  element: HTMLDivElement;
  hue: number;
  scale: number;
  maxY: number;
  stopped: boolean;
}

const BASE_SIZE = 80;
const MIN_SCALE = 1.5;
const MAX_SCALE = 5.0;
const SAFE_ZONE_WIDTH_PERCENT = 0.4;
const EDGE_PADDING = 60; // Padding from screen edges

// Collision size as percentage of visual size
const HORIZONTAL_COLLISION = 0.2; // 80% overlap
const VERTICAL_COLLISION = 0.5;   // 50% overlap

// Convert hex color to hue (0-360)
function hexToHue(hex: string): number {
  // Remove # if present
  hex = hex.replace(/^#/, "");
  
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  
  if (max === min) return 0; // Grayscale
  
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

export function PhysicsCanvas({ imageUrl, spawnQueue, clearKey }: PhysicsCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const bodiesRef = useRef<BodyData[]>([]);
  const animationRef = useRef<number>(0);
  const processedIdsRef = useRef<Set<number>>(new Set());

  // Initialize physics engine
  useEffect(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 1 },
    });
    engineRef.current = engine;

    // Create walls with padding from edges
    const wallThickness = 50;
    const walls = [
      Matter.Bodies.rectangle(width / 2, height + wallThickness / 2, width, wallThickness, { isStatic: true }),
      Matter.Bodies.rectangle(EDGE_PADDING - wallThickness / 2, height / 2, wallThickness, height, { isStatic: true }),
      Matter.Bodies.rectangle(width - EDGE_PADDING + wallThickness / 2, height / 2, wallThickness, height, { isStatic: true }),
    ];
    Matter.Composite.add(engine.world, walls);

    const runner = Matter.Runner.create();
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);

    // Animation loop - updates DOM directly, no React re-renders
    const updatePositions = () => {
      for (const bodyData of bodiesRef.current) {
        const { body, element, scale, maxY, stopped } = bodyData;
        const size = BASE_SIZE * scale;

        // Check if horse has reached its max depth
        if (!stopped && body.position.y >= maxY) {
          Matter.Body.setStatic(body, true);
          bodyData.stopped = true;
        }

        // Update position
        element.style.transform = `translate(${body.position.x - size / 2}px, ${body.position.y - size / 2}px)`;
      }
      animationRef.current = requestAnimationFrame(updatePositions);
    };
    animationRef.current = requestAnimationFrame(updatePositions);

    return () => {
      cancelAnimationFrame(animationRef.current);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
      // Clean up DOM elements
      bodiesRef.current.forEach(({ element }) => element.remove());
      bodiesRef.current = [];
      processedIdsRef.current.clear();
    };
  }, []);

  // Update image URL on existing elements when it changes
  useEffect(() => {
    bodiesRef.current.forEach(({ element }) => {
      const img = element.querySelector("img");
      if (img) img.src = imageUrl;
    });
  }, [imageUrl]);

  const spawnObject = useCallback((color: string | null) => {
    if (!engineRef.current || !containerRef.current) return;

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const scale = MIN_SCALE + Math.random() * (MAX_SCALE - MIN_SCALE);
    const size = BASE_SIZE * scale;
    
    // Use user's color if available, otherwise random
    const hue = color ? hexToHue(color) : Math.random() * 360;

    // Random max depth in the lower half of the screen
    const maxY = screenHeight * 0.5 + Math.random() * screenHeight * 0.5;

    // Calculate spawn position outside safe zone, with edge padding
    const safeZoneStart = screenWidth * (0.5 - SAFE_ZONE_WIDTH_PERCENT / 2);
    const safeZoneEnd = screenWidth * (0.5 + SAFE_ZONE_WIDTH_PERCENT / 2);
    const leftEdge = EDGE_PADDING + size / 2;
    const rightEdge = screenWidth - EDGE_PADDING - size / 2;
    const leftZoneWidth = safeZoneStart - leftEdge;
    const rightZoneWidth = rightEdge - safeZoneEnd;
    const totalSpawnWidth = leftZoneWidth + rightZoneWidth;

    let x: number;
    if (totalSpawnWidth <= 0) {
      x = Math.random() < 0.5 ? leftEdge : rightEdge;
    } else {
      const randomPos = Math.random() * totalSpawnWidth;
      x = randomPos < leftZoneWidth
        ? leftEdge + randomPos
        : safeZoneEnd + (randomPos - leftZoneWidth);
    }

    const y = -size - Math.random() * 100;

    // Create physics body with rectangle for asymmetric overlap
    const collisionWidth = size * HORIZONTAL_COLLISION;
    const collisionHeight = size * VERTICAL_COLLISION;

    const body = Matter.Bodies.rectangle(x, y, collisionWidth, collisionHeight, {
      restitution: 0.3,
      friction: 0.5,
      frictionAir: 0.01,
      angle: 0,
      inertia: Infinity, // Prevent rotation
    });
    Matter.Composite.add(engineRef.current.world, body);

    // Create DOM element directly (no React state)
    const element = document.createElement("div");
    element.className = "absolute will-change-transform";
    element.style.width = `${size}px`;
    element.style.height = `${size}px`;
    // Apply hue-rotate and boost saturation for vibrancy
    element.style.filter = `hue-rotate(${hue}deg) saturate(1.8) brightness(1.1)`;

    const img = document.createElement("img");
    img.src = imageUrl;
    img.alt = "";
    img.crossOrigin = "anonymous";
    img.className = "h-full w-full object-contain";
    element.appendChild(img);

    containerRef.current.appendChild(element);
    bodiesRef.current.push({ body, element, hue, scale, maxY, stopped: false });
  }, [imageUrl]);

  // Process spawn queue
  useEffect(() => {
    for (const request of spawnQueue) {
      if (!processedIdsRef.current.has(request.id)) {
        processedIdsRef.current.add(request.id);
        spawnObject(request.color);
      }
    }
  }, [spawnQueue, spawnObject]);

  // Clear all horses when clearKey changes
  const prevClearKeyRef = useRef(clearKey);
  useEffect(() => {
    if (clearKey !== prevClearKeyRef.current) {
      prevClearKeyRef.current = clearKey;
      
      // Remove all DOM elements
      bodiesRef.current.forEach(({ body, element }) => {
        element.remove();
        if (engineRef.current) {
          Matter.Composite.remove(engineRef.current.world, body);
        }
      });
      
      // Clear arrays
      bodiesRef.current = [];
      processedIdsRef.current.clear();
    }
  }, [clearKey]);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-40 overflow-hidden"
    />
  );
}
