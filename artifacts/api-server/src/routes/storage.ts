import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import path from "node:path";
import multer from "multer";
import { uploadBuffer, downloadBuffer } from "../lib/gcsStorage";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

/**
 * POST /storage/upload
 * Accepts multipart/form-data with a "file" field (image).
 * Stores the file in GCS at uploads/<uuid>.<ext> and returns { objectPath }.
 * objectPath format: /objects/uploads/<uuid>.<ext>
 * To serve: GET /api/storage/objects/uploads/<uuid>.<ext>
 */
router.post("/storage/upload", upload.single("file"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "No file provided" });
    return;
  }

  try {
    const ext = path.extname(req.file.originalname).toLowerCase() || ".bin";
    const filename = `${randomUUID()}${ext}`;
    const relPath = `uploads/${filename}`;

    await uploadBuffer(relPath, req.file.buffer, req.file.mimetype);

    res.json({ objectPath: `/objects/${relPath}` });
  } catch (err) {
    req.log.error({ err }, "Image upload failed");
    res.status(500).json({ error: "Upload failed" });
  }
});

/**
 * GET /storage/objects/uploads/*
 * Serves uploaded image files from GCS.
 */
router.get("/storage/objects/uploads/*filename", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filename;
    const filename = Array.isArray(raw) ? raw.join("/") : raw;
    const relPath = `uploads/${filename}`;

    const buffer = await downloadBuffer(relPath);

    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
    };
    const contentType = mimeTypes[ext] ?? "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.send(buffer);
  } catch (err: any) {
    if (err?.code === 404 || err?.message?.includes("No such object")) {
      res.status(404).json({ error: "Image not found" });
      return;
    }
    req.log.error({ err }, "Failed to serve image");
    res.status(500).json({ error: "Failed to serve image" });
  }
});

export default router;
