import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service'; // Assuming PrismaService is in this location
import {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  Task,
  TaskLog,
  AgentLog, // Will be used more in later phases
  Prisma,
} from '@prisma/client';
import { uid } from 'uid';

import {
  WorkflowExecutionService,
} from '../../../src/services/workflow-execution-service'; // Adjusted path
import {
  RuntimeWorkflowExecution,
  RuntimeExecutionNode,
  DetailedWorkflowNodeStatus,
  DetailedWorkflowExecutionStatus,
  WorkflowExecutionResult as RuntimeWorkflowExecutionResult, // Alias to avoid conflict if original is used
  NodeExecutionResult as RuntimeNodeExecutionResult,     // Alias
  LogLevel,
  // createRuntimeExecutionNode, // This is used by createInitialRuntimeWorkflowExecution
  createInitialRuntimeWorkflowExecution,
} from '../../../src/types/workflow-execution'; // Adjusted path
import { availableFlows } from '../../../src/ai/flows'; // Import available Genkit flows

@Injectable()
export class ProductionWorkflowExecutionService extends WorkflowExecutionService {
  private activeWorkflows: Map<string, RuntimeWorkflowExecution> = new Map();

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private async log(
    taskId: string,
    workflowExecutionId: string,
    nodeId: string | null,
    level: LogLevel,
    message: string,
    data?: any,
  ): Promise<void> {
    console.log(`[${level}] WFE: ${workflowExecutionId} ${nodeId ? `(Node: ${nodeId})` : ''} Task: ${taskId} - ${message}`, data || '');
    try {
      await this.prisma.taskLog.create({
        data: {
          taskId,
          workflowExecutionId,
          workflowNodeId: nodeId,
          level,
          message,
          data: data ? JSON.stringify(data) : Prisma.JsonNull,
        },
      });
      // AgentLog creation would go here in a more detailed implementation
    } catch (error) {
      console.error('Failed to write log to Prisma TaskLog:', error);
    }
  }

  async initializeWorkflow(
    workflowIdFromDb: string,
    taskId: string,
    initialInput?: any,
  ): Promise<RuntimeWorkflowExecution> {
    const workflowDefinition = await this.prisma.workflow.findUnique({
      where: { id: workflowIdFromDb },
      include: { nodes: true, edges: true },
    });

    if (!workflowDefinition) {
      throw new Error(`Workflow with ID ${workflowIdFromDb} not found.`);
    }

    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new Error(`Task with ID ${taskId} not found.`);
    }

    const workflowExecution = createInitialWorkflowExecution(
      workflowIdFromDb,
      taskId,
      workflowDefinition,
      task,
      initialInput,
    ) as RuntimeWorkflowExecution; // Cast because createInitialRuntime returns the specific type

    this.activeWorkflows.set(workflowExecution.id, workflowExecution);

    await this.log(
      taskId,
      workflowExecution.id,
      null,
      'INFO',
      'Workflow initialized',
      { workflowIdFromDb, initialInput }
    );

    return workflowExecution;
  }

  async startWorkflow(workflowExecutionId: string): Promise<RuntimeWorkflowExecutionResult> {
    const workflowExecution = this.activeWorkflows.get(workflowExecutionId);
    if (!workflowExecution) {
      throw new Error(`Workflow execution ${workflowExecutionId} not found or not initialized.`);
    }

    workflowExecution.status = DetailedWorkflowExecutionStatus.RUNNING;
    workflowExecution.startTime = new Date();

    try {
      await this.prisma.task.update({
        where: { id: workflowExecution.taskId },
        data: { status: 'IN_PROGRESS' }, // Assuming 'IN_PROGRESS' is a valid TaskStatus
      });
    } catch (error) {
        await this.log(workflowExecution.taskId, workflowExecutionId, null, 'ERROR', 'Failed to update task status to IN_PROGRESS.', {error});
        workflowExecution.status = DetailedWorkflowExecutionStatus.FAILED;
        workflowExecution.error = error;
        throw error;
    }


    await this.log(
      workflowExecution.taskId,
      workflowExecutionId,
      null,
      'INFO',
      'Workflow started'
    );

    const entryNodes = workflowExecution.nodes.filter(node =>
      !workflowExecution.workflowDefinition.edges.some(edge => edge.targetNodeId === node.id)
    );

    if (entryNodes.length === 0 && workflowExecution.nodes.length > 0) {
        await this.log(workflowExecution.taskId, workflowExecutionId, null, 'WARN', 'No entry nodes found. Workflow may not execute.');
    }

    for (const entryNode of entryNodes) {
      this.executeNode(workflowExecutionId, entryNode.id); // Intentionally not awaited
    }

    return {
      workflowExecutionId,
      status: workflowExecution.status,
      nodeResults: [], // Results will be populated as nodes complete
    };
  }

  private async invokeGenkitFlowAgent(
    agentConfig: any,
    nodeInput: any,
    logContext: { taskId: string; workflowExecutionId: string; nodeId: string },
  ): Promise<any> {
    const { taskId, workflowExecutionId, nodeId } = logContext;
    const flowName = agentConfig?.flowName;

    if (!flowName || typeof flowName !== 'string') {
      await this.log(taskId, workflowExecutionId, nodeId, 'ERROR', 'flowName not found or invalid in agentConfig.', { agentConfig });
      throw new Error('flowName not found or invalid in agentConfig.');
    }

    const flowFunction = availableFlows[flowName];

    if (typeof flowFunction !== 'function') {
      await this.log(taskId, workflowExecutionId, nodeId, 'ERROR', `Genkit flow '${flowName}' not found or not a function.`);
      throw new Error(`Genkit flow '${flowName}' not found or not a function.`);
    }

    await this.log(taskId, workflowExecutionId, nodeId, 'INFO', `Invoking Genkit flow: ${flowName}`, { input: nodeInput });
    try {
      const result = await flowFunction(nodeInput);
      await this.log(taskId, workflowExecutionId, nodeId, 'INFO', `Genkit flow ${flowName} completed successfully`, { output: result });
      return result;
    } catch (flowError) {
      await this.log(taskId, workflowExecutionId, nodeId, 'ERROR', `Genkit flow ${flowName} failed.`, { error: flowError });
      throw flowError; // Re-throw to be caught by executeNode
    }
  }

  private async dispatchAgentTask(
    agentType: string,
    agentConfig: any,
    nodeInput: any,
    taskId: string,
    workflowExecutionId: string,
    nodeId: string,
  ): Promise<any> {
    switch (agentType) {
      case 'genkitFlowRunner':
        return this.invokeGenkitFlowAgent(agentConfig, nodeInput, { taskId, workflowExecutionId, nodeId });
      // Add cases for other agent types here, e.g.:
      // case 'toolRunner':
      //   return this.invokeToolAgent(agentConfig, nodeInput, { taskId, workflowExecutionId, nodeId });
      default:
        await this.log(taskId, workflowExecutionId, nodeId, 'ERROR', `Unknown agent type: ${agentType}`);
        throw new Error(`Unknown agent type: ${agentType}`);
    }
  }

  protected async executeNode(workflowExecutionId: string, nodeId: string): Promise<void> {
    const workflowExecution = this.activeWorkflows.get(workflowExecutionId);
    if (!workflowExecution) {
      // This case should ideally not happen if workflow is active
      console.error(`[ERROR] Critical: Workflow execution ${workflowExecutionId} not found in active map during executeNode for node ${nodeId}.`);
      return;
    }

    const node = workflowExecution.nodes.find(n => n.id === nodeId);
    if (!node) {
      await this.log(workflowExecution.taskId, workflowExecutionId, nodeId, 'ERROR', `Node with ID ${nodeId} not found in workflow definition.`);
      return;
    }

    // Ensure we are using the detailed statuses
    if (node.status !== DetailedWorkflowNodeStatus.PENDING) {
      await this.log(workflowExecution.taskId, workflowExecutionId, nodeId, 'WARN', `Node ${node.name} is not in PENDING state, skipping execution. Current state: ${node.status}`);
      return;
    }

    node.status = DetailedWorkflowNodeStatus.RUNNING;
    node.startTime = new Date();
    await this.log(workflowExecution.taskId, workflowExecutionId, nodeId, 'INFO', `Node ${node.name} (Type: ${node.type}) started execution.`);

    try {
      // The node.type from Prisma (e.g., "genkitFlowRunner") is the agentType
      // node.agentConfig and node.inputData are populated by createRuntimeExecutionNode helper
      const agentType = node.type;
      const agentConfig = node.agentConfig || {}; // Default to empty object if undefined
      const nodeInput = node.inputData || {};   // Default to empty object if undefined

      await this.log(workflowExecution.taskId, workflowExecutionId, nodeId, 'DEBUG', `Dispatching to agent. Type: ${agentType}`, { agentConfig, nodeInput });

      const agentResult = await this.dispatchAgentTask(
        agentType,
        agentConfig,
        nodeInput,
        workflowExecution.taskId,
        workflowExecutionId,
        nodeId,
      );

      node.outputData = agentResult;
      node.status = DetailedWorkflowNodeStatus.COMPLETED;
      node.endTime = new Date();
      await this.log(workflowExecution.taskId, workflowExecutionId, nodeId, 'INFO', `Node ${node.name} completed successfully.`, { output: agentResult });

    } catch (error) {
      node.status = DetailedWorkflowNodeStatus.FAILED;
      node.endTime = new Date();
      node.error = error instanceof Error ? error.message : String(error);
      await this.log(workflowExecution.taskId, workflowExecutionId, nodeId, 'ERROR', `Node ${node.name} failed.`, { error: node.error });
      
      // Check if workflow should fail immediately or continue if possible (not implemented yet)
      await this.completeWorkflow(workflowExecutionId, DetailedWorkflowExecutionStatus.FAILED, undefined, node.error);
      return; // Stop further processing for this path if node failure leads to workflow failure
    }

    await this.triggerNextNodes(workflowExecutionId, nodeId);
  }

  protected async triggerNextNodes(workflowExecutionId: string, completedNodeId: string): Promise<void> {
    const workflowExecution = this.activeWorkflows.get(workflowExecutionId);
    if (!workflowExecution) {
      // This case should ideally not happen
      console.error(`[ERROR] Critical: Workflow execution ${workflowExecutionId} not found in active map during triggerNextNodes for completed node ${completedNodeId}.`);
      return;
    }

    const outgoingEdges = workflowExecution.workflowDefinition.edges.filter(
      edge => edge.sourceNodeId === completedNodeId
    );

    if (outgoingEdges.length === 0) {
      // This might be an end node or a node that doesn't lead anywhere further
      await this.log(workflowExecution.taskId, workflowExecutionId, completedNodeId, 'INFO', `Node ${completedNodeId} has no outgoing edges.`);
    }

    for (const edge of outgoingEdges) {
      const targetNode = workflowExecution.nodes.find(n => n.id === edge.targetNodeId);
      if (!targetNode) {
        await this.log(workflowExecution.taskId, workflowExecutionId, completedNodeId, 'ERROR', `Target node ${edge.targetNodeId} not found for edge from ${completedNodeId}.`);
        continue;
      }

      // Simplified dependency check: only proceed if target node is PENDING
      // A real implementation would check ALL incoming edges to targetNode
      const incomingEdgesToTarget = workflowExecution.workflowDefinition.edges.filter(
        e => e.targetNodeId === targetNode.id
      );
      const allDependenciesMet = incomingEdgesToTarget.every(inEdge => {
        const sourceNode = workflowExecution.nodes.find(n => n.id === inEdge.sourceNodeId);
        return sourceNode && (sourceNode.status === DetailedWorkflowNodeStatus.COMPLETED || sourceNode.status === DetailedWorkflowNodeStatus.SKIPPED);
      });

      if (targetNode.status === DetailedWorkflowNodeStatus.PENDING && allDependenciesMet) {
        await this.log(workflowExecution.taskId, workflowExecutionId, targetNode.id, 'INFO', `All dependencies for node ${targetNode.name} met. Triggering execution.`);
        this.executeNode(workflowExecutionId, targetNode.id); // Intentionally not awaited
      } else if (targetNode.status !== DetailedWorkflowNodeStatus.PENDING && !allDependenciesMet) {
         await this.log(workflowExecution.taskId, workflowExecutionId, targetNode.id, 'DEBUG', `Dependencies for node ${targetNode.name} not yet met or node not pending. Status: ${targetNode.status}`);
      }
    }

    // Check for workflow completion
    const allNodesTerminal = workflowExecution.nodes.every(
      n => n.status === DetailedWorkflowNodeStatus.COMPLETED ||
           n.status === DetailedWorkflowNodeStatus.SKIPPED ||
           n.status === DetailedWorkflowNodeStatus.FAILED || // A failed node can also make the workflow terminal if not handled
           n.status === DetailedWorkflowNodeStatus.CANCELLED
    );

    // More precise completion check:
    // Workflow is COMPLETED if all nodes are COMPLETED or SKIPPED.
    // Workflow is FAILED if any node FAILED and there are no more RUNNING or PENDING nodes.
    // Workflow is CANCELLED if any node was CANCELLED and there are no more RUNNING or PENDING nodes.

    const hasRunningNodes = workflowExecution.nodes.some(n => n.status === DetailedWorkflowNodeStatus.RUNNING);
    const hasPendingNodes = workflowExecution.nodes.some(n => n.status === DetailedWorkflowNodeStatus.PENDING);

    if (!hasRunningNodes && !hasPendingNodes) { // Only consider completion if no nodes are actively running or waiting
        const anyNodeFailed = workflowExecution.nodes.some(n => n.status === DetailedWorkflowNodeStatus.FAILED);
        const anyNodeCancelled = workflowExecution.nodes.some(n => n.status === DetailedWorkflowNodeStatus.CANCELLED);

        if (anyNodeFailed) {
            await this.completeWorkflow(workflowExecutionId, DetailedWorkflowExecutionStatus.FAILED, undefined, workflowExecution.nodes.find(n => n.status === DetailedWorkflowNodeStatus.FAILED)?.error);
        } else if (anyNodeCancelled) {
            await this.completeWorkflow(workflowExecutionId, DetailedWorkflowExecutionStatus.CANCELLED, undefined, "Workflow cancelled due to node cancellation.");
        } else if (allNodesTerminal) { // Should mean all COMPLETED or SKIPPED if not FAILED or CANCELLED
            const isTerminalNode = (node: RuntimeExecutionNode) => !workflowExecution.workflowDefinition.edges.some(edge => edge.sourceNodeId === node.id);
            const lastCompletedNode = workflowExecution.nodes.filter(n => n.status === DetailedWorkflowNodeStatus.COMPLETED && isTerminalNode(n)).pop();
            await this.completeWorkflow(workflowExecutionId, DetailedWorkflowExecutionStatus.COMPLETED, lastCompletedNode?.outputData);
        }
    }
  }

  protected async completeWorkflow(workflowExecutionId: string, finalStatus: DetailedWorkflowExecutionStatus, output?: any, error?: any): Promise<void> {
    const workflowExecution = this.activeWorkflows.get(workflowExecutionId);
    if (!workflowExecution || workflowExecution.status === DetailedWorkflowExecutionStatus.COMPLETED || workflowExecution.status === DetailedWorkflowExecutionStatus.FAILED || workflowExecution.status === DetailedWorkflowExecutionStatus.CANCELLED) {
      // Already completed or not found or already in a terminal state
      return;
    }

    workflowExecution.status = finalStatus;
    workflowExecution.endTime = new Date();
    workflowExecution.currentOutput = output;
    workflowExecution.error = error;

    let taskStatus: string = 'DONE'; // Default Prisma TaskStatus
    if (finalStatus === DetailedWorkflowExecutionStatus.FAILED) {
      taskStatus = 'BLOCKED'; // Or 'FAILED' if you have such a status
    } else if (finalStatus === DetailedWorkflowExecutionStatus.CANCELLED) {
      taskStatus = 'CANCELLED'; // Or other appropriate status
    }

    try {
      await this.prisma.task.update({
        where: { id: workflowExecution.taskId },
        data: { status: taskStatus, actualEndDate: new Date() },
      });
    } catch (dbError) {
      await this.log(workflowExecution.taskId, workflowExecutionId, null, 'ERROR', `Failed to update task status to ${taskStatus} upon workflow completion.`, {dbError});
    }


    await this.log(
      workflowExecution.taskId,
      workflowExecutionId,
      null,
      finalStatus === DetailedWorkflowExecutionStatus.COMPLETED ? 'INFO' : 'ERROR',
      `Workflow ${finalStatus.toLowerCase()}`,
      { output, error }
    );

    // In a multi-instance environment, you might emit an event here or clean up.
    // For now, we keep it in activeWorkflows until explicitly removed or service restarts.
    // For long-running workflows, activeWorkflows should be persisted or rehydrated.
  }


  async pauseWorkflow(workflowExecutionId: string): Promise<DetailedWorkflowExecutionStatus> {
    const workflowExecution = this.activeWorkflows.get(workflowExecutionId);
    if (!workflowExecution) throw new Error('Workflow not found.');
    if (workflowExecution.status !== DetailedWorkflowExecutionStatus.RUNNING) {
        await this.log(workflowExecution.taskId, workflowExecutionId, null, 'WARN', `Workflow cannot be paused. Current status: ${workflowExecution.status}`);
        return workflowExecution.status;
    }
    workflowExecution.status = DetailedWorkflowExecutionStatus.PAUSED;
    // Mark relevant nodes as PAUSED
    workflowExecution.nodes.forEach(node => {
      if (node.status === DetailedWorkflowNodeStatus.RUNNING) {
        node.status = DetailedWorkflowNodeStatus.PAUSED; // Or a specific "PAUSED_BY_WORKFLOW"
        // Actual agent pausing logic would be needed here for true pause
      }
    });
    await this.log(workflowExecution.taskId, workflowExecutionId, null, 'INFO', 'Workflow paused');
    return workflowExecution.status;
  }

  async resumeWorkflow(workflowExecutionId: string): Promise<DetailedWorkflowExecutionStatus> {
    const workflowExecution = this.activeWorkflows.get(workflowExecutionId);
    if (!workflowExecution) throw new Error('Workflow not found.');
    if (workflowExecution.status !== DetailedWorkflowExecutionStatus.PAUSED) {
        await this.log(workflowExecution.taskId, workflowExecutionId, null, 'WARN', `Workflow cannot be resumed. Current status: ${workflowExecution.status}`);
        return workflowExecution.status;
    }
    workflowExecution.status = DetailedWorkflowExecutionStatus.RUNNING;
    await this.log(workflowExecution.taskId, workflowExecutionId, null, 'INFO', 'Workflow resumed');
    
    const nodesToResume = workflowExecution.nodes.filter(n => n.status === DetailedWorkflowNodeStatus.PAUSED);
    for (const node of nodesToResume) {
        // Reset to pending to be picked up by executeNode logic if dependencies are met
        node.status = DetailedWorkflowNodeStatus.PENDING; 
        await this.log(workflowExecution.taskId, workflowExecutionId, node.id, 'INFO', `Node ${node.name} status reset to PENDING for resumption.`);
        
        // Check if this node can be re-triggered immediately
        const incomingEdgesToNode = workflowExecution.workflowDefinition.edges.filter(
            e => e.targetNodeId === node.id
        );
        const allDependenciesMet = incomingEdgesToNode.every(inEdge => {
            const sourceNode = workflowExecution.nodes.find(n => n.id === inEdge.sourceNodeId);
            return sourceNode && (sourceNode.status === DetailedWorkflowNodeStatus.COMPLETED || sourceNode.status === DetailedWorkflowNodeStatus.SKIPPED);
        });

        if (allDependenciesMet) {
            this.executeNode(workflowExecutionId, node.id); // Intentionally not awaited
        }
    }
    return workflowExecution.status;
  }

  async cancelWorkflow(workflowExecutionId: string): Promise<DetailedWorkflowExecutionStatus> {
    const workflowExecution = this.activeWorkflows.get(workflowExecutionId);
    if (!workflowExecution) throw new Error('Workflow not found.');

    workflowExecution.status = DetailedWorkflowExecutionStatus.CANCELLED;
    workflowExecution.endTime = new Date();

    workflowExecution.nodes.forEach(node => {
      if (node.status === DetailedWorkflowNodeStatus.RUNNING || node.status === DetailedWorkflowNodeStatus.PENDING || node.status === DetailedWorkflowNodeStatus.PAUSED) {
        node.status = DetailedWorkflowNodeStatus.CANCELLED;
        node.endTime = new Date();
        // Actual agent cancellation logic would be needed here
      }
    });
    await this.log(workflowExecution.taskId, workflowExecutionId, null, 'INFO', 'Workflow cancelled');
    // Ensure the main completeWorkflow logic is called to finalize task status etc.
    await this.completeWorkflow(workflowExecutionId, DetailedWorkflowExecutionStatus.CANCELLED, undefined, "Workflow cancelled by user.");
    return workflowExecution.status;
  }

  async getWorkflowStatus(workflowExecutionId: string): Promise<RuntimeWorkflowExecution | null> {
    return this.activeWorkflows.get(workflowExecutionId) || null;
  }

  async getWorkflowLogs(workflowExecutionId: string): Promise<Array<{ timestamp: Date; message: string; nodeId?: string; level: string; data?: any }>> {
    // This method should ideally return logs from the persistent store (TaskLog).
    // The workflowExecution.logs is an in-memory accumulation for the current session only.
    const logsFromDb = await this.prisma.taskLog.findMany({
        where: { workflowExecutionId: workflowExecutionId },
        orderBy: { timestamp: 'asc' },
    });
    return logsFromDb.map(log => ({
        timestamp: log.timestamp,
        message: log.message,
        nodeId: log.workflowNodeId || undefined,
        level: log.level as LogLevel, // Cast if your DB level is string
        data: log.data // Prisma JsonValue
    }));
  }
}
