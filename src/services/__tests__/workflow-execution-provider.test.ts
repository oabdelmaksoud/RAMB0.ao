import { WorkflowExecutionProvider } from '../workflow-execution-provider';
import { WorkflowNode, WorkflowEdge } from '@/types';
import { WorkflowStatus, WorkflowNodeStatus } from '@/types/workflow-execution';

describe('WorkflowExecutionProvider', () => {
  const mockNodes: WorkflowNode[] = [
    {
      id: 'node1',
      name: 'Analysis Agent',
      type: 'Analysis Agent',
      x: 100,
      y: 100,
      config: {}
    },
    {
      id: 'node2',
      name: 'Reporting Agent',
      type: 'Reporting Agent', 
      x: 200,
      y: 200,
      config: {}
    }
  ];

  const mockEdges: WorkflowEdge[] = [
    {
      id: 'edge1',
      sourceNodeId: 'node1',
      targetNodeId: 'node2'
    }
  ];

  it('should create a workflow', async () => {
    const workflow = await WorkflowExecutionProvider.createWorkflow(mockNodes, mockEdges);
    
    expect(workflow).toBeDefined();
    expect(workflow.id).toBeTruthy();
    expect(workflow.nodes.length).toBe(2);
    expect(workflow.status).toBe(WorkflowStatus.DRAFT);
    expect(workflow.nodes[0].status).toBe(WorkflowNodeStatus.PENDING);
  });

  it('should execute a workflow', async () => {
    const workflow = await WorkflowExecutionProvider.createWorkflow(mockNodes, mockEdges);
    const result = await WorkflowExecutionProvider.executeWorkflow(workflow.id);

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.completedNodes).toBe(2);
    expect(result.failedNodes).toBe(0);
  });

  it('should get workflow status', async () => {
    const workflow = await WorkflowExecutionProvider.createWorkflow(mockNodes, mockEdges);
    await WorkflowExecutionProvider.executeWorkflow(workflow.id);

    const status = await WorkflowExecutionProvider.getWorkflowStatus(workflow.id);
    
    expect(status).toBeDefined();
    expect(status.status).toBe(WorkflowStatus.COMPLETED);
    expect(status.nodes.every(node => node.status === WorkflowNodeStatus.COMPLETED)).toBe(true);
  });

  it('should get workflow logs', async () => {
    const workflow = await WorkflowExecutionProvider.createWorkflow(mockNodes, mockEdges);
    await WorkflowExecutionProvider.executeWorkflow(workflow.id);

    const logs = await WorkflowExecutionProvider.getWorkflowLogs(workflow.id);
    
    expect(logs).toBeDefined();
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.every(log => log.workflowExecutionId === workflow.id)).toBe(true);
  });

  it('should support filtering logs by node', async () => {
    const workflow = await WorkflowExecutionProvider.createWorkflow(mockNodes, mockEdges);
    await WorkflowExecutionProvider.executeWorkflow(workflow.id);

    const nodeLogs = await WorkflowExecutionProvider.getWorkflowLogs(workflow.id, 'node1');
    
    expect(nodeLogs).toBeDefined();
    expect(nodeLogs.length).toBeGreaterThan(0);
    expect(nodeLogs.every(log => log.nodeId === 'node1')).toBe(true);
  });
});
