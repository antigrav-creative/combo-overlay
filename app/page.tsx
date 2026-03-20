"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  DEFAULT_ITEMS,
  get7TVUrl,
  serializeItems,
  type ComboItemConfig,
} from "@/types/combo";

export default function SetupPage() {
  const router = useRouter();

  const [channel, setChannel] = useState("");
  const [items, setItems] = useState<ComboItemConfig[]>(DEFAULT_ITEMS);
  const [emoteErrors, setEmoteErrors] = useState<Record<string, boolean>>({});
  const [devMode, setDevMode] = useState(false);
  const [showTotals, setShowTotals] = useState(true);
  const [showUsers, setShowUsers] = useState(false);
  const [size, setSize] = useState(3);
  const [corner, setCorner] = useState<"bl" | "tl" | "br" | "tr">("bl");
  const [fallingHearts, setFallingHearts] = useState(true);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      setDevMode(true);
    }
  }, []);

  const updateItem = (index: number, updates: Partial<ComboItemConfig>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
    if (updates.emoteId !== undefined) {
      setEmoteErrors((prev) => ({ ...prev, [index]: false }));
    }
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: `item${Date.now()}`, name: "", emoteId: "", cost: 10, displayType: "creature", sizeScale: 1 },
    ]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const generatedUrl = channel
    ? `/${channel}?items=${serializeItems(items)}${showTotals ? "&showTotals=true" : ""}${showUsers ? "&showUsers=true" : ""}${size !== 3 ? `&size=${size}` : ""}${corner !== "bl" ? `&corner=${corner}` : ""}${!fallingHearts ? "&fallingHearts=false" : ""}${devMode ? "&dev=true" : ""}`
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (generatedUrl) router.push(generatedUrl);
  };

  const handleCopyUrl = () => {
    if (generatedUrl) {
      navigator.clipboard.writeText(window.location.origin + generatedUrl);
    }
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-zinc-950 p-8">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-white">Combo Overlay</h1>
          <p className="text-zinc-400">Configure your Twitch overlay for tracking combos</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Channel Name */}
          <div>
            <label htmlFor="channel" className="mb-2 block text-sm font-medium text-zinc-300">
              Twitch Channel Name
            </label>
            <input
              id="channel"
              type="text"
              value={channel}
              onChange={(e) => setChannel(e.target.value.toLowerCase().trim())}
              placeholder="e.g. 9bub"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
              required
            />
          </div>

          {/* Combo Items */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-300">Combo Items</p>
              <button
                type="button"
                onClick={addItem}
                className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-500"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs text-zinc-400">Name</label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItem(index, { name: e.target.value })}
                          placeholder="e.g. Horselul"
                          className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-zinc-400">ID (for IRC matching)</label>
                        <input
                          type="text"
                          value={item.id}
                          onChange={(e) => updateItem(index, { id: e.target.value.toLowerCase().replace(/\s/g, "") })}
                          placeholder="e.g. horselul"
                          className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 font-mono text-xs text-white placeholder-zinc-500 outline-none focus:border-purple-500"
                        />
                      </div>
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="ml-3 rounded-lg px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-900/30 hover:text-red-300"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="mb-3 grid grid-cols-3 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-zinc-400">Cost (bits)</label>
                      <input
                        type="number"
                        value={item.cost}
                        onChange={(e) => updateItem(index, { cost: parseInt(e.target.value, 10) || 0 })}
                        min="1"
                        className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-zinc-400">Display Type</label>
                      <select
                        value={item.displayType}
                        onChange={(e) => updateItem(index, { displayType: e.target.value as "creature" | "falling" })}
                        className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                      >
                        <option value="creature">Creature (physics)</option>
                        <option value="falling">Falling</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-zinc-400">Size Scale</label>
                      <input
                        type="number"
                        value={item.sizeScale}
                        onChange={(e) => updateItem(index, { sizeScale: parseFloat(e.target.value) || 1 })}
                        min="0.5"
                        max="4"
                        step="0.5"
                        className="w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-zinc-400">7TV Emote ID</label>
                    <input
                      type="text"
                      value={item.emoteId}
                      onChange={(e) => updateItem(index, { emoteId: e.target.value.trim() })}
                      placeholder="e.g. 01FDTEQJJR000CM9KGHJPMM7N6"
                      className="mb-3 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 font-mono text-xs text-white placeholder-zinc-500 outline-none focus:border-purple-500"
                    />
                    <div className="flex items-center justify-center rounded-lg bg-zinc-900 p-4">
                      {item.emoteId && !emoteErrors[index] ? (
                        <Image
                          src={get7TVUrl(item.emoteId)}
                          alt={`${item.name} emote preview`}
                          width={64}
                          height={64}
                          className="object-contain"
                          onError={() => setEmoteErrors((prev) => ({ ...prev, [index]: true }))}
                          unoptimized
                        />
                      ) : (
                        <div className="text-center text-xs text-zinc-500">
                          {item.emoteId ? "Failed to load" : "Enter emote ID"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-2 text-xs text-zinc-500">
              Copy the ID from a 7TV emote URL like{" "}
              <code className="text-zinc-400">7tv.app/emotes/[ID]</code>. Items are matched by cost (most expensive first) when decomposing cheers.
            </p>
          </div>

          {/* Mode Options */}
          <div className="space-y-3 rounded-xl border border-zinc-700 bg-zinc-800/50 p-4">
            <p className="text-sm font-medium text-zinc-400">Combo Modes</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Falling Hearts</p>
                <p className="text-sm text-zinc-400">Hearts fall from top and disappear</p>
              </div>
              <button
                type="button"
                onClick={() => setFallingHearts(!fallingHearts)}
                className={`relative h-7 w-12 rounded-full transition-colors ${fallingHearts ? "bg-purple-600" : "bg-zinc-600"}`}
              >
                <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${fallingHearts ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          </div>

          {/* Display Options */}
          <div className="space-y-3 rounded-xl border border-zinc-700 bg-zinc-800/50 p-4">
            <p className="text-sm font-medium text-zinc-400">Display Options</p>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Show Totals</p>
                <p className="text-sm text-zinc-400">Display combo counts with emotes</p>
              </div>
              <button
                type="button"
                onClick={() => setShowTotals(!showTotals)}
                className={`relative h-7 w-12 rounded-full transition-colors ${showTotals ? "bg-purple-600" : "bg-zinc-600"}`}
              >
                <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${showTotals ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Show Leaderboard</p>
                <p className="text-sm text-zinc-400">Display who donated how many</p>
              </div>
              <button
                type="button"
                onClick={() => setShowUsers(!showUsers)}
                className={`relative h-7 w-12 rounded-full transition-colors ${showUsers ? "bg-purple-600" : "bg-zinc-600"}`}
              >
                <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${showUsers ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Score Position</p>
                <p className="text-sm text-zinc-400">Corner for stats display</p>
              </div>
              <select
                value={corner}
                onChange={(e) => setCorner(e.target.value as "bl" | "tl" | "br" | "tr")}
                className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-purple-500"
              >
                <option value="bl">Bottom Left</option>
                <option value="tl">Top Left</option>
                <option value="br">Bottom Right</option>
                <option value="tr">Top Right</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Emote Size</p>
                <p className="text-sm text-zinc-400">Overall size of falling emotes</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={size}
                  onChange={(e) => setSize(parseInt(e.target.value, 10))}
                  className="h-2 w-24 cursor-pointer appearance-none rounded-lg bg-zinc-600 accent-purple-500"
                />
                <span className="w-8 text-center text-sm font-medium text-white">{size}</span>
              </div>
            </div>
          </div>

          {/* Generated URL */}
          {generatedUrl && (
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4">
              <p className="mb-2 text-sm font-medium text-zinc-400">Overlay URL</p>
              <div className="flex gap-2">
                <code className="flex-1 overflow-x-auto rounded-lg bg-zinc-900 px-3 py-2 text-sm text-green-400">
                  {generatedUrl}
                </code>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="rounded-lg bg-zinc-700 px-3 py-2 text-sm text-white transition-colors hover:bg-zinc-600"
                >
                  Copy
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={!channel}
            className="w-full rounded-xl bg-purple-600 py-4 text-lg font-semibold text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Open Overlay
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-zinc-500">
          Add this URL as a Browser Source in OBS
        </p>
      </div>
    </div>
  );
}
