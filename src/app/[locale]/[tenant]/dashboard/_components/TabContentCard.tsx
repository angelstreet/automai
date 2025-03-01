'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';

interface TabContentCardProps {
  title: string;
}

export function TabContentCard({ title }: TabContentCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center h-40">
          <p className="text-sm text-muted-foreground">{title} content will go here</p>
        </div>
      </CardContent>
    </Card>
  );
}
