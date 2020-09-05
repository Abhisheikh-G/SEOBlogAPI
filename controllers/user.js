const User = require("../models/User");
const Blog = require("../models/Blog");
const _ = require("lodash");
const formidable = require("formidable");
const fs = require("fs");
const { errorHandler } = require("../helpers/dbErrorHandler");

exports.read = (req, res) => {
  req.profile.hashed_password = undefined;
  return res.json(req.profile);
};

exports.update = (req, res) => {
  let form = new formidable.IncomingForm();
  form.keepExtensions = true;
  form.parse(req, (err, fields, files) => {
    if (err) return res.status(400).json({ error: "Error uploading photo." });
    else {
      let user = req.profile;
      user = _.extend(user, fields);

      if (fields.password && fields.password.length < 6) {
        return res
          .status(400)
          .json({ error: "Password needs to be at least 6 characters long." });
      }

      if (files.photo) {
        if (files.photo.size > 10000000) {
          return res
            .status(400)
            .json({ error: "Image should be less than 1mb" });
        } else {
          user.photo.data = fs.readFileSync(files.photo.path);
          user.photo.contentType = files.photo.type;
        }
      }

      user.save((err, result) => {
        if (err) return res.status(400).json({ error: errorHandler(err) });
        else {
          user.hashed_password = undefined;
          user.photo = undefined;
          user.salt = undefined;
          res.json({ user, message: "Profile successfully updated." });
        }
      });
    }
  });
};

exports.photo = (req, res) => {
  const username = req.params.username;
  console.log("Inside photo middleware, username: ", username);
  console.log("Inside photo middleware, req.params: ", req.params);

  User.findOne({ username }).exec((error, user) => {
    if (error || !user) return res.status(400).json({ error: error });
    if (user.photo.data) {
      res.set("Content-Type", user.photo.contentType);
      return res.send(user.photo.data);
    }
  });
};

exports.retreiveProfile = (req, res) => {
  const username = req.params.username;
  let user;

  if (!username)
    return res
      .status(400)
      .json({ error: "There was a problem retrieving that user." });
  else {
    User.findOne({ username }).exec((error, verifiedUser) => {
      if (error || !verifiedUser)
        return res.status(400).json({ error: "User was not found" });
      else {
        user = verifiedUser;

        Blog.find({ author: verifiedUser._id })
          .populate("categories", "_id name slug")
          .populate("tags", "_id name slug")
          .populate("author", "_id name")
          .limit(10)
          .select(
            "_id title slug excerpt categories tags author createdAt updatedAt"
          )
          .exec((error, data) => {
            if (error)
              return res.status(400).json({ error: errorHandler(error) });
            else {
              user.photo = undefined;
              user.hashed_password = undefined;
              res.json({ user, blogs: data });
            }
          });
      }
    });
  }
};
