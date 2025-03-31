import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';

interface DashboardTabContentCardProps {
  title: string;
  description?: string;
}

export function DashboardTabContentCard({ title, description }: DashboardTabContentCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-center justify-center border rounded-md">
          <p className="text-muted-foreground">Content for {title} coming soon.</p>
        </div>
      </CardContent>
    </Card>
  );
}
