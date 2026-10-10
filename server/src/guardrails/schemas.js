import { z } from "zod";

/**
 * Schema for initial meeting request input validation
 */
export const MeetingRequestInputSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters long"),
  durationMinutes: z.number().int().positive().default(30),
  preferredDate: z.string().describe("Target date in YYYY-MM-DD format"),
  timePreference: z.string().optional().describe("e.g. 'morning', 'afternoon', 'after 3pm'"),
  attendees: z.array(z.string().email("Invalid attendee email address")).min(1, "At least one attendee is required"),
  notes: z.string().optional()
});

/**
 * Schema for Planner Agent output
 */
export const CandidateSlotSchema = z.object({
  slotId: z.string().describe("Unique identifier for this candidate slot"),
  date: z.string().describe("YYYY-MM-DD"),
  startTime: z.string().describe("HH:mm in 24-hour format"),
  endTime: z.string().describe("HH:mm in 24-hour format"),
  timezone: z.string().describe("Base timezone of the slot"),
  rationale: z.string().describe("Why this slot complies with policies and attendee preferences")
});

export const PlannerOutputSchema = z.object({
  meetingObjective: z.string().describe("Summary of meeting purpose"),
  durationMinutes: z.number().int(),
  candidateSlots: z.array(CandidateSlotSchema).min(1, "At least one candidate slot must be proposed"),
  agendaDraft: z.array(z.string()).describe("Proposed agenda bullet points"),
  policyConsiderations: z.string().describe("How company policies and preferences influenced the plan")
});

/**
 * Schema for Executor Agent output
 */
export const ExecutorOutputSchema = z.object({
  selectedSlot: CandidateSlotSchema.nullable().describe("The best available slot from candidates, or null if all conflict"),
  hasConflict: z.boolean().describe("Whether any attendee has a scheduling conflict"),
  conflictDetails: z.string().nullable().describe("Explanation of any detected calendar conflict"),
  draftInvite: z.object({
    title: z.string(),
    date: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    durationMinutes: z.number(),
    attendees: z.array(z.string()),
    agenda: z.array(z.string()),
    meetingLink: z.string().url()
  }).nullable()
});

/**
 * Schema for Validator Agent output
 */
export const ValidatorOutputSchema = z.object({
  status: z.enum(["APPROVED", "NEEDS_REVISION"]).describe("Final validation verdict"),
  violations: z.array(z.string()).describe("List of rule, policy, or buffer violations if any"),
  critique: z.string().describe("Detailed feedback explaining why it passed or what must be revised by the Planner"),
  confidenceScore: z.number().min(0).max(1).describe("Confidence score of compliance")
});
