import { Avatar, AvatarFallback, AvatarImage } from '@/components/shadcn/avatar';
import { Button } from '@/components/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card';

import { DashboardOverviewClient } from './client/DashboardOverviewClient';
import { DashboardRecentSales } from './DashboardRecentSales';

export function DashboardMainContent() {
  // Static demo data
  const tasks = [
    { id: '1', title: 'Review test results', dueDate: 'Today' },
    { id: '2', title: 'Update test cases', dueDate: 'Tomorrow' },
    { id: '3', title: 'Create new project', dueDate: 'Next week' },
  ];

  const teamChat = [
    {
      id: '1',
      name: 'John Doe',
      avatar: 'https://avatar.vercel.sh/jdoe',
      message: 'Just completed the new test suite.',
      time: '2 hours ago',
    },
    {
      id: '2',
      name: 'Jane Smith',
      avatar: 'https://avatar.vercel.sh/jsmith',
      message: 'Found a bug in the login flow.',
      time: '3 hours ago',
    },
  ];

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
      {/* Left Column - Chart and Tasks */}
      <div className="col-span-1 md:col-span-2 lg:col-span-4 space-y-4">
        <Card className="h-[450px]">
          <CardHeader>
            <CardTitle>Success Rate Over Time</CardTitle>
            <CardDescription>Monthly success rate for all test executions</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <DashboardOverviewClient />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tasks</CardTitle>
            <CardDescription>Your upcoming tasks and assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{task.dueDate}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Recent Activity and Chats */}
      <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-4">
        <Card className="h-[450px]">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest test executions by team members</CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardRecentSales />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Chat</CardTitle>
            <CardDescription>Recent conversations with team members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamChat.map((chat) => (
                <div key={chat.id} className="flex items-start gap-4">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={chat.avatar} />
                    <AvatarFallback>
                      {chat.name
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{chat.name}</p>
                    <p className="text-sm text-muted-foreground">{chat.message}</p>
                    <p className="text-xs text-muted-foreground">{chat.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
