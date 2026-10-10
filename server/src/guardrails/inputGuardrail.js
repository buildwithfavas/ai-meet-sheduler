import { MeetingRequestInputSchema } from "./schemas.js";
import { formatDateDMY } from "../utils/dateTimeUtils.js";

/**
 * List of known prompt injection patterns and unauthorized system commands
 */
const INJECTION_PATTERNS = [
  /ignore (all )?(previous|above) instructions/i,
  /system override/i,
  /you are now in developer mode/i,
  /jailbreak/i,
  /delete (all )?(calendar|events|database)/i,
  /drop table/i,
  /<script>/i,
  /bypass guardrails/i
];

/**
 * Validates and sanitizes user input before passing it to agents
 * @param {object} input - Raw user request payload
 * @returns {{ valid: boolean, sanitizedInput?: object, error?: string }}
 */
export function validateAndSanitizeInput(input) {
  // 1. Prompt Injection & Security Check on string fields
  const combinedText = [input.topic, input.notes, input.timePreference].filter(Boolean).join(" ");
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(combinedText)) {
      return {
        valid: false,
        error: `Security Guardrail Alert: Input contains prohibited or potentially malicious pattern (${pattern}).`
      };
    }
  }

  // 2. Syntactic & Schema Validation
  const result = MeetingRequestInputSchema.safeParse(input);
  if (!result.success) {
    const errorMessages = result.error.errors.map(err => `${err.path.join(".")}: ${err.message}`).join("; ");
    return {
      valid: false,
      error: `Input Validation Error: ${errorMessages}`
    };
  }

  // 3. Past Date Guardrail: Ensure requested date is today or in the future
  const data = result.data;
  const now = new Date();
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (data.preferredDate < todayISO) {
    return {
      valid: false,
      error: `Date Validation Error: The requested date (${formatDateDMY(data.preferredDate)}) has already passed. Please select today (${formatDateDMY(todayISO)}) or a future date.`
    };
  }

  // 4. Return sanitized data
  return {
    valid: true,
    sanitizedInput: {
      topic: data.topic.trim(),
      durationMinutes: data.durationMinutes,
      preferredDate: data.preferredDate.trim(),
      timePreference: data.timePreference?.trim() || "business hours",
      attendees: data.attendees.map(email => email.trim().toLowerCase()),
      notes: data.notes?.trim() || ""
    }
  };
}
