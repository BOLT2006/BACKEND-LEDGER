import express from "express"
import { authmiddleware } from "../middleware/auth.middleware.js"
import { createAccountContoller , getAccountsController , getAccountBalanceController} from "../controllers/account.controller.js"

const router = express.Router()

// CREATE ACCOUNT
router.post("/" , authmiddleware , createAccountContoller)

// GET ALL ACCOUNTS
router.get("/" , authmiddleware , getAccountsController)

// GET ACCOUNT Balance
router.get("/:accountId/balance" , authmiddleware , getAccountBalanceController)

export default router