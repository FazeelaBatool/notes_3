const mongoose = require("mongoose");
require("dotenv").config(); // Load environment variables

const connectDB = async () => {
  const MONGO_URI = process.env.MONGO_URI;
  
  if (!MONGO_URI) {
    console.error("❌ MongoDB URI is not set in environment variables!");
    console.error("Please set MONGO_URI in your .env file");
    process.exit(1);
  }

  let retries = 5;
  
  while (retries > 0) {
    try {
      await mongoose.connect(MONGO_URI);

      console.log("✅ Connected to MongoDB successfully!");
      return;
    } catch (error) {
      console.error(`❌ MongoDB Connection Error (${retries} retries left):`, error.message);
      retries--;

      if (retries === 0) {
        console.error("❌ MongoDB connection failed after multiple attempts. Exiting...");
        process.exit(1); // Stop the app
      }

      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait before retrying
    }
  }
};

// Handle unexpected errors to avoid app crashes
process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Promise Rejection:", err);
});

module.exports = connectDB;