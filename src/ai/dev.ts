
import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-agent-performance.ts';
import '@/ai/flows/suggest-agent-configuration.ts';
import '@/ai/flows/plan-project-task-flow.ts';
import '@/ai/flows/task-chat-flow.ts';
import '@/ai/flows/generate-requirement-doc-flow.ts';
import '@/ai/flows/analyze-ticket-flow.ts';
import '@/ai/flows/suggest-project-workflow-flow.ts'; // Added new workflow