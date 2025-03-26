'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/shadcn/form';
import { Input } from '@/components/shadcn/input';
import { Button } from '@/components/shadcn/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import { toast } from '@/components/shadcn/use-toast';
import { createCICDProvider, updateCICDProvider, testCICDProvider } from '@/app/actions/cicd';
import {
  CICDProvider,
  CICDProviderPayload,
  CICDProviderType,
  CICDAuthType,
} from '@/types/context/cicd';

interface CICDProviderFormProps {
  providerId?: string;
  provider?: CICDProvider;
  onComplete: () => void;
}

interface FormValues {
  name: string;
  type: CICDProviderType;
  url: string;
  auth_type: CICDAuthType;
  username: string;
  password: string;
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
      auth_type: 'token',
      username: '',
      password: '',
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
        auth_type: provider.config?.auth_type || 'token',
        username: provider.config?.credentials?.username || '',
        password: '', // Don't populate password for security
        token: '', // Don't populate token for security
      });
    }
  }, [isEditMode, provider, form]);

  // Handle credential input changes based on auth type
  const handleCredentialChange = (field: string, value: string) => {
    form.setValue(field as keyof FormValues, value);
  };

  // Handle selection changes
  const handleSelectChange = (field: string, value: string) => {
    form.setValue(field as keyof FormValues, value as any);

    // Reset credential fields when auth type changes
    if (field === 'auth_type') {
      form.setValue('username', '');
      form.setValue('password', '');
      form.setValue('token', '');
    }
  };

  // Test the connection to the CI/CD provider
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestMessage(null);

    try {
      // Get values from the form
      const values = form.getValues();

      // Prepare credentials based on auth type
      const credentials: any = {};
      if (values.auth_type === 'token') {
        credentials.token = values.token;
      } else if (values.auth_type === 'basic_auth') {
        credentials.username = values.username;
        credentials.password = values.password;
      }

      // Create provider data object
      const providerData: CICDProviderPayload = {
        id: providerId,
        name: values.name,
        type: values.type,
        url: values.url,
        auth_type: values.auth_type,
        credentials,
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
      // Prepare credentials based on auth type
      let credentials: any = {};

      switch (data.auth_type) {
        case 'basic_auth':
          credentials = {
            username: data.username,
            password: data.password,
          };
          break;
        case 'token':
          credentials = {
            token: data.token,
          };
          break;
        // Add other auth types as needed
      }

      // Prepare provider payload
      const providerPayload: CICDProviderPayload = {
        id: providerId,
        name: data.name,
        type: data.type,
        url: data.url,
        config: {
          auth_type: data.auth_type,
          credentials,
        },
      };

      // Create or update the provider
      const action = providerId
        ? () => updateCICDProvider(providerId, providerPayload)
        : () => createCICDProvider(providerPayload);

      const result = await action();

      if (result.success) {
        toast({
          title: providerId ? 'Provider Updated' : 'Provider Created',
          description: `The ${data.name} provider has been successfully ${providerId ? 'updated' : 'created'}.`,
          variant: 'success',
        });

        // Close the dialog and refresh the list
        onComplete();
      } else {
        toast({
          title: 'Error',
          description: result.error || `Failed to ${providerId ? 'update' : 'create'} the provider`,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancel button
  const handleCancel = () => {
    onComplete();
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">
        {isEditMode ? 'Edit CI/CD Provider' : 'Add New CI/CD Provider'}
      </h2>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Provider Type */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Provider Type</FormLabel>
                <Select
                  defaultValue={field.value}
                  onValueChange={(value) => handleSelectChange('type', value)}
                  disabled={isEditMode} // Can't change type in edit mode
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="jenkins">Jenkins</SelectItem>
                    <SelectItem value="github">GitHub Actions</SelectItem>
                    <SelectItem value="gitlab">GitLab CI</SelectItem>
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
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter provider name" {...field} />
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
              <FormItem>
                <FormLabel>URL</FormLabel>
                <FormControl>
                  <Input
                    placeholder={
                      form.getValues('type') === 'jenkins'
                        ? 'http://jenkins.example.com:8080'
                        : form.getValues('type') === 'github'
                          ? 'https://github.com/username/repo'
                          : 'Enter provider URL'
                    }
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Authentication Type */}
          <FormField
            control={form.control}
            name="auth_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Authentication Type</FormLabel>
                <Select
                  defaultValue={field.value}
                  onValueChange={(value) => handleSelectChange('auth_type', value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select authentication type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="token">API Token</SelectItem>
                    <SelectItem value="basic_auth">Username & Password</SelectItem>
                    {form.getValues('type') === 'github' && (
                      <SelectItem value="oauth">OAuth</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Authentication Credentials */}
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-md space-y-4">
            <h3 className="font-medium">Credentials</h3>

            {form.watch('auth_type') === 'token' && (
              <FormField
                control={form.control}
                name="token"
                rules={{ required: 'Token is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Token</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter API token"
                        onChange={(e) => handleCredentialChange('token', e.target.value)}
                        value={field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {form.watch('auth_type') === 'basic_auth' && (
              <>
                <FormField
                  control={form.control}
                  name="username"
                  rules={{ required: 'Username is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter username"
                          onChange={(e) => handleCredentialChange('username', e.target.value)}
                          value={field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  rules={{ required: 'Password is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter password"
                          onChange={(e) => handleCredentialChange('password', e.target.value)}
                          value={field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {form.watch('auth_type') === 'oauth' && (
              <div className="text-sm text-gray-500">
                OAuth configuration requires additional setup. Please contact your administrator.
              </div>
            )}
          </div>

          {/* Test Connection Status */}
          {testMessage && (
            <div
              className={`p-3 rounded-md ${testMessage.success ? 'bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-100' : 'bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-100'}`}
            >
              {testMessage.message}
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-between space-x-4 pt-4">
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting}
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </Button>
            </div>

            <div className="flex space-x-2">
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : isEditMode ? 'Update Provider' : 'Create Provider'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default CICDProviderForm;
