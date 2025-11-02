import { Router } from "express";
import { healthcheck } from "../controllers/healthcheck.controllers.js";


const router = Router();

router.route("/").get(healthcheck); //When a GET request is made to /, call the healthcheck controller function. "/" relative to wherever this router is mounted

export default router