"use client";

import { useState, useEffect, useCallback } from "react";
import type { ComboType } from "./useTwitchChat";

interface ComboData {
  total: number;
  users: Record<string, number>;
}

// User horse data for persistent horse mode
export interface UserHorseData {
  color: string;
  count: number;
  x: number; // percentage 0-100
  y: number; // percentage 50-100 (bottom half)
}

export interface ComboStorage {
  hearts: ComboData;
  horselul: ComboData;
  userHorses: Record<string, UserHorseData>;
}

const createEmptyStorage = (): ComboStorage => ({
  hearts: { total: 0, users: {} },
  horselul: { total: 0, users: {} },
  userHorses: {},
});

function getStorageKey(channel: string): string {
  return `combo-overlay-${channel.toLowerCase()}`;
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
        // Migrate old data that doesn't have userHorses
        setData({
          hearts: parsed.hearts || { total: 0, users: {} },
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

  const addCombo = useCallback((type: ComboType, username: string) => {
    setData((prev) => {
      const key = type === "heart" ? "hearts" : "horselul";
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
    });
  }, []);

  // Add or update a user's horse (for user horses mode)
  // corner param helps avoid placing horses under the stats display
  const updateUserHorse = useCallback((username: string, color: string, corner: string = "bl") => {
    setData((prev) => {
      const userHorses = prev.userHorses || {};
      const existing = userHorses[username];
      if (existing) {
        // User exists - increment count
        return {
          ...prev,
          userHorses: {
            ...userHorses,
            [username]: {
              ...existing,
              count: existing.count + 1,
              color: color || existing.color, // Update color if provided
            },
          },
        };
      } else {
        // New user - create horse at random position avoiding the counter corner
        // Determine safe x range based on corner
        let minX = 15;
        let maxX = 85;
        let minY = 55;
        let maxY = 85;

        // Avoid the corner where stats are displayed
        if (corner === "bl") {
          // Bottom-left: avoid left 30% and bottom 20%
          minX = 35;
          maxY = 80;
        } else if (corner === "br") {
          // Bottom-right: avoid right 30% and bottom 20%
          maxX = 65;
          maxY = 80;
        } else if (corner === "tl") {
          // Top-left: avoid left 30% (but we're in bottom half anyway)
          minX = 35;
        } else if (corner === "tr") {
          // Top-right: avoid right 30%
          maxX = 65;
        }

        const x = minX + Math.random() * (maxX - minX);
        const y = minY + Math.random() * (maxY - minY);

        return {
          ...prev,
          userHorses: {
            ...userHorses,
            [username]: {
              color: color || "#9147ff", // Default to Twitch purple
              count: 1,
              x,
              y,
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

  return {
    data,
    isLoaded,
    addCombo,
    updateUserHorse,
    clearStorage,
    heartsTotal: data.hearts.total,
    horselulTotal: data.horselul.total,
    userHorses: data.userHorses,
  };
}

