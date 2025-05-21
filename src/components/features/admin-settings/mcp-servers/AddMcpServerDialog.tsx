// src/components/features/admin-settings/mcp-servers/AddMcpServerDialog.tsx
'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose, // For a dedicated close button if needed, or rely on onOpenChange
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { addMcpServer, CreateMcpServerDto, McpServer } from '@/lib/api/mcpServers';
import { cn } from '@/lib/utils'; // For conditional class names if needed for errors

interface AddMcpServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (newServer: McpServer) => void;
}

const AddMcpServerDialog: React.FC<AddMcpServerDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setName('');
    setDescription('');
    setBaseUrl('');
    setErrors({});
    setIsLoading(false);
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Name is required.';
    }
    if (!baseUrl.trim()) {
      newErrors.baseUrl = 'Base URL is required.';
    } else {
      try {
        new URL(baseUrl); // Basic URL validation
      } catch (_) {
        newErrors.baseUrl = 'Invalid URL format.';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    setIsLoading(true);
    const serverData: CreateMcpServerDto = {
      name,
      description: description.trim() || undefined, // Send undefined if empty
      baseUrl,
      // isSystemServer is not set here, defaults to false on backend
    };

    try {
      const newServer = await addMcpServer(serverData);
      toast({
        title: 'MCP Server Added',
        description: `Successfully added "${newServer.name}".`,
      });
      onSuccess(newServer);
      onOpenChange(false); // Close dialog on success
      // Form is reset by useEffect when `open` changes to false then true again
    } catch (error: any) {
      toast({
        title: 'Error Adding Server',
        description: error.message || 'Could not add MCP server.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New MCP Server</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new MCP server.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <div className="col-span-3">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cn(errors.name && 'border-red-500')}
                  disabled={isLoading}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <div className="col-span-3">
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="baseUrl" className="text-right">
                Base URL
              </Label>
              <div className="col-span-3">
                <Input
                  id="baseUrl"
                  type="url" // Provides some browser-level validation
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className={cn(errors.baseUrl && 'border-red-500')}
                  placeholder="http://example.com/api"
                  disabled={isLoading}
                />
                {errors.baseUrl && <p className="text-xs text-red-500 mt-1">{errors.baseUrl}</p>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Server'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddMcpServerDialog;
