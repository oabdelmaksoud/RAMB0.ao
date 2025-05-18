
'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import ProjectCard from '@/components/features/projects/ProjectCard';
import type { Project, Task, ProjectFile } from '@/types';
import { Briefcase, PlusCircle } from 'lucide-react';
import AddProjectDialog from '@/components/features/projects/AddProjectDialog';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { mockProjectTemplates } from '@/lib/project-templates';
import { format } from 'date-fns';

// These are EXPORTED so they can be used by other pages like the main page and project detail page
export const initialMockProjects: Project[] = [
  {
    id: 'proj-001',
    name: 'AI Powered Marketing Suite',
    description: 'Develop an integrated suite of marketing tools powered by generative AI to automate content creation and campaign management.',
    status: 'Active',
    lastUpdated: '2024-07-20T10:00:00Z',
    thumbnailUrl: 'https://placehold.co/600x400.png?text=AI+Marketing',
    agentCount: 5,
    workflowCount: 3,
  },
  {
    id: 'proj-002',
    name: 'Automated Financial Reporting',
    description: 'A system to automatically pull financial data from various sources, generate reports, and identify anomalies using intelligent agents.',
    status: 'Active',
    lastUpdated: '2024-07-21T14:30:00Z',
    thumbnailUrl: 'https://placehold.co/600x400.png?text=Fin+Reporting',
    agentCount: 3,
    workflowCount: 2,
  },
  {
    id: 'proj-003',
    name: 'E-commerce Platform Revamp',
    description: 'Complete overhaul of the existing e-commerce platform with a focus on UX, performance, and AI-driven personalization.',
    status: 'On Hold',
    lastUpdated: '2024-06-15T09:00:00Z',
    thumbnailUrl: 'https://placehold.co/600x400.png?text=E-commerce',
    agentCount: 8,
    workflowCount: 5,
  },
];

export const PROJECTS_STORAGE_KEY = 'ramboAgentProjects'; // Changed from agentFlowProjects
export const getTasksStorageKey = (projectId: string) => `ramboAgentTasks_project_${projectId}`;
export const getAgentsStorageKey = (projectId: string) => `ramboAgentAgents_project_${projectId}`;
export const getWorkflowsStorageKey = (projectId: string) => `ramboAgentWorkflows_project_${projectId}`;
export const getFilesStorageKey = (projectId: string) => `ramboAgentFiles_project_${projectId}`;
export const getRequirementsStorageKey = (projectId: string) => `ramboAgentRequirements_project_${projectId}`;


export default function ProjectsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="container mx-auto">
      <PageHeader>
        <PageHeaderHeading>Redirecting to Projects...</PageHeaderHeading>
      </PageHeader>
      <div className="text-center py-10">
        <p>If you are not redirected, please <a href="/" className="text-primary hover:underline">click here</a>.</p>
      </div>
    </div>
  );
}

// Need to re-import useRouter for the redirect page
import { useRouter } from 'next/navigation';
