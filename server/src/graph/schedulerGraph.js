import { StateGraph, START, END } from "@langchain/langgraph";
import { SchedulerAnnotation } from "../state/schedulerState.js";
import { validateAndSanitizeInput } from "../guardrails/inputGuardrail.js";
import { isLoopLimitExceeded, createEscalationReport } from "../guardrails/loopGuardrail.js";
import { queryKnowledgeBase } from "../rag/vectorStore.js";
import { plannerNode } from "../agents/planner.js";
import { executorNode } from "../agents/executor.js";
import { validatorNode } from "../agents/validator.js";

/**
 * Node 1: Input Guardrail Check
 */
function inputGuardrailNode(state) {
  console.log(`\n🛡️ [Guardrail Layer 1] Inspecting input for security and schema validity...`);
  const check = validateAndSanitizeInput(state.userRequest);

  if (!check.valid) {
    console.log(`🚫 [Guardrail Layer 1] Input blocked: ${check.error}`);
    return {
      finalStatus: "GUARDRAIL_BLOCKED",
      logs: [`Guardrail: Blocked input - ${check.error}`]
    };
  }

  return {
    userRequest: check.sanitizedInput,
    logs: ["Guardrail: Input sanitized and verified successfully"]
  };
}

/**
 * Node 2: RAG Knowledge Retrieval
 */
function ragRetrievalNode(state) {
  console.log(`\n📚 [RAG Node] Retrieving company scheduling policies and attendee preferences...`);
  const context = queryKnowledgeBase({
    query: `${state.userRequest.topic} ${state.userRequest.timePreference || ""}`,
    attendeeEmails: state.userRequest.attendees
  });

  return {
    ragContext: context,
    logs: ["RAG: Retrieved relevant organizational context and preferences"]
  };
}

/**
 * Node: Completion Node
 */
function completionNode(state) {
  console.log(`\n🎉 [Workflow Completed] Meeting successfully scheduled!`);
  return {
    finalStatus: "SUCCESS",
    logs: ["Workflow completed successfully"]
  };
}

/**
 * Node: Escalation Node (Loop Guardrail)
 */
function escalationNode(state) {
  console.log(`\n⚠️ [Guardrail Layer 3] Loop limit reached. Escalating to human organizer...`);
  const report = createEscalationReport(state);
  return {
    finalStatus: "ESCALATED",
    validation: {
      status: "ESCALATED",
      violations: report.reasons,
      critique: report.message,
      recommendation: report.recommendation
    },
    logs: ["Workflow escalated to human coordinator"]
  };
}

/**
 * Conditional Routing Edge after Input Guardrail
 */
function routeAfterGuardrail(state) {
  if (state.finalStatus === "GUARDRAIL_BLOCKED") {
    return END;
  }
  return "ragRetriever";
}

/**
 * Conditional Routing Edge after Validator
 */
function routeAfterValidator(state) {
  const status = state.validation?.status;

  if (status === "APPROVED") {
    return "complete";
  }

  // Check loop guardrail
  if (isLoopLimitExceeded(state.iterationCount)) {
    return "escalate";
  }

  // Cycle back to Planner with Validator's feedback
  console.log(`\n🔁 [LangGraph Cyclic Edge] Routing back to Planner Agent for Revision (Count: ${state.iterationCount})...`);
  return "planner";
}

/**
 * Build and compile the full Multi-Agent LangGraph Workflow
 */
export function buildSchedulerGraph() {
  const workflow = new StateGraph(SchedulerAnnotation)
    // Add Nodes
    .addNode("inputGuardrail", inputGuardrailNode)
    .addNode("ragRetriever", ragRetrievalNode)
    .addNode("planner", plannerNode)
    .addNode("executor", executorNode)
    .addNode("validator", validatorNode)
    .addNode("complete", completionNode)
    .addNode("escalate", escalationNode)

    // Define Graph Edges
    .addEdge(START, "inputGuardrail")
    .addConditionalEdges("inputGuardrail", routeAfterGuardrail)
    .addEdge("ragRetriever", "planner")
    .addEdge("planner", "executor")
    .addEdge("executor", "validator")
    .addConditionalEdges("validator", routeAfterValidator)
    .addEdge("complete", END)
    .addEdge("escalate", END);

  return workflow.compile();
}
