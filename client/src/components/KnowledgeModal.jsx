import React, { useEffect, useState } from "react";
import { X, BookOpen, Clock, Globe } from "lucide-react";
import { API_ENDPOINTS } from "../config/api";

export default function KnowledgeModal({ isOpen, onClose }) {
  const [knowledge, setKnowledge] = useState({ policies: "", profiles: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch(API_ENDPOINTS.KNOWLEDGE)
        .then((res) => res.json())
        .then((data) => {
          setKnowledge(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(15, 23, 42, 0.4)",
      backdropFilter: "blur(6px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: "1rem"
    }}>
      <div className="glass-panel" style={{
        width: "100%",
        maxWidth: "750px",
        maxHeight: "85vh",
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        borderColor: "#cbd5e1",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)"
      }}>
        {/* Modal Header */}
        <div style={{
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid var(--border-color)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <BookOpen size={20} color="var(--cyan-accent)" />
            <h3 style={{ fontSize: "1.15rem", color: "var(--text-main)", fontWeight: "700" }}>
              RAG Knowledge Base & Policies
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", color: "var(--text-muted)", padding: "0.25rem", borderRadius: "6px" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: "1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
              Loading RAG Documents...
            </div>
          ) : (
            <>
              {/* Attendee Profiles */}
              <div>
                <h4 style={{ fontSize: "0.9rem", color: "var(--accent-primary)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "700", marginBottom: "0.75rem" }}>
                  Attendee Preference Profiles
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
                  {knowledge.profiles.map((profile, idx) => (
                    <div key={idx} style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      padding: "0.9rem",
                      borderRadius: "10px"
                    }}>
                      <div style={{ fontWeight: "700", color: "var(--text-main)", fontSize: "0.95rem" }}>
                        {profile.name}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                        {profile.role}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--cyan-accent)", display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.3rem", fontWeight: "500" }}>
                        <Globe size={14} /> {profile.timezone}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#334155", display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem", fontWeight: "500" }}>
                        <Clock size={14} /> {profile.workingHours}
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontStyle: "italic" }}>
                        "{profile.preferences}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Company Policies */}
              <div>
                <h4 style={{ fontSize: "0.9rem", color: "var(--cyan-accent)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: "700", marginBottom: "0.75rem" }}>
                  Official Scheduling Policies
                </h4>
                <div style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  padding: "1.25rem",
                  borderRadius: "10px",
                  fontSize: "0.85rem",
                  color: "#334155",
                  whiteSpace: "pre-wrap",
                  lineHeight: "1.6"
                }}>
                  {knowledge.policies}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
