// src/app/[locale]/[tenant]/deployment/_components/ScriptParameterForm.tsx
import React from 'react';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Checkbox } from '@/components/shadcn/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { ScriptParameter } from '../types';

interface ScriptParameterFormProps {
  parameter: ScriptParameter;
  value: any;
  onChange: (value: any) => void;
}

const ScriptParameterForm: React.FC<ScriptParameterFormProps> = ({
  parameter,
  value,
  onChange
}) => {
  switch (parameter.type) {
    case 'boolean':
      return (
        <div className="flex items-center space-x-2">
          <Checkbox 
            id={`param-${parameter.id}`} 
            checked={!!value} 
            onCheckedChange={onChange}
          />
          <Label htmlFor={`param-${parameter.id}`}>{parameter.name}</Label>
        </div>
      );
      
    case 'number':
      return (
        <div className="space-y-2">
          <Label htmlFor={`param-${parameter.id}`}>{parameter.name}</Label>
          <Input 
            id={`param-${parameter.id}`}
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            placeholder={parameter.description}
          />
        </div>
      );
      
    case 'select':
      return (
        <div className="space-y-2">
          <Label htmlFor={`param-${parameter.id}`}>{parameter.name}</Label>
          <Select value={value} onValueChange={onChange}>
            <SelectTrigger id={`param-${parameter.id}`}>
              <SelectValue placeholder={parameter.description || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {parameter.options?.map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
      
    default: // string
      return (
        <div className="space-y-2">
          <Label htmlFor={`param-${parameter.id}`}>{parameter.name}</Label>
          <Input 
            id={`param-${parameter.id}`}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={parameter.description}
          />
        </div>
      );
  }
};

export default ScriptParameterForm;