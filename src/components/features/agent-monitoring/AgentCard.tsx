import type { Agent } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Cpu, MemoryStick, FileText, AlertTriangle, CheckCircle2, XCircle, PauseCircle, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"


interface AgentCardProps {
  agent: Agent;
}

const statusIcons = {
  Running: <Zap className="h-4 w-4 text-green-500" />,
  Idle: <PauseCircle className="h-4 w-4 text-yellow-500" />,
  Error: <AlertTriangle className="h-4 w-4 text-red-500" />,
  Stopped: <XCircle className="h-4 w-4 text-gray-500" />,
};

const statusColors: { [key in Agent['status']]: string } = {
  Running: 'bg-green-500/20 text-green-700 dark:bg-green-500/10 dark:text-green-400 border-green-500/30',
  Idle: 'bg-yellow-500/20 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 border-yellow-500/30',
  Error: 'bg-red-500/20 text-red-700 dark:bg-red-500/10 dark:text-red-400 border-red-500/30',
  Stopped: 'bg-gray-500/20 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400 border-gray-500/30',
};


export default function AgentCard({ agent }: AgentCardProps) {
  return (
    <Card className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{agent.name}</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-1.5 rounded-full bg-card border">
                  {statusIcons[agent.status]}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{agent.status}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription className="text-sm text-muted-foreground">{agent.type}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        <Badge variant="outline" className={cn("font-mono text-xs", statusColors[agent.status])}>
          Status: {agent.status}
        </Badge>
        <div className="text-sm text-muted-foreground">
          <Activity className="inline-block h-4 w-4 mr-1.5" />
          Last active: {agent.lastActivity}
        </div>
        {agent.performance && (
          <div className="space-y-2 pt-2">
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span><Cpu className="inline-block h-3 w-3 mr-1" /> CPU Usage</span>
                <span>{agent.performance.cpuUsage ?? 0}%</span>
              </div>
              <Progress value={agent.performance.cpuUsage} aria-label={`${agent.performance.cpuUsage}% CPU Usage`} className="h-2" />
            </div>
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span><MemoryStick className="inline-block h-3 w-3 mr-1" /> Memory</span>
                <span>{agent.performance.memoryUsage ?? 0} MB</span>
              </div>
              <Progress value={(agent.performance.memoryUsage ?? 0)/512 * 100} aria-label={`${agent.performance.memoryUsage} MB Memory Usage`} className="h-2" />
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" className="w-full">
          <FileText className="h-4 w-4 mr-2" />
          View Logs
        </Button>
      </CardFooter>
    </Card>
  );
}

// Helper to apply cn for conditional classes
import { cn } from "@/lib/utils";
