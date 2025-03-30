'use client';

import { useTranslations } from 'next-intl';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Skeleton } from '@/components/shadcn/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shadcn/table';

export default function MembersTabSkeleton() {
  const t = useTranslations('team');

  return (
    <Card>
      <CardHeader className="py-2">
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Skeleton className="h-5 w-5" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-20" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-24" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-32" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-4 w-16" />
              </TableHead>
              <TableHead className="text-right">
                <Skeleton className="h-4 w-24 ml-auto" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="py-2">
                    <Skeleton className="h-10 w-10 rounded-full" />
                  </TableCell>
                  <TableCell className="py-2">
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell className="py-2">
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell className="py-2">
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell className="py-2">
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="py-2 text-right">
                    <Skeleton className="h-8 w-16 ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
