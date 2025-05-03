'use client';

import { PlusCircle, Save, X, Eye, EyeOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { createEnvironmentVariable } from '@/app/actions/environmentVariablesAction';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Switch } from '@/components/shadcn/switch';
import { cn } from '@/lib/utils';
import { EnvironmentVariable } from '@/types/context/environmentVariablesContextType';

interface VercelStyleEnvEditorProps {
  teamId: string;
  onVariablesCreated: (variables: EnvironmentVariable[]) => void;
}

interface EnvRow {
  id: string; // Temporary ID for UI tracking
  key: string;
  value: string;
  isSecret: boolean;
  isValueVisible: boolean;
  error?: string;
}

export function VercelStyleEnvEditor({ teamId, onVariablesCreated }: VercelStyleEnvEditorProps) {
  const t = useTranslations('environmentVariables');
  const c = useTranslations('common');

  const [rows, setRows] = useState<EnvRow[]>([
    { id: 'initial', key: '', value: '', isSecret: false, isValueVisible: true },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  // Add a new empty row
  const addRow = () => {
    setRows([
      ...rows,
      { id: `row-${Date.now()}`, key: '', value: '', isSecret: false, isValueVisible: true },
    ]);
  };

  // Remove a row by its ID
  const removeRow = (id: string) => {
    if (rows.length === 1) {
      // If it's the last row, just clear it instead of removing
      setRows([
        { id: `row-${Date.now()}`, key: '', value: '', isSecret: false, isValueVisible: true },
      ]);
    } else {
      setRows(rows.filter((row) => row.id !== id));
    }
  };

  // Update a specific field in a row
  const updateRow = (id: string, field: keyof EnvRow, value: string | boolean) => {
    setRows(
      rows.map((row) => {
        if (row.id === id) {
          return { ...row, [field]: value };
        }
        return row;
      }),
    );
  };

  // Toggle secret value
  const toggleSecret = (id: string) => {
    setRows(
      rows.map((row) => {
        if (row.id === id) {
          // When toggling secret on, also hide the value by default
          const newIsSecret = !row.isSecret;
          return {
            ...row,
            isSecret: newIsSecret,
            // Hide value when making it secret, otherwise show it
            isValueVisible: newIsSecret ? false : true,
          };
        }
        return row;
      }),
    );
  };

  // Toggle value visibility
  const toggleValueVisibility = (id: string) => {
    setRows(
      rows.map((row) => {
        if (row.id === id) {
          return { ...row, isValueVisible: !row.isValueVisible };
        }
        return row;
      }),
    );
  };

  // Get display value (actual or masked)
  const _getDisplayValue = (row: EnvRow) => {
    if (!row.isSecret || row.isValueVisible) {
      return row.value;
    }
    // Return masked value (dots) matching the length of the actual value
    return row.value ? '•'.repeat(Math.min(row.value.length, 10)) : '';
  };

  // Parse .env content
  const parseEnvContent = (content: string) => {
    if (!content.trim()) {
      return null;
    }

    // Split content by new lines and filter out empty lines and comments
    const lines = content
      .split('\n')
      .filter((line) => line.trim() !== '' && !line.trim().startsWith('#'));

    if (lines.length === 0) {
      return null;
    }

    // Parse each line into key-value pairs
    const parsedRows: EnvRow[] = lines.map((line) => {
      // Check if line contains = character
      const equalsIndex = line.indexOf('=');
      if (equalsIndex > 0) {
        const key = line.substring(0, equalsIndex).trim();
        const value = line.substring(equalsIndex + 1).trim();

        // Remove quotes if present
        const cleanValue =
          value.startsWith('"') && value.endsWith('"')
            ? value.substring(1, value.length - 1)
            : value;

        return {
          id: `row-${Date.now()}-${Math.random()}`,
          key,
          value: cleanValue,
          isSecret: false,
          isValueVisible: true,
        };
      }

      // If no equals sign, treat the whole line as a key
      return {
        id: `row-${Date.now()}-${Math.random()}`,
        key: line.trim(),
        value: '',
        isSecret: false,
        isValueVisible: true,
      };
    });

    return parsedRows;
  };

  // Handle pasting in a key field
  const handleKeyFieldPaste = (e: React.ClipboardEvent, rowId: string) => {
    const pastedText = e.clipboardData.getData('text');

    // If it looks like .env content (contains equals sign or multiple lines)
    if (pastedText.includes('=') || pastedText.includes('\n')) {
      e.preventDefault();

      const parsedRows = parseEnvContent(pastedText);

      if (parsedRows && parsedRows.length > 0) {
        // If we have parsed multiple rows, replace current row with first parsed row
        // and add the rest as new rows
        const currentRowIndex = rows.findIndex((r) => r.id === rowId);

        if (currentRowIndex !== -1) {
          const updatedRows = [...rows];

          // Update current row with first parsed row
          updatedRows[currentRowIndex] = {
            ...updatedRows[currentRowIndex],
            key: parsedRows[0].key,
            value: parsedRows[0].value,
          };

          // Insert remaining rows after current row
          if (parsedRows.length > 1) {
            updatedRows.splice(currentRowIndex + 1, 0, ...parsedRows.slice(1));
          }

          setRows(updatedRows);
          toast.success(`${parsedRows.length} environment variables parsed`);
        }
      }
    }
  };

  // Validate rows before saving
  const validateRows = (): boolean => {
    let isValid = true;
    const updatedRows = rows.map((row) => {
      // Skip empty rows
      if (row.key.trim() === '' && row.value.trim() === '') {
        return row;
      }

      const error = validateEnvironmentVariableKey(row.key);
      if (error) {
        isValid = false;
        return { ...row, error };
      }

      return { ...row, error: undefined };
    });

    setRows(updatedRows);
    return isValid;
  };

  // Validate environment variable key
  const validateEnvironmentVariableKey = (key: string): string | undefined => {
    if (key.trim() === '') {
      return t('key_required');
    }

    if (!key.match(/^[A-Za-z0-9_]+$/)) {
      return t('key_validation');
    }

    // Check for duplicates
    const duplicateCount = rows.filter((row) => row.key === key).length;
    if (duplicateCount > 1) {
      return t('key_exists');
    }

    return undefined;
  };

  // Save all valid environment variables
  const saveEnvironmentVariables = async () => {
    if (!validateRows()) {
      return;
    }

    // Filter out empty rows
    const validRows = rows.filter((row) => row.key.trim() !== '');

    if (validRows.length === 0) {
      toast.error('No valid environment variables to save');
      return;
    }

    setIsSaving(true);

    try {
      const results = [];
      const successfulVariables = [];

      // Save each variable one by one
      for (const row of validRows) {
        const result = await createEnvironmentVariable(teamId, {
          key: row.key,
          value: row.value,
          description: '',
          is_secret: row.isSecret,
        });

        results.push(result);

        if (result.success && result.data) {
          successfulVariables.push(result.data);
        }
      }

      // Check if all were successful
      const allSuccessful = results.every((result) => result.success);

      if (allSuccessful) {
        toast.success(`${results.length} environment variables saved successfully`);
        onVariablesCreated(successfulVariables);
        // Reset to a single empty row
        setRows([
          { id: `row-${Date.now()}`, key: '', value: '', isSecret: false, isValueVisible: true },
        ]);
      } else {
        const successCount = results.filter((result) => result.success).length;
        toast.warning(
          `${successCount}/${results.length} variables saved. Some variables could not be saved.`,
        );

        // Keep the rows that failed and clear the successful ones
        const successfulKeys = successfulVariables.map((v) => v.key);
        const remainingRows = rows.filter((row) => !successfulKeys.includes(row.key));
        setRows(
          remainingRows.length > 0
            ? remainingRows
            : [
                {
                  id: `row-${Date.now()}`,
                  key: '',
                  value: '',
                  isSecret: false,
                  isValueVisible: true,
                },
              ],
        );
      }
    } catch (error) {
      console.error('Error saving environment variables:', error);
      toast.error('Failed to save environment variables');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header row with labels */}
      <div className="grid grid-cols-12 gap-2 mb-1 px-1">
        <div className="col-span-5">
          <Label>{t('key')}</Label>
        </div>
        <div className="col-span-5">
          <Label>{t('value')}</Label>
        </div>
        <div className="col-span-1 text-xs text-muted-foreground flex items-center justify-center pt-1">
          {c('secret')}
        </div>
        <div className="col-span-1"></div>
      </div>

      <div className="grid gap-1">
        {rows.map((row) => (
          <div
            key={row.id}
            className="grid grid-cols-12 gap-2 items-center py-1 group border-b border-border/30 last:border-0"
          >
            {/* Key */}
            <div className="col-span-5">
              <Input
                id={`key-${row.id}`}
                value={row.key}
                onChange={(e) => updateRow(row.id, 'key', e.target.value)}
                onPaste={(e) => handleKeyFieldPaste(e, row.id)}
                placeholder="e.g. CLIENT_KEY"
                className={cn('h-8', row.error ? 'border-destructive' : '')}
              />
              {row.error && <p className="text-xs text-destructive mt-0.5">{row.error}</p>}
            </div>

            {/* Value */}
            <div className="col-span-5">
              <div className="relative">
                <Input
                  id={`value-${row.id}`}
                  type={row.isSecret && !row.isValueVisible ? 'password' : 'text'}
                  value={row.value}
                  onChange={(e) => updateRow(row.id, 'value', e.target.value)}
                  placeholder="e.g. your-secret-value"
                  className={cn('h-8', row.error ? 'border-destructive' : '')}
                />
                {row.isSecret && row.value && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                    onClick={() => toggleValueVisibility(row.id)}
                    title={row.isValueVisible ? t('hide_value') : t('show_value')}
                  >
                    {row.isValueVisible ? (
                      <EyeOff className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Secret Toggle */}
            <div className="col-span-1 flex justify-center">
              <Switch
                id={`secret-${row.id}`}
                checked={row.isSecret}
                onCheckedChange={() => toggleSecret(row.id)}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            {/* Remove Button */}
            <div className="col-span-1 flex justify-center">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeRow(row.id)}
                aria-label="Remove"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mt-4">
        <Button
          type="button"
          variant="outline"
          onClick={addRow}
          disabled={isSaving}
          size="sm"
          className="gap-1"
        >
          <PlusCircle className="h-4 w-4" />
          {c('add_another')}
        </Button>

        <div className="flex-1"></div>

        <Button
          type="button"
          onClick={saveEnvironmentVariables}
          disabled={isSaving}
          className="gap-1"
        >
          <Save className="h-4 w-4" />
          {isSaving ? c('saving') : c('save')}
        </Button>
      </div>
    </div>
  );
}
