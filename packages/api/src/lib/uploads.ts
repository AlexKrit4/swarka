import path from "node:path";
import fs from "node:fs";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import { randomUUID } from "node:crypto";

const UPLOADS_DIR = path.resolve(
  process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads")
);

export function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

export function getUploadsDir() {
  return UPLOADS_DIR;
}

export async function saveUpload(
  fileStream: NodeJS.ReadableStream,
  filename: string
): Promise<string> {
  ensureUploadsDir();
  const ext = path.extname(filename).toLowerCase() || ".jpg";
  const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
  if (!allowed.includes(ext)) {
    throw new Error("Invalid file type");
  }
  const newName = `${randomUUID()}${ext}`;
  const filepath = path.join(UPLOADS_DIR, newName);
  await pipeline(fileStream, createWriteStream(filepath));
  return `/uploads/${newName}`;
}

export function deleteUpload(urlPath: string) {
  if (!urlPath.startsWith("/uploads/")) return;
  const filepath = path.join(UPLOADS_DIR, path.basename(urlPath));
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
}
