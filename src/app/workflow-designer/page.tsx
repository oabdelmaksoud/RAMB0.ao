
'use client';

import WorkflowPalette from '@/components/features/workflow-designer/WorkflowPalette';
import WorkflowCanvas from '@/components/features/workflow-designer/WorkflowCanvasPlaceholder'; // Corrected import
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { Activity as WorkflowIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Agent } from '@/types';

export default function WorkflowDesignerPage() {
  const [projectAgents, setProjectAgents] = useState<Agent[]>([]);
  
  useEffect(() => {
    // Load project agents from localStorage
    const loadProjectAgents = () => {
      try {
        // Get agents from all projects
        const storedProjects = localStorage.getItem('projects');
        const projects = storedProjects ? JSON.parse(storedProjects) : [];
        
        const allAgents: Agent[] = [];
        
        // For each project, get its agents
        projects.forEach((project: any) => {
          const projectId = project.id;
          const agentsStorageKey = `project_${projectId}_agents`;
          const storedAgents = localStorage.getItem(agentsStorageKey);
          
          if (storedAgents) {
            const agents = JSON.parse(storedAgents);
            if (Array.isArray(agents)) {
              allAgents.push(...agents);
            }
          }
        });
        
        setProjectAgents(allAgents);
      } catch (error) {
        console.error('Error loading project agents:', error);
        setProjectAgents([]);
      }
    };
    
    loadProjectAgents();
  }, []);
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
        <WorkflowPalette projectAgents={projectAgents} />
        <WorkflowCanvas /> {/* This usage remains the same as the component name is WorkflowCanvas */}
      </div>
    </div>
  );
}
