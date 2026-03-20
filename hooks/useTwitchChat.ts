"use client";

import { useEffect, useRef, useCallback } from "react";
import tmi from "tmi.js";
import type { ComboItemConfig, ComboEvent } from "@/types/combo";
import { decomposeCheer } from "@/types/combo";

interface UseTwitchChatOptions {
  channel: string;
  items: ComboItemConfig[];
  enabled?: boolean;
  devMode?: boolean;
  onCombo: (event: ComboEvent) => void;
}

// Parse raw IRC tags from Twitch message
function parseIRCTags(rawTags: string): Record<string, string> {
  const tags: Record<string, string> = {};
  if (!rawTags.startsWith("@")) return tags;

  const tagString = rawTags.slice(1);
  const pairs = tagString.split(";");

  for (const pair of pairs) {
    const [key, value] = pair.split("=");
    if (key) {
      tags[key] = (value || "").replace(/\\s/g, " ").replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
    }
  }

  return tags;
}

const CHEER_PATTERN = /cheer(\d+)/gi;

// Build a cost→item lookup for exact matching
function buildCostMap(items: ComboItemConfig[]): Map<number, ComboItemConfig> {
  const map = new Map<number, ComboItemConfig>();
  // If multiple items have the same cost, first one wins
  for (const item of items) {
    if (!map.has(item.cost)) {
      map.set(item.cost, item);
    }
  }
  return map;
}

/**
 * Fire onCombo events for a cheer.
 * 1. Parse individual CheerN amounts from message text
 * 2. For each amount, exact-match to an item by cost → fire that specific item
 * 3. For amounts with no exact match → greedy decompose that amount
 * 4. If no cheers found in message, greedy decompose the total from tags.bits
 */
function fireCheerEvents(
  bits: number,
  username: string,
  color: string | null,
  items: ComboItemConfig[],
  onCombo: (event: ComboEvent) => void,
  message?: string,
) {
  const now = Date.now();
  const costMap = buildCostMap(items);

  // Try to parse individual cheers from message
  if (message) {
    const matches = [...message.matchAll(CHEER_PATTERN)];
    if (matches.length > 0) {
      for (const match of matches) {
        const amount = parseInt(match[1], 10);
        const exactItem = costMap.get(amount);

        if (exactItem) {
          // Exact match — user chose this item
          onCombo({ itemId: exactItem.id, username, color, bits: amount, timestamp: now });
        } else {
          // No exact match — greedy decompose this individual amount
          const decomposed = decomposeCheer(amount, items);
          for (const { itemId, count } of decomposed) {
            const itemConfig = items.find((i) => i.id === itemId);
            const itemCost = itemConfig?.cost ?? amount;
            for (let i = 0; i < count; i++) {
              onCombo({ itemId, username, color, bits: itemCost, timestamp: now });
            }
          }
        }
      }
      return;
    }
  }

  // Fallback: no cheers in message, greedy decompose the total
  const decomposed = decomposeCheer(bits, items);
  for (const { itemId, count } of decomposed) {
    const itemConfig = items.find((i) => i.id === itemId);
    const itemCost = itemConfig?.cost ?? bits;
    for (let i = 0; i < count; i++) {
      onCombo({ itemId, username, color, bits: itemCost, timestamp: now });
    }
  }
}

// Process combo from parsed IRC tags (onetapgiftredeemed)
function processComboFromTags(
  tags: Record<string, string>,
  items: ComboItemConfig[],
  onCombo: (event: ComboEvent) => void
): boolean {
  const msgId = tags["msg-id"];
  const bitsSpent = tags["msg-param-bits-spent"];
  const giftId = tags["msg-param-gift-id"];
  const displayName = tags["msg-param-user-display-name"] || tags["display-name"] || "anonymous";
  const color = tags["color"] || null;

  if (msgId === "onetapgiftredeemed" && bitsSpent && giftId) {
    const bits = parseInt(bitsSpent, 10);
    const giftLower = giftId.toLowerCase();

    // Match giftId against configured items
    const matchedItem = items.find((item) => item.id.toLowerCase() === giftLower);
    if (matchedItem) {
      onCombo({
        itemId: matchedItem.id,
        username: displayName.toLowerCase(),
        color,
        bits,
        timestamp: Date.now(),
      });
      return true;
    }
  }

  return false;
}

export function useTwitchChat({
  channel,
  items,
  enabled = true,
  devMode = false,
  onCombo,
}: UseTwitchChatOptions) {
  const clientRef = useRef<tmi.Client | null>(null);
  const onComboRef = useRef(onCombo);
  const itemsRef = useRef(items);

  useEffect(() => {
    onComboRef.current = onCombo;
  }, [onCombo]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    if (!enabled || !channel) return;

    const client = new tmi.Client({
      options: { debug: devMode },
      connection: {
        secure: true,
        reconnect: true,
      },
      channels: [channel],
    });

    clientRef.current = client;

    // Handle regular chat messages (cheers + dev mode triggers)
    const handleMessage = (
      _channel: string,
      tags: tmi.ChatUserstate,
      message: string,
      _self: boolean
    ) => {
      const username = (tags.username || tags["display-name"] || "anonymous").toLowerCase();
      const color = tags.color || null;

      // Check if this message has bits attached (cheer)
      if (tags.bits) {
        const bits = parseInt(tags.bits as string, 10);
        if (bits > 0) {
          fireCheerEvents(bits, username, color, itemsRef.current, onComboRef.current, message);
          return;
        }
      }

      // Dev mode: check for # + itemId triggers
      if (devMode) {
        const trimmed = message.trim().toLowerCase();
        if (trimmed.startsWith("#")) {
          const trigger = trimmed.slice(1).split(/\s/)[0];
          const matchedItem = itemsRef.current.find(
            (item) => item.id.toLowerCase() === trigger || item.name.toLowerCase() === trigger
          );
          if (matchedItem) {
            onComboRef.current({
              itemId: matchedItem.id,
              username,
              color,
              bits: matchedItem.cost,
              timestamp: Date.now(),
            });
          }
        }
      }
    };

    // Handle raw messages - parse IRC format directly
    const handleRawMessage = (
      messageCloned: { [property: string]: unknown },
      message: { [property: string]: unknown }
    ) => {
      const raw = message.raw as string | undefined;

      if (devMode && raw) {
        console.log("[RAW IRC]", raw);
      }

      // Parse directly from raw IRC if available
      if (raw && raw.startsWith("@")) {
        const spaceIndex = raw.indexOf(" ");
        if (spaceIndex > 0) {
          const tagsPart = raw.slice(0, spaceIndex);
          const tags = parseIRCTags(tagsPart);

          if (devMode) {
            console.log("[PARSED TAGS]", tags);
          }

          if (tags["msg-id"] === "onetapgiftredeemed") {
            processComboFromTags(tags, itemsRef.current, onComboRef.current);
          }
        }
      }
    };

    client.on("message", handleMessage);
    client.on("raw_message", handleRawMessage);

    client.connect().catch((err) => {
      console.error("Failed to connect to Twitch chat:", err);
    });

    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, [channel, enabled, devMode]);

  // Simulate a combo event for a specific item
  const simulateCombo = useCallback(
    (itemId: string, username: string = "testuser", color?: string) => {
      const item = itemsRef.current.find((i) => i.id === itemId);
      onComboRef.current({
        itemId,
        username: username.toLowerCase(),
        color: color || null,
        bits: item?.cost ?? 0,
        timestamp: Date.now(),
      });
    },
    []
  );

  // Simulate a cheer with a specific bit amount (decomposed into items)
  const simulateCheer = useCallback(
    (bits: number, username: string = "testuser", color?: string, message?: string) => {
      fireCheerEvents(bits, username.toLowerCase(), color || null, itemsRef.current, onComboRef.current, message);
    },
    []
  );

  // Simulate from raw IRC message (for testing exact Twitch format)
  const simulateRawMessage = useCallback(
    (rawMessage: string) => {
      if (rawMessage.startsWith("@")) {
        const spaceIndex = rawMessage.indexOf(" ");
        if (spaceIndex > 0) {
          const tagsPart = rawMessage.slice(0, spaceIndex);
          const tags = parseIRCTags(tagsPart);
          console.log("[SIMULATE RAW] Parsed tags:", tags);
          processComboFromTags(tags, itemsRef.current, onComboRef.current);
        }
      }
    },
    []
  );

  return { simulateCombo, simulateCheer, simulateRawMessage };
}
