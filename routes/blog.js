const express = require("express");
const router = express.Router();
const { requireSignin, adminMiddleware } = require("../controllers/auth");

const {
  create,
  remove,
  update,
  getPhoto,
  listAllBlogsInfo,
  listAllBlogs,
  listSingleBlog,
} = require("../controllers/blog");

router.post("/blog", requireSignin, adminMiddleware, create);
router.get("/blogs", listAllBlogs);
router.post("/blogs-categories-tags", listAllBlogsInfo);
router.get("/blog/:slug", listSingleBlog);
router.delete("/blog/:slug", requireSignin, adminMiddleware, remove);
router.put("/blog/:slug", requireSignin, adminMiddleware, update);
router.get("/blog/photo/:slug", getPhoto);

module.exports = router;
