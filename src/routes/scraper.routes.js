import express from "express";
import {
  validateScrapePayload,
  validateGetProfiles,
  validateMarkProfilesChecked,
  validatePostQualifiedSeed,
  validateDeleteQualifiedSeed,
  validateGetQualifiedSeeds,
} from "../validations/scraper.validation.js";
import {
  triggerScrapeSync,
  getProfiles,
  markProfilesChecked,
  deletePendingProfiles,
  deleteInputsByUsernames,
  postQualifiedSeed,
  getQualifiedSeeds,
  deleteQualifiedSeed,
} from "../controller/scraper.controller.js";

const router = express.Router();

// POST /api/scraper/trigger-sync — waits for result (testing only)
router.post("/trigger", validateScrapePayload, triggerScrapeSync);

// GET /api/scraper/profiles?page=1
router.get("/profiles", validateGetProfiles, getProfiles);

// DELETE /api/scraper/profiles/pending — remove all pending profiles
router.delete("/profiles/pending", deletePendingProfiles);

// DELETE /api/scraper/inputs/usernames — remove specific usernames from inputs
router.delete(
  "/inputs/usernames",
  validateMarkProfilesChecked,
  deleteInputsByUsernames,
);

// PATCH /api/scraper/profiles — mark usernames as checked (reviewed)
router.patch("/profiles", validateMarkProfilesChecked, markProfilesChecked);

// POST /api/scraper/qualified-seeds — save a qualified seed (username + following)
router.post("/qualified-seeds", validatePostQualifiedSeed, postQualifiedSeed);

// DELETE /api/scraper/qualified-seeds?username=sam.22 — remove one qualified seed
router.delete(
  "/qualified-seeds",
  validateDeleteQualifiedSeed,
  deleteQualifiedSeed,
);

// GET /api/scraper/qualified-seeds?followingLimit=500
//     /api/scraper/qualified-seeds?all=true — every seed (no following cap), excludes pipeline inputs
router.get("/qualified-seeds", validateGetQualifiedSeeds, getQualifiedSeeds);

export default router;
