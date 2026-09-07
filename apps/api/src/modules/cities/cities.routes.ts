import { Router } from "express";
import { getCities } from "./cities.controller.js";

const router = Router();

// Public: GET /api/cities — list all active serviceable cities
router.get("/", getCities);

export default router;
