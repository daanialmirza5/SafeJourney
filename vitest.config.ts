import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // `forks` (child processes) instead of the default `threads` pool:
    // importing @aws-sdk/client-s3 (src/lib/storage/providers/s3.ts, only
    // ever loaded for its module-level `save`/`read` object -- the S3
    // client itself is never instantiated unless STORAGE_PROVIDER=s3 with
    // full credentials) reliably crashed the worker thread with an access
    // violation (0xC0000005) during process teardown on this Windows
    // environment, after every test had already passed -- a real
    // regression risk for CI, since a non-zero exit code would fail the
    // pipeline despite correct test results. Separate child processes
    // sidestep whatever native/thread-unsafe state the SDK's dependency
    // tree sets up, at a small startup-time cost.
    pool: "forks",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
