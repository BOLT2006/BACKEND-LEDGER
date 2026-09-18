import express from "express"
import userRoute from "./routes/auth.routes.js"

const app = express()

app.use("/api/auth", userRoute)
export default app