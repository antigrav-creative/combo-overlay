"use client";

import { useEffect, useRef, useCallback } from "react";
import tmi from "tmi.js";

export type ComboType = "heart" | "horselul";

export interface ComboEvent {
  type: ComboType;
  username: string;
  color: string | null; // User's Twitch name color (hex)
  bits: number;
  timestamp: number;
}

interface UseTwitchChatOptions {
  channel: string;
  enabled?: boolean;
  devMode?: boolean; // Allow #horselul and #heart triggers in chat
  onCombo: (event: ComboEvent) => void;
}

// Pattern: "username redeemed comboname for X Bits"
const BIT_REDEMPTION_PATTERN = /(\w+) redeemed (\w+) for (\d+) Bits/i;

// Dev mode triggers
const DEV_TRIGGER_PATTERN = /^#(horselul|heart|hearts)$/i;

export function useTwitchChat({
  channel,
  enabled = true,
  devMode = false,
  onCombo,
}: UseTwitchChatOptions) {
  const clientRef = useRef<tmi.Client | null>(null);
  const onComboRef = useRef(onCombo);

  // Keep callback ref updated
  useEffect(() => {
    onComboRef.current = onCombo;
  }, [onCombo]);

  useEffect(() => {
    if (!enabled || !channel) return;

    const client = new tmi.Client({
      options: { debug: false },
      connection: {
        secure: true,
        reconnect: true,
      },
      channels: [channel],
    });

    clientRef.current = client;

    const handleMessage = (
      _channel: string,
      tags: tmi.ChatUserstate,
      message: string,
      _self: boolean
    ) => {
      // Check for bit redemption pattern
      const redemptionMatch = message.match(BIT_REDEMPTION_PATTERN);
      if (redemptionMatch) {
        const [, username, comboName, bitsStr] = redemptionMatch;
        const bits = parseInt(bitsStr, 10);
        const comboLower = comboName.toLowerCase();

        let type: ComboType | null = null;

        if (comboLower === "heart" || comboLower === "hearts") {
          type = "heart";
        } else if (comboLower === "horselul") {
          type = "horselul";
        }

        if (type) {
          onComboRef.current({
            type,
            username: username.toLowerCase(),
            color: tags.color || null,
            bits,
            timestamp: Date.now(),
          });
        }
        return;
      }

      // Dev mode: check for #horselul or #heart triggers
      if (devMode) {
        const devMatch = message.trim().match(DEV_TRIGGER_PATTERN);
        if (devMatch) {
          const trigger = devMatch[1].toLowerCase();
          let type: ComboType;

          if (trigger === "heart" || trigger === "hearts") {
            type = "heart";
          } else {
            type = "horselul";
          }

          onComboRef.current({
            type,
            username: (tags.username || tags["display-name"] || "anonymous").toLowerCase(),
            color: tags.color || null,
            bits: type === "heart" ? 5 : 50,
            timestamp: Date.now(),
          });
        }
      }
    };

    client.on("message", handleMessage);

    client.connect().catch((err) => {
      console.error("Failed to connect to Twitch chat:", err);
    });

    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, [channel, enabled, devMode]);

  // Expose a method to simulate messages for dev mode
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

  return { simulateMessage };
}
