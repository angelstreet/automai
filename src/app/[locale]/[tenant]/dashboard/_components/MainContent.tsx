'use client';

import { Overview } from '@/components/dashboard/Overview';
import { RecentSales } from '@/components/dashboard/RecentSales';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/shadcn/avatar';
import { Button } from '@/components/shadcn/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/shadcn/card';
import { useEffect, useState } from 'react';

export function MainContent() {
  type Task = {
    id: string;
    title: string;
    dueDate: string;
  };
  
  type ChatMessage = {
    id: string;
    name: string;
    avatar: string;
    message: string;
    time: string;
  };
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamChat, setTeamChat] = useState<ChatMessage[]>([]);
  
  useEffect(() => {
    // Using static demo data instead of server calls
    const staticTasks = [
      {
        id: '1',
        title: 'Update test cases for login flow',
        dueDate: 'Due in 2 days',
      },
      {
        id: '2',
        title: 'Review automation scripts',
        dueDate: 'Due tomorrow',
      },
      {
        id: '3',
        title: 'Prepare test report',
        dueDate: 'Due next week',
      },
    ];
    
    const staticChat = [
      {
        id: '1',
        name: 'John Doe',
        avatar: '/avatars/01.svg',
        message: 'Updated the test suite configuration',
        time: '2 hours ago',
      },
      {
        id: '2',
        name: 'Jane Smith',
        avatar: '/avatars/02.svg',
        message: 'Added new test cases for payment flow',
        time: '5 hours ago',
      },
      {
        id: '3',
        name: 'Robert Johnson',
        avatar: '/avatars/03.svg',
        message: 'Fixed failing tests in CI pipeline',
        time: 'Yesterday',
      },
    ];
    
    setTasks(staticTasks);
    setTeamChat(staticChat);
  }, []);

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
            <Overview />
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
              {teamChat.map((chat) => (
                <div key={chat.id} className="flex items-start gap-4">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={chat.avatar} />
                    <AvatarFallback>{chat.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{chat.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {chat.message}
                    </p>
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
