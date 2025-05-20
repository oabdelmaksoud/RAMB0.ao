# Overall Architecture

## Frontend
The Frontend, built with Next.js, serves as the user interface for interacting with tasks, projects, and workflows. Key components are located in `src/app` and `src/components`, enabling users to manage their work visually and intuitively.

## Backend (`rambo-backend`)
The Backend, powered by NestJS and located in `rambo-backend/src`, handles the core business logic, data persistence, and user authentication. It exposes a GraphQL API for the frontend to consume, ensuring efficient data exchange.

## AI Planning (`src/ai`)
The AI Planning component, utilizing Genkit and Google AI, is responsible for the intelligent planning of tasks. It breaks down complex tasks into manageable sub-tasks and suggests appropriate agent assignments, with its core logic found in `src/ai/flows`.

## Database (`rambo-backend/prisma/schema.prisma`)
The Database, defined and managed by Prisma with PostgreSQL as the underlying engine, stores all critical data. This includes information about users, projects, tasks, workflows, agents, and logs, as specified in `rambo-backend/prisma/schema.prisma`.

# AI-Driven Task Planning Flow

## Core Component
The `planProjectTaskFlow`, located in `src/ai/flows/plan-project-task-flow.ts`, is the central AI-driven flow responsible for task planning within the system.

## Technology
This flow leverages Genkit, a framework for building AI-powered applications, and utilizes a Google AI model (e.g., Gemini) for its intelligent decision-making capabilities.

## Inputs
The `planProjectTaskFlow` takes several key inputs to generate a comprehensive task plan:
*   **User's Goal/Task Description:** The primary objective or task the user wants to achieve.
*   **Project ID and Context:** Information about the specific project for which the task is being planned, providing relevant background.
*   **Existing Project Workflows:** Contextual information from existing workflows within the project to inform the planning process.
*   **Specific Workflow (Optional):** Users can optionally select a specific workflow to guide the AI's planning strategy.
*   **Previous Plan Details (for Modifications):** If the request is to modify an existing plan, details of the previous plan are provided.

## Process
The flow employs sophisticated prompt engineering techniques to instruct the AI model. This involves carefully crafting prompts that guide the AI to consider all relevant inputs and constraints, leading to an effective and context-aware task plan.

## Outputs
The primary outputs of the `planProjectTaskFlow` are:
*   **`plannedTask` Object:** A structured object representing the planned task. This object includes key fields such as:
    *   `title`: The title of the task.
    *   `status`: The current status of the task (e.g., "To Do", "In Progress").
    *   `assignee`: The suggested agent or team to work on the task.
    *   `startDate`: The anticipated start date of the task.
    *   `duration`: The estimated time required to complete the task.
    *   `suggestedSubTasks`: A list of sub-tasks that break down the main task.
*   **`reasoning`:** An explanation from the AI detailing the rationale behind its generated plan and decisions.

## Key AI Capabilities
The AI integrated into this flow exhibits several key capabilities:
*   **Task Duration Estimation:** It estimates task durations by considering the execution speed of AI agents.
*   **Intelligent Assignment:** Assigns tasks to "Agent Workflows" or "Agent Teams," which can be either conceptual or based on existing defined structures.
*   **Sub-Task Generation:** Generates `suggestedSubTasks`, where each sub-task includes an `assignedAgentType`. This type can be derived from the nodes of a user-selected workflow, ensuring alignment with established processes.
*   **Iterative Refinement:** Supports iterative refinement of the plan based on user feedback, allowing for adjustments and improvements to the initial plan.

# Workflow Definition and Structure

## 1. Database Schema
The foundational structure for workflow definitions is managed within the project's database, with `rambo-backend/prisma/schema.prisma` serving as the definitive source for these data models.

Key models involved in defining workflows are:
*   **`Workflow`**: Represents an entire workflow or process template. It acts as a container for the various steps and transitions.
*   **`WorkflowNode`**: Defines a specific step, stage, or action within a `Workflow`. Each node represents a unit of work.
*   **`WorkflowEdge`**: Represents a connection or transition between two `WorkflowNodes` within a `Workflow`. These edges can define the flow of control, potentially including conditions for transitioning from one node to another.

In essence, a `Workflow` is constructed from a series of `WorkflowNodes` that are interconnected by `WorkflowEdges`, outlining the sequence and logic of a process.

## 2. Workflow Node Details
Each `WorkflowNode` in the schema includes a crucial `type` field. This `type` is designed to correspond to an `Agent.type` from the `Agent` table (also defined in `rambo-backend/prisma/schema.prisma`). This linkage effectively assigns a specific kind of AI agent or automated capability to each step in the workflow.

Furthermore, the `WorkflowNode` model contains a `config` field, which is a JSON type. This field is intended to store agent-specific parameters or configurations, allowing for customized behavior of the assigned agent for that particular workflow step.

## 3. Workflow Creation (Assumption)
The system's design strongly suggests that users are empowered to create and manage these workflow definitions. While the exact implementation details for workflow creation are not fully detailed in the provided context, a graphical user interface is the most probable method.

A likely candidate for this interface is the component located at `src/app/workflow-designer/page.tsx`. This suggests that users would be able to visually construct workflows by adding various `WorkflowNodes`, defining their properties (like `type` and `config`), and connecting them with `WorkflowEdges` to map out the process flow.

## 4. Purpose
The defined workflows serve a dual critical purpose within the task management system:
*   **Guiding AI Task Planning:** As observed in the `planProjectTaskFlow`, when `selectedWorkflowDetail` (which would be a specific `Workflow` instance) is provided as input, it serves as a template or blueprint. The AI uses this predefined structure to break down tasks into sub-tasks, ensuring that the generated plan aligns with established processes and agent capabilities defined in the workflow nodes.
*   **Directing Automated Execution:** These structured workflows are designed to direct the automated execution of tasks. Each node, linked to an agent type and configured with specific parameters, represents a step to be performed by the corresponding AI agent, with edges dictating the sequence of execution.

# Task Execution Flow

The system now supports both simulated and production modes for task execution, managed by the `WorkflowExecutionProvider`.

## 1. Task-Workflow Link
When a task is planned (e.g., via `planProjectTaskFlow`), a `Task` record is created and linked to a specific `Workflow` definition via `Task.workflowId`. This dictates the steps for the task's execution. Tasks can also be linked directly to an agent via `Task.agentId` for simpler, single-step operations, although workflow-driven execution is the primary focus for complex tasks.

## 2. Execution Service Architecture
*   **`WorkflowExecutionService` (Abstract Class):** Defined in `src/services/workflow-execution-service.ts`, this abstract class outlines the contract for all workflow execution services.
*   **`WorkflowExecutionProvider`:** Located in `rambo-backend/src/services/workflow-execution-provider.ts`, this provider is responsible for furnishing an instance of an execution service. It can return:
    *   `ProductionWorkflowExecutionService`: For actual task execution using real agents.
    *   `SimulatedWorkflowExecutionService`: For simulating workflow logic without real agent invocation.
    The choice is determined by environment variables or options passed during initialization (e.g., `options.simulationMode`).
*   **Type Definitions (`src/types/workflow-execution.ts`):** This file defines crucial runtime types like `RuntimeWorkflowExecution` (representing the state of an ongoing workflow) and `RuntimeExecutionNode` (representing the state of a node within that execution). It includes helpers like `createInitialRuntimeWorkflowExecution` and `createRuntimeExecutionNode` which parse `WorkflowNode.config` from Prisma into structured `agentConfig` and `inputData` for the runtime node.

## 3. Production Execution (`ProductionWorkflowExecutionService`)
Located in `rambo-backend/src/services/ProductionWorkflowExecutionService.ts`, this service orchestrates the actual execution of workflows:

### a. Initialization (`initializeWorkflow`)
*   Takes a `workflowIdFromDb` (ID of a Prisma `Workflow`) and a `taskId`.
*   Fetches the `Workflow` definition (including its `WorkflowNodes` and `WorkflowEdges`) and the `Task` from the database.
*   Creates a `RuntimeWorkflowExecution` object. During this, each `PrismaWorkflowNode` is converted into a `RuntimeExecutionNode`. The `config` (JSON) from `PrismaWorkflowNode` is parsed:
    *   `agentConfig`: General configuration for the agent (e.g., `flowName` for a Genkit flow).
    *   `inputData`: Specific input for this node's execution.
*   Stores the `RuntimeWorkflowExecution` in an in-memory `activeWorkflows` map and logs the initialization to `TaskLog`.

### b. Starting Execution (`startWorkflow`)
*   Retrieves the initialized `RuntimeWorkflowExecution`.
*   Sets its status to `RUNNING` and updates the associated `Task` status to `IN_PROGRESS`.
*   Identifies entry nodes (nodes with no incoming edges) and calls `executeNode` for each.

### c. Node Execution (`executeNode`)
*   Retrieves the specific `RuntimeExecutionNode` to be executed.
*   Sets the node's status to `RUNNING`.
*   Calls `dispatchAgentTask`, passing the `node.type` (e.g., "genkitFlowRunner"), `node.agentConfig`, and `node.inputData`.

### d. Agent Dispatch (`dispatchAgentTask`)
*   This private method acts as a router based on the `agentType` (derived from `RuntimeExecutionNode.type`).
*   It contains a `switch` statement to call the appropriate handler for the given agent type.

### e. `genkitFlowRunner` Agent Handler (`invokeGenkitFlowAgent`)
*   **Purpose:** To execute Genkit flows.
*   **Logic:**
    1.  Retrieves `flowName` from `agentConfig.flowName`.
    2.  Looks up the corresponding flow function in the `availableFlows` map (imported from `src/ai/flows/index.ts`).
    3.  If the flow is found, it's invoked with the `nodeInput` (derived from `RuntimeExecutionNode.inputData`).
    4.  The result from the Genkit flow becomes the `outputData` of the `RuntimeExecutionNode`.
    5.  Logs the invocation, parameters, and outcome (success or failure) to `TaskLog`.
    6.  Handles errors from flow execution, setting the node to `FAILED`.
*   If successful, `executeNode` updates the node status to `COMPLETED` and calls `triggerNextNodes`.
*   If failed, `executeNode` updates node status to `FAILED` and calls `completeWorkflow` to potentially fail the entire workflow.

### f. Triggering Next Nodes (`triggerNextNodes`)
*   After a node completes, this method checks its outgoing edges.
*   For each target node, it verifies if all its prerequisite nodes (dependencies) are `COMPLETED` or `SKIPPED`.
*   If all dependencies are met and the target node is `PENDING`, `executeNode` is called for it.
*   Checks for overall workflow completion (all nodes terminal) or failure (a node failed and no further progress possible).

### g. Workflow Completion (`completeWorkflow`)
*   Updates the `RuntimeWorkflowExecution` status (e.g., `COMPLETED`, `FAILED`).
*   Updates the parent `Task` status in the database (e.g., to `DONE`, `BLOCKED`).
*   Logs the final workflow outcome.

### h. Logging
*   The service uses a `log` helper method to write detailed logs (including node activity, agent invocations, errors) to the `TaskLog` table in Prisma, associated with the `taskId` and `workflowExecutionId`.

## 4. Simulated Execution (`SimulatedWorkflowExecutionService`)
*   This service (details might be in `src/services/SimulatedWorkflowExecutionService.ts` or similar) processes workflow structures (`nodes` and `edges`) without invoking real agents.
*   It typically iterates through nodes, simulates time delays, and updates statuses (`PENDING`, `RUNNING`, `COMPLETED`) in memory.
*   It's used for testing workflow logic and UI demonstration of task progression.

## 5. Initiation of Execution
*   Likely triggered via the `useWorkflowExecution` hook (defined conceptually in `rambo-backend/src/services/workflow-execution-provider.ts` but primarily for frontend use via API calls).
*   API endpoints would call static methods on `WorkflowExecutionProvider` (e.g., `initializeWorkflowExecution`, `executeWorkflow`), passing the `PrismaService` instance and selecting the execution mode.

# Remaining Gaps and Future Agent Support
# Remaining Gaps and Future Agent Support

## 1. Current State of Agent Execution
The system now has a functional `ProductionWorkflowExecutionService` capable of actual task execution. The primary gap of not having a production execution engine has been filled. The `genkitFlowRunner` agent type is implemented, allowing workflows to execute Genkit flows based on configurations in `WorkflowNode.config`.

The `TODO` comment previously noted in `src/services/workflow-execution-provider.ts` regarding implementing a production service is now addressed.

## 2. Focus: Expanding Agent Handler Library
The main "gap" is no longer the absence of an execution service, but rather the need to iteratively expand the library of supported agent handlers within `ProductionWorkflowExecutionService`. Each new agent type (like the designed `httpApiCaller` or `scriptRunner`) requires:
*   A unique `type` string (e.g., "httpApiCaller").
*   A corresponding handler method within `ProductionWorkflowExecutionService` (e.g., `invokeHttpApiCallerAgent`).
*   An entry in the `dispatchAgentTask` method's switch statement to route to the new handler.
*   Clear conventions for how `Agent.config` (for agent-level settings) and `WorkflowNode.config.input` (for node-specific inputs) are structured for this agent type.

## 3. Impact of Current Implementation
With the `ProductionWorkflowExecutionService` and `genkitFlowRunner`:
*   The system can automate tasks that are encapsulated within Genkit flows.
*   The core logic for workflow progression, state management (`RuntimeWorkflowExecution`, `RuntimeExecutionNode`), and persistent logging (`TaskLog`) is in place for production execution.
*   The immediate next step for expanding capabilities is to implement the handlers for other designed agent types (like `httpApiCaller`, `scriptRunner`) as detailed in the "Expanding Agent Support (Phase 3 Design)" section. This will unlock a wider range of automation possibilities.

# Supporting Data Models and Logging

The entire task management and execution flow is underpinned by a set of robust data models defined in `rambo-backend/prisma/schema.prisma` and a strategy for logging important events.

## 1. Key Prisma Models

The following Prisma models are central to the task lifecycle, from initial planning through definition, execution, and logging:

*   **`Project`**: Serves as the primary container for all related tasks, workflows, and associated data. It groups work into logical units.
*   **`Task`**: Represents an individual unit of work. This model stores comprehensive details including the task's description, current status (e.g., To Do, In Progress, Completed), assigned user (`assigneeId`), links to a specific `Workflow` (`workflowId`) or a direct `Agent` (`agentId`), relationships to parent tasks (`parentId`), and dependencies on other tasks.
*   **`Workflow`**: Defines a reusable template or blueprint for a process. It consists of a collection of nodes and the edges that connect them, dictating the flow of work.
*   **`WorkflowNode`**: Represents a distinct step, stage, or action within a `Workflow`. Each node is crucially linked to an `Agent.type`, specifying the kind of AI agent or capability required for that step. It also stores node-specific configurations.
*   **`WorkflowEdge`**: Defines the directed connections or transitions between `WorkflowNodes` within a `Workflow`. These edges determine the sequence of operations and can include conditions for progressing from one node to the next.
*   **`Agent`**: Stores critical information about the AI agents available to the system. This includes the `type` of agent (which links to `WorkflowNode.type`), its configuration parameters (`config`), and potentially metadata about its capabilities or the Genkit flows it uses.
*   **`User`**: Represents the human users who interact with the system. This model is used for assigning tasks, defining ownership, and managing permissions.

## 2. Logging Strategy

A comprehensive logging strategy is essential for observability, debugging, and auditing the task execution process. The Prisma schema defines two key logging tables:

*   **`TaskLog`**:
    *   **Purpose:** This table is designed to record significant events, status changes, and key outcomes related to a specific `Task` throughout its entire lifecycle. Examples of log entries could include "Task created," "Task status changed to In Progress," "Sub-task X completed," "Task failed due to error Y," or "Task completed successfully."
    *   **Linkage:** Each `TaskLog` entry is associated with a `Task` via a `taskId`.

*   **`AgentLog`**:
    *   **Purpose:** This table is intended to store detailed operational logs originating from the AI agents themselves during their execution phase. These logs would capture agent-specific information such as decisions made, critical parameters used, errors encountered internally by the agent, and relevant data points processed or generated. This provides a deeper insight into the agent's behavior.
    *   **Linkage:** Each `AgentLog` entry would be associated with an `Agent` (`agentId`) and potentially the specific `Task` or `WorkflowNodeExecution` it was working on.

While the `SimulatedWorkflowExecutionService` currently generates some logs in memory (like `WorkflowExecutionLog` for simulated node statuses), the persistent and structured logging into the `TaskLog` and `AgentLog` tables in the database would be a core responsibility and feature of the future production `WorkflowExecutionService`. This persistent logging is vital for tracking actual work, diagnosing issues in a production environment, and providing an audit trail.

# Conclusion and Future Outlook

## 1. Summary of Current State
The project has successfully established a sophisticated architecture for intelligent task management, which now includes a functional production execution core:
*   **AI-Driven Task Planning:** The `planProjectTaskFlow` decomposes user goals into tasks and sub-tasks.
*   **Workflow Definition:** A robust system for defining workflows, where `WorkflowNode.type` links to an agent type and `WorkflowNode.config` provides `agentConfig` and `inputData`.
*   **Data Models:** Comprehensive Prisma models for all entities.
*   **Execution Services:**
    *   `SimulatedWorkflowExecutionService` for testing and UI demonstration.
    *   `ProductionWorkflowExecutionService` for actual task execution, currently supporting the `genkitFlowRunner` agent type. This service manages the lifecycle of `RuntimeWorkflowExecution` and `RuntimeExecutionNode`, handles agent invocation via `dispatchAgentTask`, and logs to `TaskLog`.
*   **Provider Pattern:** `WorkflowExecutionProvider` selects the appropriate service (production or simulated) based on configuration.

## 2. Current Focus and Next Steps
With the core production execution engine in place, the primary focus shifts from building the engine itself to expanding its capabilities by adding more agent handlers:
*   The immediate next step is to implement the handlers for agent types like `httpApiCaller` and `scriptRunner` as designed in the "Expanding Agent Support (Phase 3 Design)" section.
*   Each new agent handler will extend the system's ability to interact with external systems and perform diverse automated actions.

## 3. Future Potential
The implemented `ProductionWorkflowExecutionService` and the extensible agent model form a strong foundation for a powerful automation and collaboration platform. Future potential includes:
*   **Rich Agent Library:** Developing a comprehensive library of agent handlers for various services and tools.
*   **End-to-End Task Automation:** Achieving seamless automation from user goal to AI planning to multi-agent execution.
*   **Intelligent Agent Collaboration:** Orchestrating complex workflows where multiple specialized AI agents collaborate.
*   **Enhanced UI for Execution Monitoring:** Providing detailed views of live workflow executions, node statuses, and agent logs in the frontend.
*   **Dynamic Adaptation:** Potentially incorporating capabilities for the system to dynamically adjust workflows or agent assignments based on real-time feedback and performance monitoring.

The system is now well-positioned to evolve into a versatile and autonomous task management and automation platform.

# Expanding Agent Support (Phase 3 Design)

To enhance the system's capabilities, new agent types can be integrated into the `ProductionWorkflowExecutionService`. This section outlines the design for two such agents: `httpApiCaller` and `scriptRunner`.

These new agent types will be added to the `dispatchAgentTask` method in `ProductionWorkflowExecutionService.ts`. The `WorkflowNode.type` field will specify which agent to use (e.g., "httpApiCaller", "scriptRunner"), and the `WorkflowNode.config` will be parsed to provide `agentConfig` (for agent-level settings) and `inputData` (for node-specific inputs) to the respective handler methods.

## 1. Agent Type: `httpApiCaller`

### a. Purpose
The `httpApiCaller` agent is designed to make HTTP requests to external APIs or web services. This allows workflows to interact with other systems, fetch data, or trigger external processes.

### b. `Agent.config` Example
This configuration is stored in the `Agent` record in the database and provides base settings for this agent. The `WorkflowNode.config.agentConfig` in a workflow definition would typically reference this agent's ID, or could potentially override parts of this if the design allows. For simplicity, we assume `WorkflowNode.agentConfig` is populated from the resolved `Agent`'s own `config` field by `initializeWorkflow`.

```json
{
  "baseUrl": "https://api.example.com/v1",
  "defaultHeaders": {
    "User-Agent": "RamboTaskSystem/1.0",
    "Authorization": "Bearer {SECRET_AUTH_TOKEN_ID}"
  },
  "timeoutMs": 5000,
  "allowedMethods": ["GET", "POST", "PUT"],
  "retryPolicy": {
    "attempts": 3,
    "delayMs": 1000
  }
}
```
*   `baseUrl`: Prepended to all requests.
*   `defaultHeaders`: Common headers. Placeholders like `{SECRET_AUTH_TOKEN_ID}` would need a secure way to be resolved (e.g., from a secrets manager, not shown here).
*   `timeoutMs`: Default request timeout.
*   `allowedMethods`: Restricts which HTTP methods this agent instance can use.
*   `retryPolicy`: Basic retry mechanism for transient network issues.

### c. `WorkflowNode.config.inputData` Example
This is the `input` part of `WorkflowNode.config`, which becomes `RuntimeExecutionNode.inputData`.

```json
{
  "method": "POST",
  "path": "/users",
  "headers": {
    "X-Custom-Header": "customValue123"
  },
  "queryParams": {
    "status": "active",
    "page": 1
  },
  "body": {
    "name": "John Doe",
    "email": "john.doe@example.com"
  }
}
```
*   `method`: The HTTP method (e.g., GET, POST, PUT, DELETE).
*   `path`: Specific endpoint path, appended to `baseUrl`.
*   `headers`: Additional or overriding headers for this specific request.
*   `queryParams`: Key-value pairs for URL query parameters.
*   `body`: Request payload for methods like POST or PUT.

### d. Handler Logic Outline (`invokeHttpApiCallerAgent`)

The `invokeHttpApiCallerAgent(agentConfig: any, nodeInput: any, logContext: LogContext): Promise<any>` method would:
1.  **Validate Inputs:**
    *   Check if `nodeInput.method` is present and is one of the `agentConfig.allowedMethods` (if specified).
    *   Ensure `nodeInput.path` is present.
2.  **Construct Request URL:** Combine `agentConfig.baseUrl` and `nodeInput.path`. Append query parameters from `nodeInput.queryParams`.
3.  **Merge Headers:** Combine `agentConfig.defaultHeaders` and `nodeInput.headers` (node-specific headers take precedence). Resolve any secret placeholders in headers securely.
4.  **Make HTTP Request:**
    *   Use a robust HTTP client library (e.g., `axios`, `node-fetch`).
    *   Set method, URL, headers, body (from `nodeInput.body`), and timeout (from `nodeInput.timeoutMs` or `agentConfig.timeoutMs`).
    *   Implement retry logic based on `agentConfig.retryPolicy` for appropriate status codes (e.g., 5xx errors, network errors).
5.  **Process Response:**
    *   If the request is successful (e.g., 2xx status code):
        *   Return the response body (e.g., parsed JSON if `Content-Type` is `application/json`). The structure of the return might be `{ "status": response.status, "headers": response.headers, "body": response.data }`.
        *   Log success with status code and key response details.
    *   If the request fails (e.g., 4xx, 5xx status codes, timeout):
        *   Log the error, including request details and response status/body if available.
        *   Throw a structured error (e.g., `HttpError` with status, message, and response data) to be caught by `executeNode`.
6.  **Logging:** Log key steps, parameters, and outcomes using `this.log` with the provided `logContext`.

## 2. Agent Type: `scriptRunner`

### a. Purpose
The `scriptRunner` agent is designed to execute arbitrary scripts (e.g., Shell, Python, Node.js) on the server where the backend is running. This is a powerful but potentially risky agent that needs careful security considerations.

### b. `Agent.config` Example
Stored in the `Agent` record.

```json
{
  "interpreter": "/usr/bin/python3", // or /bin/bash, /usr/bin/node, etc.
  "scriptBasePath": "/opt/rambo/scripts", // Secure base directory for scripts
  "allowedScripts": ["data_processing/normalize_user.py", "utils/backup_db.sh"], // Whitelist of executable scripts relative to scriptBasePath
  "timeoutSeconds": 300, // Max execution time
  "defaultEnvVars": { // Environment variables to set for the script
    "API_KEY_ID": "{SECRET_API_KEY_ID}"
  }
}
```
*   `interpreter`: The command to execute the script (e.g., `python3`, `bash`, `node`).
*   `scriptBasePath`: A restricted base directory from which scripts can be run.
*   `allowedScripts`: An explicit whitelist of script paths (relative to `scriptBasePath`) that this agent instance is permitted to run. This is crucial for security.
*   `timeoutSeconds`: A timeout to prevent runaway scripts.
*   `defaultEnvVars`: Environment variables to be set when the script runs. Secrets should be handled securely.

### c. `WorkflowNode.config.inputData` Example
This is the `input` part of `WorkflowNode.config`, which becomes `RuntimeExecutionNode.inputData`.

```json
{
  "scriptPath": "data_processing/normalize_user.py", // Must be in agentConfig.allowedScripts
  "arguments": [
    "--userId", "user123",
    "--mode", "dry-run"
  ],
  "stdin": "Optional string to pass to script's stdin",
  "environment": { // Additional or overriding environment variables
    "CUSTOM_VAR": "nodeSpecificValue"
  }
}
```
*   `scriptPath`: The specific script to run (must be one of `agentConfig.allowedScripts`).
*   `arguments`: An array of command-line arguments to pass to the script.
*   `stdin`: (Optional) Data to be piped to the script's standard input.
*   `environment`: Additional environment variables for this specific execution, merged with `agentConfig.defaultEnvVars`.

### d. Handler Logic Outline (`invokeScriptRunnerAgent`)

The `invokeScriptRunnerAgent(agentConfig: any, nodeInput: any, logContext: LogContext): Promise<any>` method would:
1.  **Security Checks & Validation:**
    *   Verify `nodeInput.scriptPath` is present and is listed in `agentConfig.allowedScripts`. If not, throw a security error.
    *   Construct the full script path by combining `agentConfig.scriptBasePath` and `nodeInput.scriptPath`. Ensure this path is still within the intended secure directory (path traversal protection).
    *   Sanitize all arguments in `nodeInput.arguments` to prevent command injection vulnerabilities, especially if any part of an argument is derived from user input at any stage.
2.  **Prepare Environment:** Merge `agentConfig.defaultEnvVars` and `nodeInput.environment`. Resolve any secrets securely.
3.  **Execute Script:**
    *   Use Node.js `child_process.spawn` for robust execution and stream handling.
    *   Pass `agentConfig.interpreter` as the command, and the full script path followed by `nodeInput.arguments` as arguments.
    *   Set environment variables.
    *   If `nodeInput.stdin` is provided, pipe it to the child process's stdin.
    *   Implement the timeout from `agentConfig.timeoutSeconds`. If the script exceeds this, terminate it.
4.  **Capture Output & Handle Exit:**
    *   Capture `stdout` and `stderr` from the script.
    *   When the script exits:
        *   If `exitCode` is 0 (success):
            *   Return an object like `{ "exitCode": 0, "stdout": "...", "stderr": "..." }`.
            *   Log success.
        *   If `exitCode` is non-zero (failure):
            *   Log the error, including `exitCode`, `stdout`, and `stderr`.
            *   Throw a structured error (e.g., `ScriptExecutionError` with exit code, stdout, stderr) to be caught by `executeNode`.
        *   If the script was terminated due to timeout, throw a specific timeout error.
5.  **Logging:** Log key steps, script path, arguments, and outcomes using `this.log`.

**Security Note for `scriptRunner`:** This agent type carries significant security risks. In a production system, it would require:
*   Running scripts in a sandboxed environment (e.g., Docker container, gVisor).
*   Strict input validation and sanitization.
*   Principle of least privilege for file system access and network capabilities of the script.
*   Auditing and monitoring of script executions.

## 3. Modified `dispatchAgentTask` Method

The `dispatchAgentTask` method in `ProductionWorkflowExecutionService.ts` would be updated as follows:

```typescript
// In ProductionWorkflowExecutionService.ts

private async dispatchAgentTask(
  agentType: string,
  agentConfig: any, // Parsed from Agent.config via WorkflowNode.config.agentConfig
  nodeInput: any,   // Parsed from WorkflowNode.config.input
  taskId: string,
  workflowExecutionId: string,
  nodeId: string,
): Promise<any> {
  const logContext = { taskId, workflowExecutionId, nodeId }; // Helper for passing log params

  switch (agentType) {
    case 'genkitFlowRunner':
      return this.invokeGenkitFlowAgent(agentConfig, nodeInput, logContext);
    
    case 'httpApiCaller':
      // Ensure invokeHttpApiCallerAgent is implemented and imported/available
      // return this.invokeHttpApiCallerAgent(agentConfig, nodeInput, logContext);
      await this.log(taskId, workflowExecutionId, nodeId, 'WARN', `Agent type 'httpApiCaller' handler not yet fully implemented. Stubbed.`, { agentConfig, nodeInput });
      return { message: "httpApiCaller stubbed response", inputReceived: nodeInput }; // Placeholder

    case 'scriptRunner':
      // Ensure invokeScriptRunnerAgent is implemented and imported/available
      // return this.invokeScriptRunnerAgent(agentConfig, nodeInput, logContext);
      await this.log(taskId, workflowExecutionId, nodeId, 'WARN', `Agent type 'scriptRunner' handler not yet fully implemented. Stubbed.`, { agentConfig, nodeInput });
      return { message: "scriptRunner stubbed response", inputReceived: nodeInput }; // Placeholder

    // Add cases for other agent types here
    default:
      await this.log(taskId, workflowExecutionId, nodeId, 'ERROR', `Unknown or unsupported agent type: ${agentType}`);
      throw new Error(`Unknown or unsupported agent type: ${agentType}`);
  }
}

// Placeholder for actual implementations (would be methods within the class)
// private async invokeHttpApiCallerAgent(agentConfig: any, nodeInput: any, logContext: any): Promise<any> { /* ... */ }
// private async invokeScriptRunnerAgent(agentConfig: any, nodeInput: any, logContext: any): Promise<any> { /* ... */ }

```
*(For the actual implementation, the commented-out `return this.invoke...` lines would be active, and the stubbed logging/return lines would be removed. The handler methods themselves would be defined within the class.)*

This design provides a clear path for integrating diverse automation capabilities directly into the workflow execution engine.
