"use client";

type CornerPosition = "bl" | "tl" | "br" | "tr";

const CORNER_CLASSES: Record<CornerPosition, string> = {
  bl: "bottom-8 left-8",
  tl: "top-8 left-8",
  br: "bottom-8 right-8",
  tr: "top-8 right-8",
};

interface ComboStatsProps {
  horselulImageUrl: string;
  heartImageUrl: string;
  dinodanceImageUrl: string;
  showTotals: boolean;
  showUsers: boolean;
  corner?: CornerPosition;
  heartsTotal: number;
  heartsByUser: Record<string, number>;
  horselulTotal: number;
  horselulUsers: Record<string, number>;
  dinodanceTotal: number;
  dinodanceUsers: Record<string, number>;
}

export function ComboStats({
  horselulImageUrl,
  heartImageUrl,
  dinodanceImageUrl,
  showTotals,
  showUsers,
  corner = "bl",
  heartsTotal,
  heartsByUser,
  horselulTotal,
  horselulUsers,
  dinodanceTotal,
  dinodanceUsers,
}: ComboStatsProps) {
  if (!showTotals && !showUsers) return null;

  const horselulUsersList = Object.entries(horselulUsers)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const heartUsersList = Object.entries(heartsByUser)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const dinodanceUsersList = Object.entries(dinodanceUsers)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const hasAnyTotal = horselulTotal > 0 || heartsTotal > 0 || dinodanceTotal > 0;
  const hasAnyUsers = horselulUsersList.length > 0 || heartUsersList.length > 0 || dinodanceUsersList.length > 0;

  // Hide entire component if everything is zero
  if (showTotals && !showUsers && !hasAnyTotal) return null;
  if (showUsers && !showTotals && !hasAnyUsers) return null;
  if (showTotals && showUsers && !hasAnyTotal && !hasAnyUsers) return null;

  // Leaderboard section helper
  const renderLeaderboard = (
    usersList: [string, number][],
    imageUrl: string,
    imgClass: string,
    isHeart?: boolean,
    clipId?: string,
  ) => {
    if (usersList.length === 0) return null;
    return (
      <div>
        <div className="mb-2 flex items-center gap-2">
          {isHeart ? (
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
                <img src={imageUrl} alt="" className="h-full w-full object-cover" crossOrigin="anonymous" />
              </div>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className={imgClass} crossOrigin="anonymous" />
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

  // Collect visible leaderboards for dividers
  const leaderboards = [
    horselulUsersList.length > 0 ? "horselul" : null,
    dinodanceUsersList.length > 0 ? "dinodance" : null,
    heartUsersList.length > 0 ? "heart" : null,
  ].filter(Boolean);

  return (
    <div className={`fixed ${CORNER_CLASSES[corner]} z-50 flex flex-col gap-3`}>
      {/* Totals */}
      {showTotals && hasAnyTotal && (
        <div className="flex flex-col gap-2 rounded-2xl bg-black/60 px-5 py-4 backdrop-blur-sm">
          {/* Horselul total */}
          {horselulTotal > 0 && (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={horselulImageUrl} alt="" className="h-10 w-10 object-contain" crossOrigin="anonymous" />
              <span className="text-2xl font-bold tabular-nums text-white">
                {horselulTotal.toLocaleString()}
              </span>
            </div>
          )}

          {/* DinoDance total */}
          {dinodanceTotal > 0 && (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={dinodanceImageUrl} alt="" className="h-10 w-10 object-contain" crossOrigin="anonymous" />
              <span className="text-2xl font-bold tabular-nums text-white">
                {dinodanceTotal.toLocaleString()}
              </span>
            </div>
          )}

          {/* Hearts total */}
          {heartsTotal > 0 && (
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10">
                <svg className="absolute h-0 w-0">
                  <defs>
                    <clipPath id="heart-clip-stats" clipPathUnits="objectBoundingBox">
                      <path d="M0.5,0.15 C0.35,-0.05 0.05,0.05 0.05,0.35 C0.05,0.55 0.25,0.75 0.5,1 C0.75,0.75 0.95,0.55 0.95,0.35 C0.95,0.05 0.65,-0.05 0.5,0.15 Z" />
                    </clipPath>
                  </defs>
                </svg>
                <div className="h-full w-full" style={{ clipPath: "url(#heart-clip-stats)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={heartImageUrl} alt="" className="h-full w-full object-cover" crossOrigin="anonymous" />
                </div>
              </div>
              <span className="text-2xl font-bold tabular-nums text-white">
                {heartsTotal.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* User breakdowns */}
      {showUsers && hasAnyUsers && (
        <div className="flex flex-col gap-3 rounded-2xl bg-black/60 px-5 py-4 backdrop-blur-sm">
          {renderLeaderboard(horselulUsersList, horselulImageUrl, "h-5 w-5 object-contain")}

          {leaderboards.indexOf("horselul") !== -1 && leaderboards.indexOf("dinodance") !== -1 && (
            <div className="h-px bg-zinc-700" />
          )}

          {renderLeaderboard(dinodanceUsersList, dinodanceImageUrl, "h-5 w-5 object-contain")}

          {(leaderboards.indexOf("dinodance") !== -1 || leaderboards.indexOf("horselul") !== -1) &&
            leaderboards.indexOf("heart") !== -1 && (
            <div className="h-px bg-zinc-700" />
          )}

          {renderLeaderboard(heartUsersList, heartImageUrl, "h-5 w-5 object-cover", true, "heart-clip-stats-small")}
        </div>
      )}
    </div>
  );
}
