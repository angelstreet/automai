import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

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
}

export function ConnectionForm({ 
  formData, 
  onChange, 
  testStatus, 
  testError 
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
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          placeholder="Client name"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="type">Connection Type</Label>
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
      
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-2">
          <Label htmlFor="ip">IP Address</Label>
          <Input
            id="ip"
            placeholder="IP Address"
            value={formData.ip}
            onChange={(e) => handleInputChange('ip', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="port">Port</Label>
          <Input
            id="port"
            placeholder="Port"
            value={formData.port}
            onChange={(e) => handleInputChange('port', e.target.value)}
          />
        </div>
      </div>
      
      {connectionType === 'ssh' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="user">Username</Label>
            <Input
              id="user"
              placeholder="Username"
              value={formData.user}
              onChange={(e) => handleInputChange('user', e.target.value)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
            />
          </div>
        </>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Description (optional)"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
        />
      </div>
      
      {testStatus === 'success' && (
        <Alert className="bg-green-50 text-green-800 border-green-100">
          <AlertTitle>Connection successful</AlertTitle>
          <AlertDescription>
            Successfully connected to the remote machine.
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