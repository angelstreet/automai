'use client';

import { RecentSales } from '@/components/Dashboard/RecentSales';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/Shadcn/avatar';
import { Button } from '@/components/Shadcn/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/Shadcn/card';

export function MainContent() {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
      {/* Left Column - Chart and Tasks */}
      <div className="col-span-1 md:col-span-2 lg:col-span-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Success Rate Over Time</CardTitle>
            <CardDescription>Monthly success rate for all test executions</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="flex items-center justify-center h-[350px] bg-muted/20 rounded-md">
              <p className="text-muted-foreground">Chart visualization coming soon</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
            <CardDescription>Your upcoming tasks and assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Update test cases for login flow</p>
                  <p className="text-xs text-muted-foreground">Due in 2 days</p>
                </div>
                <Button variant="outline" size="sm">
                  View
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Review automation scripts</p>
                  <p className="text-xs text-muted-foreground">Due tomorrow</p>
                </div>
                <Button variant="outline" size="sm">
                  View
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Prepare test report</p>
                  <p className="text-xs text-muted-foreground">Due next week</p>
                </div>
                <Button variant="outline" size="sm">
                  View
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Recent Activity and Chats */}
      <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest test executions by team members</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentSales />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Chat</CardTitle>
            <CardDescription>Recent conversations with team members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatars/01.svg" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="text-sm font-medium">John Doe</p>
                  <p className="text-sm text-muted-foreground">
                    Updated the test suite configuration
                  </p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatars/02.svg" />
                  <AvatarFallback>JS</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Jane Smith</p>
                  <p className="text-sm text-muted-foreground">
                    Added new test cases for payment flow
                  </p>
                  <p className="text-xs text-muted-foreground">5 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatars/03.svg" />
                  <AvatarFallback>RJ</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Robert Johnson</p>
                  <p className="text-sm text-muted-foreground">
                    Fixed failing tests in CI pipeline
                  </p>
                  <p className="text-xs text-muted-foreground">Yesterday</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
