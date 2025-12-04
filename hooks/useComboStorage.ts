"use client";

import { useState, useEffect, useCallback } from "react";
import type { ComboType } from "./useTwitchChat";

// Expiration times in milliseconds
const HORSE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
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
  timestamp: number; // when the horse was last updated (for expiry calculation)
  isExpiring?: boolean; // flag to trigger explosion animation
  expiringAt?: number; // when the horse started expiring (for removal timing)
}

export interface ComboStorage {
  hearts: HeartRedemption[];
  horselul: {
    total: number;
    users: Record<string, number>;
  };
  userHorses: Record<string, UserHorseData>;
}

const createEmptyStorage = (): ComboStorage => ({
  hearts: [],
  horselul: { total: 0, users: {} },
  userHorses: {},
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
          userHorses: parsed.userHorses || {},
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

  // Check for expired horses and hearts periodically
  useEffect(() => {
    if (!isLoaded) return;

    const checkExpiry = () => {
      const now = Date.now();
      
      setData((prev) => {
        let changed = false;
        const newUserHorses = { ...prev.userHorses };
        const horsesToMarkExpiring: string[] = [];
        const horsesToRemove: string[] = [];

        for (const [username, horse] of Object.entries(newUserHorses)) {
          const age = now - horse.timestamp;
          
          if (horse.isExpiring && horse.expiringAt) {
            // Already expiring - check if animation time has passed (2 seconds for animation to complete)
            const timeSinceExpiring = now - horse.expiringAt;
            if (timeSinceExpiring >= 2000) {
              // Animation should be done, remove completely
              horsesToRemove.push(username);
              changed = true;
            }
          } else if (age >= HORSE_EXPIRY_MS && !horse.isExpiring) {
            // Just expired - mark as expiring to trigger animation
            horsesToMarkExpiring.push(username);
            changed = true;
          }
        }

        // Mark horses as expiring (triggers animation)
        for (const username of horsesToMarkExpiring) {
          newUserHorses[username] = { ...newUserHorses[username], isExpiring: true, expiringAt: now };
        }

        // Calculate counts to remove
        let totalToRemove = 0;
        const newHorselulUsers = { ...prev.horselul.users };
        
        // Remove expired horses completely
        for (const username of horsesToRemove) {
          totalToRemove += prev.horselul.users[username] || 0;
          delete newHorselulUsers[username];
          delete newUserHorses[username];
        }

        // Filter out expired hearts
        const newHearts = prev.hearts.filter((h) => now - h.timestamp < HEART_EXPIRY_MS);
        if (newHearts.length !== prev.hearts.length) {
          changed = true;
        }

        if (!changed) return prev;

        return {
          ...prev,
          hearts: newHearts,
          horselul: {
            total: Math.max(0, prev.horselul.total - totalToRemove),
            users: newHorselulUsers,
          },
          userHorses: newUserHorses,
        };
      });
    };

    // Check immediately and then every second (for smoother animation timing)
    checkExpiry();
    const interval = setInterval(checkExpiry, 1000);
    return () => clearInterval(interval);
  }, [isLoaded]);

  // Remove a horse immediately (called after animation or for manual removal)
  const removeExpiredHorse = useCallback((username: string) => {
    setData((prev) => {
      const horse = prev.userHorses[username];
      if (!horse) return prev;
      
      const newUserHorses = { ...prev.userHorses };
      delete newUserHorses[username];
      
      // Get the count from horselul.users to ensure accuracy
      const userHorselulCount = prev.horselul.users[username] || 0;
      
      // Remove from horselul users
      const newHorselulUsers = { ...prev.horselul.users };
      delete newHorselulUsers[username];
      
      return {
        ...prev,
        horselul: {
          total: Math.max(0, prev.horselul.total - userHorselulCount),
          users: newHorselulUsers,
        },
        userHorses: newUserHorses,
      };
    });
  }, []);

  // Manually trigger a horse to expire (for dev testing)
  const expireHorse = useCallback((username: string) => {
    setData((prev) => {
      const horse = prev.userHorses[username];
      if (!horse) return prev;
      
      return {
        ...prev,
        userHorses: {
          ...prev.userHorses,
          [username]: { ...horse, isExpiring: true, expiringAt: Date.now() },
        },
      };
    });
  }, []);

  const addCombo = useCallback((type: ComboType, username: string) => {
    const now = Date.now();
    
    setData((prev) => {
      if (type === "heart") {
        // Add heart with timestamp
        return {
          ...prev,
          hearts: [...prev.hearts, { username, timestamp: now }],
        };
      } else {
        // Horselul - track total and users
        const current = prev.horselul;
        return {
          ...prev,
          horselul: {
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

  // Add or update a user's horse (for user horses mode)
  // corner param helps avoid placing horses under the stats display
  const updateUserHorse = useCallback((username: string, color: string, corner: string = "bl") => {
    setData((prev) => {
      const userHorses = prev.userHorses || {};
      const existing = userHorses[username];
      const now = Date.now();
      
      if (existing && !existing.isExpiring) {
        // User exists and not expiring - increment count and reset timestamp
        return {
          ...prev,
          userHorses: {
            ...userHorses,
            [username]: {
              ...existing,
              count: existing.count + 1,
              color: color || existing.color,
              timestamp: now, // Reset expiry timer
            },
          },
        };
      } else {
        // New user or expired - create horse at random position avoiding the counter corner
        let minX = 15;
        let maxX = 85;
        let minY = 55;
        let maxY = 85;

        // Avoid the corner where stats are displayed
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
          userHorses: {
            ...userHorses,
            [username]: {
              color: color || "#9147ff",
              count: 1,
              x,
              y,
              timestamp: now,
              isExpiring: false, // Explicitly set to false so it can expire later
            },
          },
        };
      }
    });
  }, []);

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
    removeExpiredHorse,
    expireHorse,
    clearStorage,
    heartsTotal,
    heartsByUser,
    horselulTotal: data.horselul.total,
    horselulUsers: data.horselul.users,
    userHorses: data.userHorses,
  };
}
