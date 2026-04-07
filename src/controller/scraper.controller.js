import {
  runScrapePipeline,
  getPendingProfiles,
  markProfilesCheckedByUsernames,
  deleteAllPendingProfiles,
  upsertQualifiedSeed,
  deleteQualifiedSeedByUsername,
  getQualifiedSeedsFiltered,
  getQualifiedSeedsAll,
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

const deletePendingProfiles = async (req, res, next) => {
  try {
    const result = await deleteAllPendingProfiles();
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

const postQualifiedSeed = async (req, res, next) => {
  try {
    const { username, following } = req.body;
    const data = await upsertQualifiedSeed({ username, following });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const getQualifiedSeeds = async (req, res, next) => {
  try {
    const all =
      req.query.all === "true" ||
      req.query.all === "1" ||
      req.query.all === true;
    const data = all
      ? await getQualifiedSeedsAll()
      : await getQualifiedSeedsFiltered({
          followingLimit: parseInt(String(req.query.followingLimit), 10),
        });
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const deleteQualifiedSeed = async (req, res, next) => {
  try {
    const username = req.query.username;
    const data = await deleteQualifiedSeedByUsername(String(username ?? ""));
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export {
  triggerScrapeSync,
  getProfiles,
  markProfilesChecked,
  deletePendingProfiles,
  postQualifiedSeed,
  getQualifiedSeeds,
  deleteQualifiedSeed,
};
