import { v2 as cloudinary } from "cloudinary";
import fs from "fs"
import dotenv from "dotenv";
import { apiError } from "./apiError.js";

dotenv.config();


//configuring cloudinary
cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_CLOUD_API_KEY, 
        api_secret: process.env.CLOUDINARY_CLOUD_API_SECRET
})


const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null
        const response  = await cloudinary.uploader.upload(localFilePath,
            {
                resource_type : "auto"
            }
        )
        // console.log("File has been uploaded successfully: ", response.url);
        fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath);  //deleting file from our servers local storage
        return null;
    }
}

const deleteFromCloudinary = async (publicId) => {
   try {
     const result = await cloudinary.uploader.destroy(publicId);
     console.log("Deleted From cloudinary")
   } catch (error) {
        console.log("Error while deleting from cloudinary")
        return null;
   }

}

export {uploadOnCloudinary, deleteFromCloudinary};