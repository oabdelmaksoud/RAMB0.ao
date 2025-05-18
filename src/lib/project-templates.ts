
import type { ProjectTemplate } from '@/types';
import { format } from 'date-fns';

const today = format(new Date(), 'yyyy-MM-dd');

export const mockProjectTemplates: ProjectTemplate[] = [
  {
    id: 'template-blank',
    name: 'Blank Project',
    description: 'Start with a completely empty project.',
    initialTasks: [],
    initialFiles: [],
  },
  {
    id: 'template-software-dev',
    name: 'Standard Software Project',
    description: 'A basic template for software development projects, including typical phases and a common folder structure.',
    initialTasks: [
      { title: 'Project Planning & Requirements Gathering', status: 'To Do', assignedTo: 'Project Manager', startDate: today, durationDays: 5, progress: 0, isMilestone: false, description: "Define project scope, objectives, and gather detailed requirements." },
      { title: 'System Design & Architecture', status: 'To Do', assignedTo: 'Lead Developer / Architect', startDate: today, durationDays: 7, progress: 0, isMilestone: false, description: "Design the overall system architecture and component interactions." },
      { title: 'Development Sprint 1', status: 'To Do', assignedTo: 'Development Team', startDate: today, durationDays: 10, progress: 0, isMilestone: false, description: "Implement core features for the first sprint." },
      { title: 'Testing Phase 1', status: 'To Do', assignedTo: 'QA Team', startDate: today, durationDays: 5, progress: 0, isMilestone: false, description: "Conduct initial testing of Sprint 1 deliverables." },
      { title: 'Deployment to Staging', status: 'To Do', assignedTo: 'DevOps Team', startDate: today, durationDays: 2, progress: 0, isMilestone: false, description: "Deploy the application to the staging environment." },
    ],
    initialFiles: [
      { name: 'docs', type: 'folder', children: [
        { name: 'README.md', type: 'file', content: '# Project Readme\n\nThis is a placeholder README file.' },
        { name: 'CONTRIBUTING.md', type: 'file', content: '# Contributing Guidelines\n\n...' },
      ]},
      { name: 'src', type: 'folder', children: [
        { name: 'main.ts', type: 'file', content: '// Main application entry point\nconsole.log("Hello, World!");' },
        { name: 'utils.ts', type: 'file', content: '// Utility functions\nexport const greet = (name: string) => `Hello, ${name}!`;' },
      ]},
      { name: 'tests', type: 'folder', children: [] },
      { name: '.gitignore', type: 'file', content: 'node_modules\n.env\n.next\nout\n*.log' },
    ],
  },
  {
    id: 'template-marketing-campaign',
    name: 'Marketing Campaign',
    description: 'A template for planning and executing a marketing campaign.',
    initialTasks: [
      { title: 'Campaign Strategy & Planning', status: 'To Do', assignedTo: 'Marketing Lead', startDate: today, durationDays: 3, progress: 0, description: "Define campaign goals, target audience, and overall strategy." },
      { title: 'Content Creation (Ads, Social, Email)', status: 'To Do', assignedTo: 'Content Team', startDate: today, durationDays: 7, progress: 0, description: "Develop all creative assets for the campaign." },
      { title: 'Campaign Setup & Configuration', status: 'To Do', assignedTo: 'Campaign Manager', startDate: today, durationDays: 2, progress: 0, description: "Set up tracking, ad platforms, and email sequences." },
      { title: 'Campaign Launch', status: 'To Do', assignedTo: 'Marketing Lead', startDate: today, durationDays: 1, progress: 0, isMilestone: true, description: "Go-live date for the campaign." },
      { title: 'Performance Monitoring & Reporting', status: 'To Do', assignedTo: 'Analytics Team', startDate: today, durationDays: 5, progress: 0, description: "Track campaign KPIs and generate performance reports." },
    ],
    initialFiles: [
      { name: 'strategy', type: 'folder', children: [
        { name: 'CampaignBrief.docx', type: 'file', content: 'This is a mock campaign brief document.' },
      ]},
      { name: 'assets', type: 'folder', children: [
        { name: 'images', type: 'folder', children: [] },
        { name: 'videos', type: 'folder', children: [] },
        { name: 'copywriting', type: 'folder', children: [
            { name: 'social_media_posts.txt', type: 'file', content: 'Draft posts for social media.'}
        ] },
      ]},
      { name: 'reports', type: 'folder', children: [] }, // Completed the 'reports' folder object
    ], // Closes initialFiles array for marketing campaign
  }, // Closes marketing campaign template object
]; // Closes mockProjectTemplates array
