import AgentCard from '@/components/features/agent-monitoring/AgentCard';
import type { Agent } from '@/types';
import { Activity, BarChart3, Cpu, FileText, MemoryStick, Zap } from 'lucide-react';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';

const mockAgents: Agent[] = [
  {
    id: 'agent-001',
    name: 'Code Analyzer X',
    type: 'Analysis Agent',
    status: 'Running',
    lastActivity: '2 minutes ago',
    performance: { cpuUsage: 25, memoryUsage: 128 },
  },
  {
    id: 'agent-002',
    name: 'Build Master',
    type: 'CI/CD Agent',
    status: 'Idle',
    lastActivity: '1 hour ago',
    performance: { cpuUsage: 2, memoryUsage: 64 },
  },
  {
    id: 'agent-003',
    name: 'DocuBot',
    type: 'Documentation Agent',
    status: 'Error',
    lastActivity: '5 minutes ago',
    performance: { cpuUsage: 0, memoryUsage: 32 },
  },
  {
    id: 'agent-004',
    name: 'Deployatron 5000',
    type: 'Deployment Agent',
    status: 'Running',
    lastActivity: '30 seconds ago',
    performance: { cpuUsage: 60, memoryUsage: 256 },
  },
  {
    id: 'agent-005',
    name: 'QA Inspector',
    type: 'Testing Agent',
    status: 'Idle',
    lastActivity: '3 hours ago',
    performance: { cpuUsage: 5, memoryUsage: 90 },
  },
  {
    id: 'agent-006',
    name: 'PerfMon',
    type: 'Monitoring Agent',
    status: 'Stopped',
    lastActivity: '1 day ago',
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
