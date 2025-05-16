
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
// Button component is no longer directly used for palette items
import { Code2, FileText, Bell, BarChartBig, BrainCircuit } from 'lucide-react';

const agentTypes = [
  { name: 'Code Review Agent', icon: Code2, description: 'Analyzes code for quality and errors.' },
  { name: 'Documentation Agent', icon: FileText, description: 'Generates and updates project docs.' },
  { name: 'Notification Agent', icon: Bell, description: 'Sends alerts and updates.' },
  { name: 'Reporting Agent', icon: BarChartBig, description: 'Compiles and presents data reports.' },
  { name: 'Custom Logic Agent', icon: BrainCircuit, description: 'Executes user-defined scripts.' },
];

export default function WorkflowPalette() {
  return (
    <Card className="w-1/4 min-w-[280px] max-w-[320px] flex flex-col shadow-lg">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg">Agent Palette</CardTitle>
      </CardHeader>
      <ScrollArea className="flex-grow">
        <CardContent className="p-4 space-y-3"> {/* space-y-3 provides spacing between items */}
          {agentTypes.map((agent) => (
            <div
              key={agent.name}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/reactflow', agent.name);
                e.dataTransfer.effectAllowed = 'move';
              }}
              className="p-3 border rounded-lg bg-card hover:shadow-lg hover:border-primary cursor-grab transition-all duration-150 ease-in-out flex items-start gap-3 text-left group"
              title={`Drag to add ${agent.name}`}
            >
              <agent.icon className="h-6 w-6 mt-0.5 text-primary group-hover:text-primary/90 shrink-0" />
              <div>
                <p className="font-semibold text-card-foreground group-hover:text-primary">{agent.name}</p>
                <p className="text-xs text-muted-foreground">{agent.description}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
