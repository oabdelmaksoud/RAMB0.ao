
'use client';

import { useState, useEffect, useRef } from 'react';
import type { Task } from '@/types';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const agentResponses = [
  "I'm on it! Will update you shortly.",
  "Noted. I'll incorporate this into the current plan.",
  "Understood. Processing this request.",
  "Thanks for the input. I'm adjusting the parameters now.",
  "Acknowledged. I'll get back to you with the results.",
  "Working on that right now. Expect an update soon.",
  "That's a good point. Let me analyze that further.",
];

export default function TaskChatDialog({ open, onOpenChange, task }: TaskChatDialogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize with a welcome message from the agent if the dialog is opened for a task
    if (open && task) {
      setMessages([
        {
          id: `agent-welcome-${Date.now()}`,
          sender: 'agent',
          text: `Hello! I'm the agent assigned to "${task.title}". How can I assist you today?`,
          timestamp: new Date(),
        },
      ]);
      setNewMessage(''); // Clear input field when dialog opens
    } else if (!open) {
      setMessages([]); // Clear messages when dialog closes
    }
  }, [open, task]);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !task) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: newMessage.trim(),
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setNewMessage('');

    // Simulate agent reply
    setTimeout(() => {
      const randomResponse = agentResponses[Math.floor(Math.random() * agentResponses.length)];
      const agentReply: ChatMessage = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: randomResponse,
        timestamp: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, agentReply]);
    }, 1000 + Math.random() * 1000); // Random delay for reply
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] md:max-w-[600px] flex flex-col h-[70vh] max-h-[600px]">
        <DialogHeader>
          <DialogTitle>Chat for: {task.title}</DialogTitle>
          <DialogDescription>
            Interact with the agent team working on this task. Assigned to: {task.assignedTo}.
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
                    "max-w-[70%] rounded-lg px-3 py-2 text-sm shadow-sm",
                    msg.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  <p className="break-words">{msg.text}</p>
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
          </div>
        </ScrollArea>

        <div className="mt-auto pt-4 flex items-center gap-2 border-t">
          <Textarea
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            rows={1}
            className="min-h-[40px] resize-none flex-grow"
          />
          <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
            Send
          </Button>
        </div>
        
        {/* Footer is removed to maximize chat area within fixed dialog height */}
        {/* <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter> */}
      </DialogContent>
    </Dialog>
  );
}
