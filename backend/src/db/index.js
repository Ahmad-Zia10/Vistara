//This is for db connection only
import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

//Once you call dotenv.config() once in your application, it loads all the environment variables from .env into process.env — and they become available globally throughout your project (as long as the app is running in the same Node.js process).


const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\n Mongo DB connected !! DB host ${connectionInstance.connection.host}`); 
        
    } catch (error) {
        console.log("Database connection failed");
        process.exit(1);
    }
}

export default connectDB