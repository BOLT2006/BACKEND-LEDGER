import express from "express"
import { userLoginController, userRegisterController } from "../controllers/auth.controller.js";

const router = express.Router();

/* POST /api/userRoute/register */
router.post("/register" , userRegisterController)

// POST /api/userRoute/login
router.post("/login" , userLoginController)

export default router