import WorkflowPalette from '@/components/features/workflow-designer/WorkflowPalette';
import WorkflowCanvasPlaceholder from '@/components/features/workflow-designer/WorkflowCanvasPlaceholder';
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
          Visually design and manage project workflows by connecting different agents.
        </PageHeaderDescription>
      </PageHeader>

      <div className="flex flex-grow gap-6 mt-2 overflow-hidden">
        <WorkflowPalette />
        <WorkflowCanvasPlaceholder />
      </div>
    </div>
  );
}
