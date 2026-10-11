import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { buildSchedulerGraph } from "../graph/schedulerGraph.js";
import { CalendarTool, getAttendeeProfiles } from "../tools/calendarTool.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize compiled LangGraph workflow
const schedulerGraph = buildSchedulerGraph();

/**
 * Meeting Controller
 * Orchestrates meeting scheduling requests, calendar lookups, and knowledge retrieval
 */
export const meetingController = {
  /**
   * POST /api/schedule
   * Core Agentic pipeline invocation
   */
  async scheduleMeeting(req, res) {
    const { topic, durationMinutes, preferredDate, timePreference, attendees, notes } = req.body;

    try {
      console.log(`\n📥 [Controller: Meeting] Received schedule request: "${topic}" on ${preferredDate}`);

      const result = await schedulerGraph.invoke({
        userRequest: {
          topic,
          durationMinutes: Number(durationMinutes) || 30,
          preferredDate,
          timePreference: timePreference || "business hours",
          attendees: Array.isArray(attendees) ? attendees : [attendees],
          notes: notes || ""
        }
      });

      res.json({
        success: result.finalStatus === "SUCCESS",
        finalStatus: result.finalStatus,
        confirmedInvite: result.execution?.draftInvite || null,
        plan: result.plan || null,
        execution: result.execution || null,
        validation: result.validation || null,
        iterationCount: result.iterationCount || 0,
        ragContext: result.ragContext || "",
        logs: result.logs || []
      });
    } catch (error) {
      console.error("❌ [Controller: Meeting] Error:", error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * POST /api/schedule/stream
   * Real-time Multi-Agent SSE Streaming invocation
   */
  async scheduleMeetingStream(req, res) {
    const { topic, durationMinutes, preferredDate, timePreference, attendees, notes } = req.body;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

    const sendEvent = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      console.log(`\n📥 [Controller: Stream] Received request: "${topic}" on ${preferredDate}`);
      sendEvent("start", { activeAgent: "planner", message: "Starting agent pipeline..." });

      const initialState = {
        userRequest: {
          topic,
          durationMinutes: Number(durationMinutes) || 30,
          preferredDate,
          timePreference: timePreference || "business hours",
          attendees: Array.isArray(attendees) ? attendees : [attendees],
          notes: notes || ""
        }
      };

      let accumulated = { ...initialState };
      const stream = await schedulerGraph.stream(initialState, { streamMode: "updates" });

      for await (const chunk of stream) {
        for (const [nodeName, nodeOutput] of Object.entries(chunk)) {
          accumulated = { ...accumulated, ...nodeOutput };

          if (nodeName === "inputGuardrail") {
            const isBlocked = nodeOutput.finalStatus === "GUARDRAIL_BLOCKED";
            sendEvent("step", {
              node: "inputGuardrail",
              status: isBlocked ? "BLOCKED" : "PASSED",
              activeAgent: isBlocked ? null : "planner",
              message: isBlocked ? "🛡️ Input Guardrail blocked prompt injection attempt." : "🛡️ Input Guardrail verified and sanitized request."
            });

            if (isBlocked) {
              sendEvent("done", {
                success: false,
                finalStatus: "GUARDRAIL_BLOCKED",
                logs: nodeOutput.logs || ["Security Guardrail blocked request."],
                message: "🛡️ Request blocked by Input Guardrail."
              });
              res.end();
              return;
            }
          } else if (nodeName === "ragRetriever") {
            sendEvent("step", {
              node: "ragRetriever",
              activeAgent: "planner",
              ragContext: nodeOutput.ragContext,
              message: "📚 RAG retrieved attendee profiles and company scheduling policies."
            });
          } else if (nodeName === "planner") {
            const iter = accumulated.iterationCount || 1;
            sendEvent("step", {
              node: "planner",
              activeAgent: "executor",
              plan: nodeOutput.plan,
              iterationCount: iter,
              isRevision: iter > 1,
              message: iter > 1
                ? `🔁 Revision Cycle #${iter}: Agent 1 (Planner) generated new alternative slots avoiding previous conflicts.`
                : `🤖 Agent 1 (Planner) formulated ${nodeOutput.plan?.candidateSlots?.length || 1} candidate slot(s).`
            });
          } else if (nodeName === "executor") {
            const iter = accumulated.iterationCount || 1;
            const hasConflict = nodeOutput.execution?.hasConflict;
            sendEvent("step", {
              node: "executor",
              activeAgent: "validator",
              execution: nodeOutput.execution,
              iterationCount: iter,
              isRevision: iter > 1,
              message: hasConflict
                ? `⚠️ Agent 2 (Executor) detected calendar conflict (${nodeOutput.execution?.conflictDetails}). Forwarding to Validator.`
                : `⚙️ Agent 2 (Executor) locked conflict-free slot: ${nodeOutput.execution?.selectedSlot?.startTime || nodeOutput.execution?.lockedSlot?.startTime} - ${nodeOutput.execution?.selectedSlot?.endTime || nodeOutput.execution?.lockedSlot?.endTime}.`
            });
          } else if (nodeName === "validator") {
            const approved = nodeOutput.validation?.status === "APPROVED";
            const iter = accumulated.iterationCount || 1;
            const violations = nodeOutput.validation?.violations || [];
            const violationText = violations.length > 0 ? violations.join("; ") : (nodeOutput.validation?.critique || "Policy mismatch");

            sendEvent("step", {
              node: "validator",
              activeAgent: approved ? "complete" : "planner",
              validation: nodeOutput.validation,
              execution: accumulated.execution,
              iterationCount: iter,
              needsRevision: !approved,
              message: approved
                ? `🎉 Agent 3 (Validator) APPROVED! All constraints and policies met.`
                : `⚠️ Agent 3 (Validator) detected conflict: "${violationText}". Looping back to Agent 1 (Planner) for Revision Cycle #${iter + 1}...`
            });
          } else if (nodeName === "complete") {
            sendEvent("done", {
              success: true,
              finalStatus: "SUCCESS",
              confirmedInvite: accumulated.execution?.draftInvite || null,
              plan: accumulated.plan || null,
              execution: accumulated.execution || null,
              validation: accumulated.validation || null,
              iterationCount: accumulated.iterationCount || 1,
              ragContext: accumulated.ragContext || "",
              logs: accumulated.logs || [],
              message: `🎉 Meeting successfully scheduled and verified in ${accumulated.iterationCount || 1} cycle(s)!`
            });
          } else if (nodeName === "escalate") {
            sendEvent("done", {
              success: false,
              finalStatus: "ESCALATED",
              plan: accumulated.plan || null,
              execution: accumulated.execution || null,
              validation: accumulated.validation || null,
              iterationCount: accumulated.iterationCount || 3,
              logs: accumulated.logs || [],
              message: "⚠️ Maximum revision cycles exceeded. Escalated to human organizer."
            });
          }
        }
      }

      res.end();
    } catch (error) {
      console.error("❌ [Controller: Stream] Error:", error);
      sendEvent("error", { error: error.message });
      res.end();
    }
  },

  /**
   * GET /api/knowledge
   * Returns company policies and attendee profiles dynamically from files
   */
  getKnowledge(req, res) {
    try {
      const rootDir = path.resolve(__dirname, "../../");
      const policiesPath = path.join(rootDir, "knowledge", "company_policies.md");
      const profilesPath = path.join(rootDir, "knowledge", "attendee_profiles.json");

      const policies = fs.existsSync(policiesPath) ? fs.readFileSync(policiesPath, "utf-8") : "";
      const profiles = fs.existsSync(profilesPath) ? JSON.parse(fs.readFileSync(profilesPath, "utf-8")) : [];

      res.json({ policies, profiles });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * GET /api/calendar
   * Returns calendar availability for a given date dynamically from MongoDB
   */
  async getCalendar(req, res) {
    try {
      const date = req.query.date || "2026-10-15";
      const profiles = getAttendeeProfiles();
      const attendees = req.query.attendees ? req.query.attendees.split(",") : profiles.map(p => p.email);
      const busySlots = await CalendarTool.getBusySlots(date, attendees);
      res.json({ date, busySlots });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * GET /api/meetings
   * Returns all scheduled meetings stored in MongoDB
   */
  async getMeetings(req, res) {
    try {
      const meetings = await CalendarTool.getAllMeetings();
      res.json({ success: true, count: meetings.length, meetings });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};
