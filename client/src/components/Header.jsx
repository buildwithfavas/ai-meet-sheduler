import React from "react";
import { Bot, RefreshCw, BookOpen } from "lucide-react";

export default function Header({ serverHealth, onOpenPolicies, onTestConnection, testingConnection }) {
  return (
    <header className="glass-panel" style={{ padding: "1.25rem 2rem", marginBottom: "2rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        {/* Title and Branding */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{
            background: "var(--accent-gradient)",
            padding: "0.75rem",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 15px rgba(79, 70, 229, 0.3)"
          }}>
            <Bot size={28} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h1 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-main)" }}>
                AI Meeting Scheduler
              </h1>
              <span style={{
                background: "rgba(99, 102, 241, 0.1)",
                color: "var(--accent-primary)",
                padding: "0.2rem 0.65rem",
                borderRadius: "20px",
                fontSize: "0.75rem",
                fontWeight: "600",
                border: "1px solid rgba(99, 102, 241, 0.25)"
              }}>
                LangGraph Multi-Agent
              </span>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              Planner, Executor & Validator Agents with RAG Policies & Guardrails
            </p>
          </div>
        </div>

        {/* Status Indicators & Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {/* Active Model Indicator */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "#f1f5f9",
            padding: "0.45rem 0.9rem",
            borderRadius: "10px",
            border: "1px solid var(--border-color)",
            fontSize: "0.85rem"
          }}>
            <div style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: serverHealth?.status === "online" ? "#10b981" : "#ef4444",
              boxShadow: serverHealth?.status === "online" ? "0 0 8px #10b981" : "none"
            }} />
            <span style={{ color: "var(--text-muted)" }}>Backend:</span>
            <span style={{ color: "var(--text-main)", fontWeight: "600" }}>
              {serverHealth?.activeProvider === "ollama" ? "Ollama (Primary) + OpenRouter (Fallback)" : "OpenRouter"}
            </span>
          </div>

          {/* Test Connection Button */}
          <button
            id="test-connection-btn"
            onClick={onTestConnection}
            disabled={testingConnection}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "rgba(99, 102, 241, 0.08)",
              color: "var(--accent-primary)",
              padding: "0.5rem 0.9rem",
              borderRadius: "10px",
              border: "1px solid rgba(99, 102, 241, 0.25)",
              fontSize: "0.85rem",
              fontWeight: "600"
            }}
          >
            <RefreshCw size={14} className={testingConnection ? "spin" : ""} />
            {testingConnection ? "Pinging..." : "Test Ping"}
          </button>

          {/* View Knowledge Base */}
          <button
            id="view-knowledge-btn"
            onClick={onOpenPolicies}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "rgba(2, 132, 199, 0.08)",
              color: "var(--cyan-accent)",
              padding: "0.5rem 0.9rem",
              borderRadius: "10px",
              border: "1px solid rgba(2, 132, 199, 0.25)",
              fontSize: "0.85rem",
              fontWeight: "600"
            }}
          >
            <BookOpen size={14} />
            RAG Policies & Profiles
          </button>
        </div>
      </div>
    </header>
  );
}
