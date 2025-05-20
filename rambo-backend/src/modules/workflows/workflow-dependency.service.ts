import { Injectable } from '@nestjs/common';
import { WorkflowNode, WorkflowEdge } from '@prisma/client';

@Injectable()
export class WorkflowDependencyService {
  getExecutionOrder(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
    // Build adjacency list and in-degree count
    const graph: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};
    
    nodes.forEach(node => {
      graph[node.id] = [];
      inDegree[node.id] = 0;
    });

    edges.forEach(edge => {
      graph[edge.sourceId].push(edge.targetId);
      inDegree[edge.targetId]++;
    });

    // Kahn's algorithm for topological sort
    const queue: string[] = nodes
      .filter(node => inDegree[node.id] === 0)
      .map(node => node.id);
    
    const order: string[] = [];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      order.push(nodeId);

      for (const neighbor of graph[nodeId]) {
        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) {
          queue.push(neighbor);
        }
      }
    }

    return order;
  }
}
