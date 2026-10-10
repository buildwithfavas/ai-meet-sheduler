import { getLLM } from "../config/llm.js";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

/**
 * Planner Agent Node
 * Analyzes meeting request, policies, and revision critique to propose candidate slots
 */
export async function plannerNode(state) {
  const { userRequest, ragContext, validation, iterationCount } = state;
  const currentIteration = (iterationCount || 0) + 1;

  console.log(`\n🤖 [Agent 1: Planner] Starting Planning Cycle (Iteration #${currentIteration})...`);

  const systemPrompt = `You are the Executive Meeting Planner Agent.
Your responsibility is to design candidate meeting slots that fulfill the user's intent while strictly complying with retrieved company policies and attendee preference profiles.

IMPORTANT RULES:
1. Standard business hours: 09:00 to 18:00. Never schedule before 09:00 or after 18:00.
2. Never propose weekend dates (Saturday/Sunday).
3. Do not propose slots during daily lunch hours (13:00 - 14:00) or Friday afternoons after 14:00.
4. If this is a revision cycle, CAREFULLY review the Validator critique and propose alternative non-conflicting times.
5. NEVER propose dates that have already passed. All meeting candidate slots must be on or after today's date.

OUTPUT FORMAT:
Respond with ONLY valid JSON (no markdown formatting, no code ticks, just raw JSON) following this exact structure:
{
  "meetingObjective": "Brief summary of the meeting",
  "durationMinutes": 30,
  "candidateSlots": [
    {
      "slotId": "slot-1",
      "date": "YYYY-MM-DD",
      "startTime": "HH:mm",
      "endTime": "HH:mm",
      "timezone": "UTC",
      "rationale": "Reason for selecting this slot"
    }
  ],
  "agendaDraft": ["Agenda point 1", "Agenda point 2"],
  "policyConsiderations": "How company policies and preferences were applied"
}`;

  let userPrompt = `MEETING REQUEST:
- Topic: ${userRequest.topic}
- Target Date: ${userRequest.preferredDate}
- Preferred Time: ${userRequest.timePreference}
- Duration: ${userRequest.durationMinutes} minutes
- Attendees: ${userRequest.attendees.join(", ")}
- Notes: ${userRequest.notes || "None"}

ORGANIZATIONAL CONTEXT & POLICIES (FROM RAG):
${ragContext}`;

  if (validation && validation.status === "NEEDS_REVISION") {
    userPrompt += `\n\n⚠️ PREVIOUS ATTEMPT REJECTED BY VALIDATOR:
- Violations: ${validation.violations.join(", ")}
- Validator Critique: ${validation.critique}
Please adjust the schedule to resolve all flagged violations!`;
  }

  const llm = getLLM();
  let planResult;

  try {
    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt)
    ]);

    const content = typeof response.content === "string" ? response.content : JSON.stringify(response.content);
    // Clean potential markdown ticks from local LLMs
    const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim();
    planResult = JSON.parse(cleaned);
  } catch (err) {
    console.warn("⚠️ JSON Parse fallback for Planner response:", err.message);
    // Fallback deterministic proposal based on input
    const [startH, startM] = (userRequest.timePreference?.includes("afternoon") ? [15, 0] : [10, 0]);
    const duration = userRequest.durationMinutes || 30;
    const endH = startH + Math.floor((startM + duration) / 60);
    const endM = (startM + duration) % 60;
    const pad = n => String(n).padStart(2, "0");

    planResult = {
      meetingObjective: `Discussion on ${userRequest.topic}`,
      durationMinutes: duration,
      candidateSlots: [
        {
          slotId: "slot-fallback-1",
          date: userRequest.preferredDate,
          startTime: `${pad(startH)}:${pad(startM)}`,
          endTime: `${pad(endH)}:${pad(endM)}`,
          timezone: "Asia/Kolkata",
          rationale: "Selected compliant standard business window"
        }
      ],
      agendaDraft: [`Discuss ${userRequest.topic}`, "Q&A and Next Steps"],
      policyConsiderations: "Standard working hours applied"
    };
  }

  console.log(`✅ [Agent 1: Planner] Proposed ${planResult.candidateSlots.length} candidate slot(s).`);

  return {
    plan: planResult,
    iterationCount: currentIteration,
    logs: [`Planner: Proposed slots on ${planResult.candidateSlots.map(s => s.startTime + '-' + s.endTime).join(", ")}`]
  };
}
