import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
// import { GitProviderType } from '@prisma/client';

// Define the enum locally to match the type in src/types/repositories.ts
export type GitProviderType = 'github' | 'gitlab' | 'gitea';

// Create a constant object for use in the form
export const GitProviderTypes = {
  GITHUB: 'github' as GitProviderType,
  GITLAB: 'gitlab' as GitProviderType,
  GITEA: 'gitea' as GitProviderType
};

import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/shadcn/dialog';
import { Button } from '@/components/shadcn/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/shadcn/form';
import { Input } from '@/components/shadcn/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import { GitHubIcon, GitLabIcon, GiteaIcon } from '@/components/Icons';

const formSchema = z.object({
  type: z.enum(['github', 'gitlab', 'gitea'] as const),
  displayName: z.string().min(1, 'Display name is required'),
  serverUrl: z.string().url('Invalid URL').optional(),
  token: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddGitProviderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: FormValues) => void;
  isLoading?: boolean;
}

export function AddGitProviderDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  isLoading = false 
}: AddGitProviderDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: GitProviderTypes.GITHUB,
      displayName: '',
      serverUrl: '',
      token: '',
    },
  });

  const providerType = form.watch('type');
  const isGitea = providerType === GitProviderTypes.GITEA;

  const handleSubmit = (values: FormValues) => {
    onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Git Provider</DialogTitle>
          <DialogDescription>
            Connect to a Git provider to access your repositories.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a provider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={GitProviderTypes.GITHUB}>
                        <div className="flex items-center gap-2">
                          <GitHubIcon className="h-4 w-4" />
                          <span>GitHub</span>
                        </div>
                      </SelectItem>
                      <SelectItem value={GitProviderTypes.GITLAB}>
                        <div className="flex items-center gap-2">
                          <GitLabIcon className="h-4 w-4" />
                          <span>GitLab</span>
                        </div>
                      </SelectItem>
                      <SelectItem value={GitProviderTypes.GITEA}>
                        <div className="flex items-center gap-2">
                          <GiteaIcon className="h-4 w-4" />
                          <span>Gitea</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="My GitHub Account" 
                      {...field} 
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {isGitea && (
              <>
                <FormField
                  control={form.control}
                  name="serverUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Server URL</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://gitea.example.com" 
                          {...field} 
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Token</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your Gitea access token" 
                          type="password"
                          {...field} 
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            
            <DialogFooter>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Connecting...' : 'Connect'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 