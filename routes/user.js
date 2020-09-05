const express = require("express");
const router = express.Router();
const { requireSignin, authMiddleware } = require("../controllers/auth");

const { read, retreiveProfile, update, photo } = require("../controllers/user");
const { route } = require("./blog");

router.get("/user/profile", requireSignin, authMiddleware, read);
router.get("/user/:username", retreiveProfile);
router.put("/user/update", requireSignin, authMiddleware, update);
router.get("/user/photo/:username", photo);

module.exports = router;
