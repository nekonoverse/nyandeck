import { createSignal } from "solid-js";

export type ColumnType = "home" | "public" | "notifications";

export interface ColumnConfig {
  id: string;
  type: ColumnType;
}

const STORAGE_KEY = "nyandeck_columns";

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function loadColumns(): ColumnConfig[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore
  }
  return [
    { id: generateId(), type: "home" },
    { id: generateId(), type: "notifications" },
    { id: generateId(), type: "public" },
  ];
}

function saveColumns(cols: ColumnConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cols));
}

const [columns, setColumns] = createSignal<ColumnConfig[]>(loadColumns());

export { columns };

export function addColumn(type: ColumnType) {
  setColumns((prev) => {
    const next = [...prev, { id: generateId(), type }];
    saveColumns(next);
    return next;
  });
}

export function removeColumn(id: string) {
  setColumns((prev) => {
    const next = prev.filter((c) => c.id !== id);
    saveColumns(next);
    return next;
  });
}

export function moveColumn(id: string, direction: -1 | 1) {
  setColumns((prev) => {
    const idx = prev.findIndex((c) => c.id === id);
    if (idx < 0) return prev;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= prev.length) return prev;
    const next = [...prev];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    saveColumns(next);
    return next;
  });
}
