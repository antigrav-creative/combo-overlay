"use client";

import { useState, useEffect, useCallback } from "react";
import type { ComboItemConfig } from "@/types/combo";

const FALLING_EXPIRY_MS = 12 * 60 * 60 * 1000; // 12 hours

export interface UserCreatureData {
  color: string;
  count: number; // total redemptions (for stats)
  x: number;
  y: number;
  timestamp: number; // last activity time — for 12h removal
  bonusUnits: number; // extra size units above 1x at time of last update
  bonusSince: number; // when bonusUnits was set — for computing current shrink
}

interface FallingRedemption {
  username: string;
  timestamp: number;
}

interface ItemData {
  total: number;
  users: Record<string, number>;
  redemptions: FallingRedemption[]; // for "falling" display type
  creatures: Record<string, UserCreatureData>; // for "creature" display type
}

export interface ComboStorage {
  items: Record<string, ItemData>;
}

function createEmptyItemData(): ItemData {
  return { total: 0, users: {}, redemptions: [], creatures: {} };
}

const createEmptyStorage = (): ComboStorage => ({ items: {} });

function getStorageKey(channel: string): string {
  return `combo-overlay-v4-${channel.toLowerCase()}`;
}

function getOrCreateItem(items: Record<string, ItemData>, id: string): ItemData {
  return items[id] || createEmptyItemData();
}

export function useComboStorage(channel: string, itemConfigs: ComboItemConfig[], timeOffset: number = 0) {
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
          items: parsed.items || {},
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

  // Check for creature removal and falling redemption expiry
  useEffect(() => {
    if (!isLoaded) return;

    const checkExpiry = () => {
      const now = Date.now() + timeOffset;

      setData((prev) => {
        let changed = false;
        const newItems = { ...prev.items };

        for (const [itemId, itemData] of Object.entries(newItems)) {
          const config = itemConfigs.find((c) => c.id === itemId);
          if (!config) continue;

          if (config.displayType === "creature") {
            // Remove creatures whose bonus has fully shrunk to 0
            const creatures = { ...itemData.creatures };
            const toRemove: string[] = [];

            for (const [username, creature] of Object.entries(creatures)) {
              const elapsed = (now - creature.bonusSince) / (60 * 60 * 1000);
              const remaining = creature.bonusUnits - elapsed;
              if (remaining <= 0) {
                toRemove.push(username);
              }
            }

            if (toRemove.length > 0) {
              changed = true;
              let totalToRemove = 0;
              const newUsers = { ...itemData.users };

              for (const username of toRemove) {
                totalToRemove += itemData.users[username] || 0;
                delete newUsers[username];
                delete creatures[username];
              }

              newItems[itemId] = {
                ...itemData,
                total: Math.max(0, itemData.total - totalToRemove),
                users: newUsers,
                creatures,
              };
            }
          }

          if (config.displayType === "falling") {
            const newRedemptions = itemData.redemptions.filter(
              (r) => now - r.timestamp < FALLING_EXPIRY_MS
            );
            if (newRedemptions.length !== itemData.redemptions.length) {
              changed = true;
              newItems[itemId] = { ...itemData, redemptions: newRedemptions };
            }
          }
        }

        if (!changed) return prev;
        return { items: newItems };
      });
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 1000);
    return () => clearInterval(interval);
  }, [isLoaded, itemConfigs, timeOffset]);

  const addCombo = useCallback(
    (itemId: string, username: string, color: string, corner: string = "bl") => {
      const config = itemConfigs.find((c) => c.id === itemId);
      if (!config) return;

      setData((prev) => {
        const items = { ...prev.items };
        const item = { ...getOrCreateItem(items, itemId) };
        const now = Date.now();

        item.total = item.total + 1;
        item.users = { ...item.users, [username]: (item.users[username] || 0) + 1 };

        if (config.displayType === "falling") {
          item.redemptions = [...item.redemptions, { username, timestamp: now }];
        }

        if (config.displayType === "creature") {
          const creatures = { ...item.creatures };
          const existing = creatures[username];

          if (existing) {
            // Compute current bonus (shrinks by 1 per hour)
            const elapsed = (now - existing.bonusSince) / (60 * 60 * 1000);
            const currentBonus = Math.max(0, existing.bonusUnits - elapsed);

            creatures[username] = {
              ...existing,
              count: existing.count + 1,
              color: color || existing.color,
              timestamp: now,
              bonusUnits: currentBonus + 1,
              bonusSince: now,
            };
          } else {
            let minX = 15, maxX = 85, minY = 55, maxY = 85;
            if (corner === "bl") { minX = 35; maxY = 80; }
            else if (corner === "br") { maxX = 65; maxY = 80; }
            else if (corner === "tl") { minX = 35; }
            else if (corner === "tr") { maxX = 65; }

            creatures[username] = {
              color: color || "#9147ff",
              count: 1,
              x: minX + Math.random() * (maxX - minX),
              y: minY + Math.random() * (maxY - minY),
              timestamp: now,
              bonusUnits: 1, // starts at 1x, shrinks to 0 over 1 hour
              bonusSince: now,
            };
          }

          item.creatures = creatures;
        }

        items[itemId] = item;
        return { items };
      });
    },
    [itemConfigs]
  );

  const clearStorage = useCallback(() => {
    setData(createEmptyStorage());
    if (channel) {
      localStorage.removeItem(getStorageKey(channel));
    }
  }, [channel]);

  // Derived helpers
  const getItemData = useCallback(
    (itemId: string): ItemData => {
      return data.items[itemId] || createEmptyItemData();
    },
    [data]
  );

  return {
    data,
    isLoaded,
    addCombo,
    clearStorage,
    getItemData,
  };
}
