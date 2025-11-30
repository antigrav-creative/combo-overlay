"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const DEFAULT_HORSELUL_EMOTE_ID = "01FDTEQJJR000CM9KGHJPMM7N6";
const DEFAULT_HEART_EMOTE_ID = "01HNK8DGF0000FG935RNS75APG";

function get7TVUrl(emoteId: string): string {
  return `https://cdn.7tv.app/emote/${emoteId}/4x.avif`;
}

export default function SetupPage() {
  const router = useRouter();
  
  const [channel, setChannel] = useState("");
  const [horselulEmoteId, setHorselulEmoteId] = useState(DEFAULT_HORSELUL_EMOTE_ID);
  const [heartEmoteId, setHeartEmoteId] = useState(DEFAULT_HEART_EMOTE_ID);
  const [devMode, setDevMode] = useState(false);
  const [showTotals, setShowTotals] = useState(true);
  const [showUsers, setShowUsers] = useState(false);
  const [horselulError, setHorselulError] = useState(false);
  const [heartError, setHeartError] = useState(false);

  // Default dev mode based on environment
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      setDevMode(true);
    }
  }, []);

  const horselulUrl = get7TVUrl(horselulEmoteId || DEFAULT_HORSELUL_EMOTE_ID);
  const heartUrl = get7TVUrl(heartEmoteId || DEFAULT_HEART_EMOTE_ID);
  
  const generatedUrl = channel
    ? `/${channel}?emoteId=${horselulEmoteId || DEFAULT_HORSELUL_EMOTE_ID}&heartEmoteId=${heartEmoteId || DEFAULT_HEART_EMOTE_ID}${showTotals ? "&showTotals=true" : ""}${showUsers ? "&showUsers=true" : ""}${devMode ? "&dev=true" : ""}`
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (generatedUrl) {
      router.push(generatedUrl);
    }
  };

  const handleCopyUrl = () => {
    if (generatedUrl) {
      const fullUrl = window.location.origin + generatedUrl;
      navigator.clipboard.writeText(fullUrl);
    }
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-zinc-950 p-8">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-white">
            Combo Overlay
          </h1>
          <p className="text-zinc-400">
            Configure your Twitch overlay for tracking combos
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Channel Name */}
          <div>
            <label
              htmlFor="channel"
              className="mb-2 block text-sm font-medium text-zinc-300"
            >
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

          {/* Emote Settings - Two Columns */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Horselul Emote */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4">
              <label
                htmlFor="horselulEmoteId"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Horselul Emote ID
              </label>
              <input
                id="horselulEmoteId"
                type="text"
                value={horselulEmoteId}
                onChange={(e) => {
                  setHorselulEmoteId(e.target.value.trim());
                  setHorselulError(false);
                }}
                placeholder={DEFAULT_HORSELUL_EMOTE_ID}
                className="mb-3 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 font-mono text-xs text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500"
              />
              <div className="flex items-center justify-center rounded-lg bg-zinc-900 p-4">
                {!horselulError ? (
                  <Image
                    src={horselulUrl}
                    alt="Horselul emote preview"
                    width={64}
                    height={64}
                    className="object-contain"
                    onError={() => setHorselulError(true)}
                    unoptimized
                  />
                ) : (
                  <div className="text-center text-xs text-red-400">
                    Failed to load
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs text-zinc-500">Falling objects</p>
            </div>

            {/* Heart Emote */}
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4">
              <label
                htmlFor="heartEmoteId"
                className="mb-2 block text-sm font-medium text-zinc-300"
              >
                Heart Emote ID
              </label>
              <input
                id="heartEmoteId"
                type="text"
                value={heartEmoteId}
                onChange={(e) => {
                  setHeartEmoteId(e.target.value.trim());
                  setHeartError(false);
                }}
                placeholder={DEFAULT_HEART_EMOTE_ID}
                className="mb-3 w-full rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 font-mono text-xs text-white placeholder-zinc-500 outline-none transition-colors focus:border-purple-500"
              />
              <div className="flex items-center justify-center rounded-lg bg-zinc-900 p-4">
                {!heartError ? (
                  <div className="relative h-16 w-16">
                    <svg className="absolute h-0 w-0">
                      <defs>
                        <clipPath id="heart-clip-preview" clipPathUnits="objectBoundingBox">
                          <path d="M0.5,0.15 C0.35,-0.05 0.05,0.05 0.05,0.35 C0.05,0.55 0.25,0.75 0.5,1 C0.75,0.75 0.95,0.55 0.95,0.35 C0.95,0.05 0.65,-0.05 0.5,0.15 Z" />
                        </clipPath>
                      </defs>
                    </svg>
                    <div
                      className="h-full w-full"
                      style={{ clipPath: "url(#heart-clip-preview)" }}
                    >
                      <Image
                        src={heartUrl}
                        alt="Heart emote preview"
                        width={64}
                        height={64}
                        className="h-full w-full object-cover"
                        onError={() => setHeartError(true)}
                        unoptimized
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-xs text-red-400">
                    Failed to load
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs text-zinc-500">Counter icon (clipped)</p>
            </div>
          </div>

          <p className="text-xs text-zinc-500">
            Copy the ID from a 7TV emote URL like{" "}
            <code className="text-zinc-400">7tv.app/emotes/[ID]</code>
          </p>

          {/* Display Options */}
          <div className="space-y-3 rounded-xl border border-zinc-700 bg-zinc-800/50 p-4">
            <p className="text-sm font-medium text-zinc-400">Display Options</p>
            
            {/* Show Totals Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Show Totals</p>
                <p className="text-sm text-zinc-400">
                  Display combo counts with emotes
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTotals(!showTotals)}
                className={`relative h-7 w-12 rounded-full transition-colors ${
                  showTotals ? "bg-purple-600" : "bg-zinc-600"
                }`}
              >
                <span
                  className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                    showTotals ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Show Users Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">Show Leaderboard</p>
                <p className="text-sm text-zinc-400">
                  Display who donated how many
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowUsers(!showUsers)}
                className={`relative h-7 w-12 rounded-full transition-colors ${
                  showUsers ? "bg-purple-600" : "bg-zinc-600"
                }`}
              >
                <span
                  className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition-transform ${
                    showUsers ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Generated URL */}
          {generatedUrl && (
            <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-4">
              <p className="mb-2 text-sm font-medium text-zinc-400">
                Overlay URL
              </p>
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

          {/* Submit */}
          <button
            type="submit"
            disabled={!channel}
            className="w-full rounded-xl bg-purple-600 py-4 text-lg font-semibold text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Open Overlay
          </button>
        </form>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-zinc-500">
          Add this URL as a Browser Source in OBS
        </p>
      </div>
    </div>
  );
}
