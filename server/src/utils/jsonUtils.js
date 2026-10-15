/**
 * Robust JSON extraction and parsing utilities for LLM responses
 * Handles markdown formatting, preambles, trailing commas, and malformed outputs
 */

/**
 * Extracts and parses a JSON object or array from potentially messy LLM response text
 * @param {string} rawText - Raw string from LLM invoke
 * @param {object|null} fallback - Optional fallback value if parsing completely fails
 * @returns {object|null} Parsed JSON object or fallback
 */
export function extractAndParseJSON(rawText, fallback = null) {
  if (!rawText || typeof rawText !== "string") {
    return fallback;
  }

  // 1. Strip markdown code fence indicators
  let text = rawText
    .replace(/^```json/gim, "")
    .replace(/^```/gm, "")
    .replace(/```$/gm, "")
    .trim();

  // 2. Direct parse attempt
  try {
    return JSON.parse(text);
  } catch (err) {
    // Continue to regex-based extraction
  }

  // 3. Find outermost JSON object '{ ... }' or array '[ ... ]'
  const firstCurly = text.indexOf("{");
  const lastCurly = text.lastIndexOf("}");
  const firstBracket = text.indexOf("[");
  const lastBracket = text.lastIndexOf("]");

  let candidate = null;

  if (firstCurly !== -1 && lastCurly > firstCurly) {
    // If curlies come before brackets or brackets don't exist
    if (firstBracket === -1 || firstCurly < firstBracket) {
      candidate = text.slice(firstCurly, lastCurly + 1);
    }
  }

  if (!candidate && firstBracket !== -1 && lastBracket > firstBracket) {
    candidate = text.slice(firstBracket, lastBracket + 1);
  }

  if (candidate) {
    // Clean common LLM formatting defects:
    // a) Remove trailing commas right before closing brace or bracket
    let sanitized = candidate.replace(/,\s*([}\]])/g, "$1");

    // b) Strip non-standard inline comments (// ...)
    sanitized = sanitized.replace(/\/\/[^\n\r]*/g, "");

    try {
      return JSON.parse(sanitized);
    } catch (parseErr) {
      console.warn("⚠️ [jsonUtils] Extracted JSON substring failed to parse:", parseErr.message);
    }
  }

  return fallback;
}
