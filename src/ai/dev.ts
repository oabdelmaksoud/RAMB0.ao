
import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-agent-performance.ts';
import '@/ai/flows/suggest-agent-configuration.ts';
import '@/ai/flows/plan-project-task-flow.ts';
import '@/ai/flows/task-chat-flow.ts'; // Added new task chat flow

