"use client";

import { useEffect, useRef, useState } from "react";
import type { UserHorseData } from "@/hooks/useComboStorage";

type CornerPosition = "bl" | "tl" | "br" | "tr";

interface UserHorsesProps {
  imageUrl: string;
  userHorses: Record<string, UserHorseData>;
  lastUpdate: { username: string; timestamp: number } | null;
  corner?: CornerPosition;
}

const BASE_SIZE = 80;
const SIZE_INCREMENT = 80; // Each redemption adds this many pixels
const MAX_DISPLAY_SIZE = 800; // Visual cap for sanity

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

interface HorseProps {
  username: string;
  data: UserHorseData;
  isJumping: boolean;
  isNew: boolean;
  imageUrl: string;
}

function Horse({ username, data, isJumping, isNew, imageUrl }: HorseProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [animationState, setAnimationState] = useState<"initial" | "falling" | "landed">(
    isNew ? "initial" : "landed"
  );
  
  const size = Math.min(BASE_SIZE + (data.count - 1) * SIZE_INCREMENT, MAX_DISPLAY_SIZE);
  const hue = hexToHue(data.color);
  const textColor = getContrastColor(data.color);

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

  // Calculate position based on animation state
  let top: string;
  let opacity: number;
  let transition: string;

  if (animationState === "initial") {
    top = "-150px";
    opacity = 1;
    transition = "none";
  } else if (animationState === "falling") {
    top = `${data.y}%`;
    opacity = 1;
    transition = "top 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)";
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
        transform: `translate(-50%, -50%) ${isJumping && animationState === "landed" ? "translateY(-50px) scale(1.2)" : ""}`,
        transition,
      }}
    >
      {/* Horse image */}
      <div
        style={{
          width: size,
          height: size,
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

export function UserHorses({ imageUrl, userHorses, lastUpdate, corner = "bl" }: UserHorsesProps) {
  const [jumpingUser, setJumpingUser] = useState<string | null>(null);
  const [newUsers, setNewUsers] = useState<Set<string>>(new Set());
  const lastTimestampRef = useRef<number>(0);
  const knownUsersRef = useRef<Set<string>>(new Set());

  // Track new users for fall-in animation
  useEffect(() => {
    const currentUsers = Object.keys(userHorses || {});
    const newUserSet = new Set<string>();
    
    for (const user of currentUsers) {
      if (!knownUsersRef.current.has(user)) {
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
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {users.map(([username, data]) => (
        <Horse
          key={username}
          username={username}
          data={data}
          isJumping={jumpingUser === username}
          isNew={newUsers.has(username)}
          imageUrl={imageUrl}
        />
      ))}
    </div>
  );
}
