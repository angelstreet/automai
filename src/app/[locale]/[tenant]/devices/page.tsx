'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/Shadcn/card';
import { Button } from '@/components/Shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/Shadcn/dialog';
import { Input } from '@/components/Shadcn/input';
import { Textarea } from '@/components/Shadcn/textarea';
import { Label } from '@/components/Shadcn/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/Shadcn/select';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function DevicesPage() {
  return (
    <div className="container mx-auto p-4">
      <h1>Devices</h1>
      <p>This page is under construction.</p>
    </div>
  );
}
