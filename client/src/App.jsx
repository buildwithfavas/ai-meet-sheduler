import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import SchedulerForm from "./components/SchedulerForm";
import AgentWorkflowVisualizer from "./components/AgentWorkflowVisualizer";
import KnowledgeModal from "./components/KnowledgeModal";
import { API_ENDPOINTS } from "./config/api";

export default function App() {
  const [serverHealth, setServerHealth] = useState(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [result, setResult] = useState(null);
  const [isKnowledgeOpen, setIsKnowledgeOpen] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const [activeAgent, setActiveAgent] = useState(null);
  const [activeMessage, setActiveMessage] = useState("");
  const [liveWorkflow, setLiveWorkflow] = useState(null);

  const fetchHealth = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.HEALTH);
      const data = await res.json();
      setServerHealth(data);
    } catch {
      setServerHealth({ status: "offline" });
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setToastMessage("Pinging LLM model...");
    try {
      const res = await fetch(API_ENDPOINTS.TEST_CONNECTION, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage(`✅ ${data.provider.toUpperCase()} Ping Success (${data.latencySeconds}s): "${data.response}"`);
      } else {
        setToastMessage(`❌ Ping Failed: ${data.error}`);
      }
    } catch (err) {
      setToastMessage(`❌ Error: Backend server unreachable on port 5000`);
    } finally {
      setTestingConnection(false);
      setTimeout(() => setToastMessage(null), 5000);
    }
  };

  const handleScheduleSubmit = async (formData) => {
    setIsScheduling(true);
    setActiveAgent("planner");
    setLiveWorkflow({
      plan: null,
      execution: null,
      validation: null,
      confirmedInvite: null,
      finalStatus: null,
      iterationCount: 1,
      logs: []
    });
    setResult(null);

    try {
      const response = await fetch(API_ENDPOINTS.SCHEDULE_STREAM, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() || "";

        for (const block of blocks) {
          if (!block.trim()) continue;
          const eventMatch = block.match(/event:\s*([^\n]+)/);
          const dataMatch = block.match(/data:\s*([^\n]+)/);

          if (dataMatch) {
            const eventType = eventMatch ? eventMatch[1].trim() : "message";
            const data = JSON.parse(dataMatch[1].trim());

            if (eventType === "start") {
              setActiveAgent(data.activeAgent || "planner");
              if (data.message) setActiveMessage(data.message);
            } else if (eventType === "step") {
              if (data.activeAgent) {
                setActiveAgent(data.activeAgent);
              }
              if (data.message) {
                setActiveMessage(data.message);
              }
              setLiveWorkflow(prev => ({
                ...prev,
                plan: data.plan !== undefined ? data.plan : prev?.plan,
                execution: data.execution !== undefined ? data.execution : prev?.execution,
                validation: data.validation !== undefined ? data.validation : prev?.validation,
                iterationCount: data.iterationCount !== undefined ? data.iterationCount : prev?.iterationCount,
                lastMessage: data.message || prev?.lastMessage,
                isRevision: data.isRevision || data.needsRevision || (data.iterationCount > 1)
              }));
            } else if (eventType === "done") {
              setActiveAgent(null);
              if (data.message) setActiveMessage(data.message);
              setLiveWorkflow(prev => ({ ...prev, ...data }));
              setResult(data);
            } else if (eventType === "error") {
              throw new Error(data.error);
            }
          }
        }
      }
    } catch (err) {
      console.warn("Stream failed, falling back to standard REST:", err.message);
      try {
        const res = await fetch(API_ENDPOINTS.SCHEDULE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });
        const data = await res.json();
        setResult(data);
        setLiveWorkflow(data);
      } catch (fallbackErr) {
        setResult({
          finalStatus: "ERROR",
          logs: [`Failed to connect: ${fallbackErr.message}`]
        });
      }
    } finally {
      setIsScheduling(false);
      setActiveAgent(null);
    }
  };

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "1.5rem" }}>
      {/* Toast Alert */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          top: "1.5rem",
          right: "1.5rem",
          zIndex: 9999,
          background: "#ffffff",
          border: "1px solid #cbd5e1",
          color: "var(--text-main)",
          padding: "0.8rem 1.25rem",
          borderRadius: "10px",
          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.06)",
          fontSize: "0.875rem",
          fontWeight: "500",
          animation: "slideIn 0.2s ease"
        }}>
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <Header
        serverHealth={serverHealth}
        onOpenPolicies={() => setIsKnowledgeOpen(true)}
        onTestConnection={handleTestConnection}
        testingConnection={testingConnection}
      />

      {/* Main Grid: Form on Left, Agent Visualizer on Right */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
        gap: "2rem",
        alignItems: "start"
      }}>
        {/* Left Column: Form */}
        <SchedulerForm
          onSubmit={handleScheduleSubmit}
          isScheduling={isScheduling}
        />

        {/* Right Column: Visualizer */}
        <AgentWorkflowVisualizer
          result={result}
          isScheduling={isScheduling}
          activeAgent={activeAgent}
          activeMessage={activeMessage}
          liveWorkflow={liveWorkflow}
        />
      </div>

      {/* RAG Knowledge Modal */}
      <KnowledgeModal
        isOpen={isKnowledgeOpen}
        onClose={() => setIsKnowledgeOpen(false)}
      />
    </div>
  );
}
