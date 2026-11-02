import dns from "node:dns";
import mongoose from "mongoose";

// Workaround for my laptop's network only. Not needed on the hosting server
if (process.env.NODE_ENV !== "production") {
  dns.setDefaultResultOrder("ipv4first");
}

export async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("DB connection failed:", err.message);
    process.exit(1);
  }
}