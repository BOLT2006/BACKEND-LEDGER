import express from "express"
import { authmiddleware } from "../middleware/auth.middleware.js"
import { createAccountContoller } from "../controllers/account.controller.js"

const router = express.Router()

router.post("/" , authmiddleware , createAccountContoller)

export default router