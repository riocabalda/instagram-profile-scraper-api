import { ApifyClient } from "apify-client";
import createHttpError from "http-errors";
import actorConfig from "../config/actor.js";

const upstreamMessage = (error) =>
  error instanceof Error ? error.message : String(error);

// Run Actor 1 — Get following list of seed accounts
const runFollowingActor = async ({
  usernames,
  followingLimit = 2000,
  token,
}) => {
  try {
    const client = new ApifyClient({ token });

    const input = {
      Account: usernames,
      resultsLimit: followingLimit,
      dataToScrape: "Followings",
    };
    const run = await client.actor(actorConfig.ACTOR_FOLLOWING_ID).call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    return items;
  } catch (error) {
    throw createHttpError(502, `[Following Actor] ${upstreamMessage(error)}`, {
      expose: true,
    });
  }
};

// Run Actor 2 — Get full profile data for a chunk of usernames
const runProfileActor = async ({ usernames, token }) => {
  try {
    const client = new ApifyClient({ token });

    const input = {
      usernames,
      includeAboutSection: false,
    };

    const run = await client.actor(actorConfig.ACTOR_PROFILE_ID).call(input);
    const { items } = await client.dataset(run.defaultDatasetId).listItems();

    return items;
  } catch (error) {
    throw createHttpError(502, `[Profile Actor] ${upstreamMessage(error)}`, {
      expose: true,
    });
  }
};

export { runFollowingActor, runProfileActor };
