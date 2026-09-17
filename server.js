import app from "./src/app.js";
import connectDB from "./src/config/db.js";
import 'dotenv/config'


const PORT = process.env.PORT || 3000

app.listen(PORT , () => {
    connectDB()
    console.log(`Server is running on port ${PORT}`)
})