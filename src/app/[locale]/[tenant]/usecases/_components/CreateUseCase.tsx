import { PLATFORMS } from '@/app/[locale]/[tenant]/platforms/constants';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import { NewUseCase, Project } from '@/types/usecase';

type CreateUseCaseProps = {
  projects: Project[];
  newUseCase: NewUseCase;
  onClose: () => void;
  onChange: (field: keyof NewUseCase, value: string) => void;
  onSubmit: () => void;
};

export function CreateUseCase({
  projects,
  newUseCase,
  onClose,
  onChange,
  onSubmit,
}: CreateUseCaseProps) {
  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-semibold">Create New Use Case</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Project</label>
          <Select
            value={newUseCase.projectId}
            onValueChange={(value) => onChange('projectId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <Input
            value={newUseCase.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder="Use case name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <Input
            value={newUseCase.description}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="Description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Platform</label>
          <Select
            value={newUseCase.platform}
            onValueChange={(value) => onChange('platform', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a platform" />
            </SelectTrigger>
            <SelectContent>
              {PLATFORMS.map((platform) => (
                <SelectItem key={platform} value={platform}>
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={!newUseCase.projectId || !newUseCase.name}>
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}
