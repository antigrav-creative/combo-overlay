"use client";

import { useEffect, useRef, useState } from "react";
import type { UserHorseData } from "@/hooks/useComboStorage";

type CornerPosition = "bl" | "tl" | "br" | "tr";

interface UserHorsesProps {
  imageUrl: string;
  userHorses: Record<string, UserHorseData>;
  lastUpdate: { username: string; timestamp: number } | null;
  corner?: CornerPosition;
  onExpired?: (username: string) => void;
}

// Emote dimensions (64x26 aspect ratio = ~2.46:1)
const EMOTE_ASPECT_RATIO = 64 / 26; // width / height
const BASE_HEIGHT = 50;
const HEIGHT_INCREMENT = 50; // Each redemption adds this many pixels to height
const MAX_HEIGHT = 500; // Visual cap for sanity

// Calculate contrasting text color (black or white) based on background
function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace(/^#/, "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

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

// Puff particle component
function PuffParticle({ x, y, color, delay }: { x: number; y: number; color: string; delay: number }) {
  return (
    <div
      className="absolute rounded-full"
      style={{
        left: x,
        top: y,
        width: 20,
        height: 20,
        backgroundColor: color,
        opacity: 0,
        transform: "scale(0)",
        animation: `puff 0.6s ease-out ${delay}s forwards`,
      }}
    />
  );
}

interface HorseProps {
  username: string;
  data: UserHorseData;
  isJumping: boolean;
  isNew: boolean;
  isExpiring: boolean;
  imageUrl: string;
  onExplosionComplete?: () => void;
}

function Horse({ username, data, isJumping, isNew, isExpiring, imageUrl, onExplosionComplete }: HorseProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [animationState, setAnimationState] = useState<"initial" | "falling" | "landed" | "exploding" | "gone">(
    isNew ? "initial" : "landed"
  );
  const [showParticles, setShowParticles] = useState(false);
  
  // Calculate dimensions maintaining aspect ratio
  const height = Math.min(BASE_HEIGHT + (data.count - 1) * HEIGHT_INCREMENT, MAX_HEIGHT);
  const width = height * EMOTE_ASPECT_RATIO;
  const hue = hexToHue(data.color);
  const textColor = getContrastColor(data.color);

  // Handle explosion when isExpiring becomes true
  useEffect(() => {
    if (isExpiring && animationState !== "exploding" && animationState !== "gone") {
      setAnimationState("exploding");
      setShowParticles(true);
      
      // Remove after explosion animation
      const timer = setTimeout(() => {
        setAnimationState("gone");
        onExplosionComplete?.();
      }, 800);
      
      return () => clearTimeout(timer);
    }
  }, [isExpiring, animationState, onExplosionComplete]);

  // Reset animation if a new horse is created while old one was exploding
  // (isExpiring becomes false while in exploding/gone state)
  useEffect(() => {
    if (!isExpiring && (animationState === "exploding" || animationState === "gone")) {
      setAnimationState("initial");
      setShowParticles(false);
    }
  }, [isExpiring, animationState]);

  // Handle fall-in animation for new horses
  useEffect(() => {
    if (isNew && animationState === "initial") {
      // Force a reflow to ensure initial styles are applied
      if (elementRef.current) {
        elementRef.current.offsetHeight; // Force reflow
      }
      // Start falling after a brief delay
      const fallTimer = setTimeout(() => {
        setAnimationState("falling");
      }, 50);
      
      // Mark as landed after animation
      const landTimer = setTimeout(() => {
        setAnimationState("landed");
      }, 900);
      
      return () => {
        clearTimeout(fallTimer);
        clearTimeout(landTimer);
      };
    }
  }, [isNew, animationState]);

  // Generate particles for explosion
  const particles = [];
  if (showParticles) {
    const numParticles = 12;
    for (let i = 0; i < numParticles; i++) {
      const angle = (i / numParticles) * Math.PI * 2;
      const distance = 30 + Math.random() * 40;
      const px = Math.cos(angle) * distance + width / 2;
      const py = Math.sin(angle) * distance + height / 2;
      particles.push(
        <PuffParticle
          key={i}
          x={px}
          y={py}
          color={data.color}
          delay={Math.random() * 0.1}
        />
      );
    }
  }

  if (animationState === "gone") return null;

  // Calculate position based on animation state
  let top: string;
  let opacity: number;
  let transition: string;
  let scale = 1;

  if (animationState === "initial") {
    top = "-150px";
    opacity = 1;
    transition = "none";
  } else if (animationState === "falling") {
    top = `${data.y}%`;
    opacity = 1;
    transition = "top 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)";
  } else if (animationState === "exploding") {
    top = `${data.y}%`;
    opacity = 0;
    scale = 1.5;
    transition = "opacity 0.4s ease-out, transform 0.4s ease-out";
  } else {
    top = `${data.y}%`;
    opacity = 1;
    transition = "transform 0.3s ease-out, width 0.3s ease-out, height 0.3s ease-out";
  }

  return (
    <div
      ref={elementRef}
      className="absolute"
      style={{
        left: `${data.x}%`,
        top,
        opacity,
        transform: `translate(-50%, -50%) scale(${scale}) ${isJumping && animationState === "landed" ? "translateY(-50px) scale(1.2)" : ""}`,
        transition,
      }}
    >
      {/* Explosion particles */}
      {showParticles && (
        <div className="pointer-events-none absolute inset-0">
          {particles}
        </div>
      )}
      
      {/* Horse image */}
      <div
        style={{
          width,
          height,
          filter: `hue-rotate(${hue}deg) saturate(1.5) brightness(1.1)`,
          transition: "width 0.3s ease-out, height 0.3s ease-out",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-contain"
          crossOrigin="anonymous"
        />
      </div>
      
      {/* Username badge */}
      <div
        className="absolute left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap rounded-full px-3 py-1 text-sm font-bold shadow-lg"
        style={{
          backgroundColor: data.color,
          color: textColor,
        }}
      >
        {username}
        <span className="ml-1 opacity-75">×{data.count}</span>
      </div>
    </div>
  );
}

export function UserHorses({ imageUrl, userHorses, lastUpdate, corner = "bl", onExpired }: UserHorsesProps) {
  const [jumpingUser, setJumpingUser] = useState<string | null>(null);
  const [newUsers, setNewUsers] = useState<Set<string>>(new Set());
  const lastTimestampRef = useRef<number>(0);
  const knownUsersRef = useRef<Set<string>>(new Set());

  // Track new users for fall-in animation
  // Also remove users from known set when they're removed from userHorses
  useEffect(() => {
    const currentUsers = new Set(Object.keys(userHorses || {}));
    const newUserSet = new Set<string>();
    
    // Find users that were removed (so they can be "new" again later)
    for (const user of knownUsersRef.current) {
      if (!currentUsers.has(user)) {
        knownUsersRef.current.delete(user);
      }
    }
    
    // Find new users
    for (const user of currentUsers) {
      const horse = userHorses[user];
      // Only treat as new if not expiring (a fresh horse)
      if (!knownUsersRef.current.has(user) && !horse?.isExpiring) {
        newUserSet.add(user);
        knownUsersRef.current.add(user);
      }
    }
    
    if (newUserSet.size > 0) {
      setNewUsers((prev) => new Set([...prev, ...newUserSet]));
      // Clear new status after animation completes
      const timer = setTimeout(() => {
        setNewUsers(new Set());
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [userHorses]);

  // Trigger jump animation when a user gets an update (but not for new users)
  useEffect(() => {
    if (lastUpdate && lastUpdate.timestamp !== lastTimestampRef.current) {
      lastTimestampRef.current = lastUpdate.timestamp;
      
      // Don't jump if this is a new user (they're falling in)
      if (!newUsers.has(lastUpdate.username)) {
        setJumpingUser(lastUpdate.username);
        
        const timer = setTimeout(() => {
          setJumpingUser(null);
        }, 300);
        
        return () => clearTimeout(timer);
      }
    }
  }, [lastUpdate, newUsers]);

  const users = Object.entries(userHorses || {});
  
  if (users.length === 0) return null;

  return (
    <>
      {/* CSS for puff animation */}
      <style jsx global>{`
        @keyframes puff {
          0% {
            opacity: 0.8;
            transform: scale(0) translate(-50%, -50%);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.5) translate(-50%, -50%);
          }
          100% {
            opacity: 0;
            transform: scale(2) translate(-50%, -50%);
          }
        }
      `}</style>
      
      <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
        {users.map(([username, data]) => (
          <Horse
            key={username}
            username={username}
            data={data}
            isJumping={jumpingUser === username}
            isNew={newUsers.has(username)}
            isExpiring={!!data.isExpiring}
            imageUrl={imageUrl}
            onExplosionComplete={() => onExpired?.(username)}
          />
        ))}
      </div>
    </>
  );
}
