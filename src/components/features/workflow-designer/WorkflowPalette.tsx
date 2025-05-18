'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Code2, FileText, Bell, BarChartBig, BrainCircuit, ToyBrick, SlidersHorizontal, Activity, AlertTriangle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Agent } from '@/types';
import { AGENTS_STORAGE_KEY, initialMockAgents as initialGlobalAgentsData } from '@/app/agent-management/page';

interface PaletteAgentType {
  name: string; // This will be the agent.type
  icon: LucideIcon;
  description: string;
}

const getDefaultIconForAgentType = (agentType: string): LucideIcon => {
  const lowerType = agentType.toLowerCase();
  if (lowerType.includes('code') || lowerType.includes('develop')) return Code2;
  if (lowerType.includes('doc') || lowerType.includes('text')) return FileText;
  if (lowerType.includes('notif') || lowerType.includes('alert')) return Bell;
  if (lowerType.includes('report') || lowerType.includes('summary')) return BarChartBig;
  if (lowerType.includes('analy')) return BrainCircuit;
  if (lowerType.includes('deploy')) return SlidersHorizontal;
  if (lowerType.includes('test')) return Activity;
  if (lowerType.includes('monitor')) return AlertTriangle;
  return ToyBrick; // Default icon
};

export default function WorkflowPalette() {
  const [paletteAgentTypes, setPaletteAgentTypes] = useState<PaletteAgentType[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    let loadedAgents: Agent[] = [];
    try {
      const storedAgentsJson = localStorage.getItem(AGENTS_STORAGE_KEY);
      if (storedAgentsJson) {
        loadedAgents = JSON.parse(storedAgentsJson);
      } else {
        loadedAgents = initialGlobalAgentsData;
      }
    } catch (error) {
      console.error("Error loading global agents for palette:", error);
      loadedAgents = initialGlobalAgentsData;
    }
    
    const uniqueTypes = Array.from(new Set(loadedAgents.map(agent => agent.type)));
    
    const newPaletteItems: PaletteAgentType[] = uniqueTypes.map(type => ({
      name: type,
      icon: getDefaultIconForAgentType(type),
      description: `Draggable ${type}.`
    }));

    setPaletteAgentTypes(newPaletteItems);

  }, [isClient]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, agentTypeName: string) => {
    e.dataTransfer.setData('text/plain', agentTypeName);
    e.dataTransfer.effectAllowed = 'move';
    console.log(`PALETTE: Drag started for type: ${agentTypeName}. Data set to: ${agentTypeName}`);
  };

  return (
    <Card className="w-full md:w-1/4 md:min-w-[280px] md:max-w-[320px] flex flex-col shadow-lg">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg">Agent Palette</CardTitle>
      </CardHeader>
      <ScrollArea className="flex-grow">
        <CardContent className="p-4 space-y-3">
          {paletteAgentTypes.length === 0 && isClient && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No global agent types found. Add agent configurations on the 'Agents' page to populate this palette.
            </p>
          )}
          {paletteAgentTypes.map((agentType) => (
            <div
              key={agentType.name}
              draggable={true}
              onDragStart={(e) => handleDragStart(e, agentType.name)}
              className="p-3 border rounded-lg bg-card hover:shadow-lg hover:border-primary cursor-grab transition-all duration-150 ease-in-out flex items-start gap-3 text-left group"
              title={`Drag to add ${agentType.name}`}
            >
              <agentType.icon className="h-6 w-6 mt-0.5 text-primary group-hover:text-primary/90 shrink-0" />
              <div>
                <p className="font-semibold text-card-foreground group-hover:text-primary">{agentType.name}</p>
                <p className="text-xs text-muted-foreground">{agentType.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
