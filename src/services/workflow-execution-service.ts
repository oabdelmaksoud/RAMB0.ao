import { WorkflowExecution, WorkflowExecutionResult, WorkflowExecutionOptions, WorkflowStatus, WorkflowExecutionLog, WorkflowNodeStatus } from '@/types/workflow-execution';
import { WorkflowNode, WorkflowEdge } from '@/types';
import { uid } from '@/lib/utils';

export abstract class WorkflowExecutionService {
  /**
   * Initialize a new workflow execution from a set of nodes and edges
   * @param nodes Workflow nodes to be executed
   * @param edges Connections between nodes
   * @param options Execution configuration options
   * @returns Initialized workflow execution instance
   */
  abstract initializeWorkflow(
    nodes: WorkflowNode[], 
    edges: WorkflowEdge[], 
    options?: WorkflowExecutionOptions
  ): Promise<WorkflowExecution>;

  /**
   * Start the execution of a previously initialized workflow
   * @param workflowId ID of the workflow to start
   * @returns Workflow execution result
   */
  abstract startWorkflow(workflowId: string): Promise<WorkflowExecutionResult>;

  /**
   * Pause an ongoing workflow execution
   * @param workflowId ID of the workflow to pause
   * @returns Updated workflow status
   */
  abstract pauseWorkflow(workflowId: string): Promise<WorkflowStatus>;

  /**
   * Resume a paused workflow
   * @param workflowId ID of the workflow to resume
   * @returns Workflow execution result
   */
  abstract resumeWorkflow(workflowId: string): Promise<WorkflowExecutionResult>;

  /**
   * Cancel an ongoing or paused workflow
   * @param workflowId ID of the workflow to cancel
   * @returns Final workflow status
   */
  abstract cancelWorkflow(workflowId: string): Promise<WorkflowStatus>;

  /**
   * Retrieve the current status of a workflow
   * @param workflowId ID of the workflow to check
   * @returns Current workflow execution details
   */
  abstract getWorkflowStatus(workflowId: string): Promise<WorkflowExecution>;

  /**
   * Retrieve execution logs for a specific workflow
   * @param workflowId ID of the workflow
   * @param nodeId Optional specific node to filter logs
   * @param startTime Optional start time to filter logs
   * @param endTime Optional end time to filter logs
   * @returns Array of workflow execution logs
   */
  abstract getWorkflowLogs(
    workflowId: string, 
    nodeId?: string, 
    startTime?: Date, 
    endTime?: Date
  ): Promise<WorkflowExecutionLog[]>;
}

export class SimulatedWorkflowExecutionService extends WorkflowExecutionService {
  private workflows: Map<string, WorkflowExecution> = new Map();
  private workflowLogs: Map<string, WorkflowExecutionLog[]> = new Map();

  async initializeWorkflow(
    nodes: WorkflowNode[], 
    edges: WorkflowEdge[], 
    options: WorkflowExecutionOptions = {}
  ): Promise<WorkflowExecution> {
    const workflowId = uid('workflow');
    const executionNodes = nodes.map(node => ({
      id: node.id,
      name: node.name,
      type: node.type,
      status: WorkflowNodeStatus.PENDING,
      config: node.config,
      dependencies: this.findNodeDependencies(node.id, edges)
    }));

    const workflow: WorkflowExecution = {
      id: workflowId,
      name: `Workflow ${workflowId}`,
      description: options.simulationMode ? 'Simulated Workflow' : 'Active Workflow',
      status: WorkflowStatus.DRAFT,
      nodes: executionNodes,
      createdBy: 'system', // TODO: Replace with actual user context
      startTime: undefined,
      endTime: undefined,
      projectId: undefined // TODO: Add project context
    };

    this.workflows.set(workflowId, workflow);
    this.workflowLogs.set(workflowId, []);

    return workflow;
  }

  private findNodeDependencies(nodeId: string, edges: WorkflowEdge[]): string[] {
    return edges
      .filter(edge => edge.targetNodeId === nodeId)
      .map(edge => edge.sourceNodeId);
  }

  async startWorkflow(workflowId: string): Promise<WorkflowExecutionResult> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    workflow.status = WorkflowStatus.RUNNING;
    workflow.startTime = new Date();

    // Simulate workflow execution
    const logs: WorkflowExecutionLog[] = [];
    let completedNodes = 0;
    let failedNodes = 0;

    for (const node of workflow.nodes) {
      try {
        // Simulate node execution
        node.status = WorkflowNodeStatus.IN_PROGRESS;
        node.startTime = new Date();

        // Simulated processing time
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));

        node.status = WorkflowNodeStatus.COMPLETED;
        node.endTime = new Date();
        completedNodes++;

        logs.push({
          workflowExecutionId: workflowId,
          nodeId: node.id,
          timestamp: node.endTime,
          level: 'INFO',
          message: `Node ${node.name} completed successfully`
        });
      } catch (error) {
        node.status = WorkflowNodeStatus.FAILED;
        node.errorMessage = error instanceof Error ? error.message : 'Unknown error';
        failedNodes++;

        logs.push({
          workflowExecutionId: workflowId,
          nodeId: node.id,
          timestamp: new Date(),
          level: 'ERROR',
          message: `Node ${node.name} failed: ${node.errorMessage}`
        });
      }
    }

    workflow.status = failedNodes > 0 ? WorkflowStatus.FAILED : WorkflowStatus.COMPLETED;
    workflow.endTime = new Date();

    this.workflowLogs.set(workflowId, logs);

    return {
      success: failedNodes === 0,
      completedNodes,
      failedNodes,
      totalNodes: workflow.nodes.length,
      duration: workflow.endTime.getTime() - workflow.startTime.getTime(),
      logs
    };
  }

  async pauseWorkflow(workflowId: string): Promise<WorkflowStatus> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    workflow.status = WorkflowStatus.PAUSED;
    return workflow.status;
  }

  async resumeWorkflow(workflowId: string): Promise<WorkflowExecutionResult> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    workflow.status = WorkflowStatus.RUNNING;
    // Implement resume logic similar to startWorkflow
    return this.startWorkflow(workflowId);
  }

  async cancelWorkflow(workflowId: string): Promise<WorkflowStatus> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    workflow.status = WorkflowStatus.FAILED;
    workflow.endTime = new Date();

    // Mark all pending/in-progress nodes as skipped
    workflow.nodes.forEach(node => {
      if (node.status === WorkflowNodeStatus.PENDING || node.status === WorkflowNodeStatus.IN_PROGRESS) {
        node.status = WorkflowNodeStatus.SKIPPED;
      }
    });

    return workflow.status;
  }

  async getWorkflowStatus(workflowId: string): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    return workflow;
  }

  async getWorkflowLogs(
    workflowId: string, 
    nodeId?: string, 
    startTime?: Date, 
    endTime?: Date
  ): Promise<WorkflowExecutionLog[]> {
    const logs = this.workflowLogs.get(workflowId) || [];

    return logs.filter(log => 
      (!nodeId || log.nodeId === nodeId) &&
      (!startTime || log.timestamp >= startTime) &&
      (!endTime || log.timestamp <= endTime)
    );
  }
}
