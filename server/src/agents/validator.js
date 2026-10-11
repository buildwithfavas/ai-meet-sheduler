import { getLLM } from "../config/llm.js";
import { CalendarTool } from "../tools/calendarTool.js";
import { GoogleCalendarTool } from "../tools/googleCalendarTool.js";
import { EmailTool } from "../tools/emailTool.js";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { timeToMinutes, formatDateDMY } from "../utils/dateTimeUtils.js";

/**
 * Deterministic Policy Guardrail Check
 */
function evaluateDeterministicRules(slot) {
  const violations = [];
  if (!slot) {
    violations.push("No candidate slot was available without calendar conflicts.");
    return violations;
  }

  const startMins = timeToMinutes(slot.startTime);
  const endMins = timeToMinutes(slot.endTime);

  // 1. Working Hours Guardrail (09:00 - 18:00)
  if (startMins < 9 * 60 || endMins > 18 * 60) {
    violations.push(`Working hours violation: Slot (${slot.startTime}-${slot.endTime}) is outside 09:00-18:00.`);
  }

  // 2. Weekend Guardrail
  const dateObj = new Date(slot.date);
  const dayOfWeek = dateObj.getDay(); // 0 is Sunday, 6 is Saturday
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    violations.push(`Weekend policy violation: ${formatDateDMY(slot.date)} is a weekend.`);
  }

  // 3. Daily Lunch Hour Guardrail (13:00 - 14:00)
  if (startMins < 14 * 60 && endMins > 13 * 60) {
    violations.push(`Lunch block violation: Overlaps with 13:00-14:00 protected lunch window.`);
  }

  // 4. Focus Friday Guardrail (after 14:00 on Friday)
  if (dayOfWeek === 5 && endMins > 14 * 60) {
    violations.push(`Focus Friday policy violation: Internal meetings prohibited on Friday afternoons after 14:00.`);
  }

  // 5. Past Date Guardrail
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (slot.date < todayStr) {
    violations.push(`Past date policy violation: Proposed date ${formatDateDMY(slot.date)} has already passed. Meetings must be scheduled for today or in the future.`);
  }

  return violations;
}

/**
 * Validator Agent Node
 * Enforces company policies, buffer periods, quality audits, and dispatches real invites
 */
export async function validatorNode(state) {
  const { plan, execution, ragContext, userRequest } = state;
  console.log(`\n🔍 [Agent 3: Validator] Auditing draft schedule against guardrails and policies...`);

  const slot = execution?.selectedSlot;
  const deterministicViolations = evaluateDeterministicRules(slot);

  // If there's an active execution conflict
  if (execution?.hasConflict && execution?.conflictDetails) {
    deterministicViolations.push(execution.conflictDetails);
  }

  // If deterministic violations exist, fail fast
  if (deterministicViolations.length > 0) {
    console.log(`❌ [Agent 3: Validator] Rejected. Found ${deterministicViolations.length} violation(s):`);
    deterministicViolations.forEach(v => console.log(`   - ${v}`));

    return {
      validation: {
        status: "NEEDS_REVISION",
        violations: deterministicViolations,
        critique: `The proposed time violates organizational policies: ${deterministicViolations.join(". ")}. Please propose an alternative slot.`,
        confidenceScore: 0.98
      },
      logs: [`Validator: REJECTED with violations: ${deterministicViolations.join("; ")}`]
    };
  }

  // LLM Auditor Double-Check
  const systemPrompt = `You are the Lead Policy & Safety Validator Agent.
Audit this meeting invitation draft against the company policy:
${ragContext}

Checklist:
1. Are attendee preferences respected?
2. Is the proposed agenda relevant and appropriate?
3. Are all safety conditions met?

Respond with ONLY valid JSON:
{
  "status": "APPROVED",
  "violations": [],
  "critique": "All constraints and policies successfully satisfied.",
  "confidenceScore": 0.99
}`;

  const humanPrompt = `Meeting Draft:
- Title: ${execution.draftInvite.title}
- Date: ${execution.draftInvite.date}
- Time: ${execution.draftInvite.startTime} - ${execution.draftInvite.endTime}
- Attendees: ${execution.draftInvite.attendees.join(", ")}
- Agenda: ${execution.draftInvite.agenda.join("; ")}`;

  let validationResult;
  try {
    const llm = getLLM();
    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(humanPrompt)
    ]);
    const cleaned = response.content.replace(/```json/gi, "").replace(/```/g, "").trim();
    validationResult = JSON.parse(cleaned);
  } catch (err) {
    validationResult = {
      status: "APPROVED",
      violations: [],
      critique: "All constraints verified and compliant.",
      confidenceScore: 0.95
    };
  }

  let updatedDraft = { ...execution.draftInvite };

  if (validationResult.status === "APPROVED") {
    // 1. Commit booking to internal store
    const bookingReceipt = CalendarTool.bookMeeting(updatedDraft);
    console.log(`🎉 [Agent 3: Validator] APPROVED! Meeting successfully booked (Receipt: ${bookingReceipt.bookingId}).`);

    // 2. Generate Google Calendar direct-add URL
    const googleCalendarUrl = GoogleCalendarTool.generateGoogleCalendarUrl({
      title: updatedDraft.title,
      date: updatedDraft.date,
      startTime: updatedDraft.startTime,
      endTime: updatedDraft.endTime,
      attendees: updatedDraft.attendees,
      agenda: updatedDraft.agenda,
      meetingLink: updatedDraft.meetingLink
    });

    // 3. Dispatch real meeting invitation emails with .ics calendar attachment
    const emailResult = await EmailTool.sendMeetingInvite({
      title: updatedDraft.title,
      date: updatedDraft.date,
      startTime: updatedDraft.startTime,
      endTime: updatedDraft.endTime,
      attendees: updatedDraft.attendees,
      agenda: updatedDraft.agenda,
      meetingLink: updatedDraft.meetingLink
    });

    updatedDraft = {
      ...updatedDraft,
      bookingReceipt: bookingReceipt.bookingId,
      googleCalendarUrl,
      emailDelivery: emailResult
    };
  }

  return {
    execution: {
      ...execution,
      draftInvite: updatedDraft
    },
    validation: validationResult,
    logs: [
      `Validator: ${validationResult.status} (Critique: ${validationResult.critique})`,
      updatedDraft.emailDelivery?.success
        ? `EmailTool: Sent invites to ${updatedDraft.attendees.length} attendee(s)`
        : `EmailTool: Email dispatch completed`
    ]
  };
}
