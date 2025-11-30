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

  const [spawnQueue, setSpawnQueue] = useState<SpawnRequest[]>([]);
  const [clearKey, setClearKey] = useState(0);
  const initialHorselulCountRef = useRef<number | null>(null);

  const { data, addCombo, clearStorage, heartsTotal, horselulTotal, isLoaded } =
    useComboStorage(username);

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
    clearStorage();
    setSpawnQueue([]);
    setClearKey((k) => k + 1); // Trigger horse removal
    initialHorselulCountRef.current = 0; // Prevent re-restoring
  }, [clearStorage]);

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
        />
      )}

      {/* Show simple hearts counter only if totals are not shown */}
      {!showTotals && !showUsers && (
        <HeartsCounter count={heartsTotal} imageUrl={heartImage} />
      )}

      {/* Physics canvas for falling horseluls */}
      {horselulImage && (
        <PhysicsCanvas
          imageUrl={horselulImage}
          spawnQueue={spawnQueue}
          clearKey={clearKey}
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
