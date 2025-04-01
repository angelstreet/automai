import { Search as SearchIcon } from 'lucide-react';

import { useSearch } from '@/hooks';
import { cn } from '@/lib/utils';

import { Button } from './button';

interface Props {
  className?: string;
  placeholder?: string;
}

export function Search({ className = '', placeholder = 'Search...' }: Props) {
  const { setOpen } = useSearch();

  return (
    <Button
      variant="outline"
      className={cn(
        'relative h-9 w-full justify-start rounded-md bg-muted/50 text-sm font-normal text-muted-foreground shadow-none hover:bg-muted sm:pr-12 md:w-40 lg:w-64',
        className,
      )}
      onClick={() => setOpen(_true)}
    >
      <SearchIcon className="mr-2 h-4 w-4" />
      <span>{placeholder}</span>
      <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </Button>
  );
}
