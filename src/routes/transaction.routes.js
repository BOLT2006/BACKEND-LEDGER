import express from "express";
import {authmiddleware , authSystemUserMiddleware} from "../middleware/auth.middleware.js";
import { createTransaction , createInitialFundTransfer } from "../controllers/transaction.controller.js";
const router = express.Router();

// Create a new transaction
router.post("/", authmiddleware, createTransaction);

// create initial fund transfer transaction from system user to new user
router.post("/system/initial-fund-transfer", authSystemUserMiddleware, createInitialFundTransfer , );

export default router;
