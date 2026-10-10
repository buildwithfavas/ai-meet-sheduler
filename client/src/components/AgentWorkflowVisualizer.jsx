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
import "./AgentWorkflowVisualizer.css";

function PulsingStatusBadge({ label, color = "var(--accent-primary)", bgColor = "rgba(99, 102, 241, 0.12)" }) {
  return (
    <span className="pulsing-badge" style={{ color, background: bgColor }}>
      <span className="pulsing-dot" style={{ background: color }} />
      {label}
    </span>
  );
}

function WaitingCard({ icon: Icon, title, waitingFor }) {
  return (
    <div className="glass-panel waiting-card">
      <div className="waiting-card-content">
        <Icon size={18} color="#94a3b8" />
        <h4 className="waiting-card-title">{title}</h4>
        <span className="waiting-card-sub">
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
      <div className="glass-panel visualizer-empty-card">
        <BrainCircuit size={48} className="empty-card-icon" />
        <h3 className="empty-card-title">
          Ready to Coordinate
        </h3>
        <p className="empty-card-description">
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
    <div className="workflow-container">
      {/* Live Dynamic Status Banner when actively scheduling */}
      {isScheduling && (
        <div className={`glass-panel live-status-banner ${isRevision ? "is-revision" : ""}`}>
          <div className="live-status-banner-header">
            <div className="live-status-indicator">
              <span className={`live-pulse-dot ${isRevision ? "revision" : "standard"}`} />
              <span className="live-status-title">
                {isRevision ? `🔁 LangGraph Cyclic Revision Loop (Attempt #${iterationCount})` : "Multi-Agent Orchestration in Progress"}
              </span>
            </div>
            <span className={`live-agent-badge ${isRevision ? "revision" : "standard"}`}>
              Active: {activeAgent === "planner" ? `Agent 1: Planner ${isRevision ? `(#${iterationCount})` : ""}` : activeAgent === "executor" ? `Agent 2: Executor ${isRevision ? `(#${iterationCount})` : ""}` : activeAgent === "validator" ? "Agent 3: Validator" : "Orchestrating..."}
            </span>
          </div>

          <div className="live-status-message">
            {activeMessage || "Agents are collaborating in real-time to schedule your meeting..."}
          </div>
        </div>
      )}

      {/* Status Banner (when finished) */}
      {!isScheduling && finalStatus && (
        <div className={`glass-panel result-status-banner ${isSuccess ? "border-success" : isBlocked ? "border-blocked" : "border-escalated"}`}>
          <div className="result-status-main">
            {isSuccess && <CheckCircle2 size={26} color="var(--emerald-accent)" />}
            {isBlocked && <AlertCircle size={26} color="var(--rose-accent)" />}
            {isEscalated && <RotateCcw size={26} color="var(--amber-accent)" />}
            <div>
              <h3 className="result-status-title">
                {isSuccess && "Meeting Successfully Scheduled!"}
                {isBlocked && "Security Guardrail Intercepted Request"}
                {isEscalated && "Loop Limit Exceeded — Escalated to Human"}
              </h3>
              <p className="result-status-subtitle">
                {isSuccess && (iterationCount > 1 
                  ? `Resolved calendar conflicts autonomously via LangGraph revision in ${iterationCount} cycles.`
                  : "Validated on first attempt with zero policy violations.")}
                {isBlocked && "Prohibited prompt pattern or syntax violation prevented execution."}
                {isEscalated && `Attempted ${iterationCount || 3} revision cycles; calendar conflicts unresolvable.`}
              </p>
            </div>
          </div>

          <div className={`result-status-pill ${isSuccess ? "pill-success" : isBlocked ? "pill-blocked" : "pill-escalated"}`}>
            Status: {finalStatus}
          </div>
        </div>
      )}

      {/* Confirmed Invite Card (if SUCCESS) */}
      {isSuccess && confirmedInvite && (
        <div className="glass-panel confirmed-invite-card">
          <div className="confirmed-invite-header">
            <div>
              <span className="confirmed-invite-tag">
                Confirmed Reservation
              </span>
              <h2 className="confirmed-invite-title">
                {confirmedInvite.title}
              </h2>
            </div>
            
            <div className="confirmed-invite-actions">
              {/* Google Calendar Direct Add Button */}
              {confirmedInvite.googleCalendarUrl && (
                <a
                  href={confirmedInvite.googleCalendarUrl}
                  target="_blank"
                  rel="noreferrer"
                  id="add-to-gcal-btn"
                  className="btn-gcal"
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
                className="btn-gmeet"
              >
                <Video size={16} /> Join Google Meet
              </a>
            </div>
          </div>

          <div className="confirmed-invite-meta-grid">
            <div className="meta-grid-item">
              <Clock size={16} color="var(--accent-primary)" />
              <div>
                <div className="meta-label">Date & Time</div>
                <div className="meta-value">
                  {formatDateToDMY(confirmedInvite.date)} • {confirmedInvite.startTime} - {confirmedInvite.endTime}
                </div>
              </div>
            </div>

            <div className="meta-grid-item">
              <UserCheck size={16} color="var(--accent-primary)" />
              <div>
                <div className="meta-label">Duration</div>
                <div className="meta-value">
                  {confirmedInvite.durationMinutes} Minutes
                </div>
              </div>
            </div>

            <div className="meta-grid-item">
              <Video size={16} color="#1a73e8" />
              <div>
                <div className="meta-label">Video Call</div>
                <a
                  href={confirmedInvite.meetingLink}
                  target="_blank"
                  rel="noreferrer"
                  className="gmeet-link"
                >
                  Google Meet
                </a>
              </div>
            </div>
          </div>

          {/* Email Notification Dispatch Status */}
          {confirmedInvite.emailDelivery && (
            <div className="email-status-card">
              <div className="email-status-left">
                <Mail size={18} color="var(--accent-primary)" />
                <div>
                  <div className="email-status-title">
                    {confirmedInvite.emailDelivery.isSimulated ? (
                      <>
                        <span>Email Invites Simulated (Dev Mode)</span>
                        <span className="dev-mode-badge">
                          EMAIL_ENABLED=false
                        </span>
                      </>
                    ) : (
                      <span>Email Invites Dispatched via Gmail SMTP</span>
                    )}
                  </div>
                  <div className="email-status-recipients">
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
                  className="btn-email-preview"
                >
                  <ExternalLink size={13} /> View Sent Email Preview
                </a>
              )}
            </div>
          )}

          {/* Agenda */}
          {confirmedInvite.agenda && confirmedInvite.agenda.length > 0 && (
            <div className="confirmed-agenda-box">
              <div className="confirmed-agenda-label">Confirmed Agenda:</div>
              <ul className="confirmed-agenda-list">
                {confirmedInvite.agenda.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Progressive Agent Pipeline Trace */}
      <div className="trace-pipeline">
        <h4 className="trace-title">
          Autonomous Execution Trace
        </h4>

        {/* 1. Agent 1: Planner */}
        {isScheduling && activeAgent === "planner" && iterationCount > 1 ? (
          // Active Revision Attempt on Planner
          <div className="glass-panel trace-card card-border-amber">
            <div className="trace-card-header">
              <BrainCircuit size={18} color="var(--amber-accent)" />
              <h4 className="trace-card-title">
                Agent 1: Planner (Revision Attempt #{iterationCount})
              </h4>
              <PulsingStatusBadge
                label="Formulating Alternate Slots..."
                color="var(--amber-accent)"
                bgColor="rgba(217, 119, 6, 0.12)"
              />
            </div>
            <p className="trace-card-desc">
              Validator flagged a conflict in the previous attempt. Agent 1 is re-evaluating schedule options to find a conflict-free window.
            </p>
          </div>
        ) : plan ? (
          // Completed Planner Card
          <div className={`glass-panel trace-card ${iterationCount > 1 ? "card-left-amber" : "card-left-indigo"}`}>
            <div className="trace-card-header">
              <BrainCircuit size={18} color={iterationCount > 1 ? "var(--amber-accent)" : "var(--accent-primary)"} />
              <h4 className="trace-card-title">
                Agent 1: Planner {iterationCount > 1 ? `(Attempt #${iterationCount})` : ""}
              </h4>
              <span className={`trace-count-badge ${iterationCount > 1 ? "revision" : "standard"}`}>
                {plan.candidateSlots?.length || 1} Candidate Slot(s) Formulated
              </span>
            </div>
            <div className="trace-card-meta">
              <strong>Objective:</strong> {plan.meetingObjective}
            </div>
            <div className="candidate-slots-grid">
              {plan.candidateSlots?.map((slot, i) => (
                <div key={i} className="candidate-slot-chip">
                  🕒 {slot.date ? `${formatDateToDMY(slot.date)} • ` : ""}{slot.startTime} - {slot.endTime} ({slot.timezone || "Local"})
                </div>
              ))}
            </div>
          </div>
        ) : isScheduling && (
          // Initial Working Card for Planner
          <div className="glass-panel trace-card card-border-indigo">
            <div className="trace-card-header">
              <BrainCircuit size={18} color="var(--accent-primary)" />
              <h4 className="trace-card-title">Agent 1: Planner</h4>
              <PulsingStatusBadge
                label="Formulating Candidate Slots..."
                color="var(--accent-primary)"
                bgColor="rgba(99, 102, 241, 0.12)"
              />
            </div>
            <p className="trace-card-desc">
              Evaluating duration, time preferences, and cross-timezone attendee constraints across Kolkata, New York & London...
            </p>
          </div>
        )}

        {/* 2. Agent 2: Executor */}
        {isScheduling && activeAgent === "executor" && iterationCount > 1 ? (
          // Active Revision Attempt on Executor
          <div className="glass-panel trace-card card-border-emerald revision">
            <div className="trace-card-header">
              <CalendarCheck size={18} color="var(--emerald-accent)" />
              <h4 className="trace-card-title">
                Agent 2: Executor (Revision Attempt #{iterationCount})
              </h4>
              <PulsingStatusBadge
                label="Checking Alternate Slots in Calendars..."
                color="var(--emerald-accent)"
                bgColor="rgba(5, 150, 105, 0.12)"
              />
            </div>
            <p className="trace-card-desc">
              Verifying attendee busy slots for the newly proposed alternative time window and ensuring buffer compliance...
            </p>
          </div>
        ) : execution ? (
          // Completed Executor Card
          <div className={`glass-panel trace-card ${execution.hasConflict ? "card-left-amber" : "card-left-emerald"}`}>
            <div className="trace-card-header">
              <CalendarCheck size={18} color={execution.hasConflict ? "var(--amber-accent)" : "var(--emerald-accent)"} />
              <h4 className="trace-card-title">
                Agent 2: Executor {iterationCount > 1 ? `(Attempt #${iterationCount})` : ""}
              </h4>
              <span className={`trace-count-badge ${execution.hasConflict ? "revision" : "success"}`}>
                {execution.hasConflict ? "Calendar Conflict Detected" : "Slot Verified Clean"}
              </span>
            </div>
            <p className="trace-card-desc">
              {execution.hasConflict ? execution.conflictDetails : `Selected conflict-free slot: ${execution.selectedSlot?.date ? `${formatDateToDMY(execution.selectedSlot.date)} • ` : ""}${execution.selectedSlot?.startTime || execution.lockedSlot?.startTime || "15:00"} - ${execution.selectedSlot?.endTime || execution.lockedSlot?.endTime || "15:30"}`}
            </p>
          </div>
        ) : isScheduling && plan ? (
          // Initial Working Card for Executor
          <div className="glass-panel trace-card card-border-emerald">
            <div className="trace-card-header">
              <CalendarCheck size={18} color="var(--emerald-accent)" />
              <h4 className="trace-card-title">Agent 2: Executor</h4>
              <PulsingStatusBadge
                label="Checking Calendar Buffers & Availability..."
                color="var(--emerald-accent)"
                bgColor="rgba(5, 150, 105, 0.12)"
              />
            </div>
            <p className="trace-card-desc">
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
          <div className="glass-panel trace-card card-left-amber">
            <div className="trace-card-header">
              <ShieldCheck size={18} color="var(--amber-accent)" />
              <h4 className="trace-card-title">Agent 3: Validator</h4>
              <span className="trace-count-badge revision">
                ⚠️ Conflict Flagged — Cyclic Revision Loop
              </span>
            </div>
            <p className="trace-card-desc" style={{ marginBottom: "0.4rem" }}>
              {validation.critique}
            </p>
            {validation.violations && validation.violations.length > 0 && (
              <ul className="violations-list amber">
                {validation.violations.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            )}
            <div className="cycle-loop-banner">
              <RotateCcw size={14} /> Cycled execution back to Agent 1 (Planner) & Agent 2 (Executor) for Attempt #{iterationCount}...
            </div>
          </div>
        ) : validation ? (
          // Completed Validator Card
          <div className={`glass-panel trace-card ${validation.status === "APPROVED" ? "card-left-emerald" : "card-left-rose"}`}>
            <div className="trace-card-header">
              <ShieldCheck size={18} color={validation.status === "APPROVED" ? "var(--emerald-accent)" : "var(--rose-accent)"} />
              <h4 className="trace-card-title">Agent 3: Validator</h4>
              <span className={`trace-count-badge ${validation.status === "APPROVED" ? "success" : "danger"}`}>
                Verdict: {validation.status} {iterationCount > 1 ? `(Cycle #${iterationCount})` : ""}
              </span>
            </div>
            <p className="trace-card-desc" style={{ marginBottom: "0.4rem" }}>
              {validation.critique || (validation.status === "APPROVED" ? "All constraints verified and compliant." : "")}
            </p>
            {validation.violations && validation.violations.length > 0 && (
              <ul className="violations-list rose">
                {validation.violations.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            )}
          </div>
        ) : isScheduling && execution ? (
          // Active Working Card for Validator
          <div className="glass-panel trace-card card-border-indigo">
            <div className="trace-card-header">
              <ShieldCheck size={18} color="var(--accent-primary)" />
              <h4 className="trace-card-title">Agent 3: Validator</h4>
              <PulsingStatusBadge
                label="Auditing Guardrails & Policies..."
                color="var(--accent-primary)"
                bgColor="rgba(99, 102, 241, 0.12)"
              />
            </div>
            <p className="trace-card-desc">
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
