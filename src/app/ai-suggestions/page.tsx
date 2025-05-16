import AgentConfigForm from '@/components/features/ai-suggestions/AgentConfigForm';
import { PageHeader, PageHeaderHeading, PageHeaderDescription } from '@/components/layout/PageHeader';
import { Lightbulb } from 'lucide-react';

export default function AISuggestionsPage() {
  return (
    <div className="container mx-auto">
      <PageHeader>
        <PageHeaderHeading>
          <Lightbulb className="mr-2 inline-block h-6 w-6" />
          AI-Powered Agent Configuration
        </PageHeaderHeading>
        <PageHeaderDescription>
          Describe your task and provide historical data to get optimal agent configuration suggestions powered by AI.
        </PageHeaderDescription>
      </PageHeader>
      
      <div className="max-w-2xl mx-auto">
        <AgentConfigForm />
      </div>
    </div>
  );
}
