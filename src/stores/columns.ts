import { createSignal } from "solid-js";

export type ColumnType = "home" | "public" | "notifications" | "mentions";

export interface ColumnConfig {
  id: string;
  type: ColumnType;
  width?: number;
}

const STORAGE_KEY = "nyandeck_columns";
const DEFAULT_WIDTH = 350;
const MIN_WIDTH = 280;
const MAX_WIDTH = 600;

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
    { id: generateId(), type: "mentions" },
    { id: generateId(), type: "public" },
  ];
}

function saveColumns(cols: ColumnConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cols));
}

const [columns, setColumns] = createSignal<ColumnConfig[]>(loadColumns());

export { columns, DEFAULT_WIDTH, MIN_WIDTH, MAX_WIDTH };

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

export function reorderColumns(fromIdx: number, toIdx: number) {
  setColumns((prev) => {
    if (fromIdx === toIdx) return prev;
    if (fromIdx < 0 || fromIdx >= prev.length) return prev;
    if (toIdx < 0 || toIdx >= prev.length) return prev;
    const next = [...prev];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    saveColumns(next);
    return next;
  });
}

export function setColumnWidth(id: string, width: number) {
  const clamped = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width));
  setColumns((prev) => {
    const next = prev.map((c) => (c.id === id ? { ...c, width: clamped } : c));
    saveColumns(next);
    return next;
  });
}
