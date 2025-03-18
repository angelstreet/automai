// src/app/[locale]/[tenant]/deployment/_components/ScriptParameterForm.tsx
import React from 'react';
import { Input } from '@/components/shadcn/input';
import { ScriptParameter } from '../types';

interface ScriptParameterFormProps {
  parameter: ScriptParameter;
  value: any;
  onChange: (value: string) => void;
}

const ScriptParameterForm: React.FC<ScriptParameterFormProps> = ({ 
  parameter, 
  value, 
  onChange 
}) => {
  const stringValue = value !== null && value !== undefined ? String(value) : '';
  
  return (
    <Input 
      id={`param-${parameter.id}`}
      value={stringValue}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      placeholder={parameter.description || parameter.name}
      className="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
    />
  );
};

export default ScriptParameterForm;