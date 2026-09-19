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

// authSystemUserMiddleware is a middleware function that checks if the authenticated user is a system user. If the user is not a system user, it returns a 403 Forbidden response. If the user is a system user, it allows the request to proceed to the next middleware or controller.

async function authSystemUserMiddleware(req, res, next) {

    const token =
        req.cookies.token ||
        req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized access, token is missing"
        });
    }

    try {

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const user = await User.findById(decoded.userId)
            .select("+systemUser");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found"
            });
        }

        if (!user.systemUser) {
            return res.status(403).json({
                success: false,
                message: "Forbidden access, user is not a system user"
            });
        }

        req.user = user;

        next();

    } catch (error) {

        return res.status(401).json({
            success: false,
            message: "Unauthorized access, token is invalid"
        });
    }
}


export { authmiddleware , authSystemUserMiddleware };