"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTwitchChat, type ComboType } from "@/hooks/useTwitchChat";
import { useComboStorage } from "@/hooks/useComboStorage";
import { HeartsCounter } from "@/components/HeartsCounter";
import { PhysicsCanvas, type SpawnRequest } from "@/components/PhysicsCanvas";
import { DevControls } from "@/components/DevControls";
import { ComboStats } from "@/components/ComboStats";

const DEFAULT_HORSELUL_EMOTE_ID = "01FDTEQJJR000CM9KGHJPMM7N6";
const DEFAULT_HEART_EMOTE_ID = "01HNK8DGF0000FG935RNS75APG";

// Size multiplier mapping (1-5 → 0.5x to 2x)
const SIZE_MULTIPLIERS: Record<number, number> = {
  1: 0.5,
  2: 0.75,
  3: 1,
  4: 1.5,
  5: 2,
};

// Corner position mapping
export type CornerPosition = "bl" | "tl" | "br" | "tr";

function get7TVUrl(emoteId: string): string {
  return `https://cdn.7tv.app/emote/${emoteId}/4x.avif`;
}

let spawnIdCounter = 0;

export default function OverlayPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const username = params.username as string;
  const horselulEmoteId = searchParams.get("emoteId") || DEFAULT_HORSELUL_EMOTE_ID;
  const heartEmoteId = searchParams.get("heartEmoteId") || DEFAULT_HEART_EMOTE_ID;
  const horselulImage = get7TVUrl(horselulEmoteId);
  const heartImage = get7TVUrl(heartEmoteId);
  const isDevMode = searchParams.get("dev") === "true";
  const showTotals = searchParams.get("showTotals") === "true";
  const showUsers = searchParams.get("showUsers") === "true";

  // New options
  const sizeParam = parseInt(searchParams.get("size") || "3", 10);
  const sizeMultiplier = SIZE_MULTIPLIERS[sizeParam] ?? 1;
  const corner = (searchParams.get("corner") || "bl") as CornerPosition;

  const [spawnQueue, setSpawnQueue] = useState<SpawnRequest[]>([]);
  const [clearKey, setClearKey] = useState(0);
  const initialHorselulCountRef = useRef<number | null>(null);

  const { data, addCombo, clearStorage, heartsTotal, horselulTotal, isLoaded } =
    useComboStorage(username);

  // Clear all data helper
  const clearAllData = useCallback(() => {
    clearStorage();
    setSpawnQueue([]);
    setClearKey((k) => k + 1);
    initialHorselulCountRef.current = 0;
  }, [clearStorage]);

  // Subscribe to EventSub for this channel (ensures webhook is registered)
  useEffect(() => {
    if (!username) return;

    fetch("/api/eventsub/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: username }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          console.log("[EventSub] Subscribed:", data.message);
        } else if (data.error) {
          console.warn("[EventSub] Subscription error:", data.error);
        }
      })
      .catch((err) => {
        console.error("[EventSub] Failed to subscribe:", err);
      });
  }, [username]);

  // Connect to SSE for stream.online events
  useEffect(() => {
    if (!username) return;

    const eventSource = new EventSource(`/api/events?channel=${encodeURIComponent(username)}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "stream_online") {
          console.log("[SSE] Stream went online, clearing data");
          clearAllData();
        }
      } catch {
        // Ignore parse errors (e.g., ping comments)
      }
    };

    eventSource.onerror = (error) => {
      console.error("[SSE] Connection error:", error);
    };

    return () => {
      eventSource.close();
    };
  }, [username, clearAllData]);

  // Restore horseluls from storage on load (with random colors since we don't store them)
  // Only runs once when data is first loaded
  useEffect(() => {
    if (isLoaded && initialHorselulCountRef.current === null) {
      // Capture the initial count on first load
      initialHorselulCountRef.current = horselulTotal;
      
      if (horselulTotal > 0) {
        const restoredSpawns: SpawnRequest[] = [];
        for (let i = 0; i < horselulTotal; i++) {
          restoredSpawns.push({
            id: spawnIdCounter++,
            color: null, // Random color for restored ones
          });
        }
        setSpawnQueue(restoredSpawns);
      }
    }
  }, [isLoaded, horselulTotal]);

  const handleCombo = useCallback(
    (event: { type: ComboType; username: string; color: string | null }) => {
      addCombo(event.type, event.username);

      if (event.type === "horselul") {
        setSpawnQueue((prev) => [
          ...prev,
          { id: spawnIdCounter++, color: event.color },
        ]);
      }
    },
    [addCombo]
  );

  const { simulateRawMessage } = useTwitchChat({
    channel: username,
    enabled: !!username, // Always connect to chat
    devMode: isDevMode,  // In dev mode, also listen for #horselul and #heart
    onCombo: handleCombo,
  });

  const handleSimulate = useCallback(
    (type: ComboType, fakeUsername: string, color: string | null) => {
      handleCombo({ type, username: fakeUsername, color });
    },
    [handleCombo]
  );

  const handleClear = useCallback(() => {
    clearAllData();
  }, [clearAllData]);

  if (!isLoaded) {
    return null; // Don't render until localStorage is loaded
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Show ComboStats if either totals or users is enabled */}
      {(showTotals || showUsers) && (
        <ComboStats
          data={data}
          horselulImageUrl={horselulImage}
          heartImageUrl={heartImage}
          showTotals={showTotals}
          showUsers={showUsers}
          corner={corner}
        />
      )}

      {/* Show simple hearts counter only if totals are not shown */}
      {!showTotals && !showUsers && (
        <HeartsCounter count={heartsTotal} imageUrl={heartImage} corner={corner} />
      )}

      {/* Physics canvas for falling horseluls */}
      {horselulImage && (
        <PhysicsCanvas
          imageUrl={horselulImage}
          spawnQueue={spawnQueue}
          clearKey={clearKey}
          sizeMultiplier={sizeMultiplier}
        />
      )}

      {/* Dev controls (only in dev mode) */}
      {isDevMode && (
        <DevControls
          onSimulate={handleSimulate}
          onSimulateRaw={simulateRawMessage}
          onClear={handleClear}
          heartsTotal={heartsTotal}
          horselulTotal={horselulTotal}
        />
      )}
    </div>
  );
}
