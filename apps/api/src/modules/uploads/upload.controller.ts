import { Request, Response } from "express";
import { UploadService } from "./upload.service.js";
import { logger } from "../../config/logger.js";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const VALID_BUCKETS = ["products", "stores", "reviews", "profiles"] as const;

/**
 * Bucket-level authorization. Marketplace/branding buckets must not be
 * writable by plain buyer accounts — only sellers (and admins) can upload
 * product/store imagery.
 */
function bucketRoleGate(user: any, bucket: string): string | null {
  const role = user?.role;
  if (role === "ADMIN" || role === "SUPER_ADMIN") return null;
  if ((bucket === "products" || bucket === "stores") && role !== "SELLER") {
    return "Only sellers can upload to this bucket";
  }
  return null;
}

/**
 * Reject traversal payloads: ownership is derived from the FIRST path
 * segment being the uploader's userId, so `..` sequences (raw or
 * percent-encoded) must never reach storage.
 */
function isSafeStoragePath(p: string): boolean {
  return (
    p.length > 0 &&
    !p.includes("..") &&
    !/%2e/i.test(p) &&
    !p.startsWith("/") &&
    !p.includes("\\")
  );
}

/**
 * Magic-byte sniffing: the multipart Content-Type is client-declared, so a
 * renamed executable or HTML payload could pass the mimetype check. We verify
 * the actual bytes match one of the allowed image signatures.
 */
function detectActualImageType(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) {
    return "image/png";
  }
  if (buf.length >= 12 && buf.subarray(0, 4).equals(Buffer.from("RIFF")) && buf.subarray(8, 12).equals(Buffer.from("WEBP"))) {
    return "image/webp";
  }
  if (buf.length >= 6 && (buf.subarray(0, 6).equals(Buffer.from("GIF87a")) || buf.subarray(0, 6).equals(Buffer.from("GIF89a")))) {
    return "image/gif";
  }
  return null;
}

/** Validates one multer file object; returns an error string or null. */
function validateFile(file: any, contentType: string): string | null {
  if (!ALLOWED_TYPES.includes(contentType)) {
    return `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}`;
  }
  if (file.size > MAX_SIZE) {
    return `File too large. Max size: ${MAX_SIZE / 1024 / 1024}MB`;
  }
  const sniffed = detectActualImageType(file.buffer);
  if (!sniffed) {
    return "File content is not a valid image";
  }
  if (sniffed !== contentType) {
    return `File content (${sniffed}) does not match its declared type (${contentType})`;
  }
  return null;
}

export class UploadController {
  /**
   * POST /api/uploads/:bucket
   * Upload a single image file to Supabase Storage
   */
  static async upload(req: Request, res: Response): Promise<void> {
    try {
      const { bucket } = req.params;

      if (!VALID_BUCKETS.includes(bucket as any)) {
        res.status(400).json({ error: `Invalid bucket. Must be one of: ${VALID_BUCKETS.join(", ")}` });
        return;
      }

      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }

      const validationError = validateFile(file, file.mimetype);
      if (validationError) {
        res.status(400).json({ error: validationError });
        return;
      }

      const user = (req as any).user;

      const gateError = bucketRoleGate(user, bucket);
      if (gateError) {
        res.status(403).json({ error: gateError });
        return;
      }

      const result = await UploadService.upload({
        bucket: bucket as any,
        fileName: file.originalname,
        fileBuffer: file.buffer,
        contentType: file.mimetype,
        userId: user?.id,
      });

      res.json({
        url: result.url,
        path: result.path,
      });
    } catch (err: any) {
      logger.error("Upload failed", { error: err.message });
      res.status(500).json({ error: "Upload failed" });
    }
  }

  /**
   * POST /api/uploads/:bucket/multiple
   * Upload multiple image files
   */
  static async uploadMultiple(req: Request, res: Response): Promise<void> {
    try {
      const { bucket } = req.params;

      if (!VALID_BUCKETS.includes(bucket as any)) {
        res.status(400).json({ error: `Invalid bucket. Must be one of: ${VALID_BUCKETS.join(", ")}` });
        return;
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: "No files provided" });
        return;
      }

      if (files.length > 10) {
        res.status(400).json({ error: "Maximum 10 files per upload" });
        return;
      }

      for (const file of files) {
        const validationError = validateFile(file, file.mimetype);
        if (validationError) {
          res.status(400).json({ error: `${validationError} (${file.originalname})` });
          return;
        }
      }

      const user = (req as any).user;

      const gateError = bucketRoleGate(user, bucket);
      if (gateError) {
        res.status(403).json({ error: gateError });
        return;
      }

      const results = await Promise.all(
        files.map((file) =>
          UploadService.upload({
            bucket: bucket as any,
            fileName: file.originalname,
            fileBuffer: file.buffer,
            contentType: file.mimetype,
            userId: user?.id,
          })
        )
      );

      res.json({
        files: results.map((r) => ({
          url: r.url,
          path: r.path,
        })),
      });
    } catch (err: any) {
      logger.error("Multiple upload failed", { error: err.message });
      res.status(500).json({ error: "Upload failed" });
    }
  }

  /**
   * DELETE /api/uploads/:bucket/:path
   * Delete a file from Supabase Storage
   */
  static async delete(req: Request, res: Response): Promise<void> {
    try {
      const { bucket } = req.params;
      // Express decodes %2F etc. once; decode again only for the traversal
      // check, then reject unsafe shapes before any storage call.
      const rawParam = req.params.path || "";
      const decodedPath = decodeURIComponent(rawParam);

      if (!VALID_BUCKETS.includes(bucket as any)) {
        res.status(400).json({ error: "Invalid bucket" });
        return;
      }

      if (!isSafeStoragePath(decodedPath) || !isSafeStoragePath(rawParam)) {
        res.status(400).json({ error: "Invalid file path" });
        return;
      }

      const user = (req as any).user;

      // Ownership check: path format is {userId}/{timestamp}-{random}.{ext}
      // The first segment is the userId who uploaded the file
      const pathOwner = decodedPath.split("/")[0];
      const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

      if (!isAdmin && pathOwner !== user?.id) {
        res.status(403).json({ error: "You can only delete your own files" });
        return;
      }

      await UploadService.delete(bucket as any, decodedPath);

      res.json({ success: true });
    } catch (err: any) {
      logger.error("Delete failed", { error: err.message });
      res.status(500).json({ error: "Delete failed" });
    }
  }
}
