import { ThemeProvider } from '@/context/ThemeContext';
import { UserProvider } from '@/context/UserContext';
import { TeamProvider } from '@/context/TeamContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <UserProvider>
        <TeamProvider>{children}</TeamProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
