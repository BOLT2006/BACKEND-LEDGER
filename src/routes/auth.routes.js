import express from "express"
import { userLoginController, userRegisterController  , userLogoutController} from "../controllers/auth.controller.js";

const router = express.Router();

/* POST /api/userRoute/register */
router.post("/register" , userRegisterController)

// POST /api/userRoute/login
router.post("/login" , userLoginController)

// POST /api/userRoute/logout
router.post("/logout" , userLogoutController)

export default router