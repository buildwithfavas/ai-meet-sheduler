import { Annotation } from "@langchain/langgraph";

/**
 * Shared LangGraph State Schema across all nodes
 */
export const SchedulerAnnotation = Annotation.Root({

  userRequest: Annotation({
    reducer: (curr, next) => next ?? curr,
    default: () => null
  }),

  ragContext: Annotation({
    reducer: (curr, next) => next ?? curr,
    default: () => ""
  }),
  
  plan: Annotation({
    reducer: (curr, next) => next ?? curr,
    default: () => null
  }),

  execution: Annotation({
    reducer: (curr, next) => next ?? curr,
    default: () => null
  }),

  validation: Annotation({
    reducer: (curr, next) => next ?? curr,
    default: () => null
  }),

  iterationCount: Annotation({
    reducer: (curr, next) => next ?? (curr + 1),
    default: () => 0
  }),

  finalStatus: Annotation({
    reducer: (curr, next) => next ?? curr,
    default: () => "PENDING"
  }),

  logs: Annotation({
    reducer: (curr, next) => [...(curr || []), ...(next || [])],
    default: () => []
  })
});
