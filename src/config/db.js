import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/backend-ledger`);
    console.log("MongoDB Connected Successfully!!");
  } catch (error) {
    console.log("MongoDB Connection Error ", error);
  }
};
export default connectDB
