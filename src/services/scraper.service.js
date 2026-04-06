import { randomUUID } from "node:crypto";
import createHttpError from "http-errors";
import Input from "../models/Input.model.js";
import Profile from "../models/Profile.model.js";
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

  return {
    data: results.docs,
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

export {
  runScrapePipeline,
  getPendingProfiles,
  markProfilesCheckedByUsernames,
  deleteAllPendingProfiles,
};
