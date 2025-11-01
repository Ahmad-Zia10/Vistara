import express from "express"
import cors from "cors"


const app = express();

app.use(cors({
    origin : process.env.CORS_ORIGIN,
    credentials : true
}))

//common middleware
app.use(express.json({limit:"16kb"}));
app.use(express.urlencoded({extended:true,limit:"16kb"}));
app.use(express.static("public"));
app.use(cookieParser());

//import routes
import healthcheckRoute from "./routes/healthcheck.routes.js"
import cookieParser from "cookie-parser";
import userRoute from "./routes/user.routes.js"
import { errorHandler } from "./middlewares/error.middlewares.js";





// routes

app.use("/api/v1/healthcheck", healthcheckRoute) // Where we want to serve the healthcheck.Mount all routes defined in healthcheckRoute under the base path /api/v1/healthcheck.
app.use("/api/v1/users", userRoute)



//error
app.use(errorHandler)

export {app};
