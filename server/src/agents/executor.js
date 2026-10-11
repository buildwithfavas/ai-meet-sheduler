import { CalendarTool, generateGoogleMeetLink } from "../tools/calendarTool.js";

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
    // Generate draft booking with Google Meet video link
    draftInvite = {
      title: plan.meetingObjective || userRequest.topic,
      date: selectedSlot.date,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      durationMinutes: plan.durationMinutes || userRequest.durationMinutes,
      attendees,
      agenda: plan.agendaDraft || ["Sync & Discussion"],
      meetingLink: generateGoogleMeetLink()
    };
    console.log(`✅ [Agent 2: Executor] Successfully locked slot: ${selectedSlot.date} ${selectedSlot.startTime} - ${selectedSlot.endTime}`);
    console.log(`📹 [Agent 2: Executor] Assigned Google Meet room: ${draftInvite.meetingLink}`);
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
