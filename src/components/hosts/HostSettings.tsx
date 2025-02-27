import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Button } from '@/components/shadcn/button';
import { Textarea } from '@/components/shadcn/textarea';
import { VMConfig } from '@/types/hosts';

interface VMSettingsProps {
  config: VMConfig;
  onSave: (config: VMConfig) => void;
}

export function VMSettings({ config, onSave }: VMSettingsProps) {
  const [formData, setFormData] = useState<VMConfig>(config);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>VM Configuration</CardTitle>
        <CardDescription>Configure the virtual host settings.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter VM name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Input
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                placeholder="VM type"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image">Image</Label>
              <Input
                id="image"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="Docker image"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpu">CPU Cores</Label>
              <Input
                id="cpu"
                type="number"
                value={formData.cpu}
                onChange={(e) => setFormData({ ...formData, cpu: parseInt(e.target.value) })}
                placeholder="Number of CPU cores"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memory">Memory (MB)</Label>
              <Input
                id="memory"
                type="number"
                value={formData.memory}
                onChange={(e) => setFormData({ ...formData, memory: parseInt(e.target.value) })}
                placeholder="Memory in MB"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter VM description"
              className="min-h-[100px]"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="submit" size="sm">
              Save Changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
