export type MediaFolderState = {
  folders: string[];
  assignments: Record<string, string>;
};

const EMPTY_STATE: MediaFolderState = {
  folders: [],
  assignments: {},
};

function getStorageKey(kind: "profile" | "showcase", userId: number) {
  return `media-folders:${kind}:${userId}`;
}

export function readMediaFolderState(kind: "profile" | "showcase", userId: number): MediaFolderState {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const raw = window.localStorage.getItem(getStorageKey(kind, userId));
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw) as Partial<MediaFolderState>;
    return {
      folders: Array.isArray(parsed.folders) ? parsed.folders.map(String).filter(Boolean) : [],
      assignments: parsed.assignments && typeof parsed.assignments === "object"
        ? Object.fromEntries(Object.entries(parsed.assignments).map(([key, value]) => [String(key), String(value)]))
        : {},
    };
  } catch {
    return EMPTY_STATE;
  }
}

export function writeMediaFolderState(kind: "profile" | "showcase", userId: number, state: MediaFolderState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getStorageKey(kind, userId), JSON.stringify(state));
}

export function groupItemsByFolder<T>(items: T[], getKey: (item: T) => string, assignments: Record<string, string>) {
  const grouped = new Map<string, T[]>();

  items.forEach((item) => {
    const folder = assignments[getKey(item)] || "Unsorted";
    if (!grouped.has(folder)) {
      grouped.set(folder, []);
    }
    grouped.get(folder)!.push(item);
  });

  return Array.from(grouped.entries()).map(([folder, groupItems]) => ({
    folder,
    items: groupItems,
  }));
}
