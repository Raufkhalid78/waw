import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (
  _req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: ${allowedMimes.join(", ")}`));
  }
};

export const uploadSingle = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
}).single("file");

export const uploadMultiple = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10,
  },
}).array("files", 10);
