import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory cache to eliminate repetitive disk I/O
let cachedChunks = null;
let lastLoadedTime = 0;
const CACHE_TTL_MS = 10000; // 10-second cache before checking files again

/**
 * Loads and chunks company policies and attendee profiles from knowledge files
 */
export function initKnowledgeBase(forceReload = false) {
  const now = Date.now();
  if (!forceReload && cachedChunks && (now - lastLoadedTime < CACHE_TTL_MS)) {
    return cachedChunks;
  }

  const rootDir = path.resolve(__dirname, "../../");
  const policiesPath = path.join(rootDir, "knowledge", "company_policies.md");
  const profilesPath = path.join(rootDir, "knowledge", "attendee_profiles.json");

  const chunks = [];

  // 1. Ingest Company Policies
  if (fs.existsSync(policiesPath)) {
    try {
      const rawPolicyText = fs.readFileSync(policiesPath, "utf-8");
      const sections = rawPolicyText.split(/(?=##\s+)/g);
      for (const section of sections) {
        if (section.trim()) {
          chunks.push({
            type: "COMPANY_POLICY",
            content: section.trim()
          });
        }
      }
    } catch (e) {
      console.warn("⚠️ Failed to read company_policies.md:", e.message);
    }
  }

  // 2. Ingest Attendee Profiles from attendee_profiles.json
  if (fs.existsSync(profilesPath)) {
    try {
      const rawProfiles = JSON.parse(fs.readFileSync(profilesPath, "utf-8"));
      for (const profile of rawProfiles) {
        chunks.push({
          type: "ATTENDEE_PROFILE",
          attendeeEmail: profile.email.toLowerCase(),
          attendeeName: profile.name,
          timezone: profile.timezone,
          workingHours: profile.workingHours,
          content: `Attendee Profile: ${profile.name} (${profile.email})
Role: ${profile.role}
Timezone: ${profile.timezone}
Working Hours: ${profile.workingHours}
Preferences: ${profile.preferences}`
        });
      }
    } catch (e) {
      console.warn("⚠️ Failed to parse attendee_profiles.json:", e.message);
    }
  }

  cachedChunks = chunks;
  lastLoadedTime = now;
  return chunks;
}

/**
 * Keyword-and-relevance based semantic retrieval for meeting policies and attendee constraints
 * @param {object} searchCriteria - { query, attendeeEmails }
 * @returns {string} Formatted context block for the Planner agent
 */
export function queryKnowledgeBase({ query = "", attendeeEmails = [] }) {
  const chunks = initKnowledgeBase();

  const queryLower = query.toLowerCase();
  const targetEmails = attendeeEmails.map(e => e.toLowerCase());

  const matchedChunks = [];

  // Match attendee profiles directly
  for (const chunk of chunks) {
    if (chunk.type === "ATTENDEE_PROFILE") {
      if (targetEmails.includes(chunk.attendeeEmail) || queryLower.includes(chunk.attendeeName.toLowerCase())) {
        matchedChunks.push(chunk.content);
      }
    }
  }

  // Match relevant company policies
  for (const chunk of chunks) {
    if (chunk.type === "COMPANY_POLICY") {
      const isCore =
        chunk.content.includes("Working Hours") ||
        chunk.content.includes("Buffer Period") ||
        chunk.content.includes("Focus Blocks") ||
        chunk.content.includes("Lunch Block");

      const isRelevant = queryLower
        .split(/\s+/)
        .some(word => word.length > 3 && chunk.content.toLowerCase().includes(word));

      if (isCore || isRelevant) {
        if (!matchedChunks.includes(chunk.content)) {
          matchedChunks.push(chunk.content);
        }
      }
    }
  }

  return matchedChunks.length > 0
    ? matchedChunks.join("\n\n---\n\n")
    : "No special policy overrides found. Standard business hours (09:00 - 18:00) apply.";
}
