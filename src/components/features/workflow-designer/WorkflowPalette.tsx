'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Code2, FileText, Bell, BarChartBig, BrainCircuit } from 'lucide-react';

const agentTypes = [
  { name: 'Code Review Agent', icon: Code2, description: 'Analyzes code for quality and errors.' },
  { name: 'Documentation Agent', icon: FileText, description: 'Generates and updates project docs.' },
  { name: 'Notification Agent', icon: Bell, description: 'Sends alerts and updates.' },
  { name: 'Reporting Agent', icon: BarChartBig, description: 'Compiles and presents data reports.' },
  { name: 'Custom Logic Agent', icon: BrainCircuit, description: 'Executes user-defined Python scripts.' },
];

export default function WorkflowPalette() {
  return (
    <Card className="w-1/4 min-w-[280px] max-w-[320px] flex flex-col shadow-lg">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg">Agent Palette</CardTitle>
      </CardHeader>
      <ScrollArea className="flex-grow">
        <CardContent className="p-4 space-y-3">
          {agentTypes.map((agent) => (
            <Button
              key={agent.name}
              variant="outline"
              className="w-full justify-start h-auto py-2 px-3 text-left group hover:bg-accent"
              // Placeholder for drag functionality
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reactflow', agent.name); // Example data
                e.dataTransfer.effectAllowed = 'move';
              }}
              title={`Drag to add ${agent.name}`}
            >
              <agent.icon className="h-5 w-5 mr-3 text-primary group-hover:text-accent-foreground shrink-0" />
              <div>
                <p className="font-medium group-hover:text-accent-foreground">{agent.name}</p>
                <p className="text-xs text-muted-foreground group-hover:text-accent-foreground/80">{agent.description}</p>
              </div>
            </Button>
          ))}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
