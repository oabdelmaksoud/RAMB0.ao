// src/components/features/admin-settings/mcp-servers/EditMcpServerDialog.tsx
'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  updateMcpServer,
  McpServer,
  UpdateMcpServerDto,
  McpServerStatus,
} from '@/lib/api/mcpServers';
import { cn } from '@/lib/utils';

interface EditMcpServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: McpServer | null;
  onSuccess: (updatedServer: McpServer) => void;
}

const EditMcpServerDialog: React.FC<EditMcpServerDialogProps> = ({
  open,
  onOpenChange,
  server,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [status, setStatus] = useState<McpServerStatus>(McpServerStatus.INACTIVE);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isSystemServer = server?.isSystemServer || false;

  useEffect(() => {
    if (open && server) {
      setName(server.name);
      setDescription(server.description || '');
      setBaseUrl(server.baseUrl);
      setStatus(server.status);
      setErrors({});
    }
    if (!open) {
      // Reset form when dialog is closed
      setName('');
      setDescription('');
      setBaseUrl('');
      setStatus(McpServerStatus.INACTIVE);
      setErrors({});
      setIsLoading(false);
    }
  }, [open, server]);

  const validate = (): boolean => {
    if (isSystemServer) return true; // No validation for system servers as fields are disabled

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
    if (!server) return;
    if (!isSystemServer && !validate()) { // Only validate if not a system server
      return;
    }

    setIsLoading(true);
    const updateData: UpdateMcpServerDto = {};

    if (!isSystemServer) {
      if (name !== server.name) updateData.name = name;
      if (description !== (server.description || '')) updateData.description = description.trim() || undefined;
      if (baseUrl !== server.baseUrl) updateData.baseUrl = baseUrl;
    }
    // Status can be updated for system servers as per previous component's logic, but here it implies direct edit.
    // Subtask says "Status: Switch component ... Disabled if server?.isSystemServer === true"
    // So, if it's a system server, status should not be part of updateData from this dialog.
    // However, if the intention was to allow status change for system servers from this dialog too,
    // the disabling logic for the switch would be different. Sticking to the "disabled" instruction.
    if (status !== server.status && !isSystemServer) {
         updateData.status = status;
    }


    // Do not allow isSystemServer to be changed from this dialog.
    // The service layer already protects this, but good to be explicit.
    // delete updateData.isSystemServer; // Not needed as it's not part of form state

    if (Object.keys(updateData).length === 0 && !isSystemServer) {
      toast({
        title: 'No Changes',
        description: 'No changes were made to the server details.',
      });
      setIsLoading(false);
      onOpenChange(false);
      return;
    }
    
    // For system servers, if we reach here, it means only status could have been changed (if switch wasn't disabled)
    // But since the switch IS disabled for system servers, this path should effectively mean no data to update for them.
    // If the subtask implies some fields *are* editable for system servers, this logic needs adjustment.
    // Based on "all form fields and the status switch should be disabled", we only proceed if !isSystemServer
     if (isSystemServer && Object.keys(updateData).length === 0) {
        toast({
            title: 'System Server',
            description: 'No editable fields were changed for this system server.',
        });
        setIsLoading(false);
        onOpenChange(false);
        return;
    }


    try {
      const updatedServer = await updateMcpServer(server.id, updateData);
      toast({
        title: 'MCP Server Updated',
        description: `Successfully updated "${updatedServer.name}".`,
      });
      onSuccess(updatedServer);
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error Updating Server',
        description: error.message || 'Could not update MCP server.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!server) return null; // Don't render if server is null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit MCP Server: {server.name}</DialogTitle>
          <DialogDescription>
            Update the details for this MCP server.
            {isSystemServer && (
              <p className="text-sm text-yellow-600 mt-2">
                System servers have restricted editing capabilities. Only specific fields might be editable.
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <div className="col-span-3">
                <Input
                  id="edit-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={cn(errors.name && !isSystemServer && 'border-red-500')}
                  disabled={isLoading || isSystemServer}
                />
                {!isSystemServer && errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-description" className="text-right">
                Description
              </Label>
              <div className="col-span-3">
                <Textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading || isSystemServer}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-baseUrl" className="text-right">
                Base URL
              </Label>
              <div className="col-span-3">
                <Input
                  id="edit-baseUrl"
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className={cn(errors.baseUrl && !isSystemServer && 'border-red-500')}
                  placeholder="http://example.com/api"
                  disabled={isLoading || isSystemServer}
                />
                {!isSystemServer && errors.baseUrl && <p className="text-xs text-red-500 mt-1">{errors.baseUrl}</p>}
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-status" className="text-right">
                Active
              </Label>
              <div className="col-span-3">
                <Switch
                  id="edit-status"
                  checked={status === McpServerStatus.ACTIVE}
                  onCheckedChange={(checked) =>
                    setStatus(checked ? McpServerStatus.ACTIVE : McpServerStatus.INACTIVE)
                  }
                  disabled={isLoading || isSystemServer}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || isSystemServer}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditMcpServerDialog;
