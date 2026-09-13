import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import type { StorageProvider } from "./types";

/**
 * S3-compatible object storage adapter (spec sections 41, 54). Activated
 * by STORAGE_PROVIDER=s3 with STORAGE_BUCKET/STORAGE_ACCESS_KEY/
 * STORAGE_SECRET_KEY set (see getStorageProvider() in ../storageService.ts,
 * which falls back to the local adapter if any of those are missing so the
 * app never hard-fails on incomplete storage config).
 *
 * Works against real AWS S3 (leave STORAGE_ENDPOINT unset) or any
 * S3-compatible service -- MinIO, DigitalOcean Spaces, Cloudflare R2, etc.
 * -- by setting STORAGE_ENDPOINT to that service's endpoint URL.
 *
 * Not exercised against a real bucket in this environment (no S3
 * credentials are available here) -- see docs/15_LIMITATIONS.md. The
 * implementation is a straightforward, minimal PutObject/GetObject pairing
 * against the same `save(buffer, key, mimeType)` / `read(key)` contract
 * the local adapter and the rest of the app depend on, so switching
 * providers requires no other code change.
 */

function client(): S3Client {
  return new S3Client({
    region: process.env.STORAGE_REGION || "us-east-1",
    endpoint: process.env.STORAGE_ENDPOINT || undefined,
    forcePathStyle: Boolean(process.env.STORAGE_ENDPOINT), // required by most non-AWS S3-compatible services
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY!,
      secretAccessKey: process.env.STORAGE_SECRET_KEY!,
    },
  });
}

async function streamToBuffer(body: unknown): Promise<Buffer> {
  // The Node.js runtime returns a Node Readable for GetObjectCommand's
  // Body; collect its chunks rather than depend on the newer
  // transformToByteArray() helper, which isn't present in every SDK minor
  // version.
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export const s3Provider: StorageProvider = {
  name: "s3",

  async save(buffer, key, mimeType) {
    await client().send(
      new PutObjectCommand({
        Bucket: process.env.STORAGE_BUCKET!,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      })
    );
  },

  async read(key) {
    const response = await client().send(
      new GetObjectCommand({ Bucket: process.env.STORAGE_BUCKET!, Key: key })
    );
    if (!response.Body) throw new Error(`S3 object ${key} has no body.`);
    return streamToBuffer(response.Body);
  },
};
