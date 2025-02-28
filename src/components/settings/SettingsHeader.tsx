import { useRouter } from 'next/navigation';
import { Button } from '@/components/shadcn/button';
import { ArrowLeft } from 'lucide-react';

interface SettingsHeaderProps {
  title: string;
  description?: string;
}

export function SettingsHeader({ title, description }: SettingsHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      </div>
      {description && <p className="text-muted-foreground">{description}</p>}
    </div>
  );
}
