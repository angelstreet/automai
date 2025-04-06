'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

import { createCICDProvider, testCICDProvider } from '@/app/actions/cicdAction';
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
  CICDProviderPayload,
  CICDProviderType,
  CICDAuthType,
} from '@/types/component/cicdComponentType';

import { CICDEvents } from './CICDEventListener';

interface CICDFormDialogProps {
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

const CICDFormDialogClient: React.FC<CICDFormDialogProps> = ({
  onComplete,
  isInDialog = false,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testMessage, setTestMessage] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

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

  // Watch relevant fields to update the Test Connection button state
  form.watch(['name', 'url', 'port', 'username', 'token', 'password', 'auth_type']);

  // Check if all required fields are filled for test connection
  const canTestConnection = () => {
    const values = form.getValues();
    const hasName = !!values.name.trim();
    const hasUrl = !!values.url.trim();
    const hasPort = !!values.port.trim();

    // Check auth credentials
    let hasValidCredentials = false;
    if (values.auth_type === 'token') {
      hasValidCredentials = !!values.username.trim() && !!values.token.trim();
    } else if (values.auth_type === 'basic_auth') {
      hasValidCredentials = !!values.username.trim() && !!values.password.trim();
    }

    return hasName && hasUrl && hasPort && hasValidCredentials;
  };

  // Test the connection to the CI/CD provider
  const handleTestConnection = async () => {
    if (!canTestConnection()) return;

    setIsTesting(true);
    setTestMessage(null);

    try {
      const values = form.getValues();

      // Prepare credentials based on auth type
      let credentials: any = {};

      switch (values.auth_type) {
        case 'basic_auth':
          credentials = {
            username: values.username,
            password: values.password,
          };
          break;
        case 'token':
          credentials = {
            username: values.username,
            token: values.token,
          };
          break;
        // Add other auth types as needed
      }

      // Create provider data object with port
      const providerData: CICDProviderPayload = {
        name: values.name,
        type: values.type,
        url: values.url,
        port: values.port ? parseInt(values.port, 10) : null,
        config: {
          auth_type: values.auth_type,
          credentials,
        },
      };

      // Call the server action directly instead of API endpoint
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
      // Check if test was successful, if not show a warning
      if (!testMessage?.success) {
        // Prompt user to confirm if they want to proceed without a successful test
        const confirmed = window.confirm(
          'Warning: The connection test was not successful or has not been run. Do you still want to save this provider? It may not work correctly.',
        );
        if (!confirmed) {
          setIsSubmitting(false);
          return;
        }
      }

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
        name: data.name,
        type: data.type,
        url: data.url,
        port: data.port ? parseInt(data.port, 10) : null,
        config: {
          auth_type: data.auth_type,
          credentials,
        },
      };

      // Create the provider
      const result = await createCICDProvider(providerPayload);

      if (result.success) {
        // Remove success toast
        // Close the dialog and refresh the list
        onComplete();

        // Dispatch event to notify listeners of successful operation
        window.dispatchEvent(new Event(CICDEvents.REFRESH_CICD_COMPLETE));
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to create the provider',
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
        <div className="flex justify-between space-x-2 mt-2 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTesting || !canTestConnection()}
            className="h-7 px-3 text-xs"
          >
            {isTesting ? (
              <>
                <div className="mr-1 h-2 w-2 animate-spin rounded-full border-b-2 border-current"></div>
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
              className="h-7 px-3 text-xs"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              className={`h-7 px-3 text-xs ${testMessage?.success ? 'bg-green-600 hover:bg-green-700' : ''}`}
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      );
    }

    // Default view for standalone form
    return (
      <div className="flex justify-between pt-2 space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleTestConnection}
          disabled={isTesting || !canTestConnection()}
          className="h-7 text-xs"
        >
          {isTesting ? 'Testing...' : 'Test Connection'}
        </Button>

        <div className="flex space-x-2">
          <Button type="button" variant="outline" onClick={handleCancel} className="h-7 text-xs">
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
            className={`h-7 text-xs ${testMessage?.success ? 'bg-green-600 hover:bg-green-700' : ''}`}
          >
            {isSubmitting ? 'Saving...' : 'Create Provider'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-1"
        data-form-type="do-not-autofill"
      >
        {/* Provider Type */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem className="mb-1">
              <FormLabel className="text-xs">Provider Type</FormLabel>
              <Select
                onValueChange={(value) => handleSelectChange('type', value)}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger className="h-8">
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
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {/* Provider Name */}
        <FormField
          control={form.control}
          name="name"
          rules={{ required: 'Name is required' }}
          render={({ field }) => (
            <FormItem className="mb-1">
              <FormLabel className="text-xs">Display Name</FormLabel>
              <FormControl>
                <Input className="h-8" placeholder="Enter a display name" {...field} />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {/* URL and Port - in a flex container */}
        <div className="flex gap-2 mb-1">
          {/* URL */}
          <FormField
            control={form.control}
            name="url"
            rules={{ required: 'URL is required' }}
            render={({ field }) => (
              <FormItem className="flex-grow">
                <FormLabel className="text-xs">Server URL</FormLabel>
                <FormControl>
                  <Input
                    className="h-8"
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
                <FormMessage className="text-xs" />
                {field.value && field.value.startsWith('http://') && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0">
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
            rules={{ required: 'Port is required' }}
            render={({ field }) => (
              <FormItem className="w-1/4" style={{ minWidth: '80px' }}>
                <FormLabel className="text-xs">Port</FormLabel>
                <FormControl>
                  <Input
                    className="h-8"
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
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>

        {/* Authentication Type */}
        <FormField
          control={form.control}
          name="auth_type"
          render={({ field }) => (
            <FormItem className="mb-1">
              <FormLabel className="text-xs">Authentication</FormLabel>
              <Select
                defaultValue={field.value}
                onValueChange={(value) => handleSelectChange('auth_type', value)}
              >
                <FormControl>
                  <SelectTrigger className="h-8">
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
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {/* Authentication Credentials */}
        {form.watch('auth_type') === 'token' && (
          <div className="space-y-1">
            <FormField
              control={form.control}
              name="username"
              rules={{ required: 'Username is required' }}
              render={({ field }) => (
                <FormItem className="mb-1">
                  <FormLabel className="text-xs">Username</FormLabel>
                  <FormControl>
                    <Input
                      className="h-8"
                      placeholder="Enter username"
                      onChange={(e) => handleCredentialChange('username', e.target.value)}
                      value={field.value}
                      name="new-username"
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="token"
              rules={{ required: 'Token is required' }}
              render={({ field }) => (
                <FormItem className="mb-1">
                  <FormLabel className="text-xs">API Token</FormLabel>
                  <FormControl>
                    <Input
                      className="h-8"
                      type="password"
                      placeholder="Enter your API token"
                      onChange={(e) => handleCredentialChange('token', e.target.value)}
                      value={field.value}
                      name="new-token"
                      autoComplete="new-password"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
        )}

        {form.watch('auth_type') === 'basic_auth' && (
          <div className="space-y-1">
            <FormField
              control={form.control}
              name="username"
              rules={{ required: 'Username is required' }}
              render={({ field }) => (
                <FormItem className="mb-1">
                  <FormLabel className="text-xs">Username</FormLabel>
                  <FormControl>
                    <Input
                      className="h-8"
                      placeholder="Enter username"
                      onChange={(e) => handleCredentialChange('username', e.target.value)}
                      value={field.value}
                      name="basic-username"
                      autoComplete="off"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              rules={{ required: 'Password is required' }}
              render={({ field }) => (
                <FormItem className="mb-1">
                  <FormLabel className="text-xs">Password</FormLabel>
                  <FormControl>
                    <Input
                      className="h-8"
                      type="password"
                      placeholder="Enter password"
                      onChange={(e) => handleCredentialChange('password', e.target.value)}
                      value={field.value}
                      name="new-password"
                      autoComplete="new-password"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
        )}

        {form.watch('auth_type') === 'oauth' && (
          <div className="text-xs text-muted-foreground py-1">
            OAuth configuration requires additional setup. Please contact your administrator.
          </div>
        )}

        {/* Test Connection Status */}
        {testMessage && (
          <div
            className={`p-1 text-xs rounded-md mt-1 ${
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
            disabled={isTesting || !canTestConnection()}
            className="h-7 px-2 text-xs mt-1"
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

export default CICDFormDialogClient;
