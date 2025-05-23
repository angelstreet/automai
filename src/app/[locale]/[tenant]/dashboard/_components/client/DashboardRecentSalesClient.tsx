'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/shadcn/avatar';

export function DashboardRecentSalesClient() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/avatars/01.svg" alt="Avatar" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
        <div className="flex flex-1 flex-wrap items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium leading-none">John Doe</p>
            <p className="text-sm text-muted-foreground">john.doe@example.com</p>
          </div>
          <div className="font-medium">98% Success</div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/avatars/02.svg" alt="Avatar" />
          <AvatarFallback>JS</AvatarFallback>
        </Avatar>
        <div className="flex flex-1 flex-wrap items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium leading-none">Jane Smith</p>
            <p className="text-sm text-muted-foreground">jane.smith@example.com</p>
          </div>
          <div className="font-medium">95% Success</div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/avatars/03.svg" alt="Avatar" />
          <AvatarFallback>RJ</AvatarFallback>
        </Avatar>
        <div className="flex flex-1 flex-wrap items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium leading-none">Robert Johnson</p>
            <p className="text-sm text-muted-foreground">robert.j@example.com</p>
          </div>
          <div className="font-medium">92% Success</div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Avatar className="h-9 w-9">
          <AvatarImage src="/avatars/04.svg" alt="Avatar" />
          <AvatarFallback>MD</AvatarFallback>
        </Avatar>
        <div className="flex flex-1 flex-wrap items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium leading-none">Maria Davis</p>
            <p className="text-sm text-muted-foreground">maria.d@example.com</p>
          </div>
          <div className="font-medium">89% Success</div>
        </div>
      </div>
    </div>
  );
}
