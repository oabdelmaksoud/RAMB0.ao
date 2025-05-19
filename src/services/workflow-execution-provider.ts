import { WorkflowExecutionService, SimulatedWorkflowExecutionService } from './workflow-execution-service';
import { WorkflowNode, WorkflowEdge } from '@/types';
import { WorkflowExecutionOptions, WorkflowExecution, WorkflowStatus } from '@/types/workflow-execution';

export class WorkflowExecutionProvider {
  private static instance: WorkflowExecutionService;

  /**
   * Get the current workflow execution service instance
   * @param mode Execution mode (default: simulated)
   * @returns Workflow Execution Service instance
   */
  public static getInstance(mode: 'simulated' | 'production' = 'simulated'): WorkflowExecutionService {
    if (!this.instance) {
      switch (mode) {
        case 'simulated':
          this.instance = new SimulatedWorkflowExecutionService();
          break;
        case 'production':
          // TODO: Implement actual production execution service
          this.instance = new SimulatedWorkflowExecutionService();
          console.warn('Production execution service not implemented. Using simulated service.');
          break;
        default:
          this.instance = new SimulatedWorkflowExecutionService();
      }
    }
    return this.instance;
  }

  /**
   * Create and initialize a new workflow
   * @param nodes Workflow nodes
   * @param edges Workflow edges
   * @param options Execution options
   * @returns Initialized workflow
   */
  public static async createWorkflow(
    nodes: WorkflowNode[], 
    edges: WorkflowEdge[], 
    options: WorkflowExecutionOptions = {}
  ): Promise<WorkflowExecution> {
    const service = this.getInstance(options.simulationMode ? 'simulated' : 'production');
    return service.initializeWorkflow(nodes, edges, options);
  }

  /**
   * Execute a workflow
   * @param workflowId ID of the workflow to execute
   * @returns Workflow execution result
   */
  public static async executeWorkflow(workflowId: string) {
    const service = this.getInstance();
    return service.startWorkflow(workflowId);
  }

  /**
   * Pause a running workflow
   * @param workflowId ID of the workflow to pause
   * @returns Updated workflow status
   */
  public static async pauseWorkflow(workflowId: string): Promise<WorkflowStatus> {
    const service = this.getInstance();
    return service.pauseWorkflow(workflowId);
  }

  /**
   * Cancel a workflow
   * @param workflowId ID of the workflow to cancel
   * @returns Final workflow status
   */
  public static async cancelWorkflow(workflowId: string): Promise<WorkflowStatus> {
    const service = this.getInstance();
    return service.cancelWorkflow(workflowId);
  }

  /**
   * Get workflow status
   * @param workflowId ID of the workflow
   * @returns Current workflow execution details
   */
  public static async getWorkflowStatus(workflowId: string) {
    const service = this.getInstance();
    return service.getWorkflowStatus(workflowId);
  }

  /**
   * Get workflow logs
   * @param workflowId ID of the workflow
   * @param nodeId Optional node ID to filter logs
   * @returns Workflow execution logs
   */
  public static async getWorkflowLogs(workflowId: string, nodeId?: string) {
    const service = this.getInstance();
    return service.getWorkflowLogs(workflowId, nodeId);
  }
}

// Utility hook for React components
export function useWorkflowExecution() {
  return {
    createWorkflow: WorkflowExecutionProvider.createWorkflow,
    executeWorkflow: WorkflowExecutionProvider.executeWorkflow,
    pauseWorkflow: WorkflowExecutionProvider.pauseWorkflow,
    cancelWorkflow: WorkflowExecutionProvider.cancelWorkflow,
    getWorkflowStatus: WorkflowExecutionProvider.getWorkflowStatus,
    getWorkflowLogs: WorkflowExecutionProvider.getWorkflowLogs
  };
}
