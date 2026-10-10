# 🎓 Comprehensive Learning Guide: AI Multi-Agent Meeting Scheduler

> **Target Audience:** Anyone wanting to deeply understand modern Agentic AI engineering, **LangChain**, **LangGraph**, **RAG**, **Guardrails**, and how a real full-stack multi-agent system functions from the React button click down to the backend execution loop.

---

## 📑 Table of Contents
1. [Core Fundamentals: What are LangChain, LangGraph, & RAG?](#1-core-fundamentals)
   - [Why a Simple ChatGPT Prompt Fails for Scheduling](#why-simple-chatgpt-fails)
   - [What is LangChain?](#what-is-langchain)
   - [What is LangGraph?](#what-is-langgraph)
   - [What is RAG (Retrieval-Augmented Generation)?](#what-is-rag)
2. [Where Each Concept Lives in This Codebase](#2-where-each-concept-lives-in-this-codebase)
3. [The Complete Life Cycle: From Button Click to Final Booking](#3-the-complete-life-cycle)
   - [Phase 1: React Frontend (The Trigger)](#phase-1-react-frontend)
   - [Phase 2: Express Server & SSE Streaming](#phase-2-express-server--sse-streaming)
   - [Phase 3: The 5-Node LangGraph State Machine](#phase-3-the-5-node-langgraph-state-machine)
   - [Phase 4: The Cyclic Revision Loop (Self-Correction)](#phase-4-the-cyclic-revision-loop)
   - [Phase 5: Real-World Integrations (Calendar & Email)](#phase-5-real-world-integrations)
4. [Deep Dive into Every Agent & File](#4-deep-dive-into-every-agent--file)
5. [Summary Architecture Diagram](#5-summary-architecture-diagram)

---

<a id="1-core-fundamentals"></a>
## 1. Core Fundamentals

<a id="why-simple-chatgpt-fails"></a>
### Why a Simple ChatGPT Prompt Fails for Scheduling
If you ask a single standard LLM (like GPT-4 or Claude):
> *"Schedule a meeting with Amal in India and Favas in New York on Oct 15th."*

The LLM **cannot** safely do this alone because:
1. **It has no eyes on real calendars:** It doesn't know who is already busy at 2:00 PM.
2. **It hallucinates rules:** It might schedule across lunch hours, on weekends, or at 3:00 AM New York time.
3. **It has no memory or self-correction:** If a slot has a conflict, a single prompt can't verify, backtrack, and propose an alternative.
4. **It cannot execute real actions:** It cannot create a real Google Meet room, write to a database, or send an email.

To solve this, we build an **Autonomous Multi-Agent System**. Instead of asking one AI to do everything, we divide the work among specialized agents that talk to each other and use real code tools.

---

<a id="what-is-langchain"></a>
### What is LangChain?
Think of **LangChain** as the **"universal adaptor" and utility library** for LLMs.
- Without LangChain: If you want to switch from local Ollama (`qwen2.5`) to OpenRouter (`gpt-4o-mini`), you would have to rewrite all your API calls, headers, and parsing logic.
- With LangChain: LangChain standardizes models into uniform classes (`ChatOllama`, `ChatOpenAI`), handles chat message formats (`SystemMessage`, `HumanMessage`), and makes it easy to switch providers with a single setting.

**Where we use LangChain in this project:**
- `server/src/config/llm.js`: Defines `getLLM()` which effortlessly connects to either local Ollama or cloud models via `@langchain/ollama` and `@langchain/openai`.
- `server/src/agents/planner.js`: Uses `SystemMessage` and `HumanMessage` to send structured prompts to the planner agent.
- `server/src/agents/validator.js`: Uses LangChain to audit compliance.

---

<a id="what-is-langgraph"></a>
### What is LangGraph?
If LangChain is the *engine*, **LangGraph** is the *flight control computer*.

Standard LangChain chains only run in a straight line: `A -> B -> C -> End`.
Real-world problems are **NOT** straight lines. What happens when:
- Agent 2 (Executor) finds a calendar conflict?
- Agent 3 (Validator) finds that the slot is in the middle of lunch break?

You need the system to **loop back** to Agent 1 (Planner), say *"Hey, 14:00 was rejected due to lunch break, pick another one"*, and try again!

This is what **LangGraph** does:
1. **State:** A shared memory object (`SchedulerState`) that passes data between agents.
2. **Nodes:** Functions representing individual agents (`planner`, `executor`, `validator`).
3. **Edges:** Direction arrows connecting nodes.
4. **Conditional Edges:** Logic gates (`if status === "NEEDS_REVISION" goto planner else goto end`).

---

<a id="what-is-rag"></a>
### What is RAG (Retrieval-Augmented Generation)?
**RAG** stands for **Retrieval-Augmented Generation**.
Normally, an LLM only knows what was in its training data (which ended in the past) and what you paste into the prompt. It knows **nothing** about:
- Your company's internal working hours.
- Protected lunch hour policies (13:00 - 14:00).
- "Focus Friday" policies (no meetings after 14:00 on Fridays).
- Amal's timezone (Kolkata) or Favas's preference (no meetings before 10 AM EST).

Instead of retraining or fine-tuning the AI (which is expensive and slow), **RAG works like an open-book exam**:
1. We store company knowledge in Markdown/JSON files (`server/knowledge/company_policies.md` and `server/knowledge/attendee_profiles.json`).
2. Before the agents start planning, the **RAG Node** searches and retrieves only the relevant rules and attendee constraints.
3. It injects those rules into the prompt so the LLM has the exact context right in front of it.

---

<a id="2-where-each-concept-lives-in-this-codebase"></a>
## 2. Where Each Concept Lives in This Codebase

| Concept | File / Directory | What It Does In This Project |
| :--- | :--- | :--- |
| **LangChain LLM Setup** | `server/src/config/llm.js` | Initializes Ollama or OpenRouter models with fallbacks. |
| **LangGraph Workflow Graph** | `server/src/graph/schedulerGraph.js` | Constructs the state machine: nodes, transitions, and cyclic loops. |
| **LangGraph Shared State** | `server/src/state/schedulerState.js` | Defines the schema for the data passed between agents. |
| **RAG Knowledge Base** | `server/src/rag/vectorStore.js`<br>`server/knowledge/` | Ingests company policies and attendee profiles for instant retrieval. |
| **Security Guardrails** | `server/src/guardrails/inputGuardrail.js`<br>`server/src/agents/validator.js` | Layer 1 protects against prompt injection; Layer 2 enforces business rules. |
| **Agent 1: Planner** | `server/src/agents/planner.js` | Proposes 1 to 3 candidate meeting time slots. |
| **Agent 2: Executor** | `server/src/agents/executor.js` | Checks actual calendar busy times and locks the best slot. |
| **Agent 3: Validator** | `server/src/agents/validator.js` | Audits the booking against guardrails and company policies. |
| **Real Tools** | `server/src/tools/calendarTool.js`<br>`server/src/tools/googleCalendarTool.js`<br>`server/src/tools/emailTool.js` | Generates Google Meet rooms, Google Calendar links, and dispatches email invitations. |
| **Frontend UI (React)** | `client/src/App.jsx`<br>`client/src/components/SchedulerForm.jsx`<br>`client/src/components/AgentWorkflowVisualizer.jsx` | Renders the form, listens to live SSE stream, and displays each agent step-by-step. |

---

<a id="3-the-complete-life-cycle"></a>
## 3. The Complete Life Cycle: From Button Click to Final Booking

Here is the exact step-by-step story of what happens when you use the app:

```
[User clicks "Trigger Multi-Agent Scheduler"]
                     │
                     ▼
             [client/src/App.jsx]
         Opens SSE Stream Connection
       POST /api/schedule/stream
                     │
                     ▼
     [server/src/controllers/meetingController.js]
                     │
                     ▼
         ┌────────────────────────────────────────────────────────┐
         │              LangGraph Workflow Pipeline               │
         │                                                        │
         │ 1. [inputGuardrail] ──► Block malicious injection      │
         │         │                                              │
         │         ▼ (clean)                                      │
         │ 2. [ragRetriever]   ──► Fetch policies & team profiles │
         │         │                                              │
         │         ▼                                              │
         │ 3. [planner]        ──► Propose Candidate Slots        │
         │         │                                              │
         │         ▼                                              │
         │ 4. [executor]       ──► Check real calendar availability│
         │         │                                              │
         │         ▼                                              │
         │ 5. [validator]      ──► Audit against rules            │
         │         │                                              │
         │         ├── (Conflict/Violation?)                      │
         │         │       └─► Loops BACK to [planner] (Cycle #2) │
         │         │                                              │
         │         └── (APPROVED!)                                │
         │                 ├─► Assign Google Meet Link            │
         │                 ├─► Generate Google Calendar Link      │
         │                 └─► Send Email Notification            │
         └────────────────────────────────────────────────────────┘
                     │
                     ▼ (Streaming SSE updates in real time)
       [AgentWorkflowVisualizer.jsx updates each agent card]
```

---

<a id="phase-1-react-frontend"></a>
### Phase 1: React Frontend (The Trigger)
1. You select a topic (e.g. *"Project Planning & Architecture Sync"*), a preferred date (`15-10-2026`), duration (`30 Minutes`), and attendees.
2. In [`client/src/components/SchedulerForm.jsx`](file:///d:/02-Brocamp/ai%20meet%20sheduler/client/src/components/SchedulerForm.jsx), submitting triggers `onSubmit(formData)`.
3. In [`client/src/App.jsx`](file:///d:/02-Brocamp/ai%20meet%20sheduler/client/src/App.jsx), `handleScheduleSubmit()` runs.
4. It initiates an HTTP `fetch` to `http://localhost:5000/api/schedule/stream` using **SSE (Server-Sent Events)**.

---

<a id="phase-2-express-server--sse-streaming"></a>
### Phase 2: Express Server & SSE Streaming
Why do we use **SSE (Server-Sent Events)** instead of standard REST?
- In a traditional REST call (`POST /api/schedule`), the browser must wait in complete silence for 5-10 seconds until all 3 agents finish, then suddenly show everything at once.
- With **SSE**, the backend leaves the connection open (`res.write("event: step\ndata: ...\n\n")`). As each individual agent starts and finishes, it broadcasts an event.
- The React UI reads this stream using `response.body.getReader()` and updates the UI live:
  - *Agent 1 working* -> UI lights up Agent 1 with a pulsing indicator.
  - *Agent 1 finishes* -> UI shows proposed candidate slots and moves to Agent 2.
  - *Agent 2 working* -> UI checks calendar conflicts.
  - *Agent 3 auditing* -> UI evaluates guardrails.

---

<a id="phase-3-the-5-node-langgraph-state-machine"></a>
### Phase 3: The 5-Node LangGraph State Machine

The graph is defined in [`server/src/graph/schedulerGraph.js`](file:///d:/02-Brocamp/ai%20meet%20sheduler/server/src/graph/schedulerGraph.js). It executes five distinct nodes in order:

#### 🛡️ Node 1: Input Guardrail (`inputGuardrail.js`)
- **Job:** Intercept prompt injection attacks or malformed requests before any expensive LLM calls occur.
- **How it works:** It inspects the topic and notes for blacklisted injection phrases like *"Ignore previous instructions"*, *"delete database"*, etc.
- **If bad:** It sets `finalStatus = "GUARDRAIL_BLOCKED"` and halts immediately.
- **If good:** Passes clean state to Node 2.

#### 📚 Node 2: RAG Retriever (`ragRetriever`)
- **Job:** Fetch context from disk.
- **How it works:** Reads `server/knowledge/company_policies.md` and `server/knowledge/attendee_profiles.json`.
- **Output:** Packages the working hours, lunch hours, and attendee preferences into `state.ragContext`.

#### 🤖 Node 3: Agent 1 - Planner (`planner.js`)
- **Job:** Formulate meeting slot proposals.
- **How it works:** Sends the user request and the RAG policies to the LLM with a strict prompt:
  ```json
  {
    "meetingObjective": "Project Planning & Architecture Sync",
    "candidateSlots": [
      { "date": "2026-10-15", "startTime": "10:00", "endTime": "10:30", "timezone": "Asia/Kolkata" }
    ]
  }
  ```
- **Output:** Puts `candidateSlots` into `state.plan`.

#### ⚙️ Node 4: Agent 2 - Executor (`executor.js`)
- **Job:** Check real calendar commitments.
- **How it works:** Calls `CalendarTool.checkSlotAvailability()`. It cross-references each attendee's existing calendar commitments and enforces a **15-minute buffer requirement**.
- **Output:**
  - If a slot is completely free: It locks that slot and generates a unique Google Meet room (`https://meet.google.com/xxx-yyyy-zzz`).
  - If all slots overlap with existing meetings: It flags `hasConflict: true` with a detailed conflict summary.

#### 🔍 Node 5: Agent 3 - Validator (`validator.js`)
- **Job:** Strict policy and compliance audit.
- **How it works:** Evaluates deterministic code checks:
  1. *Working hours:* Is the slot between 09:00 and 18:00?
  2. *Weekend policy:* Is the date a Saturday or Sunday?
  3. *Lunch policy:* Does it overlap with 13:00 - 14:00?
  4. *Focus Friday:* Is it a Friday afternoon meeting after 14:00?
- **Output:** Returns either `status: "APPROVED"` or `status: "NEEDS_REVISION"` with a list of violations.

---

<a id="phase-4-the-cyclic-revision-loop"></a>
### Phase 4: The Cyclic Revision Loop (Self-Correction)

This is the most powerful capability of **LangGraph**:

In [`server/src/graph/schedulerGraph.js`](file:///d:/02-Brocamp/ai%20meet%20sheduler/server/src/graph/schedulerGraph.js):
```javascript
workflow.addConditionalEdges("validator", routeAfterValidation, {
  planner: "planner",
  end: END
});
```

If Agent 3 returns `NEEDS_REVISION`:
1. The graph **does not fail or crash**.
2. It increments `iterationCount = 2`.
3. It routes execution **back to Agent 1 (Planner)**.
4. When Agent 1 runs this second time, its prompt includes:
   > *"⚠️ PREVIOUS ATTEMPT REJECTED: Slot 15:00-15:30 has a conflict for Favas. Please choose an alternate window!"*
5. Agent 1 proposes an alternate slot (e.g. `10:00 - 10:30`).
6. Agent 2 verifies it.
7. Agent 3 approves it.
8. The workflow completes with `finalStatus = "SUCCESS"`.

---

<a id="phase-5-real-world-integrations"></a>
### Phase 5: Real-World Integrations (Calendar & Email)

Once Agent 3 marks the booking as `APPROVED`, two real tool actions execute:
1. **Google Calendar URL Generator ([`googleCalendarTool.js`](file:///d:/02-Brocamp/ai%20meet%20sheduler/server/src/tools/googleCalendarTool.js)):**
   Generates a one-click direct calendar link (`https://calendar.google.com/calendar/render?action=TEMPLATE&...`) with title, date, time, attendees, agenda, and Google Meet room pre-populated.
2. **Email Dispatcher ([`emailTool.js`](file:///d:/02-Brocamp/ai%20meet%20sheduler/server/src/tools/emailTool.js)):**
   - In production mode (`EMAIL_ENABLED=true`): Dispatches real HTML emails with an interactive `.ics` calendar attachment via Nodemailer SMTP.
   - In development mode (`EMAIL_ENABLED=false`): Safely simulates delivery without spamming real inboxes, while still verifying email addresses and calendar invitations.

---

<a id="4-deep-dive-into-every-agent--file"></a>
## 4. Deep Dive into Every Agent & File

### Frontend File Architecture
- [`client/src/App.jsx`](file:///d:/02-Brocamp/ai%20meet%20sheduler/client/src/App.jsx): Main application root. Connects to the SSE stream, manages live agent state, and triggers health checks.
- [`client/src/config/api.js`](file:///d:/02-Brocamp/ai%20meet%20sheduler/client/src/config/api.js): Centralizes all API endpoints (`/api/health`, `/api/schedule/stream`, `/api/knowledge`).
- [`client/src/utils/dateUtils.js`](file:///d:/02-Brocamp/ai%20meet%20sheduler/client/src/utils/dateUtils.js): Standardizes all displayed dates into `DD-MM-YYYY` (e.g., `15-10-2026`).
- [`client/src/components/SchedulerForm.jsx`](file:///d:/02-Brocamp/ai%20meet%20sheduler/client/src/components/SchedulerForm.jsx): The meeting input form with preset demo buttons, attendee selectors, and duration pickers.
- [`client/src/components/AgentWorkflowVisualizer.jsx`](file:///d:/02-Brocamp/ai%20meet%20sheduler/client/src/components/AgentWorkflowVisualizer.jsx): Visualizes the multi-agent execution trace in real time with animated status badges, candidate cards, and confirmed reservations.

### Backend File Architecture
- [`server/src/config/llm.js`](file:///d:/02-Brocamp/ai%20meet%20sheduler/server/src/config/llm.js): Configures LangChain Chat Models (Ollama local / OpenRouter cloud).
- [`server/src/guardrails/inputGuardrail.js`](file:///d:/02-Brocamp/ai%20meet%20sheduler/server/src/guardrails/inputGuardrail.js): Sanitizes prompt injection attacks.
- [`server/src/rag/vectorStore.js`](file:///d:/02-Brocamp/ai%20meet%20sheduler/server/src/rag/vectorStore.js): Loads policies and attendee preferences from `server/knowledge/`.
- [`server/src/agents/planner.js`](file:///d:/02-Brocamp/ai%20meet%20sheduler/server/src/agents/planner.js): Planner Agent reasoning node.
- [`server/src/agents/executor.js`](file:///d:/02-Brocamp/ai%20meet%20sheduler/server/src/agents/executor.js): Executor Agent calendar availability checker.
- [`server/src/agents/validator.js`](file:///d:/02-Brocamp/ai%20meet%20sheduler/server/src/agents/validator.js): Validator Agent business rules auditor.
- [`server/src/tools/calendarTool.js`](file:///d:/02-Brocamp/ai%20meet%20sheduler/server/src/tools/calendarTool.js): In-memory calendar store with 15-minute buffer conflict checking.
- [`server/src/tools/emailTool.js`](file:///d:/02-Brocamp/ai%20meet%20sheduler/server/src/tools/emailTool.js): Email invite sender with `.ics` calendar attachments.
- [`server/src/utils/dateTimeUtils.js`](file:///d:/02-Brocamp/ai%20meet%20sheduler/server/src/utils/dateTimeUtils.js): Backend time parsing and date formatting helpers.

---

<a id="5-summary-architecture-diagram"></a>
## 5. Summary Architecture Diagram

```
+-------------------------------------------------------------------------+
|                          REACT FRONTEND (Vite)                          |
|  - SchedulerForm (User Input: topic, date DD-MM-YYYY, attendees)        |
|  - AgentWorkflowVisualizer (Real-time SSE event cards & revision trace) |
+------------------------------------┬------------------------------------+
                                     │ HTTP POST (SSE stream)
                                     ▼
+-------------------------------------------------------------------------+
|                        EXPRESS BACKEND (Node.js)                        |
|  /api/schedule/stream  --> meetingController.scheduleMeetingStream      |
+------------------------------------┬------------------------------------+
                                     │ Invoke LangGraph State Machine
                                     ▼
                     +-------------------------------+
                     | Node 1: inputGuardrail        |
                     | (Prompt injection sanitizer)  |
                     +---------------┬---------------+
                                     │ Passed
                                     ▼
                     +-------------------------------+
                     | Node 2: ragRetriever          |
                     | (Policies & Attendee Profiles)|
                     +---------------┬---------------+
                                     │ Context loaded
                                     ▼
                     +-------------------------------+ <----------+
                     | Node 3: Agent 1 (Planner)     |            |
                     | (LLM generates candidate time)|            |
                     +---------------┬---------------+            |
                                     │ Candidate slots            |
                                     ▼                            | (Cyclic Loop:
                     +-------------------------------+            |  Revision Attempt
                     | Node 4: Agent 2 (Executor)    |            |  when conflict found)
                     | (Checks busy slots & buffers) |            |
                     +---------------┬---------------+            |
                                     │ Locked slot                |
                                     ▼                            |
                     +-------------------------------+            |
                     | Node 5: Agent 3 (Validator)   |            |
                     | (Audits lunch, weekend, hours)│            |
                     +---------------┬---------------+            |
                                     │                            |
                        [Validation Verdict?]                     |
                        /                     \                   |
                  NEEDS_REVISION            APPROVED              |
                       │                       │                  |
                       +------------------------------------------+
                                               │
                                               ▼
                     +---------------------------------------+
                     | Final Commit & Tool Execution         |
                     | 1. Generate Google Meet video room    |
                     | 2. Generate Google Calendar add link  |
                     | 3. Dispatch Email Invite (.ics RFC)   |
                     | 4. Stream completion payload to React |
                     +---------------------------------------+
```
