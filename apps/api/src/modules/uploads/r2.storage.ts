import crypto from "crypto";
import { logger } from "../../config/logger.js";

/**
 * Cloudflare R2 storage driver (S3-compatible, SigV4 signed with node crypto
 * — no AWS SDK dependency).
 *
 * SINGLE-BUCKET LAYOUT: one R2 bucket holds all Waw media under stable
 * folder prefixes. A custom domain (e.g. https://cdn.waw.com.pk) is bound
 * directly to the bucket — public URLs are simply
 *   {R2_PUBLIC_BASE_URL}/{prefix}/{userId}/{timestamp}-{random}.{ext}
 * so no Worker, no routing, no per-bucket domains (Cloudflare allows one
 * custom domain per bucket, which is exactly why the layout is flat).
 *
 * Env config:
 *   R2_ACCOUNT_ID            Cloudflare account id
 *   R2_ACCESS_KEY_ID          R2 API token access key
 *   R2_SECRET_ACCESS_KEY      R2 API token secret
 *   R2_PUBLIC_BASE_URL        Custom domain bound to the bucket (no trailing slash)
 *   R2_BUCKET                 Bucket name (default: waw-media)
 *
 * Public serving is done through the bucket's Cloudflare custom domain —
 * R2's native *.r2.dev URLs are rate-limited and dev-only.
 */

const R2_SERVICE = "s3";
const R2_REGION = "auto";

export const R2_BUCKET_DEFAULT = "waw-media";

/**
 * Folder prefixes inside the single bucket, one per logical upload bucket.
 * These prefixes are PART of the object key, so they are baked into public
 * URLs and must never change once objects exist.
 */
export const R2_PREFIXES = {
  products: "product-images",
  stores: "store-assets",
  reviews: "review-photos",
  profiles: "profile-avatars",
} as const;

export type R2BucketKey = keyof typeof R2_PREFIXES;

// Read env dynamically (not the boot-time ENV snapshot) so tests and
// runtime config changes are picked up without a restart.
function r2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY,
  );
}

export function r2Enabled(): boolean {
  return r2Configured();
}

function r2BucketName(): string {
  return process.env.R2_BUCKET || R2_BUCKET_DEFAULT;
}

/** sha256 hex of a payload (unsigned-payload-safe hashing). */
function sha256Hex(data: Buffer | string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

/** HMAC-SHA256 as raw Buffer. */
function hmac(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data).digest();
}

/**
 * Canonical request + signature per AWS SigV4 for a single HTTPS request.
 * R2 accepts UNSIGNED-PAYLOAD for streaming bodies; we hash the (small)
 * image buffers directly, which is stricter.
 */
function signRequest(opts: {
  method: string;
  url: URL;
  headers: Record<string, string>;
  body: Buffer | null;
}): { headers: Record<string, string> } {
  const { method, url, body } = opts;
  const headers: Record<string, string> = { ...opts.headers };

  const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";

  const amzDate = new Date()
    .toISOString()
    .replace(/[:-]|\.\d{3}/g, "")
    .slice(0, 15); // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = body ? sha256Hex(body) : sha256Hex("");

  // Canonical URI must be the raw (encoded) path — R2 bucket paths contain
  // only safe chars we generate server-side.
  const canonicalUri = url.pathname || "/";
  const canonicalQuery = url.search ? url.search.replace(/^\?/, "") : "";

  // Canonical headers: host + x-amz-content-sha256 + x-amz-date minimum set.
  headers["x-amz-date"] = amzDate;
  headers["x-amz-content-sha256"] = payloadHash;
  headers["host"] = url.host;

  const signedHeaderNames = Object.keys(headers)
    .map((h) => h.toLowerCase())
    .sort();
  const canonicalHeaders = signedHeaderNames
    .map((h) => `${h}:${String(headers[Object.keys(headers).find((k) => k.toLowerCase() === h)!]).trim()}\n`)
    .join("");

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaderNames.join(";"),
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${R2_REGION}/${R2_SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, R2_REGION);
  const kService = hmac(kRegion, R2_SERVICE);
  const kSigning = hmac(kService, "aws4_request");
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  headers["authorization"] =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, ` +
    `SignedHeaders=${signedHeaderNames.join(";")}, Signature=${signature}`;

  return { headers };
}

async function r2Fetch(
  method: string,
  objectKey: string,
  body: Buffer | null,
  extraHeaders: Record<string, string> = {},
): Promise<Response> {
  const url = new URL(
    `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${r2BucketName()}/${objectKey}`,
  );
  const { headers } = signRequest({ method, url, headers: extraHeaders, body });
  return fetch(url, {
    method,
    headers,
    // Buffer is a valid binary BodyInit at runtime; cast for the DOM types.
    body: body ? (new Uint8Array(body) as unknown as BodyInit) : undefined,
  });
}

export class R2Storage {
  /**
   * PUT an object under its logical prefix; returns the publicly-served URL.
   * `path` is the ownership-identifying suffix ({userId}/timestamp-random.ext)
   * — the prefix is prepended internally and baked into the URL.
   */
  static async put(
    bucket: R2BucketKey,
    path: string,
    body: Buffer,
    contentType: string,
  ): Promise<{ url: string; path: string }> {
    const objectKey = `${R2_PREFIXES[bucket]}/${path}`;
    const res = await r2Fetch("PUT", objectKey, body, {
      "content-type": contentType,
      // Serve images with long-lived cache — uploads are immutable
      // (timestamp-random object names, never overwritten).
      "cache-control": "public, max-age=31536000, immutable",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`R2 upload failed (${res.status}): ${text.slice(0, 200)}`);
    }
    const base = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
    if (!base) {
      // No public domain configured: return the storage path so callers can
      // resolve later; do NOT return the authed endpoint (would 403/401).
      logger.warn("R2_PUBLIC_BASE_URL not set — upload succeeded but no public URL is resolvable", {
        bucket: r2BucketName(),
        objectKey,
      });
      return { url: `r2://${objectKey}`, path };
    }
    return { url: `${base}/${objectKey}`, path };
  }

  /** DELETE an object (idempotent — 404 is success for our purposes). */
  static async delete(bucket: R2BucketKey, path: string): Promise<void> {
    const objectKey = `${R2_PREFIXES[bucket]}/${path}`;
    const res = await r2Fetch("DELETE", objectKey, null);
    if (!res.ok && res.status !== 404) {
      const text = await res.text().catch(() => "");
      throw new Error(`R2 delete failed (${res.status}): ${text.slice(0, 200)}`);
    }
  }

  /** HEAD an object — returns whether it exists. */
  static async exists(bucket: R2BucketKey, path: string): Promise<boolean> {
    const objectKey = `${R2_PREFIXES[bucket]}/${path}`;
    const res = await r2Fetch("HEAD", objectKey, null);
    return res.ok;
  }
}
