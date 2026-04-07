import { body, query, validationResult } from "express-validator";

const validateScrapePayload = [
  body("inputs")
    .isArray({ min: 1 })
    .withMessage("inputs must be a non-empty array of strings"),
  body("inputs.*")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Each input must be a non-empty string"),
  body("followingLimit")
    .optional()
    .isInt({ min: 1, max: 5000 })
    .withMessage("followingLimit must be an integer between 1 and 5000"),
  body("chunkLimit")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("chunkLimit must be an integer between 1 and 1000"),
  body("followersMin")
    .optional()
    .isInt({ min: 1, max: 1_000_000 })
    .withMessage("followersMin must be a positive integer"),
  body("followersMax")
    .optional()
    .isInt({ min: 1, max: 1_000_000 })
    .withMessage("followersMax must be a positive integer"),
  body().custom((_, { req }) => {
    const rawMin = req.body.followersMin;
    const rawMax = req.body.followersMax;
    const min =
      rawMin === undefined || rawMin === null || rawMin === ""
        ? 500
        : Number.parseInt(String(rawMin), 10);
    const max =
      rawMax === undefined || rawMax === null || rawMax === ""
        ? 50_000
        : Number.parseInt(String(rawMax), 10);
    if (Number.isNaN(min) || Number.isNaN(max)) return true;
    if (min > max) {
      throw new Error(
        "followersMin must be less than or equal to followersMax"
      );
    }
    return true;
  }),
  body("token")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Apify token is required"),

  // Middleware to handle validation result
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    next();
  },
];

const validateMarkProfilesChecked = [
  body("usernames")
    .isArray({ min: 1 })
    .withMessage("usernames must be a non-empty array"),
  body("usernames.*")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Each username must be a non-empty string"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    next();
  },
];

const validateGetProfiles = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be a positive integer"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    next();
  },
];

const validatePostQualifiedSeed = [
  body("username")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("username is required"),
  body("following")
    .isInt({ min: 0 })
    .withMessage("following must be a non-negative integer"),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
    next();
  },
];

const validateGetQualifiedSeeds = [
  (req, res, next) => {
    const allRaw = req.query.all;
    if (
      allRaw !== undefined &&
      allRaw !== "" &&
      allRaw !== "true" &&
      allRaw !== "1"
    ) {
      return res.status(422).json({
        success: false,
        errors: [
          {
            type: "field",
            msg: 'all must be "true" or "1" when provided',
            path: "all",
            location: "query",
          },
        ],
      });
    }
    const all = allRaw === "true" || allRaw === "1";
    if (!all) {
      const raw = req.query.followingLimit;
      if (raw === undefined || raw === "") {
        return res.status(422).json({
          success: false,
          errors: [
            {
              type: "field",
              msg: "followingLimit must be a non-negative integer",
              path: "followingLimit",
              location: "query",
            },
          ],
        });
      }
      const n = parseInt(String(raw), 10);
      if (!Number.isInteger(n) || n < 0) {
        return res.status(422).json({
          success: false,
          errors: [
            {
              type: "field",
              msg: "followingLimit must be a non-negative integer",
              path: "followingLimit",
              location: "query",
            },
          ],
        });
      }
    }
    next();
  },
];

export {
  validateScrapePayload,
  validateGetProfiles,
  validateMarkProfilesChecked,
  validatePostQualifiedSeed,
  validateGetQualifiedSeeds,
};
