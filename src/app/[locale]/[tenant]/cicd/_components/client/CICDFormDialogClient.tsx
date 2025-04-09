'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

import { CICD_PROVIDER_CONFIGS } from '@/app/[locale]/[tenant]/cicd/constants';
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
import { CICDProviderPayload, CICDProviderType } from '@/types/component/cicdComponentType';

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
  token: string;
  owner: string;
  repository: string;
  repository_url: string;
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
      token: '',
      owner: '',
      repository: '',
      repository_url: '',
    },
  });

  // Get current provider config
  const currentProvider = form.watch('type');
  const providerConfig = CICD_PROVIDER_CONFIGS[currentProvider];

  // Handle selection changes with provider config
  const handleSelectChange = (field: string, value: string) => {
    form.setValue(field as keyof FormValues, value as any);

    // Reset fields when provider changes
    if (field === 'type') {
      const newConfig = CICD_PROVIDER_CONFIGS[value as CICDProviderType];

      // Reset and set default values based on provider config
      form.setValue('url', newConfig.fields.url.value || '');
      form.setValue('port', newConfig.fields.port.value || '');
      form.setValue('owner', '');
      form.setValue('repository', '');
      form.setValue('repository_url', '');
      form.setValue('token', '');
    }
  };

  // Watch relevant fields to update the Test Connection button state
  form.watch(['name', 'url', 'port', 'token', 'repository_url']);

  // Check if all required fields are filled for test connection
  const canTestConnection = () => {
    const values = form.getValues();
    const hasName = !!values.name.trim();
    const hasToken = !!values.token.trim();

    // Check provider specific fields
    const config = CICD_PROVIDER_CONFIGS[values.type];

    const hasUrl = !config.fields.url.show || !!values.url.trim();
    const hasPort = !config.fields.port.show || !!values.port.trim();
    const hasOwner = !config.fields.owner.show || !!values.owner.trim();
    const hasRepo = !config.fields.repository.show || !!values.repository.trim();
    const hasRepoUrl = !config.fields.repository_url.show || !!values.repository_url.trim();

    return hasName && hasToken && hasUrl && hasPort && hasOwner && hasRepo && hasRepoUrl;
  };

  // Test the connection to the CI/CD provider
  const handleTestConnection = async () => {
    if (!canTestConnection()) return;

    setIsTesting(true);
    setTestMessage(null);

    try {
      const values = form.getValues();

      // Create provider data object with port
      const providerData: CICDProviderPayload = {
        name: values.name,
        type: values.type,
        url: values.url,
        port: values.port ? parseInt(values.port, 10) : null,
        config: {
          auth_type: 'token',
          credentials: {
            username: '',
            token: values.token,
          },
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

  // Update form submission to use provider config
  const handleSubmit = async (data: FormValues) => {
    setIsSubmitting(true);

    try {
      if (!testMessage?.success) {
        const confirmed = window.confirm(
          'Warning: The connection test was not successful or has not been run. Do you still want to save this provider? It may not work correctly.',
        );
        if (!confirmed) {
          setIsSubmitting(false);
          return;
        }
      }

      const providerPayload = providerConfig.transformPayload(data);
      const result = await createCICDProvider(providerPayload);

      if (result.success) {
        onComplete();
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
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {/* Provider Name */}
        {providerConfig.fields.name.show && (
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
        )}

        {/* URL and Port fields - only shown for Jenkins */}
        {(providerConfig.fields.url.show || providerConfig.fields.port.show) && (
          <div className="flex gap-2 mb-1">
            {providerConfig.fields.url.show && (
              <FormField
                control={form.control}
                name="url"
                rules={{ required: providerConfig.fields.url.required ? 'URL is required' : false }}
                render={({ field }) => (
                  <FormItem className="flex-grow">
                    <FormLabel className="text-xs">Server URL</FormLabel>
                    <FormControl>
                      <Input
                        className="h-8"
                        placeholder={providerConfig.fields.url.placeholder}
                        disabled={providerConfig.fields.url.disabled}
                        value={
                          providerConfig.fields.url.disabled
                            ? providerConfig.fields.url.value
                            : field.value
                        }
                        onChange={(e) => !providerConfig.fields.url.disabled && field.onChange(e)}
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
            )}

            {providerConfig.fields.port.show && (
              <FormField
                control={form.control}
                name="port"
                rules={{
                  required: providerConfig.fields.port.required ? 'Port is required' : false,
                }}
                render={({ field }) => (
                  <FormItem className="w-1/4" style={{ minWidth: '80px' }}>
                    <FormLabel className="text-xs">Port</FormLabel>
                    <FormControl>
                      <Input
                        className="h-8"
                        type="number"
                        placeholder={providerConfig.fields.port.placeholder}
                        disabled={providerConfig.fields.port.disabled}
                        value={
                          providerConfig.fields.port.disabled
                            ? providerConfig.fields.port.value
                            : field.value
                        }
                        onChange={(e) => {
                          if (!providerConfig.fields.port.disabled) {
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            field.onChange(value);
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}

        {/* GitLab specific fields */}
        {(providerConfig.fields.owner.show || providerConfig.fields.repository.show) && (
          <div className="space-y-1">
            {providerConfig.fields.owner.show && (
              <FormField
                control={form.control}
                name="owner"
                rules={{
                  required: providerConfig.fields.owner.required
                    ? 'Owner/Group is required'
                    : false,
                }}
                render={({ field }) => (
                  <FormItem className="mb-1">
                    <FormLabel className="text-xs">Owner/Group Name</FormLabel>
                    <FormControl>
                      <Input
                        className="h-8"
                        placeholder={providerConfig.fields.owner.placeholder}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            )}

            {providerConfig.fields.repository.show && (
              <FormField
                control={form.control}
                name="repository"
                rules={{
                  required: providerConfig.fields.repository.required
                    ? 'Repository name is required'
                    : false,
                }}
                render={({ field }) => (
                  <FormItem className="mb-1">
                    <FormLabel className="text-xs">Repository Name</FormLabel>
                    <FormControl>
                      <Input
                        className="h-8"
                        placeholder={providerConfig.fields.repository.placeholder}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            )}
          </div>
        )}

        {/* GitHub Repository URL field */}
        {providerConfig.fields.repository_url.show && (
          <FormField
            control={form.control}
            name="repository_url"
            rules={{
              required: providerConfig.fields.repository_url.required
                ? 'Repository URL is required'
                : false,
              pattern: {
                value: /^https:\/\/github\.com\/[^/]+\/[^/]+$/,
                message:
                  'Please enter a valid GitHub repository URL (https://github.com/owner/repository)',
              },
            }}
            render={({ field }) => (
              <FormItem className="mb-1">
                <FormLabel className="text-xs">Repository URL</FormLabel>
                <FormControl>
                  <Input
                    className="h-8"
                    placeholder={providerConfig.fields.repository_url.placeholder}
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        )}

        {/* API Token field - always shown */}
        <FormField
          control={form.control}
          name="token"
          rules={{ required: 'API Token is required' }}
          render={({ field }) => (
            <FormItem className="mb-1">
              <FormLabel className="text-xs">API Token</FormLabel>
              <FormControl>
                <Input
                  className="h-8"
                  type="password"
                  placeholder="Enter your API token"
                  {...field}
                  name="new-token"
                  autoComplete="new-password"
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

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
