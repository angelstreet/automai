import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface FormData {
  name: string;
  description: string;
  type: string;
  ip: string;
  port: string;
  user: string;
  password: string;
}

interface ConnectionFormProps {
  formData: FormData;
  onChange: (formData: FormData) => void;
  testStatus: 'idle' | 'success' | 'error';
  testError: string | null;
  isValidating?: boolean;
  onSave?: () => void;
}

export function ConnectionForm({ 
  formData, 
  onChange, 
  testStatus, 
  testError,
  onSave
}: ConnectionFormProps) {
  const [connectionType, setConnectionType] = useState<'ssh' | 'docker' | 'portainer'>(
    formData.type as 'ssh' | 'docker' | 'portainer'
  );

  const handleTypeChange = (value: string) => {
    setConnectionType(value as 'ssh' | 'docker' | 'portainer');
    onChange({ 
      ...formData, 
      type: value,
      port: value === 'ssh' ? '22' : value === 'docker' ? '2375' : '9000'
    });
  };

  const handleInputChange = (field: string, value: string) => {
    onChange({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-3 py-2">
      <div className="grid grid-cols-12 items-center gap-3">
        <Label htmlFor="name" className="text-right col-span-2">Name</Label>
        <Input
          id="name"
          placeholder="Client name"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          className="col-span-10"
        />
      </div>
      
      <div className="grid grid-cols-12 items-center gap-3">
        <Label htmlFor="type" className="text-right col-span-2 whitespace-nowrap">Connection</Label>
        <div className="col-span-10">
          <Select 
            value={formData.type} 
            onValueChange={handleTypeChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ssh">SSH</SelectItem>
              <SelectItem value="docker">Docker</SelectItem>
              <SelectItem value="portainer">Portainer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-12 items-center gap-3">
        <Label htmlFor="ip" className="text-right col-span-2 whitespace-nowrap">IP Address</Label>
        <Input
          id="ip"
          placeholder="IP Address"
          value={formData.ip}
          onChange={(e) => handleInputChange('ip', e.target.value)}
          className="col-span-7"
        />
        <Label htmlFor="port" className="text-right whitespace-nowrap col-span-1">Port</Label>
        <Input
          id="port"
          placeholder="Port"
          value={formData.port}
          onChange={(e) => handleInputChange('port', e.target.value)}
          className="col-span-2"
        />
      </div>
      
      {connectionType === 'ssh' && (
        <div className="grid grid-cols-12 items-center gap-3">
          <Label htmlFor="user" className="text-right col-span-2 whitespace-nowrap">Username</Label>
          <Input
            id="user"
            placeholder="Username"
            value={formData.user}
            onChange={(e) => handleInputChange('user', e.target.value)}
            className="col-span-4"
          />
          <Label htmlFor="password" className="text-right whitespace-nowrap col-span-2">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            className="col-span-4"
          />
        </div>
      )}
      
      <div className="grid grid-cols-12 items-center gap-3">
        <Label htmlFor="description" className="text-right col-span-2">Description</Label>
        <Textarea
          id="description"
          placeholder="Description (optional)"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          className="col-span-10 h-16"
        />
      </div>
      
      {testStatus === 'success' && (
        <Alert className="bg-green-50 text-green-800 border-green-100">
          <AlertTitle>Connection successful</AlertTitle>
          <AlertDescription className="flex justify-between items-center">
            Successfully connected to the remote machine.
            <Button 
              onClick={onSave}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              Save
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {testStatus === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection failed</AlertTitle>
          <AlertDescription>
            {testError || "Couldn't connect to the remote machine."}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
} 