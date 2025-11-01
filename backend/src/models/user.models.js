
//   id string pk
//   watchHistory ObjectId[] videos
//   username string
//   email string
//   fullName string
//   avatar string
//   coverImage string
//   password string
//   refreshTOken string
//   createdAt Date
//   updatedAt Date

import mongoose, {Schema} from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const userSchema = new Schema(
    {
        username : {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true, 
            index: true
        },
        email : {
            type : String,
            required : true,
            lowercase : true,
            trim : true
        },
        fullname : {
            type : String,
            required : true,
            index : true
        },
        avatar : {
            type : String, //cloudinary yrl
            required : true,
        },
        coverImage : {
            type : String, //cloudinary yrl
        },
        watchHistory : [
            {
                type : Schema.Types.ObjectId,
                ref : "Video"
            }
        ],
        password : {
            type : String,
            required : [true, "password is required"]
        },
        refreshToken : {
            type : String,
        }
    },
    {timestamps : true} //adds createdAt and updatedAt of type : Date
)

userSchema.pre("save", function (next){

    if(!this.isModified("password")) return next();  //if the modified field is not password than return next()

    this.password = bcrypt.hash(this.password, 10); //else encrypt, also this will run when you are saving the password
    next();
})

userSchema.methods.isPasswordCorrect = async function(password) {
    
    return await bcrypt.compare(password, this.password);

}

userSchema.methods.generateAccessToken = function () {
    //short lived tokens 
    return jwt.sign({
        _id : this._id, //We always pass only this
        email : this.email,
        fullName : this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
        expiresIn : process.env.ACCESS_TOKEN_EXPIRY
    }
)
}

userSchema.methods.generateRefreshToken = function () {
    //long lived tokens 
    return jwt.sign({
        _id : this._id, //We always pass only this
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
        expiresIn : process.env.REFRESH_TOKEN_EXPIRY
    }
)
}



export const User = mongoose.model("User", userSchema);