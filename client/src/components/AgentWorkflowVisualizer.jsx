import React from "react";
import { 
  ShieldCheck, 
  BrainCircuit, 
  CalendarCheck, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Clock, 
  UserCheck, 
  Mail, 
  Calendar, 
  ExternalLink, 
  Video
} from "lucide-react";
import { formatDateToDMY } from "../utils/dateUtils";

function PulsingStatusBadge({ label, color = "var(--accent-primary)", bgColor = "rgba(99, 102, 241, 0.12)" }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "0.35rem",
      fontSize: "0.75rem",
      color,
      marginLeft: "auto",
      fontWeight: "700",
      background: bgColor,
      padding: "0.2rem 0.6rem",
      borderRadius: "12px"
    }}>
      <span style={{
        width: "7px",
        height: "7px",
        borderRadius: "50%",
        background: color,
        animation: "pulse-dot 1s infinite"
      }} />
      {label}
    </span>
  );
}

function WaitingCard({ icon: Icon, title, waitingFor }) {
  return (
    <div className="glass-panel" style={{ padding: "1rem 1.25rem", opacity: 0.55, border: "1px dashed var(--border-color)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <Icon size={18} color="#94a3b8" />
        <h4 style={{ fontSize: "0.95rem", color: "var(--text-muted)", fontWeight: "600" }}>{title}</h4>
        <span style={{ fontSize: "0.75rem", color: "#94a3b8", marginLeft: "auto", fontWeight: "500" }}>
          ⏳ {waitingFor}
        </span>
      </div>
    </div>
  );
}

export default function AgentWorkflowVisualizer({ result, isScheduling, activeAgent, activeMessage, liveWorkflow }) {

  // If not running and no result, show initial ready state
  if (!result && !isScheduling) {
    return (
      <div className="glass-panel" style={{ padding: "3.5rem 2rem", textAlign: "center", color: "var(--text-muted)" }}>
        <BrainCircuit size={48} color="#94a3b8" style={{ marginBottom: "1rem" }} />
        <h3 style={{ color: "var(--text-main)", fontSize: "1.15rem", fontWeight: "700", marginBottom: "0.5rem" }}>
          Ready to Coordinate
        </h3>
        <p style={{ fontSize: "0.9rem", maxWidth: "420px", margin: "0 auto" }}>
          Fill in the meeting requirements or choose a demo preset on the left to trigger the autonomous 3-agent LangGraph pipeline.
        </p>
      </div>
    );
  }

  const currentData = result || liveWorkflow || {};
  const { finalStatus, confirmedInvite, plan, execution, validation, iterationCount = 1, logs } = currentData;

  const isSuccess = finalStatus === "SUCCESS";
  const isBlocked = finalStatus === "GUARDRAIL_BLOCKED";
  const isEscalated = finalStatus === "ESCALATED";
  const isRevision = currentData.isRevision || iterationCount > 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Live Dynamic Status Banner when actively scheduling */}
      {isScheduling && (
        <div className="glass-panel" style={{
          padding: "1.15rem 1.25rem",
          background: isRevision ? "rgba(217, 119, 6, 0.06)" : "rgba(99, 102, 241, 0.05)",
          borderLeft: `4px solid ${isRevision ? "var(--amber-accent)" : "var(--accent-primary)"}`,
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem",
          animation: "fadeInCard 0.2s ease"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: isRevision ? "var(--amber-accent)" : "var(--accent-primary)",
                animation: "pulse-dot 1.2s infinite"
              }} />
              <span style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--text-main)" }}>
                {isRevision ? `🔁 LangGraph Cyclic Revision Loop (Attempt #${iterationCount})` : "Multi-Agent Orchestration in Progress"}
              </span>
            </div>
            <span style={{
              fontSize: "0.8rem",
              color: isRevision ? "var(--amber-accent)" : "var(--accent-primary)",
              background: isRevision ? "rgba(217, 119, 6, 0.12)" : "rgba(99, 102, 241, 0.12)",
              padding: "0.25rem 0.65rem",
              borderRadius: "12px",
              fontWeight: "700"
            }}>
              Active: {activeAgent === "planner" ? `Agent 1: Planner ${isRevision ? `(#${iterationCount})` : ""}` : activeAgent === "executor" ? `Agent 2: Executor ${isRevision ? `(#${iterationCount})` : ""}` : activeAgent === "validator" ? "Agent 3: Validator" : "Orchestrating..."}
            </span>
          </div>

          <div style={{ fontSize: "0.85rem", color: "var(--text-main)", fontWeight: "500", background: "#ffffff", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            {activeMessage || "Agents are collaborating in real-time to schedule your meeting..."}
          </div>
        </div>
      )}

      {/* Status Banner (when finished) */}
      {!isScheduling && finalStatus && (
        <div className="glass-panel" style={{
          padding: "1.25rem 1.5rem",
          borderLeft: `5px solid ${isSuccess ? "var(--emerald-accent)" : isBlocked ? "var(--rose-accent)" : "var(--amber-accent)"}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {isSuccess && <CheckCircle2 size={26} color="var(--emerald-accent)" />}
            {isBlocked && <AlertCircle size={26} color="var(--rose-accent)" />}
            {isEscalated && <RotateCcw size={26} color="var(--amber-accent)" />}
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--text-main)" }}>
                {isSuccess && "Meeting Successfully Scheduled!"}
                {isBlocked && "Security Guardrail Intercepted Request"}
                {isEscalated && "Loop Limit Exceeded — Escalated to Human"}
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                {isSuccess && (iterationCount > 1 
                  ? `Resolved calendar conflicts autonomously via LangGraph revision in ${iterationCount} cycles.`
                  : "Validated on first attempt with zero policy violations.")}
                {isBlocked && "Prohibited prompt pattern or syntax violation prevented execution."}
                {isEscalated && `Attempted ${iterationCount || 3} revision cycles; calendar conflicts unresolvable.`}
              </p>
            </div>
          </div>

          <div style={{
            padding: "0.3rem 0.8rem",
            borderRadius: "20px",
            fontSize: "0.8rem",
            fontWeight: "700",
            background: isSuccess ? "rgba(5, 150, 105, 0.1)" : isBlocked ? "rgba(225, 29, 72, 0.1)" : "rgba(217, 119, 6, 0.1)",
            color: isSuccess ? "var(--emerald-accent)" : isBlocked ? "var(--rose-accent)" : "var(--amber-accent)",
            border: `1px solid ${isSuccess ? "rgba(5, 150, 105, 0.3)" : isBlocked ? "rgba(225, 29, 72, 0.3)" : "rgba(217, 119, 6, 0.3)"}`
          }}>
            Status: {finalStatus}
          </div>
        </div>
      )}

      {/* Confirmed Invite Card (if SUCCESS) */}
      {isSuccess && confirmedInvite && (
        <div className="glass-panel" style={{
          padding: "1.75rem",
          background: "linear-gradient(135deg, rgba(5, 150, 105, 0.05) 0%, #ffffff 100%)",
          borderColor: "rgba(5, 150, 105, 0.35)",
          boxShadow: "0 10px 25px -5px rgba(5, 150, 105, 0.1)",
          animation: "fadeInCard 0.3s ease"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--emerald-accent)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Confirmed Reservation
              </span>
              <h2 style={{ fontSize: "1.3rem", fontWeight: "700", color: "var(--text-main)", marginTop: "0.2rem" }}>
                {confirmedInvite.title}
              </h2>
            </div>
            
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              {/* Google Calendar Direct Add Button */}
              {confirmedInvite.googleCalendarUrl && (
                <a
                  href={confirmedInvite.googleCalendarUrl}
                  target="_blank"
                  rel="noreferrer"
                  id="add-to-gcal-btn"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.45rem 0.9rem",
                    background: "rgba(5, 150, 105, 0.1)",
                    color: "var(--emerald-accent)",
                    border: "1px solid rgba(5, 150, 105, 0.3)",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    textDecoration: "none",
                    fontWeight: "600"
                  }}
                >
                  <Calendar size={15} /> Add to Google Calendar
                </a>
              )}

              {/* Join Google Meet Button */}
              <a
                href={confirmedInvite.meetingLink}
                target="_blank"
                rel="noreferrer"
                id="join-google-meet-btn"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.45rem",
                  padding: "0.45rem 1rem",
                  background: "#1a73e8",
                  color: "#ffffff",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  textDecoration: "none",
                  fontWeight: "700",
                  boxShadow: "0 2px 10px rgba(26, 115, 232, 0.35)"
                }}
              >
                <Video size={16} /> Join Google Meet
              </a>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <Clock size={16} color="var(--accent-primary)" />
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Date & Time</div>
                <div style={{ fontSize: "0.9rem", color: "var(--text-main)", fontWeight: "600" }}>
                  {formatDateToDMY(confirmedInvite.date)} • {confirmedInvite.startTime} - {confirmedInvite.endTime}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <UserCheck size={16} color="var(--accent-primary)" />
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Duration</div>
                <div style={{ fontSize: "0.9rem", color: "var(--text-main)", fontWeight: "600" }}>
                  {confirmedInvite.durationMinutes} Minutes
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <Video size={16} color="#1a73e8" />
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Video Call</div>
                <a
                  href={confirmedInvite.meetingLink}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: "0.85rem", color: "#1a73e8", fontWeight: "700", textDecoration: "underline" }}
                >
                  Google Meet
                </a>
              </div>
            </div>
          </div>

          {/* Email Notification Dispatch Status */}
          {confirmedInvite.emailDelivery && (
            <div style={{
              background: "#f8fafc",
              border: "1px solid rgba(99, 102, 241, 0.25)",
              borderRadius: "10px",
              padding: "0.85rem 1rem",
              marginBottom: "1rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.75rem"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <Mail size={18} color="var(--accent-primary)" />
                <div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-main)", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {confirmedInvite.emailDelivery.isSimulated ? (
                      <>
                        <span>Email Invites Simulated (Dev Mode)</span>
                        <span style={{ fontSize: "0.7rem", color: "var(--amber-accent)", background: "rgba(217, 119, 6, 0.1)", padding: "0.15rem 0.5rem", borderRadius: "10px", fontWeight: "700" }}>
                          EMAIL_ENABLED=false
                        </span>
                      </>
                    ) : (
                      <span>Email Invites Dispatched via Gmail SMTP</span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Recipients: {confirmedInvite.emailDelivery.recipients?.join(", ")}
                  </div>
                </div>
              </div>

              {confirmedInvite.emailDelivery.previewUrl && (
                <a
                  href={confirmedInvite.emailDelivery.previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  id="view-email-preview-btn"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    fontSize: "0.8rem",
                    color: "var(--cyan-accent)",
                    background: "rgba(2, 132, 199, 0.1)",
                    padding: "0.35rem 0.75rem",
                    borderRadius: "6px",
                    textDecoration: "none",
                    fontWeight: "600",
                    border: "1px solid rgba(2, 132, 199, 0.25)"
                  }}
                >
                  <ExternalLink size={13} /> View Sent Email Preview
                </a>
              )}
            </div>
          )}

          {/* Agenda */}
          {confirmedInvite.agenda && confirmedInvite.agenda.length > 0 && (
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.3rem", fontWeight: "600" }}>Confirmed Agenda:</div>
              <ul style={{ paddingLeft: "1.2rem", fontSize: "0.85rem", color: "var(--text-main)" }}>
                {confirmedInvite.agenda.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Progressive Agent Pipeline Trace */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h4 style={{ fontSize: "0.9rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "700" }}>
          Autonomous Execution Trace
        </h4>

        {/* 1. Agent 1: Planner */}
        {isScheduling && activeAgent === "planner" && iterationCount > 1 ? (
          // Active Revision Attempt on Planner
          <div className="glass-panel" style={{ padding: "1.25rem", border: "1.5px solid var(--amber-accent)", background: "rgba(217, 119, 6, 0.04)", animation: "fadeInCard 0.2s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
              <BrainCircuit size={18} color="var(--amber-accent)" />
              <h4 style={{ fontSize: "0.95rem", color: "var(--text-main)", fontWeight: "700" }}>
                Agent 1: Planner (Revision Attempt #{iterationCount})
              </h4>
              <PulsingStatusBadge
                label="Formulating Alternate Slots..."
                color="var(--amber-accent)"
                bgColor="rgba(217, 119, 6, 0.12)"
              />
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Validator flagged a conflict in the previous attempt. Agent 1 is re-evaluating schedule options to find a conflict-free window.
            </p>
          </div>
        ) : plan ? (
          // Completed Planner Card
          <div className="glass-panel" style={{ padding: "1.25rem", borderLeft: `4px solid ${iterationCount > 1 ? "var(--amber-accent)" : "var(--accent-primary)"}`, animation: "fadeInCard 0.25s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
              <BrainCircuit size={18} color={iterationCount > 1 ? "var(--amber-accent)" : "var(--accent-primary)"} />
              <h4 style={{ fontSize: "0.95rem", color: "var(--text-main)", fontWeight: "700" }}>
                Agent 1: Planner {iterationCount > 1 ? `(Attempt #${iterationCount})` : ""}
              </h4>
              <span style={{ fontSize: "0.75rem", color: iterationCount > 1 ? "var(--amber-accent)" : "var(--accent-primary)", marginLeft: "auto", fontWeight: "600", background: iterationCount > 1 ? "rgba(217, 119, 6, 0.08)" : "rgba(99, 102, 241, 0.08)", padding: "0.2rem 0.6rem", borderRadius: "12px", border: `1px solid ${iterationCount > 1 ? "rgba(217, 119, 6, 0.2)" : "rgba(99, 102, 241, 0.2)"}` }}>
                {plan.candidateSlots?.length || 1} Candidate Slot(s) Formulated
              </span>
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-main)", marginBottom: "0.5rem" }}>
              <strong>Objective:</strong> {plan.meetingObjective}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {plan.candidateSlots?.map((slot, i) => (
                <div key={i} style={{ background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.25)", color: "var(--accent-primary)", padding: "0.4rem 0.75rem", borderRadius: "6px", fontSize: "0.8rem", fontWeight: "500" }}>
                  🕒 {slot.date ? `${formatDateToDMY(slot.date)} • ` : ""}{slot.startTime} - {slot.endTime} ({slot.timezone || "Local"})
                </div>
              ))}
            </div>
          </div>
        ) : isScheduling && (
          // Initial Working Card for Planner
          <div className="glass-panel" style={{ padding: "1.25rem", border: "1.5px solid var(--accent-primary)", background: "rgba(99, 102, 241, 0.03)", animation: "fadeInCard 0.2s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
              <BrainCircuit size={18} color="var(--accent-primary)" />
              <h4 style={{ fontSize: "0.95rem", color: "var(--text-main)", fontWeight: "700" }}>Agent 1: Planner</h4>
              <PulsingStatusBadge
                label="Formulating Candidate Slots..."
                color="var(--accent-primary)"
                bgColor="rgba(99, 102, 241, 0.12)"
              />
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Evaluating duration, time preferences, and cross-timezone attendee constraints across Kolkata, New York & London...
            </p>
          </div>
        )}

        {/* 2. Agent 2: Executor */}
        {isScheduling && activeAgent === "executor" && iterationCount > 1 ? (
          // Active Revision Attempt on Executor
          <div className="glass-panel" style={{ padding: "1.25rem", border: "1.5px solid var(--emerald-accent)", background: "rgba(5, 150, 105, 0.04)", animation: "fadeInCard 0.2s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
              <CalendarCheck size={18} color="var(--emerald-accent)" />
              <h4 style={{ fontSize: "0.95rem", color: "var(--text-main)", fontWeight: "700" }}>
                Agent 2: Executor (Revision Attempt #{iterationCount})
              </h4>
              <PulsingStatusBadge
                label="Checking Alternate Slots in Calendars..."
                color="var(--emerald-accent)"
                bgColor="rgba(5, 150, 105, 0.12)"
              />
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Verifying attendee busy slots for the newly proposed alternative time window and ensuring buffer compliance...
            </p>
          </div>
        ) : execution ? (
          // Completed Executor Card
          <div className="glass-panel" style={{ padding: "1.25rem", borderLeft: `4px solid ${execution.hasConflict ? "var(--amber-accent)" : "var(--emerald-accent)"}`, animation: "fadeInCard 0.25s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
              <CalendarCheck size={18} color={execution.hasConflict ? "var(--amber-accent)" : "var(--emerald-accent)"} />
              <h4 style={{ fontSize: "0.95rem", color: "var(--text-main)", fontWeight: "700" }}>
                Agent 2: Executor {iterationCount > 1 ? `(Attempt #${iterationCount})` : ""}
              </h4>
              <span style={{ fontSize: "0.75rem", color: execution.hasConflict ? "var(--amber-accent)" : "var(--emerald-accent)", marginLeft: "auto", fontWeight: "600", background: execution.hasConflict ? "rgba(217, 119, 6, 0.08)" : "rgba(5, 150, 105, 0.08)", padding: "0.2rem 0.6rem", borderRadius: "12px", border: `1px solid ${execution.hasConflict ? "rgba(217, 119, 6, 0.2)" : "rgba(5, 150, 105, 0.2)"}` }}>
                {execution.hasConflict ? "Calendar Conflict Detected" : "Slot Verified Clean"}
              </span>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              {execution.hasConflict ? execution.conflictDetails : `Selected conflict-free slot: ${execution.selectedSlot?.date ? `${formatDateToDMY(execution.selectedSlot.date)} • ` : ""}${execution.selectedSlot?.startTime || execution.lockedSlot?.startTime || "15:00"} - ${execution.selectedSlot?.endTime || execution.lockedSlot?.endTime || "15:30"}`}
            </p>
          </div>
        ) : isScheduling && plan ? (
          // Initial Working Card for Executor
          <div className="glass-panel" style={{ padding: "1.25rem", border: "1.5px solid var(--emerald-accent)", background: "rgba(5, 150, 105, 0.03)", animation: "fadeInCard 0.2s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
              <CalendarCheck size={18} color="var(--emerald-accent)" />
              <h4 style={{ fontSize: "0.95rem", color: "var(--text-main)", fontWeight: "700" }}>Agent 2: Executor</h4>
              <PulsingStatusBadge
                label="Checking Calendar Buffers & Availability..."
                color="var(--emerald-accent)"
                bgColor="rgba(5, 150, 105, 0.12)"
              />
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Inspecting attendee calendar commitments, verifying buffer rules, and generating Google Meet room...
            </p>
          </div>
        ) : isScheduling ? (
          // Queued / Pending Card
          <WaitingCard icon={CalendarCheck} title="Agent 2: Executor" waitingFor="Waiting for Planner" />
        ) : null}

        {/* 3. Agent 3: Validator */}
        {validation?.status === "NEEDS_REVISION" && isScheduling ? (
          // Active Revision Notice on Validator
          <div className="glass-panel" style={{ padding: "1.25rem", borderLeft: "4px solid var(--amber-accent)", background: "rgba(217, 119, 6, 0.03)", animation: "fadeInCard 0.25s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
              <ShieldCheck size={18} color="var(--amber-accent)" />
              <h4 style={{ fontSize: "0.95rem", color: "var(--text-main)", fontWeight: "700" }}>Agent 3: Validator</h4>
              <span style={{ fontSize: "0.75rem", color: "var(--amber-accent)", marginLeft: "auto", fontWeight: "700", background: "rgba(217, 119, 6, 0.12)", padding: "0.2rem 0.6rem", borderRadius: "12px" }}>
                ⚠️ Conflict Flagged — Cyclic Revision Loop
              </span>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
              {validation.critique}
            </p>
            {validation.violations && validation.violations.length > 0 && (
              <ul style={{ paddingLeft: "1.2rem", fontSize: "0.8rem", color: "var(--amber-accent)", fontWeight: "600", marginBottom: "0.5rem" }}>
                {validation.violations.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            )}
            <div style={{ fontSize: "0.8rem", color: "var(--accent-primary)", fontWeight: "600", background: "rgba(99, 102, 241, 0.08)", padding: "0.45rem 0.75rem", borderRadius: "6px", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <RotateCcw size={14} /> Cycled execution back to Agent 1 (Planner) & Agent 2 (Executor) for Attempt #{iterationCount}...
            </div>
          </div>
        ) : validation ? (
          // Completed Validator Card
          <div className="glass-panel" style={{ padding: "1.25rem", borderLeft: `4px solid ${validation.status === "APPROVED" ? "var(--emerald-accent)" : "var(--rose-accent)"}`, animation: "fadeInCard 0.25s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
              <ShieldCheck size={18} color={validation.status === "APPROVED" ? "var(--emerald-accent)" : "var(--rose-accent)"} />
              <h4 style={{ fontSize: "0.95rem", color: "var(--text-main)", fontWeight: "700" }}>Agent 3: Validator</h4>
              <span style={{ fontSize: "0.75rem", color: validation.status === "APPROVED" ? "var(--emerald-accent)" : "var(--rose-accent)", marginLeft: "auto", fontWeight: "600", background: validation.status === "APPROVED" ? "rgba(5, 150, 105, 0.08)" : "rgba(225, 29, 72, 0.08)", padding: "0.2rem 0.6rem", borderRadius: "12px", border: `1px solid ${validation.status === "APPROVED" ? "rgba(5, 150, 105, 0.2)" : "rgba(225, 29, 72, 0.2)"}` }}>
                Verdict: {validation.status} {iterationCount > 1 ? `(Cycle #${iterationCount})` : ""}
              </span>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
              {validation.critique || (validation.status === "APPROVED" ? "All constraints verified and compliant." : "")}
            </p>
            {validation.violations && validation.violations.length > 0 && (
              <ul style={{ paddingLeft: "1.2rem", fontSize: "0.8rem", color: "var(--rose-accent)", fontWeight: "500" }}>
                {validation.violations.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            )}
          </div>
        ) : isScheduling && execution ? (
          // Active Working Card for Validator
          <div className="glass-panel" style={{ padding: "1.25rem", border: "1.5px solid var(--accent-primary)", background: "rgba(99, 102, 241, 0.03)", animation: "fadeInCard 0.2s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.5rem" }}>
              <ShieldCheck size={18} color="var(--accent-primary)" />
              <h4 style={{ fontSize: "0.95rem", color: "var(--text-main)", fontWeight: "700" }}>Agent 3: Validator</h4>
              <PulsingStatusBadge
                label="Auditing Guardrails & Policies..."
                color="var(--accent-primary)"
                bgColor="rgba(99, 102, 241, 0.12)"
              />
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Checking organizational guardrails, weekend restrictions, attendee preferences, and prompt safety...
            </p>
          </div>
        ) : isScheduling ? (
          // Queued / Pending Card
          <WaitingCard icon={ShieldCheck} title="Agent 3: Validator" waitingFor="Waiting for Executor" />
        ) : null}
      </div>
    </div>
  );
}
