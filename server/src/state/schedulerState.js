import { Annotation } from "@langchain/langgraph";

/**
 * Shared LangGraph State Schema across all nodes
 */
export const SchedulerAnnotation = Annotation.Root({
  // Initial sanitized user request
  userRequest: Annotation({
    reducer: (curr, next) => next ?? curr,
    default: () => null
  }),

  // Retrieved knowledge context from RAG
  ragContext: Annotation({
    reducer: (curr, next) => next ?? curr,
    default: () => ""
  }),

  // Proposed plan from Planner Agent
  plan: Annotation({
    reducer: (curr, next) => next ?? curr,
    default: () => null
  }),

  // Execution and Calendar Tool result from Executor Agent
  execution: Annotation({
    reducer: (curr, next) => next ?? curr,
    default: () => null
  }),

  // Validation verdict and critique from Validator Agent
  validation: Annotation({
    reducer: (curr, next) => next ?? curr,
    default: () => null
  }),

  // Revision / recursion counter for loop guardrails
  iterationCount: Annotation({
    reducer: (curr, next) => next ?? (curr + 1),
    default: () => 0
  }),

  // Final output status: "SUCCESS" | "ESCALATED" | "GUARDRAIL_BLOCKED"
  finalStatus: Annotation({
    reducer: (curr, next) => next ?? curr,
    default: () => "PENDING"
  }),

  // System logs / error trace
  logs: Annotation({
    reducer: (curr, next) => [...(curr || []), ...(next || [])],
    default: () => []
  })
});
