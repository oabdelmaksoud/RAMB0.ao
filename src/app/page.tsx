'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Project, ProjectFile, Task } from '@/types';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import ProjectCard from '@/components/features/projects/ProjectCard';
import { Button } from '@/components/ui/button';
import { FilePlus2, Briefcase } from 'lucide-react'; // Added Briefcase
import AddProjectDialog from '@/components/features/projects/AddProjectDialog';
import { useToast } from '@/hooks/use-toast';
import { 
  initialMockProjects, 
  PROJECTS_STORAGE_KEY, 
  getTasksStorageKey, 
  getAgentsStorageKey, 
  getWorkflowsStorageKey,
  getFilesStorageKey,
  getRequirementsStorageKey,
  getTicketsStorageKey
} from '@/app/projects/page'; // Keep importing from /projects/page as it exports these
import { mockProjectTemplates, type ProjectTemplate } from '@/lib/project-templates'; 
import { format } from 'date-fns';
import { uid } from '@/lib/utils';
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

// HomePage now serves as the primary project listing and management page
export default function HomePage() { 
  const [projects, setProjects] = useState<Project[]>([]);
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleteConfirmationDialogOpen, setIsDeleteConfirmationDialogOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      console.log("PROJECTS_PAGE (root): Attempting to load projects from localStorage.");
      const storedProjects = localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (storedProjects) {
        try {
          const parsedProjects = JSON.parse(storedProjects);
          setProjects(parsedProjects);
          console.log("PROJECTS_PAGE (root): Loaded projects from localStorage:", parsedProjects.length);
        } catch (error) {
          console.error("PROJECTS_PAGE (root): Error parsing projects from localStorage, using initial mocks.", error);
          setProjects(initialMockProjects);
          // localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(initialMockProjects)); // Save mocks if parsing failed
        }
      } else {
        console.log("PROJECTS_PAGE (root): No projects in localStorage, using initial mocks and saving them.");
        setProjects(initialMockProjects);
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(initialMockProjects));
      }
    }
  }, [isClient]);

  useEffect(() => {
    if (isClient && projects.length > 0) {
      // Only save if projects array isn't empty (to avoid overwriting initial load with empty array if there's a race condition)
      // or if localStorage was initially empty (meaning initialMockProjects were just set)
      const storedProjects = localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (storedProjects !== JSON.stringify(projects)) { // Only save if there's an actual change or initial save
        console.log("PROJECTS_PAGE (root): Attempting to save projects to localStorage. Current projects count:", projects.length);
        localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
        console.log("PROJECTS_PAGE (root): Successfully saved projects to localStorage.");
      }
    } else if (isClient && projects.length === 0 && localStorage.getItem(PROJECTS_STORAGE_KEY) !== null && localStorage.getItem(PROJECTS_STORAGE_KEY) !== '[]') {
      // If projects become empty (e.g. last one deleted), ensure localStorage is also updated.
      console.log("PROJECTS_PAGE (root): All projects deleted, updating localStorage to empty array.");
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify([]));
    }
  }, [projects, isClient]);
  

  const createInitialFilesRecursive = useCallback((files: ProjectTemplate['initialFiles'], currentPath: string, projectId: string): ProjectFile[] => {
    if (!files || !Array.isArray(files)) return [];
    return files.map(fileTemplate => {
      const fileId = uid(`projfile-${projectId.slice(-4)}-${fileTemplate.name.replace(/\s+/g, '-').toLowerCase()}`);
      const newFile: ProjectFile = {
        id: fileId,
        name: fileTemplate.name,
        type: fileTemplate.type,
        path: currentPath,
        lastModified: new Date().toISOString(),
        content: fileTemplate.type === 'file' ? (fileTemplate.content || `// Placeholder for ${fileTemplate.name}`) : undefined,
        children: fileTemplate.type === 'folder' ? createInitialFilesRecursive(fileTemplate.children || [], `${currentPath}${fileTemplate.name}/`, projectId) : undefined,
        size: fileTemplate.type === 'file' ? `${Math.floor(Math.random() * 100) + 1}KB` : undefined,
      };
      return newFile;
    });
  }, []);


  const handleAddProject = useCallback((projectData: Omit<Project, 'id' | 'status' | 'lastUpdated' | 'thumbnailUrl' | 'agentCount' | 'workflowCount'>, templateId?: string) => {
    const newProject: Project = {
      ...projectData,
      id: uid('proj'),
      status: 'Active',
      lastUpdated: new Date().toISOString(),
      thumbnailUrl: `https://placehold.co/600x400.png?text=${encodeURIComponent(projectData.name.substring(0,20))}`,
      agentCount: 0, 
      workflowCount: 0, 
    };

    const selectedTemplate = mockProjectTemplates.find(t => t.id === templateId);
    let templateMessage = "Project created from Blank template.";
    
    // Initialize project-specific storage for tasks, agents, workflows, files, requirements, tickets
    const initialTasksForProject: Task[] = [];
    let initialFilesForProject: ProjectFile[] = [];

    if (selectedTemplate && selectedTemplate.id !== 'template-blank') {
      templateMessage = `Project created using the "${selectedTemplate.name}" template.`;
      if (selectedTemplate.initialTasks && selectedTemplate.initialTasks.length > 0) {
        selectedTemplate.initialTasks.forEach((taskTemplate, index) => {
          initialTasksForProject.push({
            id: uid(`task-${newProject.id.slice(-5)}-${index}`),
            projectId: newProject.id,
            title: taskTemplate.title || 'Untitled Template Task',
            status: taskTemplate.status || 'To Do',
            assignedTo: taskTemplate.assignedTo || 'Unassigned',
            startDate: taskTemplate.startDate || format(new Date(), 'yyyy-MM-dd'),
            durationDays: taskTemplate.isMilestone ? 0 : (taskTemplate.durationDays === undefined || taskTemplate.durationDays < 1 ? 1 : taskTemplate.durationDays),
            progress: taskTemplate.isMilestone ? (taskTemplate.status === 'Done' ? 100 : 0) : (taskTemplate.progress || 0),
            isMilestone: taskTemplate.isMilestone || false,
            parentId: taskTemplate.parentId || null,
            dependencies: taskTemplate.dependencies || [],
            description: taskTemplate.description || `Initial task from ${selectedTemplate.name} template.`,
            isAiPlanned: false, 
          });
        });
      }
      if (selectedTemplate.initialFiles && selectedTemplate.initialFiles.length > 0) {
        initialFilesForProject = createInitialFilesRecursive(selectedTemplate.initialFiles, '/', newProject.id);
      }
    }
    
    // Always set (or clear) these localStorage items for the new project
    localStorage.setItem(getTasksStorageKey(newProject.id), JSON.stringify(initialTasksForProject));
    localStorage.setItem(getAgentsStorageKey(newProject.id), JSON.stringify([])); // Start with no specific agents, let defaults on project page load
    localStorage.setItem(getWorkflowsStorageKey(newProject.id), JSON.stringify([])); // Start with no specific workflows, let defaults on project page load
    localStorage.setItem(getFilesStorageKey(newProject.id), JSON.stringify(initialFilesForProject));
    localStorage.setItem(getRequirementsStorageKey(newProject.id), JSON.stringify([])); // Start with no specific requirements, let defaults load
    localStorage.setItem(getTicketsStorageKey(newProject.id), JSON.stringify([])); // Start with no tickets

    setProjects(prevProjects => [newProject, ...prevProjects]);
    setIsAddProjectDialogOpen(false);
    toast({
      title: "Project Created",
      description: `"${newProject.name}" has been successfully created. ${templateMessage}`,
    });
  }, [toast, createInitialFilesRecursive]);

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project);
    setIsDeleteConfirmationDialogOpen(true);
  };

  const confirmDeleteProject = () => {
    if (projectToDelete) {
      setProjects(prevProjects => prevProjects.filter(p => p.id !== projectToDelete.id));
      
      localStorage.removeItem(getTasksStorageKey(projectToDelete.id));
      localStorage.removeItem(getAgentsStorageKey(projectToDelete.id));
      localStorage.removeItem(getWorkflowsStorageKey(projectToDelete.id));
      localStorage.removeItem(getFilesStorageKey(projectToDelete.id));
      localStorage.removeItem(getRequirementsStorageKey(projectToDelete.id));
      localStorage.removeItem(getTicketsStorageKey(projectToDelete.id));

      toast({
        title: "Project Deleted",
        description: `Project "${projectToDelete.name}" and its associated data have been deleted.`,
        variant: "destructive",
      });
      setProjectToDelete(null);
      setIsDeleteConfirmationDialogOpen(false);
    }
  };

  if (!isClient) {
    return (
        <div className="container mx-auto">
            <PageHeader>
                <PageHeaderHeading>Projects Dashboard</PageHeaderHeading>
                <PageHeaderDescription>Manage and oversee all your ongoing and completed projects.</PageHeaderDescription>
            </PageHeader>
            <div className="text-center py-10">Loading projects...</div>
        </div>
    );
  }

  return (
    <div className="container mx-auto">
      <PageHeader className="items-start justify-between sm:flex-row sm:items-center">
        <div>
          <PageHeaderHeading>Projects Dashboard</PageHeaderHeading>
          <PageHeaderDescription>
            Overview of all your projects. Click on a project to view its details.
          </PageHeaderDescription>
        </div>
        <Button onClick={() => setIsAddProjectDialogOpen(true)} className="w-full mt-4 sm:w-auto sm:mt-0">
          <FilePlus2 className="mr-2 h-4 w-4" /> Add New Project
        </Button>
      </PageHeader>

      {projects.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} onDeleteProject={handleDeleteProject} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg flex flex-col items-center justify-center min-h-[300px] bg-muted/20">
            <Briefcase className="mx-auto h-12 w-12 mb-4 text-muted-foreground/50" />
            <h3 className="text-xl font-semibold mb-2">No Projects Yet</h3>
            <p className="mb-4">Get started by creating your first project.</p>
            <Button onClick={() => setIsAddProjectDialogOpen(true)} className="w-full max-w-xs sm:w-auto">
                <FilePlus2 className="mr-2 h-4 w-4"/>Add First Project
            </Button>
        </div>
      )}

      <AddProjectDialog
        open={isAddProjectDialogOpen}
        onOpenChange={setIsAddProjectDialogOpen}
        onAddProject={handleAddProject}
      />

      {projectToDelete && (
        <AlertDialog open={isDeleteConfirmationDialogOpen} onOpenChange={setIsDeleteConfirmationDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to delete "{projectToDelete.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the project and all its associated data (tasks, agents, workflows, files, requirements, tickets).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {setProjectToDelete(null); setIsDeleteConfirmationDialogOpen(false);}}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteProject} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete Project</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
