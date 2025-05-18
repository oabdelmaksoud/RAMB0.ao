
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader, PageHeaderHeading } from '@/components/layout/PageHeader';

export default function PortfolioDashboardRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return (
    <div className="container mx-auto">
      <PageHeader>
        <PageHeaderHeading>Redirecting to Dashboard...</PageHeaderHeading>
      </PageHeader>
      <div className="text-center py-10">
        <p>If you are not redirected, please <a href="/" className="text-primary hover:underline">click here</a>.</p>
      </div>
    </div>
  );
}
