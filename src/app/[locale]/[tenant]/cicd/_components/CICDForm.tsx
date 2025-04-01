'use client';

import { CheckCircle } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { createCICDProvider, updateCICDProvider, testCICDProvider } from '@/app/actions/cicdAction';
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
import { CICDProviderPayload } from '@/types/component/cicdComponentType';
import { CICDProvider, CICDProviderType } from '@/types/context/cicdContextType';

interface CICDFormProps {
  providerId?: string;
  provider?: CICDProvider;
  onComplete: () => void;
}

interface FormValues {
  name: string;
  type: CICDProviderType;
  url: string;
  token: string;
}

const CICDForm: React.FC<CICDFormProps> = ({ providerId, provider, onComplete }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testMessage, setTestMessage] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const isEditMode = !!providerId;

  // Initialize form
  const form = useForm<FormValues>({
    defaultValues: {
      name: '',
      type: 'jenkins',
      url: '',
      token: '',
    },
  });

  // Populate form with existing data if in edit mode
  useEffect(() => {
    if (isEditMode && provider) {
      form.reset({
        name: provider.name || '',
        type: provider.type || 'jenkins',
        url: provider.url || '',
        token: '', // Don't populate token for security
      });
    }
  }, [isEditMode, provider, form]);

  // Handle credential input changes
  const handleCredentialChange = (field: string, value: string) => {
    form.setValue(field as keyof FormValues, value);
  };

  // Handle selection changes
  const handleSelectChange = (field: string, value: string) => {
    form.setValue(field as keyof FormValues, value as any);
  };

  // Test the connection to the CI/CD provider
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestMessage(null);

    try {
      // Get values from the form
      const values = form.getValues();

      // Create provider data object
      const providerData: CICDProviderPayload = {
        id: providerId,
        name: values.name,
        type: values.type,
        url: values.url,
        auth_type: 'token',
        credentials: { token: values.token },
      };

      // Test the connection
      const result = await testCICDProvider(providerData);

      if (result.success) {
        setTestMessage({
          success: true,
          message: 'Connection successful! The provider is correctly configured.',
        });
      } else {
        setTestMessage({
          success: false,
          message: result.error || 'Failed to connect to the CI/CD provider.',
        });
      }
    } catch (error: any) {
      setTestMessage({
        success: false,
        message: error.message || 'An unexpected error occurred while testing the connection.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Form submission handler
  const handleSubmit = async (data: FormValues) => {
    setIsSubmitting(true);

    try {
      // Prepare provider payload
      const providerPayload: CICDProviderPayload = {
        id: providerId,
        name: data.name,
        type: data.type,
        url: data.url,
        config: {
          auth_type: 'token',
          credentials: {
            token: data.token,
          },
        },
      };

      // Create or update the provider
      const action = providerId
        ? () => updateCICDProvider(providerId, providerPayload)
        : () => createCICDProvider(providerPayload);

      const result = await action();

      if (result.success) {
        // Close the dialog and refresh the list
        onComplete();
      }
    } catch (error: any) {
      setTestMessage({
        success: false,
        message: error.message || 'An unexpected error occurred',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-2">
          {/* Provider Type */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem className="grid grid-cols-[200px,1fr] items-center gap-4">
                <FormLabel className="text-sm">Provider Type</FormLabel>
                <Select
                  defaultValue={field.value}
                  onValueChange={(value) => handleSelectChange('type', value)}
                  disabled={isEditMode}
                >
                  <FormControl>
                    <SelectTrigger className="h-9 border rounded-md bg-transparent">
                      <SelectValue placeholder="Select provider type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="jenkins">Jenkins</SelectItem>
                    <SelectItem value="github">GitHub Actions</SelectItem>
                    <SelectItem value="gitlab">GitLab CI</SelectItem>
                    <SelectItem value="circleci">CircleCI</SelectItem>
                    <SelectItem value="azure_devops">Azure DevOps</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Display Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="grid grid-cols-[200px,1fr] items-center gap-4">
                <FormLabel className="text-sm">Display Name</FormLabel>
                <FormControl>
                  <Input
                    className="h-9 border rounded-md bg-transparent"
                    {...field}
                    placeholder="Enter a display name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Server URL */}
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem className="grid grid-cols-[200px,1fr] items-center gap-4">
                <FormLabel className="text-sm">Server URL</FormLabel>
                <FormControl>
                  <Input
                    className="h-9 border rounded-md bg-transparent"
                    {...field}
                    placeholder="https://jenkins.example.com"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Authentication */}
          <div className="grid grid-cols-[200px,1fr] items-start gap-4 mt-4">
            <div className="text-sm font-medium">Authentication</div>
            <div className="space-y-4">
              <div className="space-y-2">
                <FormField
                  control={form.control}
                  name="token"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">API Token</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          className="h-9 border rounded-md bg-transparent"
                          {...field}
                          placeholder="Enter your API token"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Test message display */}
          {testMessage && (
            <div
              className={`p-4 rounded-md mt-4 ${
                testMessage.success
                  ? 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}
            >
              {testMessage.success && (
                <CheckCircle className="inline-block mr-2 h-4 w-4 text-green-600 dark:text-green-400" />
              )}
              {testMessage.message}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting || isSubmitting}
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onComplete()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? isEditMode
                    ? 'Updating...'
                    : 'Creating...'
                  : isEditMode
                    ? 'Update'
                    : 'Create'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default CICDForm;
