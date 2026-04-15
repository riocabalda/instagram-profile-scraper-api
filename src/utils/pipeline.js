import { randomUUID } from "node:crypto";
import { LINK_DOMAINS } from "../constant/socialDomain.js";
import Input from "../models/Input.model.js";

// Split array into chunks
export const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

/**
 * Validates input seeds. If any username is duplicated in the body or already
 * stored in `inputs`, returns those handles and **empty** `newUsernames` so the
 * caller never persists a partial batch.
 */
export const processInputUsernames = async (inputs) => {
  const normalized = inputs
    .map((u) =>
      String(u ?? "")
        .trim()
        .toLowerCase(),
    )
    .filter((u) => u.length > 0);

  const counts = new Map();
  for (const u of normalized) {
    counts.set(u, (counts.get(u) ?? 0) + 1);
  }
  const duplicatesInPayload = [...counts.entries()]
    .filter(([, c]) => c > 1)
    .map(([u]) => u)
    .sort((a, b) => a.localeCompare(b));

  if (duplicatesInPayload.length > 0) {
    return {
      duplicates: duplicatesInPayload,
      newUsernames: [],
      duplicatesInPayload: true,
    };
  }

  const uniqueInOrder = [...new Set(normalized)];

  const duplicates = [];
  const newUsernames = [];

  const existing = await Input.find({
    username: { $in: uniqueInOrder },
  }).select("username");
  const existingSet = new Set(existing.map((e) => e.username));

  for (const username of uniqueInOrder) {
    if (existingSet.has(username)) {
      duplicates.push(username);
    } else {
      newUsernames.push(username);
    }
  }

  if (duplicates.length > 0) {
    duplicates.sort((a, b) => a.localeCompare(b));
    return { duplicates, newUsernames: [], duplicatesInPayload: false };
  }

  return { duplicates: [], newUsernames, duplicatesInPayload: false };
};

/** @param {unknown} value */
export function normalizeUsername(value) {
  const u = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!u || u === "related profiles") return "";
  return u;
}

/**
 * Stable id for Profile schema (required, unique). Never use duplicate placeholders.
 * @param {unknown} rawId
 * @param {string} usernameNorm
 */
export function normalizeProfileId(rawId, usernameNorm) {
  const raw = rawId != null ? String(rawId).trim() : "";
  const lower = raw.toLowerCase();
  if (raw && lower !== "related profiles") return raw;
  if (usernameNorm) return `synth-${usernameNorm}`;
  return `synth-${randomUUID()}`;
}

/**
 * @param {Record<string, unknown>} profile
 * @param {{ followersMin: number; followersMax: number }} opts
 * @returns {Record<string, unknown> | null}
 */
export function mapActorProfileToDoc(profile, opts) {
  const { followersMin = 500, followersMax = 50_000 } = opts;
  const username = normalizeUsername(profile.username);
  const criteriaCheck =
    profile.followersCount &&
    profile.externalUrl &&
    profile.followersCount >= followersMin &&
    profile.followersCount <= followersMax &&
    (profile.inputUrl || profile.url) &&
    hasMatchingExternalUrl(profile.externalUrl);

  if (!username || !criteriaCheck) return null;

  const id = normalizeProfileId(profile.id, username);
  const fullName =
    (typeof profile.fullName === "string" && profile.fullName) ||
    (typeof profile.full_name === "string" && profile.full_name) ||
    "";
  const bio =
    (typeof profile.biography === "string" && profile.biography) ||
    (typeof profile.bio === "string" && profile.bio) ||
    "";
  const url =
    (typeof profile.url === "string" && profile.url.trim()) ||
    `https://www.instagram.com/${username}`;
  const inputUrl =
    (typeof profile.inputUrl === "string" && profile.inputUrl.trim()) ||
    (typeof profile.input_url === "string" && profile.input_url?.trim()) ||
    `https://www.instagram.com/${username}`;
  const followers = profile.followersCount || -1;
  const followsRaw =
    profile.followsCount ??
    profile.followingCount ??
    profile.follows_count ??
    profile.following_count;
  const follows =
    typeof followsRaw === "number" && Number.isFinite(followsRaw)
      ? followsRaw
      : 0;
  const externalUrl =
    typeof profile.externalUrl === "string" ? profile.externalUrl.trim() : "";

  return {
    id,
    username,
    full_name: fullName,
    url,
    input_url: inputUrl,
    followers_count: followers,
    follows_count: follows,
    bio,
    external_url: externalUrl,
  };
}

/**
 * @param {Record<string, unknown>} related
 * @returns {Record<string, unknown> | null}
 */
export function mapRelatedProfileToDoc(related) {
  const username = normalizeUsername(related.username);
  if (!username) return null;

  const id = normalizeProfileId(related.id, username);
  const fullName =
    (typeof related.full_name === "string" && related.full_name) ||
    (typeof related.fullName === "string" && related.fullName) ||
    "";
  const bio =
    (typeof related.bio === "string" && related.bio) ||
    (typeof related.biography === "string" && related.biography) ||
    "";
  const url =
    (typeof related.url === "string" && related.url.trim()) ||
    `https://www.instagram.com/${username}`;
  const inputUrl =
    (typeof related.input_url === "string" && related.input_url.trim()) ||
    (typeof related.inputUrl === "string" && related.inputUrl.trim()) ||
    url;

  const followers = related.followersCount || -1;
  const followsRaw =
    related.followsCount ??
    related.followingCount ??
    related.follows_count ??
    related.following_count;
  const follows =
    typeof followsRaw === "number" && Number.isFinite(followsRaw)
      ? followsRaw
      : 0;

  return {
    id,
    username,
    full_name: fullName,
    url,
    input_url: inputUrl,
    followers_count: followers,
    follows_count: follows,
    bio,
    external_url: "",
  };
}

export function hasMatchingExternalUrl(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return LINK_DOMAINS.includes(hostname);
  } catch {
    return false;
  }
}
