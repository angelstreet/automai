import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GitProviderType } from '@/types/repositories';
import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/shadcn/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/shadcn/form';
import { Input } from '@/components/shadcn/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { GitHubIcon, GitLabIcon, GiteaIcon } from '@/components/icons';
import { AlertCircle, CheckCircle2, Loader2, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/shadcn/alert';
import { testGitProviderConnection } from '@/lib/services/repositories';

// Create a constant object for use in the form
export const GitProviderTypes = {
  GITHUB: 'github' as GitProviderType,
  GITLAB: 'gitlab' as GitProviderType,
  GITEA: 'gitea' as GitProviderType
};

// Create a schema for the form
const formSchema = z.object({
  type: z.enum(['github', 'gitlab', 'gitea'] as const, {
    required_error: 'Please select a Git provider type.',
  }),
  displayName: z.string().min(2, {
    message: 'Display name must be at least 2 characters.',
  }).max(50, {
    message: 'Display name must not exceed 50 characters.',
  }),
  serverUrl: z.string().url('Invalid URL').optional(),
  token: z.string().optional(),
});

interface AddGitProviderDialogProps {
  onSubmit: (values: z.infer<typeof formSchema>) => Promise<void>;
  isSubmitting?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

export function AddGitProviderDialog({ onSubmit, isSubmitting = false, open, onOpenChange }: AddGitProviderDialogProps) {
  const [selectedType, setSelectedType] = useState<GitProviderType>('gitea');
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testError, setTestError] = useState<string | null>(null);
  
  // Initialize the form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'gitea',
      displayName: '',
      serverUrl: '',
      token: '',
    },
  });
  
  // Test the connection
  const testConnection = async () => {
    const values = form.getValues();
    if (!values.serverUrl && !values.token && selectedType === 'gitea') {
      setTestError('Please fill in all required fields');
      return;
    }

    setTestStatus('testing');
    setTestError(null);

    try {
      await testGitProviderConnection({
        type: values.type,
        serverUrl: values.serverUrl || '',
        token: values.token || '',
      });
      setTestStatus('success');
    } catch (error) {
      setTestStatus('error');
      setTestError(error instanceof Error ? error.message : 'Failed to test connection');
    }
  };
  
  // Handle form submission
  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (selectedType === 'gitea' && testStatus !== 'success') {
      setTestError('Please test the connection first');
      return;
    }
    await onSubmit(values);
    if (!isSubmitting) {
      form.reset({ type: 'gitea', displayName: '', serverUrl: '', token: '' });
      setSelectedType('gitea');
      setTestStatus('idle');
      setTestError(null);
    }
  };
  
  // Reset the form when the dialog is closed
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset({ type: 'gitea', displayName: '', serverUrl: '', token: '' });
      setSelectedType('gitea');
      setTestStatus('idle');
      setTestError(null);
    }
    onOpenChange(open);
  };

  const isGitea = selectedType === GitProviderTypes.GITEA;
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Git Provider
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Git Provider</DialogTitle>
          <DialogDescription>
            Connect to your Git provider to import repositories.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider Type</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedType(value as GitProviderType);
                        setTestStatus('idle');
                        setTestError(null);
                      }}
                      defaultValue={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a provider" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={GitProviderTypes.GITEA}>
                          <div className="flex items-center gap-2">
                            <GiteaIcon className="h-4 w-4" />
                            <span>Gitea</span>
                          </div>
                        </SelectItem>
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
                        placeholder={`My ${
                          selectedType === 'github' 
                            ? 'GitHub' 
                            : selectedType === 'gitlab' 
                              ? 'GitLab' 
                              : 'Gitea'
                        } Account`} 
                        {...field} 
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {isGitea && (
              <div className="grid grid-cols-2 gap-6">
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
                          disabled={isSubmitting}
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
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {testError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{testError}</AlertDescription>
              </Alert>
            )}

            {testStatus === 'success' && (
              <Alert variant="success" className="bg-green-50 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>Connection test successful!</AlertDescription>
              </Alert>
            )}
            
            <DialogFooter className="gap-2 sm:gap-0">
              {isGitea && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={testConnection}
                  disabled={testStatus === 'testing' || isSubmitting}
                >
                  {testStatus === 'testing' && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {testStatus === 'success' && (
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                  )}
                  Test Connection
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting || (isGitea && testStatus !== 'success')}>
                {isSubmitting ? 'Adding...' : 'Add Provider'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 