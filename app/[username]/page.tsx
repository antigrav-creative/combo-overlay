"use client";

import { useCallback, useState, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useTwitchChat } from "@/hooks/useTwitchChat";
import { useComboStorage } from "@/hooks/useComboStorage";
import { FallingCounter } from "@/components/HeartsCounter";
import { DevControls } from "@/components/DevControls";
import { ComboStats, type ComboItemStats } from "@/components/ComboStats";
import { PhysicsCreatures } from "@/components/UserHorses";
import { FallingHearts, type HeartSpawnRequest } from "@/components/FallingHearts";
import {
  DEFAULT_ITEMS,
  deserializeItems,
  get7TVUrl,
  type ComboItemConfig,
  type ComboEvent,
} from "@/types/combo";

// Size multiplier mapping (1-5 → 0.5x to 2x)
const SIZE_MULTIPLIERS: Record<number, number> = {
  1: 0.5, 2: 0.75, 3: 1, 4: 1.5, 5: 2,
};

export type CornerPosition = "bl" | "tl" | "br" | "tr";

let spawnIdCounter = 0;

export default function OverlayPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const username = params.username as string;
  const isDevMode = searchParams.get("dev") === "true";
  const showTotals = searchParams.get("showTotals") === "true";
  const showUsers = searchParams.get("showUsers") === "true";
  const sizeParam = parseInt(searchParams.get("size") || "3", 10);
  const sizeMultiplier = SIZE_MULTIPLIERS[sizeParam] ?? 1;
  const corner = (searchParams.get("corner") || "bl") as CornerPosition;
  const fallingEnabled = searchParams.get("fallingHearts") !== "false";

  // Parse items from URL or use defaults
  const items: ComboItemConfig[] = useMemo(() => {
    return deserializeItems(searchParams.get("items")) || DEFAULT_ITEMS;
  }, [searchParams]);

  const [heartSpawnQueue, setHeartSpawnQueue] = useState<HeartSpawnRequest[]>([]);
  const [lastUpdates, setLastUpdates] = useState<Record<string, { username: string; timestamp: number }>>({});
  const [timeOffset, setTimeOffset] = useState(0);

  const {
    addCombo,
    clearStorage,
    getItemData,
    isLoaded,
  } = useComboStorage(username, items, timeOffset);

  const clearAllData = useCallback(() => {
    clearStorage();
    setHeartSpawnQueue([]);
    setLastUpdates({});
    setTimeOffset(0);
  }, [clearStorage]);

  const handleCombo = useCallback(
    (event: ComboEvent) => {
      const config = items.find((i) => i.id === event.itemId);
      if (!config) return;

      addCombo(event.itemId, event.username, event.color || "#9147ff", corner);

      if (config.displayType === "creature") {
        setLastUpdates((prev) => ({
          ...prev,
          [event.itemId]: { username: event.username, timestamp: Date.now() },
        }));
      }

      if (config.displayType === "falling" && fallingEnabled) {
        setHeartSpawnQueue((prev) => [
          ...prev,
          { id: spawnIdCounter++, color: event.color },
        ]);
      }
    },
    [items, addCombo, fallingEnabled, corner]
  );

  const { simulateCombo, simulateCheer, simulateRawMessage } = useTwitchChat({
    channel: username,
    items,
    enabled: !!username,
    devMode: isDevMode,
    onCombo: handleCombo,
  });

  const handleSimulate = useCallback(
    (itemId: string, fakeUsername: string, color: string | null) => {
      const config = items.find((i) => i.id === itemId);
      if (!config) return;
      handleCombo({
        itemId,
        username: fakeUsername,
        color,
        bits: config.cost,
        timestamp: Date.now(),
      });
    },
    [items, handleCombo]
  );

  const handleSimulateCheer = useCallback(
    (bits: number, fakeUsername: string, color: string | null) => {
      // Use the chat hook's decomposition
      simulateCheer(bits, fakeUsername, color || undefined);
    },
    [simulateCheer]
  );

  if (!isLoaded) return null;

  // Build creature groups for PhysicsCreatures
  const creatureItems = items.filter((i) => i.displayType === "creature");
  const creatureGroups = creatureItems.map((item) => ({
    imageUrl: get7TVUrl(item.emoteId),
    creatures: getItemData(item.id).creatures,
    lastUpdate: lastUpdates[item.id] || null,
    sizeScale: item.sizeScale,
  }));

  // Find the first falling item for FallingHearts
  const fallingItem = items.find((i) => i.displayType === "falling");
  const fallingImageUrl = fallingItem ? get7TVUrl(fallingItem.emoteId) : null;
  const fallingTotal = fallingItem ? getItemData(fallingItem.id).total : 0;

  // Build ComboStats items
  const statsItems: ComboItemStats[] = items.map((item) => {
    const data = getItemData(item.id);
    return {
      id: item.id,
      name: item.name,
      imageUrl: get7TVUrl(item.emoteId),
      displayType: item.displayType,
      total: item.displayType === "falling" ? data.redemptions.length : data.total,
      users: data.users,
    };
  });

  // Build totals map for DevControls
  const itemTotals: Record<string, number> = {};
  for (const item of items) {
    const data = getItemData(item.id);
    itemTotals[item.id] = item.displayType === "falling" ? data.redemptions.length : data.total;
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {(showTotals || showUsers) && (
        <ComboStats
          items={statsItems}
          showTotals={showTotals}
          showUsers={showUsers}
          corner={corner}
        />
      )}

      {!showTotals && !showUsers && fallingItem && fallingImageUrl && (
        <FallingCounter
          count={fallingTotal}
          imageUrl={fallingImageUrl}
          corner={corner}
        />
      )}

      <PhysicsCreatures
        groups={creatureGroups}
        showBounds={isDevMode}
        timeOffset={timeOffset}
      />

      {fallingImageUrl && fallingEnabled && (
        <FallingHearts
          imageUrl={fallingImageUrl}
          spawnQueue={heartSpawnQueue}
          sizeMultiplier={sizeMultiplier}
        />
      )}

      {isDevMode && (
        <DevControls
          items={items}
          itemTotals={itemTotals}
          onSimulate={handleSimulate}
          onSimulateCheer={handleSimulateCheer}
          onSimulateRaw={simulateRawMessage}
          onClear={clearAllData}
          timeOffset={timeOffset}
          onTimeOffsetChange={setTimeOffset}
        />
      )}
    </div>
  );
}
