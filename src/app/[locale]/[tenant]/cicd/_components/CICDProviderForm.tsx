'use client';

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
import { toast } from '@/components/shadcn/use-toast';
import {
  CICDProvider,
  CICDProviderPayload,
  CICDProviderType,
  CICDAuthType,
  parseProviderUrl,
} from '@/types/component/cicdComponentType';

interface CICDProviderFormProps {
  providerId?: string;
  provider?: CICDProvider;
  onComplete: () => void;
  isInDialog?: boolean;
}

interface FormValues {
  name: string;
  type: CICDProviderType;
  url: string;
  port: string;
  auth_type: CICDAuthType;
  username: string;
  password: string;
  token: string;
}

const CICDProviderForm: React.FC<CICDProviderFormProps> = ({
  providerId,
  provider,
  onComplete,
  isInDialog = false,
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
      port: '',
      auth_type: 'token',
      username: '',
      password: '',
      token: '',
    },
  });

  // Populate form with existing data if in edit mode
  useEffect(() => {
    if (isEditMode && provider) {
      // Parse URL to extract port if present
      const { url, port } = parseProviderUrl(provider.url);

      form.reset({
        name: provider.name || '',
        type: provider.type || 'jenkins',
        url: url || '',
        port: port ? port.toString() : '',
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
        credentials.username = values.username;
      } else if (values.auth_type === 'basic_auth') {
        credentials.username = values.username;
        credentials.password = values.password;
      }

      // Create provider data object with port
      const providerData: CICDProviderPayload = {
        id: providerId,
        name: values.name,
        type: values.type,
        url: values.url,
        port: values.port ? parseInt(values.port, 10) : null,
        config: {
          auth_type: values.auth_type,
          credentials,
        },
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
            username: data.username,
            token: data.token,
          };
          break;
        // Add other auth types as needed
      }

      // Prepare provider payload with port
      const providerPayload: CICDProviderPayload = {
        id: providerId,
        name: data.name,
        type: data.type,
        url: data.url,
        port: data.port ? parseInt(data.port, 10) : null,
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
          variant: 'default',
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

  // Footer buttons rendering based on whether in dialog or standalone
  const renderFooterButtons = () => {
    if (isInDialog) {
      return (
        <div className="flex justify-between space-x-2 mt-4 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="h-8 px-3 text-sm"
          >
            {isTesting ? (
              <>
                <div className="mr-2 h-3 w-3 animate-spin rounded-full border-b-2 border-current"></div>
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </Button>

          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="h-8 px-3 text-sm"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting || !testMessage?.success}
              className={`h-8 px-3 text-sm ${testMessage?.success ? 'bg-green-600 hover:bg-green-700' : ''}`}
            >
              {isSubmitting ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      );
    }

    // Default view for standalone form
    return (
      <div className="flex justify-between pt-4 space-x-2">
        <Button type="button" variant="outline" onClick={handleTestConnection} disabled={isTesting}>
          {isTesting ? 'Testing...' : 'Test Connection'}
        </Button>

        <div className="flex space-x-2">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting || !testMessage?.success}
            className={testMessage?.success ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {isSubmitting ? 'Saving...' : isEditMode ? 'Update Provider' : 'Create Provider'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-2">
        {/* Provider Type */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Provider Type</FormLabel>
              <Select
                onValueChange={(value) => handleSelectChange('type', value)}
                defaultValue={field.value}
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
              <FormLabel>Display Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter a display name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* URL and Port - in a flex container */}
        <div className="flex gap-4">
          {/* URL */}
          <FormField
            control={form.control}
            name="url"
            rules={{ required: 'URL is required' }}
            render={({ field }) => (
              <FormItem className="flex-grow">
                <FormLabel>Server URL</FormLabel>
                <FormControl>
                  <Input
                    placeholder={
                      form.getValues('type') === 'jenkins'
                        ? 'https://jenkins.example.com'
                        : form.getValues('type') === 'github'
                          ? 'https://api.github.com'
                          : form.getValues('type') === 'gitlab'
                            ? 'https://gitlab.com'
                            : 'https://example.com'
                    }
                    {...field}
                  />
                </FormControl>
                <FormMessage />
                {field.value && field.value.startsWith('http://') && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    For security reasons, we recommend using HTTPS instead of HTTP.
                  </p>
                )}
              </FormItem>
            )}
          />

          {/* Port */}
          <FormField
            control={form.control}
            name="port"
            render={({ field }) => (
              <FormItem className="w-1/4" style={{ minWidth: '100px' }}>
                <FormLabel>Port</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder={form.getValues('type') === 'jenkins' ? '8080' : '443'}
                    {...field}
                    onChange={(e) => {
                      // Only allow numeric input
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Authentication Type */}
        <FormField
          control={form.control}
          name="auth_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Authentication</FormLabel>
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
        {form.watch('auth_type') === 'token' && (
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
              name="token"
              rules={{ required: 'Token is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Token</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Enter your API token"
                      onChange={(e) => handleCredentialChange('token', e.target.value)}
                      value={field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
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
          <div className="text-sm text-muted-foreground">
            OAuth configuration requires additional setup. Please contact your administrator.
          </div>
        )}

        {/* Test Connection Status */}
        {testMessage && (
          <div
            className={`p-2 text-sm rounded-md ${
              testMessage.success
                ? 'bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-100'
                : 'bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-100'
            }`}
          >
            {testMessage.message}
          </div>
        )}

        {/* Test Connection Button (only show when not in dialog, moved outside footers) */}
        {!isInDialog && (
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="mt-2"
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </Button>
        )}

        {/* Render appropriate footer based on context */}
        {renderFooterButtons()}
      </form>
    </Form>
  );
};

export default CICDProviderForm;
