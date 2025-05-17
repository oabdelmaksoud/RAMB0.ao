
'use client';

import AgentCard from '@/components/features/agent-monitoring/AgentCard';
import type { Agent } from '@/types';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { Activity } from 'lucide-react'; // Using Activity icon for monitoring
import { useState, useEffect } from 'react';

// Mock data for global agents (can be moved to a separate file or fetched in a real app)
const initialMockAgents: Agent[] = [
  {
    id: 'agent-001',
    name: 'Code Analyzer X',
    type: 'Analysis Agent',
    status: 'Running',
    lastActivity: '2024-07-22T10:00:00Z',
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
    lastActivity: '2024-07-22T09:30:00Z',
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
    lastActivity: '2024-07-22T10:15:00Z',
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
    lastActivity: '2024-07-22T10:28:00Z',
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
    lastActivity: '2024-07-22T07:00:00Z',
    logs: [
      '[INFO] Test suite "E2E-CustomerFlow" completed. All 152 tests passed.',
      '[INFO] Waiting for next scheduled run.',
    ],
     performance: { cpuUsage: 5, memoryUsage: 90 },
  },
  {
    id: 'agent-006',
    name: 'PerfMon Global',
    type: 'Monitoring Agent',
    status: 'Stopped',
    lastActivity: '2024-07-21T18:00:00Z',
    logs: ['[INFO] Agent stopped manually by admin.'],
    performance: { cpuUsage: 1, memoryUsage: 45 },
  },
];


export default function AgentMonitoringPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // In a real application, you might fetch this data or load from a global state.
    // For now, we'll use the initial mock agents.
    // If we wanted to persist changes to these global agents, we'd use localStorage here too.
    setAgents(initialMockAgents.map(agent => ({
      ...agent,
      lastActivity: new Date(agent.lastActivity).toLocaleString() // Make dates more readable
    })));
  }, []);


  if (!isClient) {
     return (
       <div className="container mx-auto">
        <PageHeader>
          <PageHeaderHeading>
            <Activity className="mr-2 inline-block h-6 w-6" />
            Agent Monitoring Dashboard
          </PageHeaderHeading>
          <PageHeaderDescription>
            Loading agent statuses...
          </PageHeaderDescription>
        </PageHeader>
        <div className="text-center py-10">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <PageHeader>
        <PageHeaderHeading>
          <Activity className="mr-2 inline-block h-6 w-6" />
          Agent Monitoring Dashboard
        </PageHeaderHeading>
        <PageHeaderDescription>
          Oversee the status and performance of all global active agents in real-time.
        </PageHeaderDescription>
      </PageHeader>

      {agents.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-lg text-muted-foreground">No global agents to display.</p>
        </div>
      )}
    </div>
  );
}
