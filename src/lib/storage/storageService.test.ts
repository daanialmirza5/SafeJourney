import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { storageService, validateUpload, InvalidUploadError, MAX_UPLOAD_BYTES } from "./storageService";

describe("validateUpload", () => {
  it("accepts an allowed MIME type, extension and size", () => {
    expect(() => validateUpload("referral-note.pdf", "application/pdf", 1024)).not.toThrow();
  });

  it("rejects a disallowed MIME type", () => {
    expect(() => validateUpload("script.exe", "application/x-msdownload", 1024)).toThrow(InvalidUploadError);
  });

  it("rejects a disallowed extension even with an allowed-looking MIME type", () => {
    expect(() => validateUpload("note.txt", "application/pdf", 1024)).toThrow(InvalidUploadError);
  });

  it("rejects a file over the size cap", () => {
    expect(() => validateUpload("big.pdf", "application/pdf", MAX_UPLOAD_BYTES + 1)).toThrow(InvalidUploadError);
  });

  it("rejects a zero-byte file", () => {
    expect(() => validateUpload("empty.pdf", "application/pdf", 0)).toThrow(InvalidUploadError);
  });
});

describe("storageService (spec sections 41, 49, 54: provider abstraction + fallback)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.STORAGE_PROVIDER = "local";
  });
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("round-trips a file through the local adapter", async () => {
    const buffer = Buffer.from("%PDF-1.4 storage service test fixture");
    const key = await storageService.save(buffer, "test-fixture.pdf", "application/pdf");
    const read = await storageService.read(key);
    expect(read.equals(buffer)).toBe(true);
  });

  it("never uses the original filename as the storage key", async () => {
    const buffer = Buffer.from("content");
    const key = await storageService.save(buffer, "very-identifying-patient-name.pdf", "application/pdf");
    expect(key).not.toContain("very-identifying-patient-name");
    expect(key.endsWith(".pdf")).toBe(true);
  });

  it("falls back to the local adapter when STORAGE_PROVIDER=s3 but credentials are incomplete", async () => {
    process.env.STORAGE_PROVIDER = "s3";
    delete process.env.STORAGE_BUCKET;
    delete process.env.STORAGE_ACCESS_KEY;
    delete process.env.STORAGE_SECRET_KEY;

    // If this actually tried to hit S3 it would throw (no real credentials
    // in this test environment); succeeding proves the fallback ran.
    const buffer = Buffer.from("fallback test");
    const key = await storageService.save(buffer, "fallback.pdf", "application/pdf");
    const read = await storageService.read(key);
    expect(read.equals(buffer)).toBe(true);
  });

  it("rejects a storage key containing path traversal segments on read", async () => {
    await expect(storageService.read("../../etc/passwd")).rejects.toThrow(InvalidUploadError);
  });
});
