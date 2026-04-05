import Input from "../models/Input.model.js";

// Split array into chunks
export const chunkArray = (arr, size) => {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};

// Check which usernames from inputs are new, save them, return duplicates
export const processInputUsernames = async (inputs) => {
  const normalized = inputs.map((u) => u.trim().toLowerCase());
  const duplicates = [];
  const newUsernames = [];

  // Check existing in DB
  const existing = await Input.find({ username: { $in: normalized } }).select(
    "username"
  );
  const existingSet = new Set(existing.map((e) => e.username));

  for (const username of normalized) {
    if (existingSet.has(username)) {
      duplicates.push(username);
    } else {
      newUsernames.push(username);
    }
  }

  return { duplicates, newUsernames };
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

export function numOrZero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * @param {Record<string, unknown>} profile
 * @param {{ hasExternalUrl: boolean; followersMin: number; followersMax: number }} opts
 * @returns {Record<string, unknown> | null}
 */
export function mapActorProfileToDoc(profile, opts) {
  const username = normalizeUsername(profile.username);
  if (!username) return null;

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
  const followers = numOrZero(
    profile.followersCount ?? profile.followers_count
  );

  return {
    id,
    username,
    full_name: fullName,
    url,
    input_url: inputUrl,
    followers_count: followers,
    bio,
    hasExternalUrl: opts.hasExternalUrl,
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

  const followers = numOrZero(
    related.followers_count ?? related.followersCount
  );

  return {
    id,
    username,
    full_name: fullName,
    url,
    input_url: inputUrl,
    followers_count: followers,
    bio,
    hasExternalUrl: false,
  };
}
