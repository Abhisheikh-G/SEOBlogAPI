const { check } = require("express-validator");

exports.categoryCreateValidator = [
  check("name").notEmpty().withMessage("A name for the category is required."),
];
