const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      "mongodb+srv://babar_db_user:xwdCDqr5U9W8dr5U@vpn.o8swezq.mongodb.net/?appName=vpn",
      {
        serverSelectionTimeoutMS: 5000, // 5 seconds for local
        socketTimeoutMS: 45000, // 45 seconds
        maxPoolSize: 10, // Maintain up to 10 socket connections
        minPoolSize: 5, // Maintain a minimum of 5 socket connections
        maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
        connectTimeoutMS: 5000, // 5 seconds for local
      }
    );
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
