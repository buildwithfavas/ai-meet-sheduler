import { CalendarTool, generateGoogleMeetLink, getAttendeeProfiles } from "../tools/calendarTool.js";
import { computeAttendeeLocalTimes } from "../utils/dateTimeUtils.js";

/**
 * Executor Agent Node
 * Verifies live calendar availability for candidate slots and prepares draft booking
 */
export async function executorNode(state) {
  const { plan, userRequest } = state;
  console.log(`\n⚙️ [Agent 2: Executor] Checking calendar availability for proposed slots...`);

  const attendees = userRequest.attendees;
  const candidateSlots = plan?.candidateSlots || [];

  let selectedSlot = null;
  let conflictSummary = null;
  let draftInvite = null;

  for (const slot of candidateSlots) {
    const check = await CalendarTool.checkSlotAvailability(slot.date, slot.startTime, slot.endTime, attendees);

    if (check.available) {
      selectedSlot = slot;
      break;
    } else {
      const conflictList = check.conflicts.map(c => `${c.attendee}: ${c.conflictingEvent}`).join(", ");
      conflictSummary = `Conflict on slot ${slot.startTime}-${slot.endTime}: ${conflictList}`;
      console.log(`⚠️ [Agent 2: Executor] ${conflictSummary}`);
    }
  }

  if (selectedSlot) {
    const profiles = getAttendeeProfiles().filter(p =>
      attendees.some(a => a.toLowerCase() === p.email.toLowerCase())
    );

    const attendeeTimes = computeAttendeeLocalTimes(
      selectedSlot.date,
      selectedSlot.startTime,
      selectedSlot.endTime,
      selectedSlot.timezone || "Asia/Kolkata",
      profiles
    );

    // Generate draft booking with Google Meet video link
    draftInvite = {
      title: plan.meetingObjective || userRequest.topic,
      date: selectedSlot.date,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      durationMinutes: plan.durationMinutes || userRequest.durationMinutes,
      timezone: selectedSlot.timezone || "Asia/Kolkata",
      attendees,
      attendeeTimes,
      agenda: plan.agendaDraft || ["Sync & Discussion"],
      meetingLink: generateGoogleMeetLink()
    };

    console.log(`✅ [Agent 2: Executor] Successfully locked slot: ${selectedSlot.date} ${selectedSlot.startTime} - ${selectedSlot.endTime}`);
    console.log(`📹 [Agent 2: Executor] Assigned Google Meet room: ${draftInvite.meetingLink}`);
    if (attendeeTimes.length > 0) {
      console.log(`🌐 [Agent 2: Executor] Local Times: ${attendeeTimes.map(t => `${t.attendee}: ${t.localTime}`).join(" | ")}`);
    }
  } else {
    console.log(`❌ [Agent 2: Executor] All proposed candidate slots have calendar conflicts.`);
  }

  const executionResult = {
    selectedSlot,
    hasConflict: !selectedSlot,
    conflictDetails: conflictSummary,
    draftInvite
  };

  return {
    execution: executionResult,
    logs: [
      selectedSlot
        ? `Executor: Available slot found (${selectedSlot.startTime}-${selectedSlot.endTime}) with Google Meet (${draftInvite.meetingLink})`
        : `Executor: Conflict detected (${conflictSummary})`
    ]
  };
}
