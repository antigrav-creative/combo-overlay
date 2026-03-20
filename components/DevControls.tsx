"use client";

import { useState } from "react";
import type { ComboItemConfig } from "@/types/combo";

interface DevControlsProps {
  items: ComboItemConfig[];
  itemTotals: Record<string, number>;
  onSimulate: (itemId: string, username: string, color: string | null) => void;
  onSimulateCheer?: (bits: number, username: string, color: string | null) => void;
  onSimulateRaw?: (rawMessage: string) => void;
  onClear: () => void;
  timeOffset: number;
  onTimeOffsetChange: (offset: number) => void;
}

const PRESET_COLORS = [
  "#FF0000", "#FF6B00", "#FFD700", "#00FF00",
  "#00BFFF", "#8A2BE2", "#FF1493", "#00CED1",
];

const BUTTON_COLORS = [
  "bg-pink-600 hover:bg-pink-500",
  "bg-purple-600 hover:bg-purple-500",
  "bg-green-600 hover:bg-green-500",
  "bg-cyan-600 hover:bg-cyan-500",
  "bg-amber-600 hover:bg-amber-500",
  "bg-blue-600 hover:bg-blue-500",
  "bg-red-600 hover:bg-red-500",
  "bg-teal-600 hover:bg-teal-500",
];

export function DevControls({
  items,
  itemTotals,
  onSimulate,
  onSimulateCheer,
  onSimulateRaw,
  onClear,
  timeOffset,
  onTimeOffsetChange,
}: DevControlsProps) {
  const [username, setUsername] = useState("testuser");
  const [color, setColor] = useState("#FF6B00");
  const [useColor, setUseColor] = useState(true);
  const [cheerBits, setCheerBits] = useState("170");
  const [isMinimized, setIsMinimized] = useState(false);

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed right-4 top-4 z-[100] rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-black shadow-lg transition-colors hover:bg-amber-400"
      >
        DEV
      </button>
    );
  }

  return (
    <div className="fixed right-4 top-4 z-[100] w-72 rounded-xl bg-zinc-900/90 p-4 text-white shadow-2xl backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold text-amber-400">DEV Controls</h3>
        <button
          onClick={() => setIsMinimized(true)}
          className="rounded px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          Minimize
        </button>
      </div>

      {/* Username input */}
      <div className="mb-3">
        <label className="mb-1 block text-xs text-zinc-400">Fake Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="testuser"
        />
      </div>

      {/* Color picker */}
      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between">
          <label className="text-xs text-zinc-400">User Color</label>
          <label className="flex items-center gap-1.5 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={useColor}
              onChange={(e) => setUseColor(e.target.checked)}
              className="h-3 w-3 rounded"
            />
            Enable
          </label>
        </div>
        <div className="flex gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            disabled={!useColor}
            className="h-9 w-12 cursor-pointer rounded-lg border-0 bg-zinc-800 p-1 disabled:cursor-not-allowed disabled:opacity-50"
          />
          <div className="flex flex-1 flex-wrap gap-1">
            {PRESET_COLORS.map((presetColor) => (
              <button
                key={presetColor}
                onClick={() => setColor(presetColor)}
                disabled={!useColor}
                className="h-4 w-4 rounded-sm border border-zinc-600 transition-transform hover:scale-110 disabled:opacity-50"
                style={{ backgroundColor: presetColor }}
                title={presetColor}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Simulate individual item buttons */}
      <div className="mb-4 flex flex-wrap gap-2">
        {items.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => onSimulate(item.id, username, useColor ? color : null)}
            className={`flex-1 min-w-[calc(50%-4px)] rounded-lg px-3 py-2 text-sm font-medium transition-colors ${BUTTON_COLORS[idx % BUTTON_COLORS.length]}`}
          >
            {item.name} ({item.cost}b)
          </button>
        ))}
      </div>

      {/* Simulate cheer */}
      {onSimulateCheer && (
        <div className="mb-4">
          <label className="mb-1 block text-xs text-zinc-400">Simulate Cheer (bits)</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={cheerBits}
              onChange={(e) => setCheerBits(e.target.value)}
              className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="170"
              min="1"
            />
            <button
              onClick={() => {
                const bits = parseInt(cheerBits, 10);
                if (bits > 0) onSimulateCheer(bits, username, useColor ? color : null);
              }}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-amber-500"
            >
              Cheer
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mb-4 rounded-lg bg-zinc-800 p-3">
        <h4 className="mb-2 text-xs font-medium text-zinc-400">Current Stats</h4>
        <div className="flex flex-col gap-1 text-sm">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span>{item.name}:</span>
              <span className="tabular-nums">{itemTotals[item.id] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Test Raw IRC buttons */}
      {onSimulateRaw && items.slice(0, 3).map((item) => (
        <button
          key={item.id}
          onClick={() => onSimulateRaw(
            `@badge-info=founder/15;badges=founder/0;color=${useColor ? color : "#00FF7F"};display-name=${username};msg-id=onetapgiftredeemed;msg-param-bits-spent=${item.cost};msg-param-gift-id=${item.id};msg-param-user-display-name=${username} :tmi.twitch.tv USERNOTICE #test`
          )}
          className="mb-2 w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-amber-500"
        >
          Test Raw IRC ({item.name})
        </button>
      ))}

      {/* Time acceleration */}
      <div className="mb-4 rounded-lg bg-zinc-800 p-3">
        <h4 className="mb-2 text-xs font-medium text-zinc-400">
          Time Warp (+{(timeOffset / (60 * 60 * 1000)).toFixed(1)}h)
        </h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onTimeOffsetChange(timeOffset + 30 * 60 * 1000)}
            className="flex-1 rounded-lg bg-zinc-700 px-2 py-1.5 text-xs font-medium transition-colors hover:bg-zinc-600"
          >
            +30m
          </button>
          <button
            onClick={() => onTimeOffsetChange(timeOffset + 60 * 60 * 1000)}
            className="flex-1 rounded-lg bg-zinc-700 px-2 py-1.5 text-xs font-medium transition-colors hover:bg-zinc-600"
          >
            +1h
          </button>
          <button
            onClick={() => onTimeOffsetChange(timeOffset + 3 * 60 * 60 * 1000)}
            className="flex-1 rounded-lg bg-zinc-700 px-2 py-1.5 text-xs font-medium transition-colors hover:bg-zinc-600"
          >
            +3h
          </button>
          <button
            onClick={() => onTimeOffsetChange(timeOffset + 6 * 60 * 60 * 1000)}
            className="flex-1 rounded-lg bg-zinc-700 px-2 py-1.5 text-xs font-medium transition-colors hover:bg-zinc-600"
          >
            +6h
          </button>
        </div>
        {timeOffset > 0 && (
          <button
            onClick={() => onTimeOffsetChange(0)}
            className="mt-2 w-full rounded-lg bg-zinc-700 px-2 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-zinc-600"
          >
            Reset Time
          </button>
        )}
      </div>

      {/* Clear button */}
      <button
        onClick={onClear}
        className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-red-500"
      >
        Clear All Data
      </button>
    </div>
  );
}
