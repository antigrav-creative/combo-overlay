"use client";

import { useState } from "react";
import type { ComboType } from "@/hooks/useTwitchChat";

interface DevControlsProps {
  onSimulate: (type: ComboType, username: string, color: string | null) => void;
  onClear: () => void;
  heartsTotal: number;
  horselulTotal: number;
}

// Some fun preset colors
const PRESET_COLORS = [
  "#FF0000", // Red
  "#FF6B00", // Orange
  "#FFD700", // Gold
  "#00FF00", // Green
  "#00BFFF", // Sky Blue
  "#8A2BE2", // Purple
  "#FF1493", // Pink
  "#00CED1", // Cyan
];

export function DevControls({
  onSimulate,
  onClear,
  heartsTotal,
  horselulTotal,
}: DevControlsProps) {
  const [username, setUsername] = useState("testuser");
  const [color, setColor] = useState("#FF6B00");
  const [useColor, setUseColor] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  const handleSimulate = (type: ComboType) => {
    onSimulate(type, username, useColor ? color : null);
  };

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
        <h3 className="font-bold text-amber-400">🛠️ Dev Controls</h3>
        <button
          onClick={() => setIsMinimized(true)}
          className="rounded px-2 py-1 text-xs text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          Minimize
        </button>
      </div>

      {/* Username input */}
      <div className="mb-3">
        <label className="mb-1 block text-xs text-zinc-400">
          Fake Username
        </label>
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

      {/* Simulate buttons */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => handleSimulate("heart")}
          className="flex-1 rounded-lg bg-pink-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-pink-500"
        >
          ❤️ Heart
        </button>
        <button
          onClick={() => handleSimulate("horselul")}
          className="flex-1 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-purple-500"
        >
          🐴 Horselul
        </button>
      </div>

      {/* Stats */}
      <div className="mb-4 rounded-lg bg-zinc-800 p-3">
        <h4 className="mb-2 text-xs font-medium text-zinc-400">Current Stats</h4>
        <div className="flex justify-between text-sm">
          <span>Hearts: {heartsTotal}</span>
          <span>Horseluls: {horselulTotal}</span>
        </div>
      </div>

      {/* Clear button */}
      <button
        onClick={onClear}
        className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-red-500"
      >
        🗑️ Clear All Data
      </button>
    </div>
  );
}
