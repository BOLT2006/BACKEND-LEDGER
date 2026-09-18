import express from "express"
import authmiddleware from "../middleware/auth.middleware.js"

const router = express.Router()

router.post("/" , authmiddleware)

export default router