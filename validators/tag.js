const { check } = require("express-validator");

exports.tagCreateValidator = [
  check("name").notEmpty().withMessage("A name for the tag is required."),
];
