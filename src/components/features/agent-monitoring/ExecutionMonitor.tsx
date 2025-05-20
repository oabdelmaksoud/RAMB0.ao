import { useEffect, useState } from 'react';
import { useToast } from '../../../hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Progress } from '../../../components/ui/progress';

interface ExecutionStatus {
  executionId: string;
  status: string;
  nodes: Array<{
    id: string;
    status: string;
    startedAt?: Date;
    completedAt?: Date;
  }>;
}

export function ExecutionMonitor({ executionId }: { executionId: string }) {
  const [status, setStatus] = useState<ExecutionStatus | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:3000/monitoring/${executionId}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setStatus(data);
    };

    ws.onerror = () => {
      toast({
        title: 'Connection Error',
        description: 'Failed to connect to monitoring service',
        variant: 'destructive'
      });
    };

    return () => ws.close();
  }, [executionId, toast]);

  if (!status) return <div>Loading execution status...</div>;

  const completedNodes = status.nodes.filter(n => n.status === 'COMPLETED').length;
  const progress = (completedNodes / status.nodes.length) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Execution {status.executionId}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground mt-2">
              {completedNodes} of {status.nodes.length} nodes completed
            </p>
          </div>
          <div className="space-y-2">
            {status.nodes.map(node => (
              <div key={node.id} className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  node.status === 'COMPLETED' ? 'bg-green-500' :
                  node.status === 'RUNNING' ? 'bg-yellow-500' :
                  'bg-gray-300'
                }`} />
                <span>{node.id}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
