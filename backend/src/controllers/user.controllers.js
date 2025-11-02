import mongoose from "mongoose";
import { User } from "../models/user.models.js";
import { apiError } from "../utils/apiError.js";
import apiResponse from "../utils/apiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken"


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user  = await User.findById(userId);
    
        if(!user){
            throw new apiError(400, "User could not be fetched from database");
        }
    
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken};

    } catch (error) {
        throw new apiError(500,"Something went wrong while generating access and refresh tokens")
    }
}

const registerUser = asyncHandler( async (req,res) => { 
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    //get user details from frontend
    const  {fullname, email , password, username} = req.body;

    //validation
    if(
        [fullname, email , password, username].some((field) => field?.trim() === '') //Once .some() finds a field where trim() === '', it stops checking and returns true.
    ){
        throw new apiError(400, "All fields are required")
    }

//checking if user already exists in database


//     $or operator
// Takes an array of conditions.
// If any one of the conditions is true, it matches.
// Comes from Mongoose (MongoDB ODM).
// Searches the User collection for a single document.
    const existedUser = await User.findOne({                          
        $or : [{username}, {email}]
    })

    if (existedUser) {
        throw new apiError(409, "User with email or username already exists");
    }
    
    //checking for images
    
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if(!avatarLocalPath) {
        throw new apiError(400, "Avatar file is required");
    }

    
    //uploading to cloudinary 
    
    // const avatar = await uploadOnCloudinary(avatarLocalPath);
    
    // let coverImage = "";
    // if(coverImageLocalPath){
    //     coverImage = await uploadOnCloudinary(coverImageLocalPath);
    // }

    let avatar;
    try {
        avatar = await uploadOnCloudinary(avatarLocalPath);
        console.log("Uploaded Avatar ", avatar)
    } catch (error) {
        console.log("Error while uploading Avatar:" , error);
        throw new apiError(500, "Failed to upload avatar")
        
    }

    let coverImage;
    try {
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
        console.log("Uploaded coverImage ", coverImage)
    } catch (error) {
        console.log("Error while uploading coverImage:" , error);
        throw new apiError(500, "Failed to upload coverImage")
        
    }

    //create user object

    try {
        const user = await User.create({
            fullname,
            avatar : avatar.url,
            coverImage : coverImage?.url,
            email,
            password,
            username : username.toLowerCase()
        })
    
        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken"
        )
    
        if(!createdUser) {
            throw new apiError(500, "Something went wrong while registering a user");
        }
    
        return res
        .status(201)
        .json(new apiResponse(201, createdUser , "Succesfully registered successfully"))
    } catch (error) {
        console.log("User Creation failed")
        if(avatar) {
            await deleteFromCloudinary(avatar.public_id);
        }
        if(coverImage) {
            await deleteFromCloudinary(coverImage.public_id);
        }

        throw new apiError(500, "Something went wrong while registering a user and the uploaded files werre deleted")
    }


})

const loginUser = asyncHandler( async (req,res) => {
    //get the fields you need
    const {username, email, password} = req.body;

    //validate user
    if(!(username || email)){
        throw new apiError(400, "Email or username is missing")
    }
    const user = await User.findOne({ $or: [{username}, {email}]});

    if(!user) {
        throw new apiError(404, "User not found");
    }

    //validate password

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new apiError(401, "Invalid User credentials")
    }

    //generate access and refresh tokens

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    if(!loggedInUser) {
        throw new apiError(405, "User could not be logged In")
    }

        const options = {
            httpOnly : true ,  //makes the cookie non-modifiable on client side.Prevents client-side JavaScript access (protects from XSS)
            secure : process.env.NODE_ENV === "development",

        }

        return res
            .status(200)
            .cookie("accesToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(new apiResponse(
                200,
                {user: loggedInUser, accessToken, refreshToken}, // in mobile apps , you cannot set the cookies , so you pass them to the user 
                "User Logged In successfully"
            ))





})

const logoutUser = asyncHandler( async (req,res) => {
    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                refreshToken : undefined      //depending on the DB we are using , we may have to set it to null or empty string
            }
        },
        {new : true }
    )
    
    const options = {
        httpOnly : true,
        secure : process.env.NODE_ENV === "development"
    }

    return res
        .status(200)
        .clearCookies("accessToken", options)
        .clearCookies("refreshToken", options)
        .json(new apiResponse(200,"User logged out successfully"))

})

const refreshAccessToken = asyncHandler( async (req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken) {
        throw new apiError(401, "Refresh Token is required");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET, // it will use the signature to verify
        )
        const user = await User.findById(decodedToken?._id)

        if(!user) {
            throw new apiError(401, "Invalid Refresh Token");
        }

        if(user?.refreshToken !== incomingRefreshToken){
            throw new apiError(401, "Invalid Refresh Token")
        }

        const options = {
        httpOnly : true ,  //makes the cookie non-modifiable on client side
        secure : process.env.NODE_ENV === "development",

        }

        const {accessToken, refreshToken : newRefreshToken} = generateAccessAndRefreshToken(user._id);

        return res
            .status(200)
            .cookies("accessToken", accessToken, options)
            .cookies("refreshToken", newRefreshToken, options)
            .json(new apiResponse(
                200,
                {
                accessToken,
                refreshToken : newRefreshToken
            },
                "Access Token regenerated successfully"
            ))


    } catch (error) {
        throw new apiError(500, "Something went wrong while refreshing access token")
    }
})

const changeCurrentPassword = asyncHandler( async (req,res) => {
    const {oldPassword, newPassword} = req.body;

    if(!(oldPassword || newPassword)) {
        throw new apiError(401, "Incomplete Credentials")
    }

    const user = await User.findById(req.user?._id);

    //validate password 
    const isPasswordValid = user.isPasswordCorrect(oldPassword)

    if(!isPasswordValid) {
        throw new apiError(401, "Enter correct Password");
    }

    user.password = newPassword; //we have a pre hook on the "save" , it automatically encrypts the password if it is being modified. It's kind of a iddleware.

    await user.save({validateBeforeSave: false});

    return res.status(200).json( new apiResponse(200, "Password was updated successfully"))



    

})

const getCurrentUser = asyncHandler( async (req,res) => {
    return res.status(200).json(new apiResponse(200, req.user, "Current User Details"))
})

const updateAccountDetails = asyncHandler( async (req,res) => {
    const {fullname, email} = req.body;

    if(!fullname && !email) {
        throw new apiError(401, "No update info provided"); 
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                fullname,
                email
            }
        },
        {new : true}
    ).select("-password -refreshToken")

    if(!user) {
        throw new apiError(401, "User not found");
    }

    return res.status(200).json(new apiResponse(200, user, "Account Details Updated "))
})

const updateUserAvatar = asyncHandler( async (req,res) => {
    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath) {
        throw new apiError(400, "File is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new apiError(401, "Something went wrong while uploading the avatar")
    }

    const user  = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                avatar : avatar.url
            }
        },
        { new : true }
    ).select("-password -refreshToken")

    return res.status(200).json(new apiResponse(200, user , "Avatar image is successfully updated"))


})

const updateCoverImage = asyncHandler( async(req,res) => {
    const coverImageLocalPath = req.file?.path;

    if(!coverImageLocalPath) {
        throw new apiError(400, "File is required");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url){
        throw new apiError(401, "Something went wrong while uploading the avatar")
    }

    const user  = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                coverImage : coverImage.url
            }
        },
        { new : true }
    ).select("-password -refreshToken")

    return res.status(200).json(new apiResponse(200, user , "Cover image is successfully updated"))
})

const getUserChannelProfile = asyncHandler( async (req, res) => {
    const {username} = req.params;

    if(!username?.trim()){
        throw new apiError(401, "Invalid Credentials");
    }

    const channel = await User.aggregate(
        [
            {
                $match : {
                    username : username?.toLowerCase()
                }
            },
            {
                $lookup : {
                    from : "subscription",
                    localField : "_id",
                    foreignField : "channel",
                    as : "subscribers"       //Once we collect all the channels that has our user _id , we will get all the subscribers
                }
            },
            {
                $lookup : {
                    from : "subscription",
                    localField : "_id",
                    foreignField : "subscriber",
                    as : "subscribedChannels"
                }
            },
            {
                $addFields :  {
                    subscribersCount : {
                        $size : "$subscribers"
                    },
                    channelsSubscribedToCount : {
                        $size : "$subscribedChannels"
                    },
                    isSubscribed : {
                        $cond : {
                            if : {$in :[req.user?._id, "subscribers.subscribed"]}, 
                            then : true,
                            else : false
                        }
                    }
                }
            },
            {
                $project : {
                    fullname : 1,
                    username : 1,
                    avatar : 1,
                    subscribersCount : 1,
                    channelsSubscribedToCount : 1,
                    isSubscribed : 1,
                    coverImage : 1,
                    email : 1   
                }
            }
        ]
    )

    //channel will be an array

    if(!channel?.lenght){
        throw new apiError(404, "Channel not found!")
    }

    console.log("Channel data is expressed as followoing : ", channel)

    return res
        .status(200)
        .json(new apiResponse(200, 
            channel[0] ,
            "Channel Details Fetched successfully"))
})

const getWatchHistory = asyncHandler( async (req, res) => {

    const user = await user.aggregate(
        [
            {
                $match : {
                    _id : new mongoose.Types.ObjectId(req.user?._id)
                }
            },
            {
                $lookup : {
                    from : "videos",
                    localField : "watchHistory",
                    foreignField : "_id",
                    as : "watchHistory",
                    pipeline : [
                        {
                            $lookup : {
                               from : "user",
                               localField : "owner",
                               foreignField : "_id",
                               as : "owner",
                               pipeline : [
                                {
                                    $project : {
                                        fullname : 1,
                                        username : 1,
                                        avatar : 1
                                    }
                                },
                                {
                                    $addFields : {
                                        owner : {
                                            $first : "owner"
                                        }
                                    }
                                }
                               ]
                            }
                        }
                    ]
                }
            }
        ]
    )

    if(!user) {
        throw new apiError(404, "Unatuhorized access")
    }

    return res
        .status(200)
        .json(new apiResponse(200, user[0]?.watchHistory , "User watch history fetched successfully"))

})

export {
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateCoverImage,
    updateUserAvatar,
    getUserChannelProfile,
    getWatchHistory 
}