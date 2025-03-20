import { Metadata } from 'next';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import { CICDProvider } from './_components';

export const metadata: Metadata = {
  title: 'CI/CD Integration',
  description: 'Configure CI/CD providers for automated deployments',
};

export default function CICDPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader 
        title="CI/CD Integration" 
        description="Configure CI/CD providers for automated deployments"
      />
      
      <Tabs defaultValue="providers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="providers" className="space-y-4">
          <CICDProvider />
        </TabsContent>
        
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Global CI/CD Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Global CI/CD settings will be available in future updates.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 