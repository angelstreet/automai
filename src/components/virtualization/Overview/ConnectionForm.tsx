import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Check, CheckCircle, Loader2, ShieldAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface FormData {
  name: string;
  description: string;
  type: string;
  ip: string;
  port: string;
  username: string;
  password: string;
}

interface ConnectionFormProps {
  formData: FormData;
  onChange: (formData: FormData) => void;
  onSave?: () => void;
  onTestSuccess?: () => void;
}

export function ConnectionForm({ 
  formData, 
  onChange, 
  onSave,
  onTestSuccess
}: ConnectionFormProps) {
  const [connectionType, setConnectionType] = useState<'ssh' | 'docker' | 'portainer'>(
    formData.type as 'ssh' | 'docker' | 'portainer'
  );

  // State variables for testing status
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testSuccess, setTestSuccess] = useState(false);

  // State for fingerprint verification
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [fingerprintVerified, setFingerprintVerified] = useState(false);
  const [requireVerification, setRequireVerification] = useState(false);

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

  // Handle keydown event to trigger test connection on Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !testing) {
      e.preventDefault();
      testConnection();
    }
  };

  // Update the testConnection function to handle fingerprint verification
  const testConnection = async () => {
    setTesting(true);
    setTestError(null);
    setTestSuccess(false);
    setFingerprint(null);
    setRequireVerification(false);
    setFingerprintVerified(false);
    
    try {
      const response = await fetch('/api/virtualization/machines/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: formData.type,
          ip: formData.ip,
          port: formData.port,
          username: formData.username,
          password: formData.password,
        }),
      });
      
      const data = await response.json();
      
      if (response.status === 428) {
        // Fingerprint verification required
        setRequireVerification(true);
        setFingerprint(data.fingerprint);
        setTestError(data.message);
      } else if (data.success) {
        setTestSuccess(true);
        // If the response includes fingerprint information
        if (data.fingerprint) {
          setFingerprint(data.fingerprint);
          setFingerprintVerified(data.fingerprintVerified || false);
        }
        // Notify parent component of successful test
        if (onTestSuccess) {
          onTestSuccess();
        }
      } else {
        setTestError(data.message);
      }
    } catch (error) {
      setTestError('Failed to test connection');
      console.error('Error testing connection:', error);
    } finally {
      setTesting(false);
    }
  };

  // Add a function to verify fingerprint
  const verifyFingerprint = async () => {
    setTesting(true);
    setTestError(null);
    
    try {
      const response = await fetch('/api/virtualization/machines/verify-fingerprint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: formData.type,
          ip: formData.ip,
          port: formData.port,
          username: formData.username,
          password: formData.password,
          fingerprint: fingerprint,
          accept: true
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setTestSuccess(true);
        setFingerprintVerified(true);
        setRequireVerification(false);
      } else {
        setTestError(data.message);
      }
    } catch (error) {
      setTestError('Failed to verify fingerprint');
      console.error('Error verifying fingerprint:', error);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-3 py-2">
      <form onKeyDown={handleKeyDown} onSubmit={(e) => e.preventDefault()}>
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
        
        <div className="grid grid-cols-12 items-center gap-3 mt-3">
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
        
        <div className="grid grid-cols-12 items-center gap-3 mt-3">
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
          <div className="grid grid-cols-12 items-center gap-3 mt-3">
            <Label htmlFor="username" className="text-right col-span-2 whitespace-nowrap">Username</Label>
            <Input
              id="username"
              placeholder="Username"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
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
        
        <div className="grid grid-cols-12 items-center gap-3 mt-3">
          <Label htmlFor="description" className="text-right col-span-2">Description</Label>
          <Textarea
            id="description"
            placeholder="Description (optional)"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="col-span-10 h-16"
          />
        </div>
        
        <div className="flex justify-end space-x-2 mt-4">
          <Button 
            variant="outline" 
            onClick={testConnection}
            disabled={testing}
            type="button"
          >
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>Test Connection</>
            )}
          </Button>
          
          {onSave && (
            <Button 
              onClick={onSave}
              disabled={!testSuccess}
              type="button"
            >
              Save
            </Button>
          )}
        </div>
      </form>
      
      {requireVerification && fingerprint && (
        <Alert className="mt-4">
          <AlertTitle className="flex items-center">
            <ShieldAlert className="h-4 w-4 mr-2" />
            Host Key Verification Failed
          </AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-2">The authenticity of host '{formData.ip}' can't be established.</p>
            <p className="mb-2">Fingerprint: <code className="bg-muted p-1 rounded">{fingerprint}</code></p>
            <p className="mb-4">Are you sure you want to continue connecting?</p>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={verifyFingerprint}
                disabled={testing}
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Yes, trust this host
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setRequireVerification(false)}
              >
                <X className="h-4 w-4 mr-2" />
                No, cancel
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {testError && !requireVerification && (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle className="flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            Connection Failed
          </AlertTitle>
          <AlertDescription>
            {testError}
          </AlertDescription>
        </Alert>
      )}
      
      {testSuccess && (
        <Alert className="mt-4" variant="success">
          <AlertTitle className="flex items-center">
            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
            Connection Successful
          </AlertTitle>
          <AlertDescription>
            <p>Successfully connected to the remote machine</p>
            {fingerprint && (
              <p className="mt-2">
                <span className="font-medium">Host fingerprint:</span>{' '}
                <code className="bg-muted p-1 rounded">{fingerprint}</code>{' '}
                {fingerprintVerified && <Badge variant="outline" className="ml-2">Verified</Badge>}
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
} 