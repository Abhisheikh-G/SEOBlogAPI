const Blog = require("../models/Blog");
const Category = require("../models/Category");
const Tag = require("../models/Tag");
const { errorHandler } = require("../helpers/dbErrorHandler");
const { smartTrim } = require("../helpers/blog");

const fs = require("fs");
const formidable = require("formidable");
const slugify = require("slugify");
const stripHtml = require("string-strip-html");
const _ = require("lodash");

exports.create = (req, res) => {
  let form = new formidable.IncomingForm();
  form.keepExtensions = true;

  form.parse(req, (err, fields, files) => {
    if (err) {
      return res
        .status(400)
        .json({ error: "Unable to process that action right now." });
    }

    const { title, body, categories, tags } = fields;

    if (!title)
      return res.status(400).json({
        error: "A title is required.",
      });

    if (title.length < 3)
      return res.status(400).json({
        error: "Titles need to be at least 3 characters long.",
      });

    if (!body || body.length < 100)
      return res.status(400).json({
        error: "You need more content.",
      });

    if (!categories || categories.length === 0)
      return res.status(400).json({
        error: "At least one category is required.",
      });

    if (!tags || tags.length === 0)
      return res.status(400).json({
        error: "At least one tag is required.",
      });

    let blog = new Blog();

    blog.title = title;
    blog.body = body;
    blog.excerpt = smartTrim(body, 320);
    blog.slug = slugify(title).toLowerCase();
    blog.metaTitle = `${title} | ${process.env.APP_NAME}`;
    blog.metaDescription = stripHtml(body.substring(0, 160));
    blog.author = req.profile._id;

    console.log("Categories and Tags", categories, tags);

    //categories and tags
    let categoriesArr = categories && categories.split(",");
    let tagsArr = categories && tags.split(",");

    if (files.photo) {
      if (files.photo.size > 1000000) {
        return res
          .status(400)
          .json({ error: "Images need to be less than 1mb in size." });
      }

      blog.photo.data = fs.readFileSync(files.photo.path);
      blog.photo.contentType = files.photo.type;
    }

    blog.save((err, result) => {
      if (err) return res.status(400).json({ error: errorHandler(err) });

      Blog.findByIdAndUpdate(
        result._id,
        {
          $push: { categories: categoriesArr, tags: tagsArr },
        },
        { new: true }
      ).exec((err, result) => {
        if (err)
          return res.status(400).json({
            error: "There was a problem adding categories/tags to the blog.",
          });
        else
          return res.status(200).json({ message: "Blog created successfully" });
      });
    });
  });
};

exports.remove = (req, res) => {
  const slug = req.params.slug.toLowerCase();

  Blog.findOneAndRemove({ slug }).exec((error, data) => {
    if (error)
      return res.json({
        error: errorHandler(error),
      });
    res.json({
      message: "Blog deleted successfully.",
    });
  });
};

exports.update = (req, res) => {
  const slug = req.params.slug.toLowerCase();

  Blog.findOne({ slug }).exec((error, oldBlog) => {
    if (error) return res.json({ error: errorHandler(error) });
    let form = new formidable.IncomingForm();
    form.keepExtensions = true;

    form.parse(req, (err, fields, files) => {
      if (err) {
        return res
          .status(400)
          .json({ error: "Unable to process that action right now." });
      }

      let slugBeforeMerge = oldBlog.slug;
      oldBlog = _.merge(oldBlog, fields);
      oldBlog.slug = slugBeforeMerge;

      const { body, metaDescription, categories, tags } = fields;

      if (body) {
        oldBlog.excerpt = smartTrim(body, 320);
        oldBlog.metaDescription = stripHtml(body.substr(0, 160));
      }

      if (categories) {
        oldBlog.categories = categories.split(",");
      }

      if (tags) {
        oldBlog.tags = tags.split(",");
      }

      if (files.photo) {
        if (files.photo.size > 1000000) {
          return res
            .status(400)
            .json({ error: "Images need to be less than 1mb in size." });
        }

        oldBlog.photo.data = fs.readFileSync(files.photo.path);
        oldBlog.photo.contentType = files.photo.type;
      } else {
        oldBlog.photo = {};
      }
    });

    oldBlog.save((err, result) => {
      if (err) return res.status(400).json({ error: errorHandler(err) });

      return res.json(result);
    });
  });
};

exports.getPhoto = (req, res) => {
  const slug = req.params.slug.toLowerCase();

  Blog.findOne({ slug })
    .select("photo")
    .exec((error, blog) => {
      if (error || !blog)
        return res.status(400).json({ error: errorHandler(error) });
      res.set("Content-Type", blog.photo.contentType);
      return res.send(blog.photo.data);
    });
};

exports.listSingleBlog = (req, res) => {
  const slug = req.params.slug.toLowerCase();

  Blog.findOne({ slug })
    .populate("categories", "_id name slug")
    .populate("tags", "_id name slug")
    .populate("author", "_id name slug")
    .select(
      "_id title body slug metaTitle metaDescription categories tags author createdAt updatedAt"
    )
    .exec((error, data) => {
      if (error) return res.json({ error: errorHandler(error) });
      res.json(data);
    });
};

exports.listAllBlogs = (req, res) => {
  Blog.find({})
    .populate("categories", "_id name slug")
    .populate("tags", "_id name slug")
    .populate("author", "_id name slug")
    .select("_id title slug excerpt categories tags author createdAt updatedAt")
    .exec((error, data) => {
      if (error)
        return res.json({
          error: errorHandler(error),
        });
      res.json(data);
    });
};

exports.listAllBlogsInfo = (req, res) => {
  let limit = req.body.limit ? parseInt(req.body.limit) : 10;
  let skip = req.body.skip ? parseInt(req.body.skip) : 0;

  let blogs, categories, tags;

  Blog.find({})
    .populate("categories", "_id name slug")
    .populate("tags", "_id name slug")
    .populate("author", "_id name username profile")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .select("_id title slug excerpt categories tags author createdAt updatedAt")
    .exec((error, data) => {
      if (error)
        return res.json({
          error: errorHandler(error),
        });
      blogs = data;

      Category.find({}).exec((error, data) => {
        if (error)
          return res.json({
            error: errorHandler(error),
          });
        categories = data;

        Tag.find({}).exec((error, data) => {
          if (error)
            return res.json({
              error: errorHandler(error),
            });
          tags = data;

          return res.json({ blogs, categories, tags, size: blogs.length });
        });
      });
    });
};
