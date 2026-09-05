import { Request, Response } from "express";
import { UploadService } from "./upload.service.js";
import { logger } from "../../config/logger.js";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export class UploadController {
  /**
   * POST /api/uploads/:bucket
   * Upload a single image file to Supabase Storage
   */
  static async upload(req: Request, res: Response): Promise<void> {
    try {
      const { bucket } = req.params;
      const validBuckets = ["products", "stores", "reviews", "profiles"] as const;

      if (!validBuckets.includes(bucket as any)) {
        res.status(400).json({ error: `Invalid bucket. Must be one of: ${validBuckets.join(", ")}` });
        return;
      }

      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }

      if (!ALLOWED_TYPES.includes(file.mimetype)) {
        res.status(400).json({ error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}` });
        return;
      }

      if (file.size > MAX_SIZE) {
        res.status(400).json({ error: `File too large. Max size: ${MAX_SIZE / 1024 / 1024}MB` });
        return;
      }

      const user = (req as any).user;
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
      const validBuckets = ["products", "stores", "reviews", "profiles"] as const;

      if (!validBuckets.includes(bucket as any)) {
        res.status(400).json({ error: `Invalid bucket. Must be one of: ${validBuckets.join(", ")}` });
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

      const user = (req as any).user;
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
      const { bucket, path } = req.params;
      const validBuckets = ["products", "stores", "reviews", "profiles"] as const;

      if (!validBuckets.includes(bucket as any)) {
        res.status(400).json({ error: "Invalid bucket" });
        return;
      }

      // Decode path from URL
      const decodedPath = decodeURIComponent(path);
      await UploadService.delete(bucket as any, decodedPath);

      res.json({ success: true });
    } catch (err: any) {
      logger.error("Delete failed", { error: err.message });
      res.status(500).json({ error: "Delete failed" });
    }
  }
}
