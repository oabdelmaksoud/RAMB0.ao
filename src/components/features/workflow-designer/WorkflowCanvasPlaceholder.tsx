import { Card, CardContent } from '@/components/ui/card';
import { MousePointerSquareDashed, Hand } from 'lucide-react';

export default function WorkflowCanvasPlaceholder() {
  return (
    <Card className="flex-grow flex flex-col items-center justify-center border-2 border-dashed border-border shadow-inner bg-background/50">
      <CardContent className="text-center p-8">
        <div className="flex items-center justify-center gap-4 mb-6">
          <MousePointerSquareDashed className="h-12 w-12 text-muted-foreground" />
          <Hand className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Design Your Workflow</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Drag agents from the palette on the left and drop them here. Connect agents to define the execution flow of your project tasks.
        </p>
        <div className="mt-8 space-y-2">
          <div className="flex items-center justify-center p-4 border rounded-lg bg-card shadow-sm">
            <span className="text-sm font-medium">Example: Code Review Agent</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-right h-5 w-5 mx-2 text-muted-foreground"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            <span className="text-sm font-medium">Notification Agent</span>
          </div>
           <p className="text-xs text-muted-foreground">(This is a visual placeholder)</p>
        </div>
      </CardContent>
    </Card>
  );
}
