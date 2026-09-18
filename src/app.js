import express from "express"
import userRoute from "./routes/auth.routes.js"
import cookieParser from "cookie-parser"
import accountRouter from "../src/routes/account.routes.js"

const app = express()

//middleware becoz by default express serever is not capabale to read req.body data
app.use(express.json())

app.use(cookieParser())

app.use("/api/auth", userRoute)
app.use("/api/accounts", accountRouter)

export default app