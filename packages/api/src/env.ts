import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Local SQLite: make relative file: paths absolute (cwd differs across packages)
if (process.env.DATABASE_URL?.startsWith("file:")) {
  const raw = process.env.DATABASE_URL.replace(/^file:/, "");
  if (!path.isAbsolute(raw)) {
    const dbFile = path.resolve(__dirname, "../../database/prisma", path.basename(raw));
    process.env.DATABASE_URL = `file:${dbFile.replace(/\\/g, "/")}`;
  }
}
