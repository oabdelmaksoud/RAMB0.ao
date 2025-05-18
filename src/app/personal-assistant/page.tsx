
'use client';

import { useState, useEffect } from 'react';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, Calendar, Briefcase, Sparkles, ExternalLink, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MockItem {
  id: string;
  type: 'email' | 'meeting';
  title: string;
  snippet: string;
  date: string;
  projectLink?: string; // e.g., "Project Alpha"
  tags?: string[];
}

interface SuggestedAction {
  id: string;
  description: string;
  relatedItem: string; // title of email/meeting
  priority: 'High' | 'Medium' | 'Low';
}

const initialMockItems: MockItem[] = [
  {
    id: 'email-1',
    type: 'email',
    title: 'Follow up on Q3 Marketing Budget',
    snippet: 'Hi team, can we get an update on the Q3 budget approval? The deadline is approaching...',
    date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    projectLink: 'AI Powered Marketing Suite',
    tags: ['budget', 'urgent'],
  },
  {
    id: 'meeting-1',
    type: 'meeting',
    title: 'Project Phoenix - Sprint Planning',
    snippet: 'Discussion points: backlog grooming, task assignments for next sprint, identify blockers...',
    date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    projectLink: 'E-commerce Platform Revamp',
    tags: ['planning', 'sprint'],
  },
  {
    id: 'email-2',
    type: 'email',
    title: 'Client Feedback - New UI Mockups',
    snippet: 'Overall positive, but a few concerns about the color scheme on the dashboard page...',
    date: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    tags: ['feedback', 'ui'],
  },
];

const initialSuggestedActions: SuggestedAction[] = [
  { id: 'action-1', description: 'Draft Q3 budget report for "AI Powered Marketing Suite"', relatedItem: 'Follow up on Q3 Marketing Budget', priority: 'High'},
  { id: 'action-2', description: 'Schedule follow-up meeting to discuss UI color scheme feedback', relatedItem: 'Client Feedback - New UI Mockups', priority: 'Medium'},
];


export default function PersonalAssistantPage() {
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const [items, setItems] = useState<MockItem[]>(initialMockItems);
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>(initialSuggestedActions);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const formatDate = (dateString: string) => {
    if (!isClient) return 'Loading date...';
    try {
      return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'});
    } catch (e) {
      return dateString;
    }
  };

  const handleConnectService = (serviceName: string) => {
    toast({
      title: `Connect ${serviceName} (Placeholder)`,
      description: `Integration with ${serviceName} is planned for future implementation.`,
    });
  };

  const handleAnalyzeItem = (item: MockItem) => {
    setIsLoadingAnalysis(true);
    toast({
      title: `Analyzing "${item.title}"...`,
      description: `AI is processing this item. (Simulation)`,
    });
    // Simulate AI processing
    setTimeout(() => {
      // Add a new mock suggested action
      const newAction: SuggestedAction = {
        id: `action-${Date.now()}`,
        description: `Follow up on "${item.title.substring(0, 20)}..." details.`,
        relatedItem: item.title,
        priority: 'Medium',
      };
      setSuggestedActions(prev => [newAction, ...prev.slice(0,2)]); // Keep only 3 actions
      setIsLoadingAnalysis(false);
      toast({
        title: "Analysis Complete!",
        description: `Suggestions generated for "${item.title}".`,
      });
    }, 2000);
  };

  const handleCreateTaskFromAction = (action: SuggestedAction) => {
     toast({
      title: `Create Task (Placeholder)`,
      description: `Creating task: "${action.description}" - this would open the AI Task Planner.`,
    });
    // In a real implementation, this would likely pre-fill and open the AITaskPlannerDialog
    // or directly create a task if the AI has enough context.
  }

  return (
    <div className="container mx-auto">
      <PageHeader>
        <PageHeaderHeading>
          <Mail className="mr-2 inline-block h-7 w-7" />
          Personal AI Assistant
        </PageHeaderHeading>
        <PageHeaderDescription>
          Connect your accounts to summarize emails, extract meeting minutes, and get AI-powered task suggestions.
        </PageHeaderDescription>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Connections & Recent Items */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Connect Accounts</CardTitle>
              <CardDescription>Link your email and calendar to enable AI assistance.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => handleConnectService('Gmail')} disabled>
                <Mail className="mr-2 h-4 w-4" /> Connect Gmail
              </Button>
              <Button variant="outline" onClick={() => handleConnectService('Outlook')} disabled>
                <Mail className="mr-2 h-4 w-4" /> Connect Outlook
              </Button>
              <Button variant="outline" onClick={() => handleConnectService('Google Calendar')} disabled>
                <Calendar className="mr-2 h-4 w-4" /> Connect Google Calendar
              </Button>
            </CardContent>
            <CardFooter>
              <p className="text-xs text-muted-foreground">Account connection is a placeholder for future development.</p>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Items (Emails & Meetings - Mock Data)</CardTitle>
              <CardDescription>Latest communications and events from your (simulated) connected accounts.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-3">
                {items.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No items to display. Connect an account to get started.</p>
                )}
                <div className="space-y-4">
                  {items.map((item) => (
                    <Card key={item.id} className="bg-muted/30">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-base">{item.title}</CardTitle>
                          <Badge variant={item.type === 'email' ? 'secondary' : 'outline'} className="capitalize text-xs">{item.type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <p className="text-sm text-muted-foreground line-clamp-2">{item.snippet}</p>
                        {item.projectLink && (
                          <Badge variant="outline" className="mt-2 text-xs border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-700">
                            <Briefcase className="mr-1 h-3 w-3" /> Project: {item.projectLink}
                          </Badge>
                        )}
                        {item.tags && item.tags.length > 0 && (
                           <div className="mt-2 flex flex-wrap gap-1">
                             {item.tags.map(tag => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
                           </div>
                        )}
                      </CardContent>
                      <CardFooter className="p-3 border-t">
                        <Button size="sm" variant="ghost" onClick={() => handleAnalyzeItem(item)} disabled={isLoadingAnalysis}>
                           <Sparkles className="mr-2 h-4 w-4" /> Analyze & Suggest Actions
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: AI Suggested Actions */}
        <div className="md:col-span-1">
          <Card className="sticky top-20"> {/* Make it sticky if the left column is long */}
            <CardHeader>
              <CardTitle className="flex items-center">
                <Sparkles className="mr-2 h-5 w-5 text-primary" /> AI Suggested Actions
              </CardTitle>
              <CardDescription>Actions identified by AI based on your recent items.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAnalysis && (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mr-2"/> Analyzing...
                </div>
              )}
              {!isLoadingAnalysis && suggestedActions.length === 0 && (
                <p className="text-muted-foreground text-center py-4">No actions suggested yet. Analyze an item to see suggestions.</p>
              )}
              {!isLoadingAnalysis && suggestedActions.length > 0 && (
                <ul className="space-y-3">
                  {suggestedActions.map((action) => (
                    <li key={action.id} className="p-3 border rounded-md bg-background hover:bg-muted/20">
                      <p className="text-sm font-medium">{action.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Related to: <span className="italic">"{action.relatedItem}"</span>
                      </p>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Priority: <Badge variant={action.priority === 'High' ? 'destructive' : 'secondary'} className="text-xs">{action.priority}</Badge>
                      </div>
                      <Button size="xs" variant="outline" className="mt-2 text-xs" onClick={() => handleCreateTaskFromAction(action)}>
                        <ExternalLink className="mr-1 h-3 w-3" /> Create Task (Planner)
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
