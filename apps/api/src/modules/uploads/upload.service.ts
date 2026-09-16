import { supabaseAdmin } from "../../config/supabase.js";
import { logger } from "../../config/logger.js";
import { R2Storage, R2_PREFIXES, r2Enabled } from "./r2.storage.js";

const BUCKETS = {
  products: "product-images",
  stores: "store-assets",
  reviews: "review-photos",
  profiles: "profile-avatars",
} as const;

type BucketName = keyof typeof BUCKETS;

interface UploadResult {
  url: string;
  path: string;
  width?: number;
  height?: number;
}

interface UploadOptions {
  bucket: BucketName;
  fileName: string;
  fileBuffer: Buffer;
  contentType: string;
  userId?: string;
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * Extension derived from the SNIFFED content type — never the client's
 * filename (a "payload.php" upload previously kept its extension verbatim;
 * the magic-byte gate already rejects non-images, but the stored extension
 * must also be server-chosen).
 */
function extensionForContentType(contentType: string): string {
  switch (contentType) {
    case "image/jpeg": return "jpg";
    case "image/png": return "png";
    case "image/webp": return "webp";
    case "image/gif": return "gif";
    default: return "jpg";
  }
}

export class UploadService {
  /**
   * Ensure storage buckets exist (run on startup — Supabase path only; the
   * single R2 bucket is created in the Cloudflare dashboard).
   */
  static async ensureBuckets(): Promise<void> {
    if (r2Enabled()) {
      logger.info("Storage driver: Cloudflare R2 (single bucket with folder prefixes)", {
        bucket: process.env.R2_BUCKET || "waw-media",
        prefixes: Object.values(R2_PREFIXES),
        publicBase: process.env.R2_PUBLIC_BASE_URL || "(not set)",
      });
      return;
    }

    const buckets = Object.values(BUCKETS);
    const { data: existing } = await supabaseAdmin.storage.listBuckets();
    const existingNames = new Set((existing || []).map((b) => b.name));

    for (const bucketName of buckets) {
      if (!existingNames.has(bucketName)) {
        const { error } = await supabaseAdmin.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 10 * 1024 * 1024, // 10MB
          allowedMimeTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
          ],
        });
        if (error && !error.message.includes("already exists")) {
          logger.error(`Failed to create bucket ${bucketName}`, { error: error.message });
        } else {
          logger.info(`Created storage bucket: ${bucketName}`);
        }
      }
    }
  }

  /**
   * Upload a file: Cloudflare R2 when configured, Supabase Storage otherwise.
   */
  static async upload(options: UploadOptions): Promise<UploadResult> {
    const { bucket, fileBuffer, contentType, userId } = options;

    // Server-generated immutable path: [userId/]timestamp-random.ext —
    // the extension is derived from the sniffed type, never the client name.
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = extensionForContentType(contentType);
    const path = userId
      ? `${userId}/${timestamp}-${random}.${ext}`
      : `${timestamp}-${random}.${ext}`;

    if (r2Enabled()) {
      // Single bucket: the logical bucket maps to a folder prefix baked
      // into the object key (and therefore into the public URL).
      return R2Storage.put(bucket, path, fileBuffer, contentType);
    }

    const bucketName = BUCKETS[bucket];
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(path, fileBuffer, {
        contentType,
        upsert: false,
      });

    if (error) throw new Error(`Upload failed: ${error.message}`);

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      path: data.path,
    };
  }

  /**
   * Delete a file from whichever driver is active.
   */
  static async delete(bucket: BucketName, path: string): Promise<void> {
    if (r2Enabled()) {
      return R2Storage.delete(bucket, path);
    }
    const bucketName = BUCKETS[bucket];
    const { error } = await supabaseAdmin.storage
      .from(bucketName)
      .remove([path]);

    if (error) throw new Error(`Delete failed: ${error.message}`);
  }

  /**
   * List files in a directory (Supabase driver only — R2 has no cheap LIST
   * in this driver; the API never uses list() in production flows).
   */
  static async list(bucket: BucketName, folder?: string): Promise<string[]> {
    const bucketName = BUCKETS[bucket];
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .list(folder || "");

    if (error) throw new Error(`List failed: ${error.message}`);
    return (data || []).map((f) => f.name);
  }

  /**
   * Get public URL for a stored file
   */
  static getPublicUrl(bucket: BucketName, path: string): string {
    if (r2Enabled()) {
      const base = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
      return base ? `${base}/${R2_PREFIXES[bucket]}/${path}` : `r2://${R2_PREFIXES[bucket]}/${path}`;
    }
    const bucketName = BUCKETS[bucket];
    const { data } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(path);
    return data.publicUrl;
  }
}
