
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import ProjectCard from '@/components/features/projects/ProjectCard';
import type { Project } from '@/types';
import { Briefcase } from 'lucide-react';

const mockProjects: Project[] = [
  {
    id: 'proj-001',
    name: 'AI Powered Marketing Suite',
    description: 'Develop an integrated suite of marketing tools powered by generative AI to automate content creation and campaign management.',
    status: 'Active',
    lastUpdated: '2024-07-20T10:00:00Z',
    thumbnailUrl: 'https://placehold.co/600x400.png', // Ensure data-ai-hint is in ProjectCard
    agentCount: 5,
    workflowCount: 3,
  },
  {
    id: 'proj-002',
    name: 'Automated Financial Reporting',
    description: 'A system to automatically pull financial data from various sources, generate reports, and identify anomalies using intelligent agents.',
    status: 'Active',
    lastUpdated: '2024-07-21T14:30:00Z',
    thumbnailUrl: 'https://placehold.co/600x400.png', // Ensure data-ai-hint is in ProjectCard
    agentCount: 3,
    workflowCount: 2,
  },
  {
    id: 'proj-003',
    name: 'E-commerce Platform Revamp',
    description: 'Complete overhaul of the existing e-commerce platform with a focus on UX, performance, and AI-driven personalization.',
    status: 'On Hold',
    lastUpdated: '2024-06-15T09:00:00Z',
    thumbnailUrl: 'https://placehold.co/600x400.png', // Ensure data-ai-hint is in ProjectCard
    agentCount: 8,
    workflowCount: 5,
  },
  {
    id: 'proj-004',
    name: 'Internal Knowledge Base AI',
    description: 'Create an AI-powered search and Q&A system for the company\'s internal knowledge base and documentation.',
    status: 'Completed',
    lastUpdated: '2024-05-30T17:00:00Z',
    thumbnailUrl: 'https://placehold.co/600x400.png', // Ensure data-ai-hint is in ProjectCard
    agentCount: 2,
    workflowCount: 1,
  },
   {
    id: 'proj-005',
    name: 'Smart City Traffic Management',
    description: 'Utilize AI agents to optimize traffic flow in real-time based on sensor data and predictive analytics.',
    status: 'Active',
    lastUpdated: '2024-07-22T11:00:00Z',
    thumbnailUrl: 'https://placehold.co/600x400.png', // Ensure data-ai-hint is in ProjectCard
    agentCount: 12,
    workflowCount: 7,
  },
  {
    id: 'proj-006',
    name: 'Healthcare Patient Monitoring',
    description: 'A system using wearable sensor data and AI agents to monitor patient vitals and alert healthcare providers to critical changes.',
    status: 'Archived',
    lastUpdated: '2023-12-01T08:00:00Z',
    thumbnailUrl: 'https://placehold.co/600x400.png', // Ensure data-ai-hint is in ProjectCard
    agentCount: 4,
    workflowCount: 2,
  }
];

export default function ProjectsPage() {
  return (
    <div className="container mx-auto">
      <PageHeader>
        <PageHeaderHeading>
          <Briefcase className="mr-2 inline-block h-6 w-6" />
          Projects Overview
        </PageHeaderHeading>
        <PageHeaderDescription>
          Manage your ongoing and completed projects. Track progress and access project-specific resources and agents.
        </PageHeaderDescription>
      </PageHeader>

      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {mockProjects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
