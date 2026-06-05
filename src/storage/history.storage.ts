import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { HistoryEntry } from "../types/index.ts";

const HISTORY_PATH = "data/history.json";
const POSTS_DIR = "data/generated-posts";

export async function readHistory(path: string = HISTORY_PATH): Promise<HistoryEntry[]> {
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("history.json is not an array");
    return parsed as HistoryEntry[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

export async function writeHistory(
  entries: HistoryEntry[],
  path: string = HISTORY_PATH,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
}

export async function appendHistory(
  entry: HistoryEntry,
  path: string = HISTORY_PATH,
): Promise<void> {
  const current = await readHistory(path);
  current.push(entry);
  await writeHistory(current, path);
}

export async function writePostMarkdown(
  date: string,
  topic: string,
  content: string,
  dir: string = POSTS_DIR,
): Promise<string> {
  await mkdir(dir, { recursive: true });
  const filePath = `${dir}/${date}.md`;
  const body = `# LinkedIn Post\n\nTopic: ${topic}\n\nDate: ${date}\n\n---\n\n${content}\n`;
  await writeFile(filePath, body, "utf8");
  return filePath;
}
