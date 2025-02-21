import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const roles = [
  { value: "admin", label: "Administrator" },
  { value: "developer", label: "Developer" },
  { value: "tester", label: "Tester" },
  { value: "viewer", label: "Viewer" },
] as const;

export type Role = (typeof roles)[number]["value"];

interface RoleSwitcherProps {
  currentRole: Role;
  onRoleChange: (role: Role) => void;
  className?: string;
}

export function RoleSwitcher({ currentRole, onRoleChange, className }: RoleSwitcherProps) {
  const [open, setOpen] = React.useState(false);

  const currentRoleLabel = roles.find((role) => role.value === currentRole)?.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-[200px] justify-between", className)}
        >
          {currentRoleLabel}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search role..." />
          <CommandEmpty>No role found.</CommandEmpty>
          <CommandGroup>
            {roles.map((role) => (
              <CommandItem
                key={role.value}
                value={role.value}
                onSelect={(currentValue) => {
                  onRoleChange(currentValue as Role);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    currentRole === role.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {role.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
} 