
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Task, TaskStatus } from '@/types'; // Import TaskStatus
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User, Loader2, FileText, Code } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { taskChatFlow, type TaskChatInput, type TaskChatOutput } from '@/ai/flows/task-chat-flow';
import { useToast } from '@/hooks/use-toast';

interface TaskChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onTaskStatusChangeByAI?: (taskId: string, newStatus: TaskStatus) => void; // New prop
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: Date;
  simulatedAction?: string;
  thinkingProcess?: string;
}

export default function TaskChatDialog({ open, onOpenChange, task, onTaskStatusChangeByAI }: TaskChatDialogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isAgentReplying, setIsAgentReplying] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const [currentSimulatedAction, setCurrentSimulatedAction] = useState<string | null>(null);
  const [currentFileContext, setCurrentFileContext] = useState<{ fileName: string; content: string } | null>(null);

  useEffect(() => {
    if (open && task) {
      console.log("TASK_CHAT_DIALOG: Initializing messages for task:", JSON.stringify(task, null, 2));
      const initialAgentMessages: ChatMessage[] = [
        {
          id: `agent-welcome-${Date.now()}`,
          sender: 'agent',
          text: `Hello! I'm the AI assistant for task: "${task.title || 'Untitled Task'}".`,
          timestamp: new Date(),
        },
        {
          id: `agent-plan-review-${Date.now() + 1}`,
          sender: 'agent',
          text: `I'm reviewing the plan:\n${task.description || "No detailed plan available."}\n\nI'm ready to proceed or discuss further. What are your instructions or questions?`,
          timestamp: new Date(Date.now() + 1),
          simulatedAction: "Reviewing task plan...",
        }
      ];
      setMessages(initialAgentMessages);
      setNewMessage('');
      setIsAgentReplying(false);
      setCurrentSimulatedAction("Reviewing task plan...");
      setCurrentFileContext(null);
    } else if (!open) {
      setMessages([]);
      setCurrentSimulatedAction(null);
      setCurrentFileContext(null);
    }
  }, [open, task]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !task || isAgentReplying) return;

    const userMessageText = newMessage.trim();
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userMessageText,
      timestamp: new Date(),
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setNewMessage('');
    setIsAgentReplying(true);
    setCurrentSimulatedAction("Agent is thinking...");
    setCurrentFileContext(null);

    try {
      const flowInput: TaskChatInput = {
        taskId: task.id,
        taskTitle: task.title || "Untitled Task",
        taskDescription: task.description || "No description provided.",
        taskStatus: task.status,
        userMessage: userMessageText,
      };
      
      console.log("TASK_CHAT_DIALOG: Sending to taskChatFlow with input:", JSON.stringify(flowInput, null, 2));
      const result: TaskChatOutput = await taskChatFlow(flowInput);
      console.log("TASK_CHAT_DIALOG: Received from taskChatFlow:", JSON.stringify(result, null, 2));
      
      const agentReply: ChatMessage = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: result.agentResponse || "I'm not sure how to respond to that.",
        timestamp: new Date(),
        simulatedAction: result.simulatedAction,
        thinkingProcess: result.thinkingProcess,
      };
      setMessages((prevMessages) => [...prevMessages, agentReply]);
      setCurrentSimulatedAction(result.simulatedAction || "Awaiting your input...");
      
      if (result.fileContextUpdate) {
        setCurrentFileContext(result.fileContextUpdate);
      }
      
      if (result.suggestedNextStatus && result.suggestedNextStatus !== task.status && onTaskStatusChangeByAI) {
        onTaskStatusChangeByAI(task.id, result.suggestedNextStatus as TaskStatus);
        toast({
          title: "Task Status Update Suggested",
          description: `Agent suggested changing status of "${task.title}" to "${result.suggestedNextStatus}". This has been applied.`,
        });
      }

    } catch (error) {
      console.error("Error calling taskChatFlow:", error);
      const errorReply: ChatMessage = {
        id: `agent-error-${Date.now()}`,
        sender: 'agent',
        text: "I'm sorry, I encountered an issue trying to respond. Please try again later.",
        timestamp: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, errorReply]);
      setCurrentSimulatedAction("Error occurred");
      toast({
        title: "Chat Error",
        description: "Could not get a response from the AI assistant.",
        variant: "destructive",
      });
    } finally {
      setIsAgentReplying(false);
      if (currentSimulatedAction?.includes("Agent is thinking...")) {
         setCurrentSimulatedAction(prev => (prev && prev.includes("Agent is thinking...")) ? "Awaiting your input..." : prev);
      }
    }
  }, [newMessage, task, isAgentReplying, toast, onTaskStatusChangeByAI, currentSimulatedAction]);

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90%] md:max-w-[80%] lg:max-w-[70%] xl:max-w-[1000px] flex flex-col h-[85vh] max-h-[750px] overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Agent Workspace: {task.title || "Untitled Task"}</DialogTitle>
          <DialogDescription>
            Task Status: {task.status}. Assigned to: {task.assignedTo}. Interact with the AI agent below.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden p-1">
          {/* Chat Area (Left or Main on mobile) */}
          <div className="md:col-span-2 flex flex-col overflow-hidden h-full">
            <ScrollArea className="flex-grow border rounded-md p-0" ref={scrollAreaRef}>
              <div className="p-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex items-start gap-3",
                      msg.sender === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {msg.sender === 'agent' && (
                      <Avatar className="h-8 w-8 border border-primary/50 flex-shrink-0">
                        <AvatarFallback><Bot className="h-4 w-4 text-primary" /></AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm break-words",
                        msg.sender === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      {msg.simulatedAction && msg.sender === 'agent' && (
                        <p className="text-xs italic opacity-70 mt-1">(Action: {msg.simulatedAction})</p>
                      )}
                      {msg.thinkingProcess && (
                        <p className="text-xs italic opacity-70 mt-1">(Thinking: {msg.thinkingProcess})</p>
                      )}
                      <p className={cn(
                          "text-xs opacity-70 mt-1",
                          msg.sender === 'user' ? 'text-right text-primary-foreground/80' : 'text-left text-muted-foreground/80'
                        )}
                      >
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {msg.sender === 'user' && (
                      <Avatar className="h-8 w-8 border flex-shrink-0">
                        <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                {isAgentReplying && (
                  <div className="flex items-start gap-3 justify-start">
                    <Avatar className="h-8 w-8 border border-primary/50 flex-shrink-0">
                      <AvatarFallback><Bot className="h-4 w-4 text-primary" /></AvatarFallback>
                    </Avatar>
                    <div className="max-w-[70%] rounded-lg px-3 py-2 text-sm shadow-sm bg-muted text-muted-foreground">
                      <div className="flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span>{currentSimulatedAction || "Agent is thinking..."}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="mt-2 pt-2 flex items-center gap-2 border-t">
              <Textarea
                placeholder="Type your message or command (e.g., 'start', 'generate code for X')..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !isAgentReplying) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={2}
                className="min-h-[60px] resize-none flex-grow"
                disabled={isAgentReplying}
              />
              <Button onClick={handleSendMessage} disabled={!newMessage.trim() || isAgentReplying}>
                {isAgentReplying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
              </Button>
            </div>
          </div>

          {/* Simulated File Viewer (Right or Below on mobile) */}
          <div className="md:col-span-1 flex flex-col min-h-0 h-full">
            <Card className="flex-grow flex flex-col">
              <CardHeader className="p-3">
                <CardTitle className="text-sm flex items-center">
                  {currentFileContext?.fileName ? <FileText className="mr-2 h-4 w-4" /> : <Code className="mr-2 h-4 w-4" />}
                  {currentFileContext?.fileName || "Simulated File Viewer"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-grow">
                <Textarea
                  readOnly
                  value={currentFileContext?.content || "// AI can simulate opening/editing/generating files here.\n// Example: 'Show me the sdp_document.md' or 'Generate a Python function to add two numbers.'"}
                  className="h-full w-full resize-none border-0 rounded-none font-mono text-xs bg-muted/30"
                  placeholder="File content or generated code will appear here..."
                />
              </CardContent>
            </Card>
          </div>
        </div>
        
        <DialogFooter className="mt-2 pt-3 border-t flex-shrink-0">
          <div className="text-xs text-muted-foreground w-full flex-grow mr-auto">
            Agent Status: <span className="font-medium text-foreground">{currentSimulatedAction || "Awaiting your input..."}</span>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close Workspace</Button>
        </DialogFooter