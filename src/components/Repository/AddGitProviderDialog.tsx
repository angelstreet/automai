import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GitProviderType } from '@prisma/client';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GitHubIcon, GitLabIcon, GiteaIcon } from '@/components/Icons';

const formSchema = z.object({
  type: z.nativeEnum(GitProviderType),
  displayName: z.string().min(1, 'Display name is required'),
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
      type: GitProviderType.GITHUB,
      displayName: '',
    },
  });

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
                      <SelectItem value={GitProviderType.GITHUB}>
                        <div className="flex items-center gap-2">
                          <GitHubIcon className="h-4 w-4" />
                          <span>GitHub</span>
                        </div>
                      </SelectItem>
                      <SelectItem value={GitProviderType.GITLAB}>
                        <div className="flex items-center gap-2">
                          <GitLabIcon className="h-4 w-4" />
                          <span>GitLab</span>
                        </div>
                      </SelectItem>
                      <SelectItem value={GitProviderType.GITEA}>
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