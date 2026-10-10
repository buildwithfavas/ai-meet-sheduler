export const MAX_RECURSION_LIMIT = 3;

/**
 * Checks whether the multi-agent graph has exceeded the maximum retry/revision count
 * @param {number} iterationCount
 * @returns {boolean}
 */
export function isLoopLimitExceeded(iterationCount) {
  return iterationCount >= MAX_RECURSION_LIMIT;
}

/**
 * Generates a structured escalation response when iteration limit is reached
 * @param {object} state - Current graph state
 * @returns {object} Escalation summary
 */
export function createEscalationReport(state) {
  return {
    status: "ESCALATED_TO_HUMAN",
    message: `Scheduling could not be resolved automatically after ${MAX_RECURSION_LIMIT} revision cycles.`,
    reasons: state.validation?.violations || ["Unresolvable attendee calendar conflicts or policy restrictions."],
    lastAttemptedPlan: state.plan,
    recommendation: "Manual coordination required between participants to identify an exception slot."
  };
}
