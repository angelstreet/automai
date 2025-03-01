'use client';
/* eslint-disable @typescript-eslint/no-unused-vars, unused-imports/no-unused-vars */

import { useParams, useRouter } from 'next/navigation';

import { useSession } from 'next-auth/react';
import { useState } from 'react';

import { Button } from '@/components/shadcn/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/shadcn/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/shadcn/dialog';

import { Input } from '@/components/shadcn/input';

import { Label } from '@/components/shadcn/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';

import { Textarea } from '@/components/shadcn/textarea';

export default function DevicesPage() {
  return (
    <div className="container mx-auto p-4">
      <h1>Devices</h1>
      <p>This page is under construction.</p>
    </div>
  );
}
