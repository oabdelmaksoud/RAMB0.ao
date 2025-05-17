
'use client';

import { useState, useEffect, useRef } from 'react';
import type { Task } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Bot, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { taskChatFlow, type TaskChatInput, type TaskChatOutput } from '@/ai/flows/task-chat-flow';
import { useToast } from '@/hooks/use-toast';

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
}

export default function TaskChatDialog({ open, onOpenChange, task }: TaskChatDialogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isAgentReplying, setIsAgentReplying] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && task) {
      const initialMessages: ChatMessage[] = [
        {
          id: `agent-welcome-${Date.now()}`,
          sender: 'agent',
          text: `Hello! I'm the AI assistant for task: "${task.title}".`,
          timestamp: new Date(),
        },
        {
          id: `agent-plan-review-${Date.now() + 1}`, // Ensure unique ID
          sender: 'agent',
          text: `I'm reviewing the plan, which includes:\n\n${task.description || "No detailed plan available."}\n\nI'm ready to start. What are your instructions or questions?`,
          timestamp: new Date(Date.now() + 1), // Ensure unique timestamp
        }
      ];
      setMessages(initialMessages);
      setNewMessage('');
      setIsAgentReplying(false);
    } else if (!open) {
      setMessages([]);
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
      };
      setMessages((prevMessages) => [...prevMessages, agentReply]);

    } catch (error) {
      console.error("Error calling taskChatFlow:", error);
      const errorReply: ChatMessage = {
        id: `agent-error-${Date.now()}`,
        sender: 'agent',
        text: "I'm sorry, I encountered an issue trying to respond. Please try again later.",
        timestamp: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, errorReply]);
      toast({
        title: "Chat Error",
        description: "Could not get a response from the AI assistant.",
        variant: "destructive",
      });
    } finally {
      setIsAgentReplying(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] md:max-w-[600px] flex flex-col h-[70vh] max-h-[600px]">
        <DialogHeader>
          <DialogTitle>Chat for: {task.title}</DialogTitle>
          <DialogDescription>
            Interact with the AI assistant for this task. Status: {task.status}. Assigned to: {task.assignedTo}.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-grow border rounded-md p-0 overflow-y-auto" ref={scrollAreaRef}>
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
                  <Avatar className="h-8 w-8 border border-primary/50">
                    <AvatarFallback><Bot className="h-4 w-4 text-primary" /></AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-[75%] rounded-lg px-3 py-2 text-sm shadow-sm break-words", // Added break-words
                    msg.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <p className={cn(
                      "text-xs opacity-70 mt-1",
                      msg.sender === 'user' ? 'text-right text-primary-foreground/80' : 'text-left text-muted-foreground/80'
                    )}
                  >
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {msg.sender === 'user' && (
                  <Avatar className="h-8 w-8 border">
                    <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
             {isAgentReplying && (
              <div className="flex items-start gap-3 justify-start">
                <Avatar className="h-8 w-8 border border-primary/50">
                  <AvatarFallback><Bot className="h-4 w-4 text-primary" /></AvatarFallback>
                </Avatar>
                <div className="max-w-[70%] rounded-lg px-3 py-2 text-sm shadow-sm bg-muted text-muted-foreground">
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="mt-auto pt-4 flex items-center gap-2 border-t">
          <Textarea
            placeholder="Type your message..."
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
            {isAgentReplying ? <Loader2 className="h-4 w-4 animate