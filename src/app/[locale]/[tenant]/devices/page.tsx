'use client';

import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState } from 'react';

import { Button } from '@/components/Shadcn/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/Shadcn/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/Shadcn/dialog';
import { Input } from '@/components/Shadcn/input';
import { Label } from '@/components/Shadcn/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/Shadcn/select';
import { Textarea } from '@/components/Shadcn/textarea';

export default function DevicesPage() {
  return (
    <div className="container mx-auto p-4">
      <h1>Devices</h1>
      <p>This page is under construction.</p>
    </div>
  );
}
