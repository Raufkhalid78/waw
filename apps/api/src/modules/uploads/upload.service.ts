import { supabaseAdmin } from "../../config/supabase.js";
import { logger } from "../../config/logger.js";

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

export class UploadService {
  /**
   * Ensure storage buckets exist (run on startup)
   */
  static async ensureBuckets(): Promise<void> {
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
   * Upload a file to Supabase Storage
   */
  static async upload(options: UploadOptions): Promise<UploadResult> {
    const { bucket, fileName, fileBuffer, contentType, userId } = options;
    const bucketName = BUCKETS[bucket];

    // Generate unique path: bucket/user_id/timestamp-random-filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = fileName.split(".").pop() || "jpg";
    const path = userId
      ? `${userId}/${timestamp}-${random}.${ext}`
      : `${timestamp}-${random}.${ext}`;

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
   * Delete a file from Supabase Storage
   */
  static async delete(bucket: BucketName, path: string): Promise<void> {
    const bucketName = BUCKETS[bucket];
    const { error } = await supabaseAdmin.storage
      .from(bucketName)
      .remove([path]);

    if (error) throw new Error(`Delete failed: ${error.message}`);
  }

  /**
   * List files in a directory
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
    const bucketName = BUCKETS[bucket];
    const { data } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(path);
    return data.publicUrl;
  }
}
