'use client';

import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, ShieldCheck, ToyBrick, Settings2, ListChecks, AlertTriangle } from 'lucide-react'; // Added AlertTriangle

export default function AdminSettingsPage() {
  return (
    <div className="container mx-auto">
      <PageHeader>
        <PageHeaderHeading>
          <Settings2 className="mr-2 inline-block h-7 w-7" />
          Admin Settings
        </PageHeaderHeading>
        <PageHeaderDescription>
          Manage global settings, users, roles, and system configurations for the RamBo Agent platform. (Conceptual)
        </PageHeaderDescription>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" /> User Management
            </CardTitle>
            <CardDescription>Manage user accounts, invite new users, and oversee user activity.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              (Placeholder for user listing, creation, and editing tools.)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShieldCheck className="mr-2 h-5 w-5" /> Role & Permission Management
            </CardTitle>
            <CardDescription>Define roles and assign permissions across the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              (Placeholder for role definition and permission assignment UI.)
            </p>
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
            <p className="text-sm text-muted-foreground">
              (Placeholder for managing global agent templates. Currently, global agents are managed on the 'Agents' page.)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings2 className="mr-2 h-5 w-5" /> System Configuration
            </CardTitle>
            <CardDescription>Configure platform-wide settings and integrations.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              (Placeholder for system parameters, API key management, etc.)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
               <ListChecks className="mr-2 h-5 w-5" /> Audit Logs
            </CardTitle>
            <CardDescription>View system-wide audit trails and activity logs.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              (Placeholder for displaying system audit logs.)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5" /> Platform Health
            </CardTitle>
            <CardDescription>Monitor the health and performance of the platform services.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              (Placeholder for system health dashboard.)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Add AlertTriangle to lucide-react imports where needed if not already present
// e.g. in project detail page: import { AlertTriangle, Brain, ... } from 'lucide-react';
// No, AlertTriangle is already used.