import { promises as fs } from "fs";
import path from "path";
import type { StorageProvider } from "./types";

function storageRoot(): string {
  return path.join(process.cwd(), "storage", "uploads");
}

/** Default storage adapter (spec section 41): local disk under
 * /storage/uploads. Zero-config, fully offline -- what the demo runs on
 * whenever STORAGE_PROVIDER isn't "s3" (or S3 isn't fully configured). */
export const localProvider: StorageProvider = {
  name: "local",

  async save(buffer, key) {
    const root = storageRoot();
    await fs.mkdir(root, { recursive: true });
    await fs.writeFile(path.join(root, key), buffer);
  },

  async read(key) {
    return fs.readFile(path.join(storageRoot(), key));
  },
};
