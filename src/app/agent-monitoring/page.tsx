
'use client';

import AgentCard from '@/components/features/agent-monitoring/AgentCard';
import type { Agent } from '@/types';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { Activity } from 'lucide-react'; 
import { useState, useEffect } from 'react';
import { AGENTS_STORAGE_KEY, initialMockAgents as initialGlobalAgentsData } from '@/app/agent-management/page';

// Default mock data for agents with performance and logs - used if localStorage for global agents is empty
// and if the initialGlobalAgentsData itself doesn't have these richer fields.
// However, the primary source will be AGENTS_STORAGE_KEY.
const detailedFallbackAgents: Agent[] = [
  {
    id: 'fallback-agent-001',
    name: 'Code Analyzer X (Fallback)',
    type: 'Analysis Agent',
    status: 'Running',
    lastActivity: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    performance: { cpuUsage: 25, memoryUsage: 128 },
    logs: [
      '[INFO] Starting analysis for project "Alpha"...',
      '[DEBUG] Found 1500 lines of code.',
      '[WARN] Potential memory leak detected in module "utils.py".',
      '[INFO] Analysis complete. Issues found: 1 critical, 3 major.',
    ],
  },
  {
    id: 'fallback-agent-002',
    name: 'Build Master (Fallback)',
    type: 'CI/CD Agent',
    status: 'Idle',
    lastActivity: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    performance: { cpuUsage: 2, memoryUsage: 64 },
    logs: [
      '[INFO] Awaiting new commits to branch "main".',
      '[DEBUG] Last build completed successfully in 5m 32s.',
    ],
  },
];


export default function AgentMonitoringPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const storedAgentsJson = localStorage.getItem(AGENTS_STORAGE_KEY);
    let agentsToDisplay: Agent[] = [];

    if (storedAgentsJson) {
      try {
        const parsedAgents = JSON.parse(storedAgentsJson) as Agent[];
        // Enrich agents from localStorage with performance/logs if they are missing
        // This part is a bit tricky as the global agents from agent-management don't have these.
        // For now, we will just display them as is. AgentCard will handle missing fields.
        agentsToDisplay = parsedAgents;
      } catch (error) {
        console.error("Failed to parse agents from localStorage for monitoring, using default global agents.", error);
        agentsToDisplay = initialGlobalAgentsData.map(agent => ({
          ...agent, 
          // Add some default performance/log data if using initialGlobalAgentsData directly
          // as the cards expect it. This is a fallback scenario.
          performance: agent.performance || { cpuUsage: (Math.random()*50), memoryUsage: (Math.random()*200 + 50) },
          logs: agent.logs || [`[INFO] Agent ${agent.name} initialized. No specific logs available.`]
        }));
      }
    } else {
      // If no global agents are in localStorage, use the initialGlobalAgentsData as a base
      // and potentially enrich them if needed, or show detailedFallback if initialGlobalAgentsData is too simple
      agentsToDisplay = initialGlobalAgentsData.length > 0 ? initialGlobalAgentsData.map(agent => ({
          ...agent, 
          performance: agent.performance || { cpuUsage: (Math.random()*50), memoryUsage: (Math.random()*200 + 50) },
          logs: agent.logs || [`[INFO] Agent ${agent.name} initialized. No specific logs available.`]
        })) : detailedFallbackAgents;
    }
    
    setAgents(agentsToDisplay.map(agent => ({
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
          <p className="text-lg text-muted-foreground">No global agents to display. Configure them on the Agent Management page.</p>
        </div>
      )}
    </div>
  );
}
