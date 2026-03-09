import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

// console.log("🔍 MONGO_URI from env:", process.env.MONGO_URI); // debug

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`✅ MongoDB Connected (Get Ready to Fight)`);
  } catch (error) {
    console.error(`❌ Error connecting MongoDB: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

export default connectDB;
