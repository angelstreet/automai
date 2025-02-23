import * as React from 'react'
import { useRouter } from 'next/navigation'
import { User } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useUser } from '@/lib/contexts/UserContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import * as Avatar from '@radix-ui/react-avatar'

interface UserProfileProps {
  tenant?: string
}

export function UserProfile({ tenant }: UserProfileProps) {
  const router = useRouter()
  const { logout, user } = useUser()
  const locale = 'en' // You might want to get this from your i18n system

  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false })
      logout()
      router.push(`/${locale}/login`)
    } catch (error) {
      console.error('Error during sign out:', error)
      router.push(`/${locale}/login`)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar.Root className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <Avatar.Image
              src={user?.image || ''}
              alt={user?.name || ''}
              className="h-full w-full rounded-full object-cover"
            />
            <Avatar.Fallback className="flex h-full w-full items-center justify-center rounded-full">
              <User className="h-4 w-4 text-foreground/60" />
            </Avatar.Fallback>
          </Avatar.Root>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push(`/${locale}/${tenant}/profile`)}>
          Profile
          <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/${locale}/${tenant}/settings`)}>
          Settings
          <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          Log out
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 