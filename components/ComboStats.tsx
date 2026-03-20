"use client";

import { get7TVUrl } from "@/types/combo";

type CornerPosition = "bl" | "tl" | "br" | "tr";

const CORNER_CLASSES: Record<CornerPosition, string> = {
  bl: "bottom-8 left-8",
  tl: "top-8 left-8",
  br: "bottom-8 right-8",
  tr: "top-8 right-8",
};

export interface ComboItemStats {
  id: string;
  name: string;
  imageUrl: string;
  displayType: "creature" | "falling";
  total: number;
  users: Record<string, number>;
}

interface ComboStatsProps {
  items: ComboItemStats[];
  showTotals: boolean;
  showUsers: boolean;
  corner?: CornerPosition;
}

export function ComboStats({
  items,
  showTotals,
  showUsers,
  corner = "bl",
}: ComboStatsProps) {
  if (!showTotals && !showUsers) return null;

  const itemsWithTotals = items.filter((i) => i.total > 0);
  const itemsWithUsers = items.filter(
    (i) => Object.keys(i.users).length > 0
  );

  const hasAnyTotal = itemsWithTotals.length > 0;
  const hasAnyUsers = itemsWithUsers.length > 0;

  if (showTotals && !showUsers && !hasAnyTotal) return null;
  if (showUsers && !showTotals && !hasAnyUsers) return null;
  if (showTotals && showUsers && !hasAnyTotal && !hasAnyUsers) return null;

  const renderLeaderboard = (item: ComboItemStats) => {
    const usersList = Object.entries(item.users)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    if (usersList.length === 0) return null;

    const clipId = `heart-clip-lb-${item.id}`;
    const isFalling = item.displayType === "falling";

    return (
      <div key={item.id}>
        <div className="mb-2 flex items-center gap-2">
          {isFalling ? (
            <div className="relative h-5 w-5">
              <svg className="absolute h-0 w-0">
                <defs>
                  <clipPath id={clipId} clipPathUnits="objectBoundingBox">
                    <path d="M0.5,0.15 C0.35,-0.05 0.05,0.05 0.05,0.35 C0.05,0.55 0.25,0.75 0.5,1 C0.75,0.75 0.95,0.55 0.95,0.35 C0.95,0.05 0.65,-0.05 0.5,0.15 Z" />
                  </clipPath>
                </defs>
              </svg>
              <div className="h-full w-full" style={{ clipPath: `url(#${clipId})` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.imageUrl} alt="" className="h-full w-full object-cover" crossOrigin="anonymous" />
              </div>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt="" className="h-5 w-5 object-contain" crossOrigin="anonymous" />
          )}
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            Leaderboard
          </span>
        </div>
        <div className="flex flex-col gap-1">
          {usersList.map(([username, count], index) => (
            <div key={username} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-zinc-300">
                <span className="text-zinc-500">{index + 1}.</span> {username}
              </span>
              <span className="font-medium tabular-nums text-white">{count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`fixed ${CORNER_CLASSES[corner]} z-50 flex flex-col gap-3`}>
      {/* Totals */}
      {showTotals && hasAnyTotal && (
        <div className="flex flex-col gap-2 rounded-2xl bg-black/60 px-5 py-4 backdrop-blur-sm">
          {itemsWithTotals.map((item) => {
            const clipId = `heart-clip-total-${item.id}`;
            const isFalling = item.displayType === "falling";

            return (
              <div key={item.id} className="flex items-center gap-3">
                {isFalling ? (
                  <div className="relative h-10 w-10">
                    <svg className="absolute h-0 w-0">
                      <defs>
                        <clipPath id={clipId} clipPathUnits="objectBoundingBox">
                          <path d="M0.5,0.15 C0.35,-0.05 0.05,0.05 0.05,0.35 C0.05,0.55 0.25,0.75 0.5,1 C0.75,0.75 0.95,0.55 0.95,0.35 C0.95,0.05 0.65,-0.05 0.5,0.15 Z" />
                        </clipPath>
                      </defs>
                    </svg>
                    <div className="h-full w-full" style={{ clipPath: `url(#${clipId})` }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.imageUrl} alt="" className="h-full w-full object-cover" crossOrigin="anonymous" />
                    </div>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className="h-10 w-10 object-contain" crossOrigin="anonymous" />
                )}
                <span className="text-2xl font-bold tabular-nums text-white">
                  {item.total.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* User leaderboards */}
      {showUsers && hasAnyUsers && (
        <div className="flex flex-col gap-3 rounded-2xl bg-black/60 px-5 py-4 backdrop-blur-sm">
          {itemsWithUsers.map((item, idx) => (
            <div key={item.id}>
              {idx > 0 && <div className="mb-3 h-px bg-zinc-700" />}
              {renderLeaderboard(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
