import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Github, GitlabIcon, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/shadcn/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/shadcn/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/shadcn/form';
import { Input } from '@/components/shadcn/input';
import { RadioGroup, RadioGroupItem } from '@/components/shadcn/radio-group';

// Define the Git provider types
export const GitProviderTypes = ['GITHUB', 'GITLAB'] as const;
export type GitProviderType = (typeof GitProviderTypes)[number];

// Create a schema for the form
const formSchema = z.object({
  type: z.enum(GitProviderTypes, {
    required_error: 'Please select a Git provider type.',
  }),
  displayName: z
    .string()
    .min(2, {
      message: 'Display name must be at least 2 characters.',
    })
    .max(50, {
      message: 'Display name must not exceed 50 characters.',
    }),
});

interface AddGitProviderDialogProps {
  onSubmit: (values: { type: GitProviderType; displayName: string }) => Promise<void>;
  isSubmitting: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddGitProviderDialog({
  onSubmit,
  isSubmitting,
  open,
  onOpenChange,
}: AddGitProviderDialogProps) {
  const [selectedType, setSelectedType] = useState<GitProviderType | null>(null);

  // Initialize the form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: undefined,
      displayName: '',
    },
  });

  // Handle form submission
  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    await onSubmit(values);
    form.reset();
    setSelectedType(null);
  };

  // Reset the form when the dialog is closed
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
      setSelectedType(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Git Provider
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Git Provider</DialogTitle>
          <DialogDescription>
            Connect to your Git provider to import repositories.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Git Provider</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedType(_value as GitProviderType);
                      }}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="GITHUB" />
                        </FormControl>
                        <FormLabel className="flex items-center space-x-2 font-normal">
                          <Github className="h-5 w-5" />
                          <span>GitHub</span>
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="GITLAB" />
                        </FormControl>
                        <FormLabel className="flex items-center space-x-2 font-normal">
                          <GitlabIcon className="h-5 w-5" />
                          <span>GitLab</span>
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>Select the Git provider you want to connect to.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedType && (
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={`My ${selectedType === 'GITHUB' ? 'GitHub' : 'GitLab'} Account`}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This is how the provider will be displayed in the UI.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add Provider'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
