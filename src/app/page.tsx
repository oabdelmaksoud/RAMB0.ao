
import AgentCard from '@/components/features/agent-monitoring/AgentCard';
import type { Agent } from '@/types';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';

const mockAgents: Agent[] = [
  {
    id: 'agent-001',
    name: 'Code Analyzer X',
    type: 'Analysis Agent',
    status: 'Running',
    lastActivity: '2 minutes ago',
    performance: { cpuUsage: 25, memoryUsage: 128 },
    logs: [
      '[INFO] Starting analysis for project "Alpha"...',
      '[DEBUG] Found 1500 lines of code.',
      '[WARN] Potential memory leak detected in module "utils.py".',
      '[INFO] Analysis complete. Issues found: 1 critical, 3 major.',
    ],
  },
  {
    id: 'agent-002',
    name: 'Build Master',
    type: 'CI/CD Agent',
    status: 'Idle',
    lastActivity: '1 hour ago',
    performance: { cpuUsage: 2, memoryUsage: 64 },
    logs: [
      '[INFO] Awaiting new commits to branch "main".',
      '[DEBUG] Last build completed successfully in 5m 32s.',
    ],
  },
  {
    id: 'agent-003',
    name: 'DocuBot',
    type: 'Documentation Agent',
    status: 'Error',
    lastActivity: '5 minutes ago',
    performance: { cpuUsage: 0, memoryUsage: 32 },
    logs: [
      '[INFO] Starting documentation generation for API v2.1.',
      '[ERROR] Failed to parse Swagger definition: Unexpected token "<" at position 0.',
      '[DEBUG] Retrying with compatibility mode...',
      '[ERROR] Compatibility mode also failed. Aborting.',
    ],
  },
  {
    id: 'agent-004',
    name: 'Deployatron 5000',
    type: 'Deployment Agent',
    status: 'Running',
    lastActivity: '30 seconds ago',
    performance: { cpuUsage: 60, memoryUsage: 256 },
    logs: [
      '[INFO] Starting deployment to "staging" environment.',
      '[INFO] Pulling latest image: myapp:latest.',
      '[INFO] Image pulled successfully.',
      '[INFO] Starting 2 new containers.',
      '[INFO] Health checks passed. Deployment successful.',
    ],
  },
  {
    id: 'agent-005',
    name: 'QA Inspector',
    type: 'Testing Agent',
    status: 'Idle',
    lastActivity: '3 hours ago',
    logs: [
      '[INFO] Test suite "E2E-CustomerFlow" completed. All 152 tests passed.',
      '[INFO] Waiting for next scheduled run.',
    ],
  },
  {
    id: 'agent-006',
    name: 'PerfMon',
    type: 'Monitoring Agent',
    status: 'Stopped',
    lastActivity: '1 day ago',
    // No logs for a stopped agent, or could have "Agent stopped manually"
  },
];

export default function DashboardPage() {
  return (
    <div className="container mx-auto">
      <PageHeader>
        <PageHeaderHeading>Agent Monitoring Dashboard</PageHeaderHeading>
        <PageHeaderDescription>
          Oversee the status and performance of all active agents in real-time.
        </PageHeaderDescription>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {mockAgents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}
