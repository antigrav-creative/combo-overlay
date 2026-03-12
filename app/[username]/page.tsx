"use client";

import { useCallback, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTwitchChat, type ComboType } from "@/hooks/useTwitchChat";
import { useComboStorage } from "@/hooks/useComboStorage";
import { HeartsCounter } from "@/components/HeartsCounter";
import { DevControls } from "@/components/DevControls";
import { ComboStats } from "@/components/ComboStats";
import { UserHorses } from "@/components/UserHorses";
import { FallingHearts, type HeartSpawnRequest } from "@/components/FallingHearts";

const DEFAULT_HORSELUL_EMOTE_ID = "01FDTEQJJR000CM9KGHJPMM7N6";
const DEFAULT_HEART_EMOTE_ID = "01HNK8DGF0000FG935RNS75APG";
const DEFAULT_DINODANCE_EMOTE_ID = "01FN4MWV0000071FCSB63SBDBN";

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
  const dinodanceEmoteId = searchParams.get("dinodanceEmoteId") || DEFAULT_DINODANCE_EMOTE_ID;
  const horselulImage = get7TVUrl(horselulEmoteId);
  const heartImage = get7TVUrl(heartEmoteId);
  const dinodanceImage = get7TVUrl(dinodanceEmoteId);
  const isDevMode = searchParams.get("dev") === "true";
  const showTotals = searchParams.get("showTotals") === "true";
  const showUsers = searchParams.get("showUsers") === "true";

  // New options
  const sizeParam = parseInt(searchParams.get("size") || "3", 10);
  const sizeMultiplier = SIZE_MULTIPLIERS[sizeParam] ?? 1;
  const corner = (searchParams.get("corner") || "bl") as CornerPosition;
  
  const fallingHeartsEnabled = searchParams.get("fallingHearts") !== "false";

  const [heartSpawnQueue, setHeartSpawnQueue] = useState<HeartSpawnRequest[]>([]);
  const [lastHorseUpdate, setLastHorseUpdate] = useState<{ username: string; timestamp: number } | null>(null);
  const [lastDinoUpdate, setLastDinoUpdate] = useState<{ username: string; timestamp: number } | null>(null);

  const {
    addCombo,
    updateUserHorse,
    updateUserDino,
    clearStorage,
    heartsTotal,
    heartsByUser,
    horselulTotal,
    horselulUsers,
    userHorses,
    dinodanceTotal,
    dinodanceUsers,
    userDinos,
    isLoaded
  } = useComboStorage(username);

  // Clear all data helper
  const clearAllData = useCallback(() => {
    clearStorage();
    setHeartSpawnQueue([]);
    setLastHorseUpdate(null);
    setLastDinoUpdate(null);
  }, [clearStorage]);

  const handleCombo = useCallback(
    (event: { type: ComboType; username: string; color: string | null }) => {
      addCombo(event.type, event.username);

      if (event.type === "horselul") {
        updateUserHorse(event.username, event.color || "#9147ff", corner);
        setLastHorseUpdate({ username: event.username, timestamp: Date.now() });
      }

      if (event.type === "dinodance") {
        updateUserDino(event.username, event.color || "#9147ff", corner);
        setLastDinoUpdate({ username: event.username, timestamp: Date.now() });
      }

      if (event.type === "heart") {
        // Falling hearts mode
        if (fallingHeartsEnabled) {
          setHeartSpawnQueue((prev) => [
            ...prev,
            { id: spawnIdCounter++, color: event.color },
          ]);
        }
      }
    },
    [addCombo, updateUserHorse, updateUserDino, fallingHeartsEnabled, corner]
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
          horselulImageUrl={horselulImage}
          heartImageUrl={heartImage}
          dinodanceImageUrl={dinodanceImage}
          showTotals={showTotals}
          showUsers={showUsers}
          corner={corner}
          heartsTotal={heartsTotal}
          heartsByUser={heartsByUser}
          horselulTotal={horselulTotal}
          horselulUsers={horselulUsers}
          dinodanceTotal={dinodanceTotal}
          dinodanceUsers={dinodanceUsers}
        />
      )}

      {/* Show simple hearts counter only if totals are not shown */}
      {!showTotals && !showUsers && (
        <HeartsCounter count={heartsTotal} imageUrl={heartImage} corner={corner} />
      )}

      {/* User horses */}
      {horselulImage && (
        <UserHorses
          imageUrl={horselulImage}
          userHorses={userHorses}
          lastUpdate={lastHorseUpdate}
          corner={corner}
        />
      )}

      {/* User dinos */}
      {dinodanceImage && (
        <UserHorses
          imageUrl={dinodanceImage}
          userHorses={userDinos}
          lastUpdate={lastDinoUpdate}
          corner={corner}
        />
      )}

      {/* Falling hearts */}
      {heartImage && fallingHeartsEnabled && (
        <FallingHearts
          imageUrl={heartImage}
          spawnQueue={heartSpawnQueue}
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
          dinodanceTotal={dinodanceTotal}
        />
      )}
    </div>
  );
}
