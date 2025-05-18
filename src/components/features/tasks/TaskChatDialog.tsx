'use client';

import { useState, useEffect, useRef } from 'react';
import type { Task } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter, // Added DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User, Loader2, Paperclip, FileText, Code } from 'lucide-react'; // Added icons
import { cn } from '@/lib/utils';
import { taskChatFlow, type TaskChatInput, type TaskChatOutput } from '@/ai/flows/task-chat-flow';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

interface TaskChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: Date;
  simulatedAction?: string;
  thinkingProcess?: string;
}

export default function TaskChatDialog({ open, onOpenChange, task }: TaskChatDialogProps) {
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

  const handleSendMessage = async () => {
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
    setCurrentSimulatedAction("Agent is thinking..."); // Update status bar
    setCurrentFileContext(null); // Clear previous file context

    try {
      const flowInput: TaskChatInput = {
        taskId: task.id,
        taskTitle: task.title,
        taskDescription: task.description || "No description provided.",
        taskStatus: task.status,
        userMessage: userMessageText,
      };
      
      const result: TaskChatOutput = await taskChatFlow(flowInput);
      
      const agentReply: ChatMessage = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: result.agentResponse,
        timestamp: new Date(),
        simulatedAction: result.simulatedAction,
        thinkingProcess: result.thinkingProcess,
      };
      setMessages((prevMessages) => [...prevMessages, agentReply]);
      setCurrentSimulatedAction(result.simulatedAction || "Awaiting your input...");
      if (result.fileContextUpdate) {
        setCurrentFileContext(result.fileContextUpdate);
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
      if(!currentSimulatedAction?.startsWith("Agent is thinking...")) {
        // If AI didn't provide a new action, revert to a waiting state message
         setCurrentSimulatedAction(prev => prev && prev.startsWith("Agent is thinking...") ? "Awaiting your input..." : prev);
      }
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] md:max-w-[750px] lg:max-w-[900px] flex flex-col h-[85vh] max-h-[700px]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Agent Workspace: {task.title}</DialogTitle>
          <DialogDescription>
            Task Status: {task.status}. Assigned to: {task.assignedTo}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4 overflow-hidden p-1">
          {/* Left Pane: Mock File Explorer & Editor */}
          <div className="md:col-span-1 flex flex-col gap-4 overflow-y-auto border-r pr-2">
            <Card className="flex-shrink-0">
              <CardHeader className="p-3">
                <CardTitle className="text-sm flex items-center"><Paperclip className="mr-2 h-4 w-4" /> Project Files (Mock)</CardTitle>
              </CardHeader>
              <CardContent className="p-3 text-xs text-muted-foreground min-h-[100px]">
                <p>_src/</p>
                <p className="pl-4">_components/</p>
                <p className="pl-4">_main_controller.py</p>
                <p>_docs/</p>
                <p className="pl-4">_requirements.md</p>
                <p className="pl-4">_sdp_document.md {currentFileContext?.fileName === 'sdp_document.md (Draft)' ? <Badge variant="outline" className="ml-1 text-green-600 border-green-500">Drafting</Badge> : ''}</p>
                <p>_README.md</p>
              </CardContent>
            </Card>
            
            <Card className="flex-grow flex flex-col min-h-[200px]">
              <CardHeader className="p-3">
                <CardTitle className="text-sm flex items-center">
                  {currentFileContext?.fileName ? <FileText className="mr-2 h-4 w-4" /> : <Code className="mr-2 h-4 w-4" />}
                  {currentFileContext?.fileName || "Simulated File Viewer"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-grow">
                <Textarea
                  readOnly
                  value={currentFileContext?.content || "// Click on a file or ask AI to open/edit one (simulated).\n// Example: 'Show me the sdp_document.md'"}
                  className="h-full w-full resize-none border-0 rounded-none font-mono text-xs bg-muted/30"
                  placeholder="File content will appear here..."
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Pane: Chat Area */}
          <div className="md:col-span-2 flex flex-col overflow-hidden">
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
                placeholder="Type your message or command..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !isAgentReplying) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
                className="min-h-[40px] resize-none flex-grow"
                disabled={isAgentReplying}
              />
              <Button onClick={handleSendMessage} disabled={!newMessage.trim() || isAgentReplying}>
                {isAgentReplying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
              </Button>
            </div>
          </div>
        </div>
        
        <DialogFooter className="mt-2 pt-3 border-t flex-shrink-0">
          <div className="text-xs text-muted-foreground w-full">
            Agent Status: <span className="font-medium text-foreground">{currentSimulatedAction || "Awaiting your input..."}</span>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close Workspace</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
