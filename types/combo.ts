export interface ComboItemConfig {
  id: string;
  name: string;
  emoteId: string;
  cost: number;
  displayType: "creature" | "falling";
  sizeScale: number;
}

export interface ComboEvent {
  itemId: string;
  username: string;
  color: string | null;
  bits: number;
  timestamp: number;
}

export const DEFAULT_ITEMS: ComboItemConfig[] = [
  {
    id: "awww",
    name: "Awww",
    emoteId: "01JZ1V2MEAAA7V2JN3AWRS5RSE",
    cost: 1000,
    displayType: "creature",
    sizeScale: 1,
  },
  {
    id: "dino",
    name: "DinoDance",
    emoteId: "01FN4MWV0000071FCSB63SBDBN",
    cost: 100,
    displayType: "creature",
    sizeScale: 1,
  },
  {
    id: "horselul",
    name: "Horselul",
    emoteId: "01FDTEQJJR000CM9KGHJPMM7N6",
    cost: 50,
    displayType: "creature",
    sizeScale: 1,
  },
  {
    id: "heart",
    name: "Heart",
    emoteId: "01HNK8DGF0000FG935RNS75APG",
    cost: 5,
    displayType: "falling",
    sizeScale: 1,
  },
];

export function get7TVUrl(emoteId: string): string {
  return `https://cdn.7tv.app/emote/${emoteId}/4x.avif`;
}

export function serializeItems(items: ComboItemConfig[]): string {
  return btoa(JSON.stringify(items));
}

export function deserializeItems(
  param: string | null,
): ComboItemConfig[] | null {
  if (!param) return null;
  try {
    return JSON.parse(atob(param));
  } catch {
    return null;
  }
}

/**
 * Decompose a bit amount into combo items using greedy algorithm (most expensive first).
 * Returns array of { itemId, count } for items that fit.
 */
export function decomposeCheer(
  totalBits: number,
  items: ComboItemConfig[],
): { itemId: string; count: number }[] {
  const sorted = [...items].sort((a, b) => b.cost - a.cost);
  const result: { itemId: string; count: number }[] = [];
  let remaining = totalBits;

  for (const item of sorted) {
    if (remaining >= item.cost) {
      const count = Math.floor(remaining / item.cost);
      result.push({ itemId: item.id, count });
      remaining -= count * item.cost;
    }
  }

  return result;
}
