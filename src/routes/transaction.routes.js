import express from "express";
import authmiddleware from "../middleware/auth.middleware.js";
import { createTransaction } from "../controllers/transaction.controller.js";
const router = express.Router();

router.post("/", authmiddleware, createTransaction);

export default router;
