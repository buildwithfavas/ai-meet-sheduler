import { getLLM } from "../config/llm.js";
import { CalendarTool } from "../tools/calendarTool.js";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { getDateDetails, addMinutesToTime, getTodayISO, formatDateDMY } from "../utils/dateTimeUtils.js";
import { extractAndParseJSON } from "../utils/jsonUtils.js";

/**
 * Planner Agent Node
 * Analyzes meeting request, policies, and revision critique to propose candidate slots
 */
export async function plannerNode(state) {
  const { userRequest, ragContext, validation, iterationCount, plan: previousPlan } = state;
  const currentIteration = (iterationCount || 0) + 1;

  console.log(`\n🤖 [Agent 1: Planner] Starting Planning Cycle (Iteration #${currentIteration})...`);

  // 1. Analyze Date Metadata
  const dateMeta = getDateDetails(userRequest.preferredDate);
  const todayISO = getTodayISO();

  // 2. Pre-fetch Free Windows and Busy Slots for attendees
  let freeWindows = [];
  let busySlots = [];
  try {
    freeWindows = await CalendarTool.getFreeWindows(userRequest.preferredDate, userRequest.durationMinutes, userRequest.attendees);
    busySlots = await CalendarTool.getBusySlots(userRequest.preferredDate, userRequest.attendees);
  } catch (err) {
    console.warn("⚠️ [Agent 1: Planner] Could not pre-fetch calendar windows:", err.message);
  }

  const freeWindowsText = freeWindows.length > 0
    ? freeWindows.map(w => `${w.startTime} - ${w.endTime} (${w.durationMinutes} min available)`).join(", ")
    : "No continuous free windows found. Strict optimization needed.";

  const busySlotsText = busySlots.length > 0
    ? busySlots.map(s => `${s.attendee}: ${s.startTime}-${s.endTime} (${s.title})`).join("; ")
    : "None recorded.";

  // 3. Dynamic Policy Instructions based on Date
  const fridayRule = dateMeta?.isFriday
    ? "⚠️ FOCUS FRIDAY ACTIVE: The target date is a Friday! Internal meetings after 14:00 are STRICTLY PROHIBITED. All candidate slots MUST conclude at or before 14:00."
    : "Standard business hours apply (09:00 - 18:00).";

  const systemPrompt = `You are the Executive Meeting Planner Agent.
Your responsibility is to design candidate meeting slots that fulfill the user's intent while strictly complying with company policies, calendar availability, and attendee preferences.

TEMPORAL CONSTRAINTS:
- Current Calendar Date: ${todayISO}
- Target Date: ${userRequest.preferredDate} (${dateMeta?.dayName || "Unknown"})
- Standard Business Hours: 09:00 to 18:00. Never propose slots before 09:00 or concluding after 18:00.
- Daily Lunch Protection Block: 13:00 to 14:00 is strictly reserved for lunch. Never schedule slots overlapping 13:00-14:00.
- Buffer Requirement: Mandatory 15-minute gap before and after any existing meeting.
- ${fridayRule}
- Never propose weekend dates (Saturday/Sunday).
- Never propose dates in the past.

OUTPUT FORMAT:
Respond with ONLY valid JSON (no markdown ticks, no preamble, raw JSON only) following this exact schema:
{
  "meetingObjective": "Brief summary of the meeting",
  "durationMinutes": ${userRequest.durationMinutes},
  "candidateSlots": [
    {
      "slotId": "slot-1",
      "date": "${userRequest.preferredDate}",
      "startTime": "HH:mm",
      "endTime": "HH:mm",
      "timezone": "Asia/Kolkata",
      "rationale": "Reason for selecting this slot"
    }
  ],
  "agendaDraft": ["Agenda point 1", "Agenda point 2"],
  "policyConsiderations": "Explanation of compliance with working hours, lunch blocks, and Friday restrictions"
}`;

  let userPrompt = `MEETING REQUEST:
- Topic: ${userRequest.topic}
- Target Date: ${userRequest.preferredDate} (${dateMeta?.dayName || ""})
- Preferred Time: ${userRequest.timePreference}
- Duration: ${userRequest.durationMinutes} minutes
- Attendees: ${userRequest.attendees.join(", ")}
- Notes: ${userRequest.notes || "None"}

LIVE CALENDAR AVAILABILITY (GROUND TRUTH):
- Verified Free Meeting Windows: ${freeWindowsText}
- Existing Attendee Commitments: ${busySlotsText}

ORGANIZATIONAL CONTEXT & POLICIES (FROM RAG):
${ragContext}`;

  if (validation && validation.status === "NEEDS_REVISION") {
    userPrompt += `\n\n⚠️ PREVIOUS ATTEMPT REJECTED BY VALIDATOR:
- Violations: ${validation.violations.join(", ")}
- Validator Critique: ${validation.critique}
Please propose alternative, compliant slots from the remaining free windows!`;
  }

  const llm = getLLM();
  let planResult = null;

  try {
    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt)
    ]);

    const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
    planResult = extractAndParseJSON(content);

    // Validate structure
    if (!planResult || !Array.isArray(planResult.candidateSlots) || planResult.candidateSlots.length === 0) {
      throw new Error("Invalid or empty candidateSlots in LLM response");
    }

    // Mathematical duration enforcement on candidate slots
    planResult.candidateSlots = planResult.candidateSlots.map((slot, idx) => {
      const correctEnd = addMinutesToTime(slot.startTime, userRequest.durationMinutes);
      return {
        ...slot,
        slotId: slot.slotId || `slot-${idx + 1}`,
        date: slot.date || userRequest.preferredDate,
        endTime: correctEnd,
        timezone: slot.timezone || "Asia/Kolkata"
      };
    });
  } catch (err) {
    console.warn("⚠️ [Agent 1: Planner] LLM parse failed or returned invalid format. Triggering deterministic compliant slot-finder:", err.message);

    // Collect previously rejected slots to exclude them from fallback
    const excludedSlots = [];
    if (previousPlan?.candidateSlots) {
      excludedSlots.push(...previousPlan.candidateSlots);
    }

    const fallbackSlot = await CalendarTool.findFirstCompliantSlot(
      userRequest.preferredDate,
      userRequest.durationMinutes,
      userRequest.timePreference,
      userRequest.attendees,
      excludedSlots
    );

    if (fallbackSlot) {
      planResult = {
        meetingObjective: `Discussion on ${userRequest.topic}`,
        durationMinutes: userRequest.durationMinutes,
        candidateSlots: [fallbackSlot],
        agendaDraft: [`Discuss ${userRequest.topic}`, "Key Technical Objectives", "Action Items & Timeline"],
        policyConsiderations: `Deterministic compliant window selected on ${dateMeta?.dayName || "weekday"}, respecting lunch blocks, Friday policies, and attendee calendar buffers.`
      };
    } else {
      // Emergency safe default
      const defaultStart = dateMeta?.isFriday ? "10:00" : "15:00";
      planResult = {
        meetingObjective: `Discussion on ${userRequest.topic}`,
        durationMinutes: userRequest.durationMinutes,
        candidateSlots: [
          {
            slotId: "slot-emergency-1",
            date: userRequest.preferredDate,
            startTime: defaultStart,
            endTime: addMinutesToTime(defaultStart, userRequest.durationMinutes),
            timezone: "Asia/Kolkata",
            rationale: "Default safe business window"
          }
        ],
        agendaDraft: [`Discuss ${userRequest.topic}`, "Next Steps"],
        policyConsiderations: "Standard working hours applied"
      };
    }
  }

  console.log(`✅ [Agent 1: Planner] Proposed ${planResult.candidateSlots.length} candidate slot(s): ${planResult.candidateSlots.map(s => `${s.startTime}-${s.endTime}`).join(", ")}`);

  return {
    plan: planResult,
    iterationCount: currentIteration,
    logs: [`Planner: Proposed candidate slot(s) ${planResult.candidateSlots.map(s => `${s.startTime}-${s.endTime}`).join(", ")}`]
  };
}
