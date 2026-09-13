import path from "path";
import crypto from "crypto";
import { localProvider } from "./providers/local";
import { s3Provider } from "./providers/s3";
import type { StorageProvider } from "./providers/types";

/**
 * Storage abstraction (spec sections 41, 49, 54). STORAGE_PROVIDER=local
 * (the default) stores uploads on local disk -- zero-config, fully
 * offline, what the demo runs on. Setting STORAGE_PROVIDER=s3 with
 * STORAGE_BUCKET/STORAGE_ACCESS_KEY/STORAGE_SECRET_KEY switches to the
 * real S3-compatible adapter (providers/s3.ts) with no other code change;
 * if any of those three are missing, this degrades gracefully back to
 * local instead of hard-failing every upload.
 *
 * Security: the original filename is NEVER used as the storage key. Every
 * file is validated for MIME type, extension and size before being
 * accepted, regardless of which provider is active.
 */

export const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
export const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

export class InvalidUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidUploadError";
  }
}

function safeExtension(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new InvalidUploadError(`File type ${ext || "(none)"} is not allowed.`);
  }
  return ext;
}

export function validateUpload(originalName: string, mimeType: string, size: number) {
  if (size <= 0 || size > MAX_UPLOAD_BYTES) {
    throw new InvalidUploadError("File exceeds the maximum allowed size of 10 MB.");
  }
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new InvalidUploadError(`MIME type ${mimeType} is not allowed.`);
  }
  safeExtension(originalName);
}

function getStorageProvider(): StorageProvider {
  const requested = process.env.STORAGE_PROVIDER ?? "local";
  if (requested !== "s3") return localProvider;

  const hasS3Config = Boolean(process.env.STORAGE_BUCKET && process.env.STORAGE_ACCESS_KEY && process.env.STORAGE_SECRET_KEY);
  if (!hasS3Config) {
    // eslint-disable-next-line no-console
    console.warn("[storage] STORAGE_PROVIDER=s3 but bucket/credentials are incomplete -- falling back to local disk.");
    return localProvider;
  }
  return s3Provider;
}

/** Validates a storage key contains no path segments, defending against
 * traversal even though every key we generate is already a flat UUID --
 * cheap insurance for both the local and S3 adapters. */
function assertSafeKey(key: string) {
  if (path.basename(key) !== key) throw new InvalidUploadError("Invalid storage key.");
}

export const storageService = {
  /** Persists a validated upload and returns an internal, non-guessable
   * storage key. The original filename is preserved only as metadata, never
   * as part of the storage path/object key. */
  async save(buffer: Buffer, originalName: string, mimeType: string): Promise<string> {
    validateUpload(originalName, mimeType, buffer.byteLength);
    const ext = safeExtension(originalName);
    const key = `${crypto.randomUUID()}${ext}`;
    await getStorageProvider().save(buffer, key, mimeType);
    return key;
  },

  async read(storageKey: string): Promise<Buffer> {
    assertSafeKey(storageKey);
    return getStorageProvider().read(storageKey);
  },
};
