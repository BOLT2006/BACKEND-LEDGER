import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import "dotenv/config";

async function authmiddleware(req, res, next) {

    // Get token from cookie or Authorization header
    const token =
        req.cookies.token ||
        req.headers.authorization?.split(" ")[1];

    // Check token
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized access, token is missing"
        });
    }

    try {

        // Verify token
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Find user
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found"
            });
        }

        // Attach user to request
        req.user = user;

        // Continue to controller
        return next();

    } catch (error) {

        return res.status(401).json({
            success: false,
            message: "Unauthorized access, token is invalid"
        });
    }
}

export { authmiddleware };