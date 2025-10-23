'use client'

import { createClient } from '@/lib/client'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

interface LogoutButtonProps {
  isExpanded?: boolean
}

export function LogoutButton({ isExpanded = true }: LogoutButtonProps) {
  const router = useRouter()

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <Button 
      onClick={logout}
      variant="ghost"
      className={`w-full justify-start gap-3 hover:bg-violet-100 ${
        !isExpanded ? 'px-2' : 'px-3'
      }`}
    >
      <LogOut className="h-5 w-5 text-red-600 shrink-0" />
      {isExpanded && <span className="text-sm text-gray-700">Logout</span>}
    </Button>
  )
}
