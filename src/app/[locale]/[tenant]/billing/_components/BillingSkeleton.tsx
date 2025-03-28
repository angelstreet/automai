import { Card, CardContent, CardHeader } from '@/components/shadcn/card';

export default function BillingSkeleton() {
  return (
    <div className="p-4 space-y-6">
      {/* Current Plan Card Skeleton */}
      <Card className="border-0 shadow-none">
        <CardHeader>
          <div className="h-7 w-32 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-24 bg-muted animate-pulse rounded" />
            <div className="h-36 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>

      {/* Billing History Card Skeleton */}
      <Card className="border-0 shadow-none">
        <CardHeader>
          <div className="h-7 w-40 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-48 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    </div>
  );
}
