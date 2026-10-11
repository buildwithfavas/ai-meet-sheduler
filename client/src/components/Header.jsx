import React from "react";
import { Bot, RefreshCw, BookOpen } from "lucide-react";
import "./Header.css";

export default function Header({ onOpenPolicies, onTestConnection, testingConnection }) {
  return (
    <header className="glass-panel header-container">
      <div className="header-content">
        {/* Title and Branding */}
        <div className="header-brand">
          <div className="header-logo-badge">
            <Bot size={28} color="#ffffff" />
          </div>
          <div>
            <div className="header-title-row">
              <h1 className="header-title">
                AI Meeting Scheduler
              </h1>
              <span className="header-badge">
                LangGraph Multi-Agent
              </span>
            </div>
            <p className="header-subtitle">
              Planner, Executor & Validator Agents with RAG Policies & Guardrails
            </p>
          </div>
        </div>

        {/* Status Indicators & Action Buttons */}
        <div className="header-actions">

          {/* Test Connection Button */}
          <button
            id="test-connection-btn"
            onClick={onTestConnection}
            disabled={testingConnection}
            className="header-btn header-btn-ping"
          >
            <RefreshCw size={14} className={testingConnection ? "spin" : ""} />
            {testingConnection ? "Pinging..." : "Test Ping"}
          </button>

          {/* View Knowledge Base */}
          <button
            id="view-knowledge-btn"
            onClick={onOpenPolicies}
            className="header-btn header-btn-knowledge"
          >
            <BookOpen size={14} />
            RAG Policies & Profiles
          </button>
        </div>
      </div>
    </header>
  );
}
