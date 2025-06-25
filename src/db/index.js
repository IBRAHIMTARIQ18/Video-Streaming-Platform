import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`
    );
    console.log(
      `\n MongoDB connected successfully !!! DB Host: ${connectionInstance.connection.host} \n`
    );
  } catch (err) {
    console.log(`\n Error connecting to MongoDB: ${err.message} \n`);
    process.exit(1); // Exit the process with failure
  }
};

export default connectDB;
