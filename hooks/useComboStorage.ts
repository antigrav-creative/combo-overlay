"use client";

import { useState, useEffect, useCallback } from "react";
import type { ComboType } from "./useTwitchChat";

interface ComboData {
  total: number;
  users: Record<string, number>;
}

export interface ComboStorage {
  hearts: ComboData;
  horselul: ComboData;
}

const createEmptyStorage = (): ComboStorage => ({
  hearts: { total: 0, users: {} },
  horselul: { total: 0, users: {} },
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
        const parsed = JSON.parse(stored) as ComboStorage;
        setData(parsed);
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
    clearStorage,
    heartsTotal: data.hearts.total,
    horselulTotal: data.horselul.total,
  };
}

