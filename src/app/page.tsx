'use client';

import { useState, useEffect } from 'react';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import ProjectCard from '@/components/features/projects/ProjectCard';
import type { Project } from '@/types';
import { initialMockProjects, PROJECTS_STORAGE_KEY } from '@/app/projects/page'; // Ensure these are exported
import { LayoutDashboard, PlusCircle, Briefcase } from 'lucide-react'; // Added Briefcase
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const storedProjectsJson = localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (storedProjectsJson) {
        try {
          const storedProjects = JSON.parse(storedProjectsJson);
          if (Array.isArray(storedProjects)) {
            setProjects(storedProjects);
          } else {
            // Fallback if stored data is invalid, but only if initialMockProjects has items
            // This prevents initializing with mocks if the user intentionally cleared all projects.
            if (initialMockProjects.length > 0 && projects.length === 0) {
              setProjects(initialMockProjects);
            }
          }
        } catch (e) {
          console.error("Dashboard: Error parsing projects from localStorage.", e);
          if (initialMockProjects.length > 0 && projects.length === 0) {
             setProjects(initialMockProjects); // Fallback on parsing error only if state is empty
          }
        }
      } else {
        // If nothing in localStorage, use initial mocks if they exist and current state is empty
        if (initialMockProjects.length > 0 && projects.length === 0) {
            setProjects(initialMockProjects);
        }
      }
    }
  }, []); // Run once on mount

  if (!isClient) {
    return (
       <div className="container mx-auto">
        <PageHeader>
          <PageHeaderHeading>
            <LayoutDashboard className="mr-2 inline-block h-6 w-6" />
            Dashboard
          </PageHeaderHeading>
          <PageHeaderDescription>
            Loading your projects overview...
          </PageHeaderDescription>
        </PageHeader>
        <div className="text-center py-10">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <PageHeader>
        <PageHeaderHeading>
          <LayoutDashboard className="mr-2 inline-block h-6 w-6" />
          Dashboard
        </PageHeaderHeading>
        <PageHeaderDescription>
          An overview of your projects. Manage them from the <Link href="/projects" className="text-primary hover:underline">Projects page</Link>.
        </PageHeaderDescription>
      </PageHeader>

      {projects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((project) => (
            // onDeleteProject is not passed, so delete button won't show on dashboard cards
            <ProjectCard key={project.id} project={project} /> 
          ))}
        </div>
      ) : (
        <div className="text-center py-10 flex flex-col items-center justify-center h-60 border-2 border-dashed rounded-lg bg-muted/20">
          <Briefcase className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-lg font-medium text-muted-foreground">No projects found.</p>
          <p className="text-sm text-muted-foreground/80 mt-1 mb-4">
            Go to the <Link href="/projects" className="text-primary hover:underline">Projects page</Link> to create your first project.
          </p>
          <Button asChild>
            <Link href="/projects">
              <PlusCircle className="mr-2 h-4 w-4" /> Go to Projects
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
