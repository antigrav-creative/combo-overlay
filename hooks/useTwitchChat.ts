"use client";

import { useEffect, useRef, useCallback } from "react";
import tmi from "tmi.js";

export type ComboType = "heart" | "horselul";

export interface ComboEvent {
  type: ComboType;
  username: string;
  color: string | null;
  bits: number;
  timestamp: number;
}

interface UseTwitchChatOptions {
  channel: string;
  enabled?: boolean;
  devMode?: boolean;
  onCombo: (event: ComboEvent) => void;
}

// Dev mode triggers - requires # prefix (e.g., #heart, #horselul)
const DEV_TRIGGER_PATTERN = /^#(horselul|heart|hearts)(\s|$)/i;

// Parse raw IRC tags from Twitch message
function parseIRCTags(rawTags: string): Record<string, string> {
  const tags: Record<string, string> = {};
  if (!rawTags.startsWith("@")) return tags;
  
  const tagString = rawTags.slice(1); // Remove @ prefix
  const pairs = tagString.split(";");
  
  for (const pair of pairs) {
    const [key, value] = pair.split("=");
    if (key) {
      // Unescape IRC values (\s = space, \n = newline, etc.)
      tags[key] = (value || "").replace(/\\s/g, " ").replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
    }
  }
  
  return tags;
}

// Process combo from parsed IRC tags
function processComboFromTags(
  tags: Record<string, string>,
  onCombo: (event: ComboEvent) => void
): boolean {
  const msgId = tags["msg-id"];
  const bitsSpent = tags["msg-param-bits-spent"];
  const giftId = tags["msg-param-gift-id"];
  const displayName = tags["msg-param-user-display-name"] || tags["display-name"] || "anonymous";
  const color = tags["color"] || null;

  // Check for onetapgiftredeemed with bits and gift ID
  if (msgId === "onetapgiftredeemed" && bitsSpent && giftId) {
    const bits = parseInt(bitsSpent, 10);
    const giftLower = giftId.toLowerCase();

    let type: ComboType | null = null;
    if (giftLower === "heart" || giftLower === "hearts") {
      type = "heart";
    } else if (giftLower === "horselul") {
      type = "horselul";
    }

    if (type) {
      onCombo({
        type,
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
  enabled = true,
  devMode = false,
  onCombo,
}: UseTwitchChatOptions) {
  const clientRef = useRef<tmi.Client | null>(null);
  const onComboRef = useRef(onCombo);

  useEffect(() => {
    onComboRef.current = onCombo;
  }, [onCombo]);

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

    // Handle regular chat messages (for dev mode triggers and bit cheers)
    const handleMessage = (
      _channel: string,
      tags: tmi.ChatUserstate,
      message: string,
      _self: boolean
    ) => {
      const username = (tags.username || tags["display-name"] || "anonymous").toLowerCase();
      const color = tags.color || null;

      // Check if this message has bits attached (regular bit cheer)
      if (tags.bits) {
        const bits = parseInt(tags.bits as string, 10);
        const msgLower = message.toLowerCase();

        let type: ComboType | null = null;
        if (msgLower.includes("heart")) {
          type = "heart";
        } else if (msgLower.includes("horselul")) {
          type = "horselul";
        }

        if (type) {
          onComboRef.current({ type, username, color, bits, timestamp: Date.now() });
          return;
        }
      }

      // Dev mode: check for #heart or #horselul triggers
      if (devMode) {
        const devMatch = message.trim().match(DEV_TRIGGER_PATTERN);
        if (devMatch) {
          const trigger = devMatch[1].toLowerCase();
          const type: ComboType = (trigger === "heart" || trigger === "hearts") ? "heart" : "horselul";
          onComboRef.current({ type, username, color, bits: type === "heart" ? 5 : 50, timestamp: Date.now() });
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
          
          // Check if this is our combo redemption
          if (tags["msg-id"] === "onetapgiftredeemed") {
            processComboFromTags(tags, onComboRef.current);
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

  // Simulate a simple combo event
  const simulateMessage = useCallback(
    (type: ComboType, username: string = "testuser", color?: string) => {
      const bits = type === "heart" ? 5 : 50;
      onComboRef.current({
        type,
        username: username.toLowerCase(),
        color: color || null,
        bits,
        timestamp: Date.now(),
      });
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
          processComboFromTags(tags, onComboRef.current);
        }
      }
    },
    []
  );

  return { simulateMessage, simulateRawMessage };
}
