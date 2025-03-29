'use client';

import { CheckCircle } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { createCICDProvider, updateCICDProvider, testCICDProvider } from '@/app/actions/cicd';
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
import { CICDProvider, CICDProviderPayload, CICDProviderType } from '@/types/context/cicd';

interface CICDProviderFormProps {
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

const CICDProviderForm: React.FC<CICDProviderFormProps> = ({
  providerId,
  provider,
  onComplete,
}) => {
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

          {/* Provider Name */}
          <FormField
            control={form.control}
            name="name"
            rules={{ required: 'Name is required' }}
            render={({ field }) => (
              <FormItem className="grid grid-cols-[200px,1fr] items-center gap-4">
                <FormLabel className="text-sm">Name</FormLabel>
                <FormControl>
                  <Input
                    className="h-9 border rounded-md bg-transparent"
                    placeholder="Enter provider name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Provider URL */}
          <FormField
            control={form.control}
            name="url"
            rules={{ required: 'URL is required' }}
            render={({ field }) => (
              <FormItem className="grid grid-cols-[200px,1fr] items-center gap-4">
                <FormLabel className="text-sm">URL</FormLabel>
                <FormControl>
                  <Input
                    className="h-9 border rounded-md bg-transparent"
                    placeholder={
                      form.getValues('type') === 'jenkins'
                        ? 'http://jenkins.example.com:8080'
                        : form.getValues('type') === 'github'
                          ? 'https://github.com/username/repo'
                          : form.getValues('type') === 'circleci'
                            ? 'https://circleci.com/api/v2'
                            : 'Enter provider URL'
                    }
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* API Token */}
          <FormField
            control={form.control}
            name="token"
            rules={{ required: 'API Token is required' }}
            render={({ field }) => (
              <FormItem className="grid grid-cols-[200px,1fr] items-center gap-4">
                <FormLabel className="text-sm">API Token</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    className="h-9 border rounded-md bg-transparent"
                    placeholder="Enter API token"
                    onChange={(e) => handleCredentialChange('token', e.target.value)}
                    value={field.value}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Test Connection Status */}
          {testMessage && (
            <div className="grid grid-cols-[200px,1fr] items-center gap-4">
              <div></div>
              <div className="text-sm">{testMessage.message}</div>
            </div>
          )}

          {/* Form Actions */}
          <div className="grid grid-cols-[200px,1fr] items-center gap-4 pt-4">
            <div></div>
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting}
              >
                {isTesting ? (
                  'Testing...'
                ) : (
                  <>
                    <CheckCircle className="h-3 w-3 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default CICDProviderForm;
