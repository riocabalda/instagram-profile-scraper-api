import {
  runScrapePipeline,
  getPendingProfiles,
  markProfilesCheckedByUsernames,
} from "../services/scraper.service.js";

const triggerScrapeSync = async (req, res, next) => {
  try {
    const {
      inputs,
      followingLimit,
      chunkLimit,
      token,
      followersMin: rawFollowersMin,
      followersMax: rawFollowersMax,
    } = req.body;
    const followersMin =
      rawFollowersMin === undefined ||
      rawFollowersMin === null ||
      rawFollowersMin === ""
        ? undefined
        : Number(rawFollowersMin);
    const followersMax =
      rawFollowersMax === undefined ||
      rawFollowersMax === null ||
      rawFollowersMax === ""
        ? undefined
        : Number(rawFollowersMax);
    const result = await runScrapePipeline({
      inputs,
      followingLimit,
      token,
      chunkLimit,
      followersMin,
      followersMax,
    });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const getProfiles = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const result = await getPendingProfiles({ page });
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const markProfilesChecked = async (req, res, next) => {
  try {
    const { usernames } = req.body;
    const result = await markProfilesCheckedByUsernames(usernames);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export { triggerScrapeSync, getProfiles, markProfilesChecked };
