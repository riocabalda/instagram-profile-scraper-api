import express from "express";
import {
  validateScrapePayload,
  validateGetProfiles,
  validateMarkProfilesChecked,
} from "../validations/scraper.validation.js";
import {
  triggerScrapeSync,
  getProfiles,
  markProfilesChecked,
} from "../controller/scraper.controller.js";

const router = express.Router();

// POST /api/scraper/trigger-sync — waits for result (testing only)
router.post("/trigger", validateScrapePayload, triggerScrapeSync);

// GET /api/scraper/profiles?page=1
router.get("/profiles", validateGetProfiles, getProfiles);

// PATCH /api/scraper/profiles — mark usernames as checked (reviewed)
router.patch("/profiles", validateMarkProfilesChecked, markProfilesChecked);

export default router;
