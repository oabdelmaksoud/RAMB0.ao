import { Worker, Job } from 'bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { WorkflowExecutionNode } from '../../../../src/types/workflow-execution';
import { Agent } from '../../../../src/types/index';
import { summarizeAgentPerformanceFlow } from '../../../../src/ai/flows/summarize-agent-performance';
import { generateRequirementDocFlow } from '../../../../src/ai/flows/generate-requirement-doc-flow';

class AnalysisAgent implements Agent {
  async execute(node: WorkflowExecutionNode) {
    if (node.type === 'requirements-analysis') {
      return await summarizeAgentPerformanceFlow({
        requirements: node.config?.requirements || '',
        codebase: node.config?.codebase || ''
      });
    }
    throw new Error(`Unsupported node type: ${node.type}`);
  }
}

class DocumentationAgent implements Agent {
  async execute(node: WorkflowExecutionNode) {
    if (node.type === 'generate-documentation') {
      return await generateRequirementDocFlow({
        requirements: node.config?.requirements || '',
        technicalSpecs: node.config?.specs || ''
      });
    }
    throw new Error(`Unsupported node type: ${node.type}`);
  }
}

@Injectable()
export class AgentsWorker implements OnModuleInit {
  private worker: Worker;

  constructor(private readonly agentsService: AgentsService) {}

  onModuleInit() {
    this.worker = new Worker(
      'agent-jobs',
      async (job: Job<{ node: WorkflowExecutionNode }>) => {
        const { node } = job.data;
        let agent = this.agentsService.getAgent(node.agent?.id || '');
        
        if (!agent) {
          // Create appropriate agent based on node type
          switch(node.type) {
            case 'requirements-analysis':
              agent = new AnalysisAgent();
              break;
            case 'generate-documentation':
              agent = new DocumentationAgent();
              break;
            default:
              throw new Error(`No agent available for node type: ${node.type}`);
          }
        }

        if (!agent) {
          throw new Error(`No agent found for node ${node.id}`);
        }

        try {
          // Execute agent-specific logic
          const result = await agent.execute(node);

          return {
            success: true,
            nodeId: node.id,
            result,
          };
        } catch (error) {
          throw error; // Will trigger retry if configured
        }
      },
      {
        connection: {
          host: 'localhost',
          port: 6379,
        },
        concurrency: 5,
      }
    );

    this.worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed:`, err);
    });
  }

  onApplicationShutdown() {
    return this.worker.close();
  }
}
