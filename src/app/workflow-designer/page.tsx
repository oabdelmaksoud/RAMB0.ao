
import WorkflowPalette from '@/components/features/workflow-designer/WorkflowPalette';
import WorkflowCanvas from '@/components/features/workflow-designer/WorkflowCanvasPlaceholder'; // Corrected import
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { Workflow as WorkflowIcon } from 'lucide-react';

export default function WorkflowDesignerPage() {
  return (
    <div className="container mx-auto h-full flex flex-col">
      <PageHeader>
        <PageHeaderHeading>
          <WorkflowIcon className="mr-2 inline-block h-6 w-6" />
          Workflow Designer
        </PageHeaderHeading>
        <PageHeaderDescription>
          Visually design and manage project workflows by connecting different agents. Drag agents to the canvas.
        </PageHeaderDescription>
      </PageHeader>

      <div className="flex flex-grow gap-6 mt-2 overflow-hidden">
        <WorkflowPalette />
        <WorkflowCanvas /> {/* This usage remains the same as the component name is WorkflowCanvas */}
      </div>
    </div>
  );
}
