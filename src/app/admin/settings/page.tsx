'use client';

import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader as ShadCnTableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Users, ShieldCheck, ToyBrick, Settings2, ListChecks, AlertTriangle, CheckCircle, ExternalLink, PlusCircle, Edit3, Trash2, Server } from 'lucide-react'; // Added Server icon
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// MCP Server specific imports
import { McpServerListTable } from '@/components/features/admin-settings/mcp-servers/McpServerListTable';
import AddMcpServerDialog from '@/components/features/admin-settings/mcp-servers/AddMcpServerDialog';
import EditMcpServerDialog from '@/components/features/admin-settings/mcp-servers/EditMcpServerDialog';
import { McpServer, getMcpServers, deleteMcpServer as apiDeleteMcpServer } from '@/lib/api/mcpServers';


// Mock data types (keeping existing mock types for brevity, though they are not used in the new MCP section)
interface MockUser {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Project Manager' | 'Team Member';
  lastActive: string;
  status: 'Active' | 'Inactive';
}

interface MockRole {
  id: string;
  name: string;
  permissions: string[];
}

interface MockAuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

interface MockHealthStatus {
  service: string;
  status: 'Healthy' | 'Warning' | 'Critical';
  message?: string;
}

// Mock data (keeping existing mock data for brevity)
const mockUsersData: MockUser[] = [
  { id: 'user-001', name: 'Alice Admin', email: 'alice@example.com', role: 'Admin', lastActive: '2024-07-22T10:00:00Z', status: 'Active' },
  { id: 'user-002', name: 'Bob Manager', email: 'bob@example.com', role: 'Project Manager', lastActive: '2024-07-21T14:30:00Z', status: 'Active' },
  { id: 'user-003', name: 'Charlie Team', email: 'charlie@example.com', role: 'Team Member', lastActive: '2024-07-20T09:15:00Z', status: 'Inactive' },
];

const mockRolesData: MockRole[] = [
  { id: 'role-admin', name: 'Admin', permissions: ['Manage Users', 'Manage Roles', 'System Configuration', 'View Audit Logs'] },
  { id: 'role-pm', name: 'Project Manager', permissions: ['Create Projects', 'Manage Project Tasks', 'Assign Project Agents'] },
  { id: 'role-member', name: 'Team Member', permissions: ['View Assigned Tasks', 'Update Task Status'] },
];

const mockAuditLogsData: MockAuditLog[] = [
  { id: 'log-001', timestamp: '2024-07-22T11:05:00Z', user: 'Alice Admin', action: 'User Created', details: 'User "David Dev" created.' },
  { id: 'log-002', timestamp: '2024-07-22T10:30:00Z', user: 'System', action: 'Maintenance Mode', details: 'System entered maintenance mode.' },
];

const mockHealthStatusesData: MockHealthStatus[] = [
  { service: 'API Gateway', status: 'Healthy' },
  { service: 'Database Service', status: 'Healthy' },
];

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [systemName, setSystemName] = useState('RamBo Agent Platform');
  const [notificationEmail, setNotificationEmail] = useState('noreply@rambo.agent');
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // MCP Server State Variables
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [isLoadingServers, setIsLoadingServers] = useState<boolean>(true);
  const [errorLoadingServers, setErrorLoadingServers] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [selectedServerForEdit, setSelectedServerForEdit] = useState<McpServer | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [serverToDelete, setServerToDelete] = useState<McpServer | null>(null);

  const fetchMcpServers = useCallback(async () => {
    setIsLoadingServers(true);
    setErrorLoadingServers(null);
    try {
      const servers = await getMcpServers(); // No filter initially, can add later if needed
      setMcpServers(servers);
    } catch (error: any) {
      setErrorLoadingServers(error.message || 'Failed to load MCP servers.');
      toast({
        title: 'Error Loading Servers',
        description: error.message || 'Could not retrieve MCP server list.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingServers(false);
    }
  }, [toast]);

  useEffect(() => {
    setIsClient(true);
    fetchMcpServers();
  }, [fetchMcpServers]);


  const handleMockAction = (actionName: string) => {
    toast({
      title: `${actionName} (Placeholder)`,
      description: `This functionality for "${actionName}" is a placeholder and not yet implemented.`,
    });
  };

  const handleSaveSystemConfig = () => {
    toast({
      title: "System Configuration Saved (Mock)",
      description: "Your system configuration changes have been notionally saved.",
    });
  };

  const formatDate = (dateString: string) => {
    if (!isClient) return 'Loading date...';
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return dateString;
    }
  };

  // MCP Server Action Handlers
  const handleEditServer = (server: McpServer) => {
    setSelectedServerForEdit(server);
    setIsEditDialogOpen(true);
  };

  const handleDeleteServer = (server: McpServer) => {
    setServerToDelete(server);
    setShowDeleteConfirm(true);
  };

  const handleServersUpdate = (updatedServers: McpServer[]) => {
    setMcpServers(updatedServers);
  };

  const handleAddSuccess = (newServer: McpServer) => {
    // fetchMcpServers(); // Re-fetch for simplicity
    setMcpServers(prev => [newServer, ...prev]); // Optimistic update
    setIsAddDialogOpen(false);
    toast({ title: 'Success', description: 'MCP Server added.' });
  };

  const handleEditSuccess = (updatedServer: McpServer) => {
    // fetchMcpServers(); // Re-fetch for simplicity
    setMcpServers(prev => prev.map(s => s.id === updatedServer.id ? updatedServer : s)); // Optimistic update
    setIsEditDialogOpen(false);
    toast({ title: 'Success', description: 'MCP Server updated.' });
  };

  const handleDeleteServerConfirm = async () => {
    if (!serverToDelete) return;
    try {
      await apiDeleteMcpServer(serverToDelete.id);
      // fetchMcpServers(); // Re-fetch for simplicity
      setMcpServers(prev => prev.filter(s => s.id !== serverToDelete.id)); // Optimistic update
      toast({
        title: 'Server Deleted',
        description: `MCP Server "${serverToDelete.name}" has been deleted.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error Deleting Server',
        description: error.message || 'Could not delete MCP server.',
        variant: 'destructive',
      });
    } finally {
      setShowDeleteConfirm(false);
      setServerToDelete(null);
    }
  };


  return (
    <div className="container mx-auto">
      <PageHeader>
        <PageHeaderHeading>
          <Settings2 className="mr-2 inline-block h-7 w-7" />
          Admin Settings
        </PageHeaderHeading>
        <PageHeaderDescription>
          Manage global settings, users, roles, and system configurations for the RamBo Agent platform.
        </PageHeaderDescription>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Existing Cards ... */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" /> User Management
              </CardTitle>
              <Button size="sm" onClick={() => handleMockAction('Add New User')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add User
              </Button>
            </div>
            <CardDescription>Manage user accounts, invite new users, and oversee user activity.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <ShadCnTableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">Last Active</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </ShadCnTableHeader>
              <TableBody>
                {mockUsersData.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">{user.email}</TableCell>
                    <TableCell><Badge variant={user.role === 'Admin' ? 'default' : 'secondary'}>{user.role}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-xs">{formatDate(user.lastActive)}</TableCell>
                    <TableCell>
                      <Badge variant={user.status === 'Active' ? 'outline' : 'destructive'} className={cn(user.status === 'Active' ? 'border-green-500 text-green-600 dark:text-green-400 dark:border-green-700' : 'border-red-500 text-red-600 dark:text-red-400 dark:border-red-700')}>
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMockAction(`Edit User ${user.name}`)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMockAction(`Delete User ${user.name}`)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
             <div className="flex justify-between items-center">
              <CardTitle className="flex items-center">
                <ShieldCheck className="mr-2 h-5 w-5" /> Role & Permission Management
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => handleMockAction('Add New Role')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Role
              </Button>
            </div>
            <CardDescription>Define roles and assign permissions across the platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockRolesData.map(role => (
              <div key={role.id} className="p-3 border rounded-md bg-muted/20">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-semibold">{role.name}</h4>
                  <Button variant="link" size="sm" className="text-xs h-auto p-0" onClick={() => handleMockAction(`Edit Permissions for ${role.name}`)}>Edit</Button>
                </div>
                <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5 pl-2">
                  {role.permissions.map(perm => <li key={perm}>{perm}</li>)}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* MCP Server Management Card - Spanning full width */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center">
                <Server className="mr-2 h-5 w-5" /> MCP Server Management
              </CardTitle>
              <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add MCP Server
              </Button>
            </div>
            <CardDescription>Manage system and admin-added MCP servers.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingServers && <p>Loading MCP servers...</p>}
            {errorLoadingServers && (
              <div className="text-red-600 flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5" />
                <p>Error: {errorLoadingServers}</p>
              </div>
            )}
            {!isLoadingServers && !errorLoadingServers && (
              <McpServerListTable
                servers={mcpServers}
                onEdit={handleEditServer}
                onDelete={handleDeleteServer}
                onServersUpdate={handleServersUpdate}
              />
            )}
          </CardContent>
        </Card>


        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ToyBrick className="mr-2 h-5 w-5" /> Global Agent Templates
            </CardTitle>
            <CardDescription>Manage base agent configurations that can be used across projects.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/agent-management" passHref legacyBehavior>
              <Button asChild className="w-full">
                <a><ExternalLink className="mr-2 h-4 w-4" /> Go to Global Agent Management</a>
              </Button>
            </Link>
             <p className="text-xs text-muted-foreground mt-2 text-center">
              Global agent configurations are managed on a dedicated page.
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings2 className="mr-2 h-5 w-5" /> System Configuration
            </CardTitle>
            <CardDescription>Configure platform-wide settings and integrations (mock).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="systemName">Platform Name</Label>
              <Input id="systemName" value={systemName} onChange={(e) => setSystemName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="notificationEmail">Default Notification Email</Label>
              <Input id="notificationEmail" type="email" value={notificationEmail} onChange={(e) => setNotificationEmail(e.target.value)} />
            </div>
             <div className="flex items-center space-x-2 py-2">
                <Label htmlFor="maintenance-mode" className="cursor-pointer whitespace-nowrap">Maintenance Mode:</Label>
                <Button
                    variant={isMaintenanceMode ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => setIsMaintenanceMode(!isMaintenanceMode)}
                    id="maintenance-mode"
                    className="w-24"
                >
                    {isMaintenanceMode ? "Disable" : "Enable"}
                </Button>
                {isMaintenanceMode && <Badge variant="destructive">ACTIVE</Badge>}
            </div>
             <div className="space-y-1">
              <Label htmlFor="apiKey">External Logging API Key</Label>
              <Input id="apiKey" type="password" placeholder="••••••••••••••••••••••••••••••" disabled 
                className="bg-muted/50 placeholder:text-muted-foreground/50"
              />
            </div>
          </CardContent>
          <CardFooter className="border-t pt-6">
            <Button onClick={handleSaveSystemConfig}>Save System Configuration</Button>
          </CardFooter>
        </Card>
        
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center">
               <ListChecks className="mr-2 h-5 w-5" /> Audit Logs
            </CardTitle>
            <CardDescription>View system-wide audit trails and activity logs (mock data).</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px] w-full rounded-md border">
              <Table>
                <ShadCnTableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="min-w-[200px]">Details</TableHead>
                  </TableRow>
                </ShadCnTableHeader>
                <TableBody>
                  {mockAuditLogsData.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs font-mono">{formatDate(log.timestamp)}</TableCell>
                      <TableCell>{log.user}</TableCell>
                      <TableCell><Badge variant="secondary" className="whitespace-nowrap">{log.action}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.details}</TableCell>
                    </TableRow>
                  ))}
                   {mockAuditLogsData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-24">No audit logs available.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5" /> Platform Health
            </CardTitle>
            <CardDescription>Monitor the health and performance of the platform services (mock data).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {mockHealthStatusesData.map(service => (
              <div key={service.service} className="flex items-center justify-between p-3 border rounded-md bg-card hover:bg-muted/20">
                <div className="flex items-center">
                  {service.status === 'Healthy' && <CheckCircle className="h-5 w-5 mr-2 text-green-500" />}
                  {service.status === 'Warning' && <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />}
                  {service.status === 'Critical' && <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />}
                  <span className="font-medium">{service.service}</span>
                </div>
                <div className="flex items-center gap-2">
                  {service.message && <Badge variant="outline" className="text-xs hidden sm:inline-flex">{service.message}</Badge>}
                  <Badge 
                    className={cn(
                      service.status === 'Healthy' && 'bg-green-100 text-green-700 border-green-300 dark:bg-green-700/30 dark:text-green-300 dark:border-green-600',
                      service.status === 'Warning' && 'bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-700/30 dark:text-yellow-300 dark:border-yellow-600',
                      service.status === 'Critical' && 'bg-red-100 text-red-700 border-red-300 dark:bg-red-700/30 dark:text-red-300 dark:border-red-600'
                    )}
                  >
                    {service.status}
                  </Badge>
                </div>
              </div>
            ))}
             {mockHealthStatusesData.length === 0 && (
                <p className="text-muted-foreground text-center py-4">Health status data not available.</p>
              )}
          </CardContent>
        </Card>
      </div>

      {/* MCP Server Dialogs */}
      <AddMcpServerDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={handleAddSuccess}
      />
      {selectedServerForEdit && (
        <EditMcpServerDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          server={selectedServerForEdit}
          onSuccess={handleEditSuccess}
        />
      )}
      {serverToDelete && (
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the
                MCP server &quot;{serverToDelete.name}&quot; and remove its data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setServerToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteServerConfirm} className="bg-destructive hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
