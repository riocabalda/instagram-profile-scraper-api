import { randomUUID } from "node:crypto";
import createHttpError from "http-errors";
import Input from "../models/Input.model.js";
import Profile from "../models/Profile.model.js";
import QualifiedSeed from "../models/QualifiedSeed.model.js";
import { withPagination } from "../utils/paginate.js";
import { runFollowingActor, runProfileActor } from "../utils/apify.js";
import {
  chunkArray,
  processInputUsernames,
  mapActorProfileToDoc,
  hasMatchingExternalUrl,
} from "../utils/pipeline.js";

const DEFAULT_FOLLOWERS_MIN = 500;
const DEFAULT_FOLLOWERS_MAX = 50_000;

const runScrapePipeline = async ({
  inputs,
  followingLimit = 500,
  token,
  chunkLimit = 500,
  followersMin = DEFAULT_FOLLOWERS_MIN,
  followersMax = DEFAULT_FOLLOWERS_MAX,
}) => {
  const { duplicates, newUsernames, duplicatesInPayload } =
    await processInputUsernames(inputs);

  if (duplicates.length > 0) {
    // Whole batch rejected — no Input rows are inserted.
    throw createHttpError(
      409,
      duplicatesInPayload
        ? "Duplicate usernames in request body (same handle listed more than once)"
        : "Duplicate usernames already registered as inputs",
      {
        duplicates,
        reason: duplicatesInPayload ? "payload" : "database",
      }
    );
  }

  await Input.insertMany(newUsernames.map((username) => ({ username })));

  const results = await runFollowingActor({
    usernames: newUsernames,
    followingLimit,
    token,
  });

  const chunks = chunkArray(results, chunkLimit);
  let totalProfilesProcessed = 0;
  let totalProfilesSaved = 0;
  let totalDuplicatesSkipped = 0;

  for (const chunk of chunks) {
    const usernamesInChunk = chunk.map((item) => item.username);

    const profileResults = await runProfileActor({
      usernames: usernamesInChunk,
      token,
    });

    const profilesToSave = [];

    for (const profile of profileResults) {
      // if (
      //   profile.relatedProfiles &&
      //   profile.relatedProfiles.length > 0 &&
      //   profile.externalUrl
      // ) {
      //   const main = mapActorProfileToDoc(profile, {
      //     has_external_url: true,
      //     followersMin,
      //     followersMax,
      //   });
      //   if (main) profilesToSave.push(main);

      //   const relatedList = Array.isArray(profile.relatedProfiles)
      //     ? profile.relatedProfiles
      //     : [];
      //   const relatedChunks = chunkArray(relatedList, chunkLimit);
      //   for (const relatedChunk of relatedChunks) {
      //     for (const related of relatedChunk) {
      //       const rel =
      //         typeof related === "object" && related !== null ? related : {};
      //       const mapped = mapActorProfileToDoc(rel, {
      //         has_external_url: false,
      //         followersMin,
      //         followersMax,
      //       });
      //       if (mapped) profilesToSave.push(mapped);
      //     }
      //   }
      // } else if (
      //   profile.followersCount &&
      //   profile.externalUrl &&
      //   profile.followersCount >= followersMin &&
      //   profile.followersCount <= followersMax &&
      //   (profile.inputUrl || profile.url) &&
      //   hasMatchingExternalUrl(profile.externalUrl)
      // ) {
      //   const doc = mapActorProfileToDoc(profile, {
      //     has_external_url: false,
      //     followersMin,
      //     followersMax,
      //   });
      //   if (doc) profilesToSave.push(doc);
      // }

      if (
        profile.followersCount &&
        profile.externalUrl &&
        profile.followersCount >= followersMin &&
        profile.followersCount <= followersMax &&
        (profile.inputUrl || profile.url) &&
        hasMatchingExternalUrl(profile.externalUrl)
      ) {
        const doc = mapActorProfileToDoc(profile, {
          has_external_url: false,
          followersMin,
          followersMax,
        });
        if (doc) profilesToSave.push(doc);
      }
    }

    const seenUsernames = new Set();
    const dedupedToSave = profilesToSave.filter((p) => {
      const key = String(p.username || "")
        .trim()
        .toLowerCase();
      if (!key || seenUsernames.has(key)) return false;
      seenUsernames.add(key);
      return true;
    });

    totalProfilesProcessed += profileResults.length;

    if (dedupedToSave.length > 0) {
      const usernamesToCheck = dedupedToSave.map((p) => p.username);
      const existingProfiles = await Profile.find({
        username: { $in: usernamesToCheck },
      })
        .select("username")
        .lean();
      const existingUsernames = new Set(
        existingProfiles.map((p) => String(p.username).toLowerCase())
      );

      const newProfiles = dedupedToSave.filter(
        (p) => !existingUsernames.has(String(p.username).toLowerCase())
      );

      totalDuplicatesSkipped += dedupedToSave.length - newProfiles.length;

      if (newProfiles.length > 0) {
        await Profile.insertMany(newProfiles, { ordered: false });
        totalProfilesSaved += newProfiles.length;
      }
    }
  }

  return {
    message: "Pipeline completed",
    totalProfilesProcessed,
    totalProfilesSaved,
    totalDuplicatesSkipped,
    totalChunks: chunks.length,
  };
};

const getPendingProfiles = async ({ page = 1, limit = 100 }) => {
  const results = await Profile.paginate(
    { status: "pending" },
    {
      page,
      limit,
      sort: { createdAt: -1 },
      lean: true,
    }
  );

  const usernames = results.docs.map((d) =>
    String(d.username || "").toLowerCase()
  );
  const qualifiedRows = await QualifiedSeed.find({
    username: { $in: usernames },
  })
    .select("username")
    .lean();
  const qualifiedSet = new Set(
    qualifiedRows.map((r) => String(r.username || "").toLowerCase())
  );

  const data = results.docs.map((doc) => ({
    ...doc,
    is_qualified_seed: qualifiedSet.has(
      String(doc.username || "").toLowerCase()
    ),
  }));

  return {
    data,
    pagination: withPagination(results),
  };
};

const markProfilesCheckedByUsernames = async (usernames) => {
  const normalized = [
    ...new Set(
      usernames
        .map((u) => String(u).trim().toLowerCase())
        .filter((u) => u.length > 0)
    ),
  ];
  if (normalized.length === 0) {
    return { modifiedCount: 0, matchedCount: 0 };
  }
  const result = await Profile.updateMany(
    { username: { $in: normalized } },
    { $set: { status: "checked" } }
  );
  const modifiedCount = result.modifiedCount ?? 0;
  const matchedCount = result.matchedCount ?? modifiedCount;
  return { modifiedCount, matchedCount };
};

const deleteAllPendingProfiles = async () => {
  const result = await Profile.deleteMany({ status: "pending" });
  const deletedCount = result.deletedCount ?? 0;
  return { deletedCount };
};

/**
 * @param {{ username: string; following: number }} params
 */
const upsertQualifiedSeed = async ({ username, following }) => {
  let norm = String(username ?? "").trim().toLowerCase();
  if (norm.startsWith("@")) {
    norm = norm.slice(1).trim();
  }
  if (!norm) {
    throw createHttpError(400, "username is required", { expose: true });
  }
  const followingNum = Number(following);
  if (!Number.isFinite(followingNum) || followingNum < 0) {
    throw createHttpError(400, "following must be a non-negative number", {
      expose: true,
    });
  }

  const followingInt = Math.floor(followingNum);
  await QualifiedSeed.updateOne(
    { username: norm },
    { $set: { username: norm, following: followingInt } },
    { upsert: true }
  );

  const doc = await QualifiedSeed.findOne({ username: norm }).lean();
  return {
    username: doc?.username ?? norm,
    following: doc?.following ?? followingInt,
  };
};

/**
 * @param {string} username
 */
const deleteQualifiedSeedByUsername = async (username) => {
  let norm = String(username ?? "").trim().toLowerCase();
  if (norm.startsWith("@")) {
    norm = norm.slice(1).trim();
  }
  if (!norm) {
    throw createHttpError(400, "username is required", { expose: true });
  }
  const result = await QualifiedSeed.deleteOne({ username: norm });
  const deletedCount = result.deletedCount ?? 0;
  if (deletedCount === 0) {
    throw createHttpError(404, "Qualified seed not found", { expose: true });
  }
  return { username: norm };
};

const mapQualifiedSeedDocs = (docs) =>
  docs.map((d) => ({
    username: d.username,
    following: d.following,
  }));

/**
 * All qualified seed documents (no following cap, includes pipeline input usernames).
 */
const getQualifiedSeedsAll = async () => {
  const docs = await QualifiedSeed.find({}).sort({ createdAt: -1 }).lean();
  return mapQualifiedSeedDocs(docs);
};

/**
 * Qualified seeds with following count at or below the limit, excluding usernames
 * registered as pipeline inputs.
 * @param {{ followingLimit: number }} params
 */
const getQualifiedSeedsFiltered = async ({ followingLimit }) => {
  const limitNum = Number(followingLimit);
  if (!Number.isFinite(limitNum) || limitNum < 0) {
    throw createHttpError(400, "followingLimit must be a non-negative number", {
      expose: true,
    });
  }
  const inputUsernames = await Input.distinct("username");
  const filter = {
    following: { $lte: Math.floor(limitNum) },
    ...(inputUsernames.length > 0
      ? { username: { $nin: inputUsernames } }
      : {}),
  };
  const docs = await QualifiedSeed.find(filter).sort({ createdAt: -1 }).lean();
  return mapQualifiedSeedDocs(docs);
};

export {
  runScrapePipeline,
  getPendingProfiles,
  markProfilesCheckedByUsernames,
  deleteAllPendingProfiles,
  upsertQualifiedSeed,
  deleteQualifiedSeedByUsername,
  getQualifiedSeedsFiltered,
  getQualifiedSeedsAll,
};
