"use client";

import { useState, useEffect, useCallback } from "react";
import type { ComboType } from "./useTwitchChat";

// Expiration times in milliseconds
const HORSE_SHRINK_MS = 60 * 60 * 1000; // 1 hour — shrink by 1 per hour of inactivity
const HORSE_REMOVE_MS = 12 * 60 * 60 * 1000; // 12 hours — full removal (same as hearts)
const HEART_EXPIRY_MS = 12 * 60 * 60 * 1000; // 12 hours

// Individual heart redemption with timestamp
interface HeartRedemption {
  username: string;
  timestamp: number;
}

// User horse data for persistent horse mode
export interface UserHorseData {
  color: string;
  count: number;
  x: number; // percentage 0-100
  y: number; // percentage 50-100 (bottom half)
  timestamp: number; // when the horse was last updated (for shrink/expiry calculation)
  lastShrinkAt?: number; // when we last applied a shrink (for catch-up after page reload)
}

export interface ComboStorage {
  hearts: HeartRedemption[];
  horselul: {
    total: number;
    users: Record<string, number>;
  };
  dinodance: {
    total: number;
    users: Record<string, number>;
  };
  awww: {
    total: number;
    users: Record<string, number>;
  };
  userHorses: Record<string, UserHorseData>;
  userDinos: Record<string, UserHorseData>;
  userAwwws: Record<string, UserHorseData>;
}

const createEmptyStorage = (): ComboStorage => ({
  hearts: [],
  horselul: { total: 0, users: {} },
  dinodance: { total: 0, users: {} },
  awww: { total: 0, users: {} },
  userHorses: {},
  userDinos: {},
  userAwwws: {},
});

function getStorageKey(channel: string): string {
  return `combo-overlay-v3-${channel.toLowerCase()}`;
}

export function useComboStorage(channel: string) {
  const [data, setData] = useState<ComboStorage>(createEmptyStorage);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (!channel) return;

    const key = getStorageKey(channel);
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        setData({
          hearts: parsed.hearts || [],
          horselul: parsed.horselul || { total: 0, users: {} },
          dinodance: parsed.dinodance || { total: 0, users: {} },
          awww: parsed.awww || { total: 0, users: {} },
          userHorses: parsed.userHorses || {},
          userDinos: parsed.userDinos || {},
          userAwwws: parsed.userAwwws || {},
        });
      }
    } catch (err) {
      console.error("Failed to load combo storage:", err);
    }
    setIsLoaded(true);
  }, [channel]);

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (!channel || !isLoaded) return;

    const key = getStorageKey(channel);
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
      console.error("Failed to save combo storage:", err);
    }
  }, [channel, data, isLoaded]);

  // Check for horse shrinking/removal and heart expiry periodically
  useEffect(() => {
    if (!isLoaded) return;

    // Shared logic: shrink + remove for a creature type (horses or dinos)
    const processCreatures = (
      creatures: Record<string, UserHorseData>,
      totals: { total: number; users: Record<string, number> },
      now: number,
    ) => {
      let changed = false;
      const updated = { ...creatures };
      const toRemove: string[] = [];

      for (const [username, creature] of Object.entries(updated)) {
        const inactiveMs = now - creature.timestamp;

        if (inactiveMs >= HORSE_REMOVE_MS) {
          toRemove.push(username);
          changed = true;
          continue;
        }

        if (inactiveMs >= HORSE_SHRINK_MS && creature.count > 1) {
          const lastShrink = creature.lastShrinkAt || creature.timestamp;
          const hoursSinceLastShrink = Math.floor((now - lastShrink) / HORSE_SHRINK_MS);
          if (hoursSinceLastShrink > 0) {
            const shrinksToApply = Math.min(hoursSinceLastShrink, creature.count - 1);
            if (shrinksToApply > 0) {
              updated[username] = { ...creature, count: creature.count - shrinksToApply, lastShrinkAt: now };
              changed = true;
            }
          }
        }
      }

      let totalToRemove = 0;
      const newUsers = { ...totals.users };
      for (const username of toRemove) {
        totalToRemove += totals.users[username] || 0;
        delete newUsers[username];
        delete updated[username];
      }

      return {
        changed,
        creatures: updated,
        totals: { total: Math.max(0, totals.total - totalToRemove), users: newUsers },
      };
    };

    const checkExpiry = () => {
      const now = Date.now();

      setData((prev) => {
        const horseResult = processCreatures(prev.userHorses, prev.horselul, now);
        const dinoResult = processCreatures(prev.userDinos, prev.dinodance, now);
        const awwwResult = processCreatures(prev.userAwwws, prev.awww, now);

        // Filter out expired hearts
        const newHearts = prev.hearts.filter((h) => now - h.timestamp < HEART_EXPIRY_MS);
        const heartsChanged = newHearts.length !== prev.hearts.length;

        if (!horseResult.changed && !dinoResult.changed && !awwwResult.changed && !heartsChanged) return prev;

        return {
          ...prev,
          hearts: newHearts,
          horselul: horseResult.totals,
          dinodance: dinoResult.totals,
          awww: awwwResult.totals,
          userHorses: horseResult.creatures,
          userDinos: dinoResult.creatures,
          userAwwws: awwwResult.creatures,
        };
      });
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 1000);
    return () => clearInterval(interval);
  }, [isLoaded]);

  const addCombo = useCallback((type: ComboType, username: string) => {
    const now = Date.now();

    setData((prev) => {
      if (type === "heart") {
        return {
          ...prev,
          hearts: [...prev.hearts, { username, timestamp: now }],
        };
      } else {
        // horselul, dinodance, or awww — same structure
        const key = type === "dinodance" ? "dinodance" : type === "awww" ? "awww" : "horselul";
        const current = prev[key];
        return {
          ...prev,
          [key]: {
            total: current.total + 1,
            users: {
              ...current.users,
              [username]: (current.users[username] || 0) + 1,
            },
          },
        };
      }
    });
  }, []);

  // Shared logic for adding/updating a creature (horse or dino)
  const updateCreature = useCallback((
    creatureKey: "userHorses" | "userDinos" | "userAwwws",
    username: string,
    color: string,
    corner: string = "bl",
  ) => {
    setData((prev) => {
      const creatures = prev[creatureKey] || {};
      const existing = creatures[username];
      const now = Date.now();
      
      if (existing) {
        return {
          ...prev,
          [creatureKey]: {
            ...creatures,
            [username]: {
              ...existing,
              count: existing.count + 1,
              color: color || existing.color,
              timestamp: now,
              lastShrinkAt: now,
            },
          },
        };
      } else {
        let minX = 15;
        let maxX = 85;
        let minY = 55;
        let maxY = 85;

        if (corner === "bl") {
          minX = 35;
          maxY = 80;
        } else if (corner === "br") {
          maxX = 65;
          maxY = 80;
        } else if (corner === "tl") {
          minX = 35;
        } else if (corner === "tr") {
          maxX = 65;
        }

        const x = minX + Math.random() * (maxX - minX);
        const y = minY + Math.random() * (maxY - minY);

        return {
          ...prev,
          [creatureKey]: {
            ...creatures,
            [username]: {
              color: color || "#9147ff",
              count: 1,
              x,
              y,
              timestamp: now,
              lastShrinkAt: now,
            },
          },
        };
      }
    });
  }, []);

  const updateUserHorse = useCallback((username: string, color: string, corner: string = "bl") => {
    updateCreature("userHorses", username, color, corner);
  }, [updateCreature]);

  const updateUserDino = useCallback((username: string, color: string, corner: string = "bl") => {
    updateCreature("userDinos", username, color, corner);
  }, [updateCreature]);

  const updateUserAwww = useCallback((username: string, color: string, corner: string = "bl") => {
    updateCreature("userAwwws", username, color, corner);
  }, [updateCreature]);

  const clearStorage = useCallback(() => {
    setData(createEmptyStorage());
    if (channel) {
      localStorage.removeItem(getStorageKey(channel));
    }
  }, [channel]);

  // Calculate hearts total from non-expired hearts
  const heartsTotal = data.hearts.length;
  
  // Calculate hearts by user from non-expired hearts
  const heartsByUser = data.hearts.reduce((acc, h) => {
    acc[h.username] = (acc[h.username] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    data,
    isLoaded,
    addCombo,
    updateUserHorse,
    updateUserDino,
    updateUserAwww,
    clearStorage,
    heartsTotal,
    heartsByUser,
    horselulTotal: data.horselul.total,
    horselulUsers: data.horselul.users,
    userHorses: data.userHorses,
    dinodanceTotal: data.dinodance.total,
    dinodanceUsers: data.dinodance.users,
    userDinos: data.userDinos,
    awwwTotal: data.awww.total,
    awwwUsers: data.awww.users,
    userAwwws: data.userAwwws,
  };
}
