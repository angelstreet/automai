import { Machine } from '@/types/virtualization';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { HostCard } from './HostCard';

interface HostGridProps {
  machines: Machine[];
  selectedMachines: Set<string>;
  selectMode: boolean;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  onTestConnection?: (machine: Machine) => void;
}

export function HostGrid({
  machines,
  selectedMachines,
  selectMode,
  onSelect,
  onDelete,
  onTestConnection,
}: HostGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {machines.map((machine) => (
        <div key={machine.id} className={cn({
          "opacity-70": selectMode && !selectedMachines.has(machine.id)
        })}>
          <div className="relative">
            {selectMode && (
              <div className="absolute right-4 top-4 z-10">
                <Checkbox
                  checked={selectedMachines.has(machine.id)}
                  onCheckedChange={() => onSelect(machine.id)}
                  aria-label="Select machine"
                />
              </div>
            )}
            <HostCard
              machine={machine}
              onDelete={onDelete}
              onTestConnection={onTestConnection}
            />
          </div>
        </div>
      ))}
    </div>
  );
} 