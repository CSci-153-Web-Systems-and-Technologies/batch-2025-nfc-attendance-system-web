'use client'

import { ArrowLeft, Menu } from 'lucide-react'
import { Button } from './button'
import { useRouter } from 'next/navigation'

interface TopNavProps {
  showBack?: boolean
  title?: string
  showMenu?: boolean
  onMenuClick?: () => void
}

export function TopNav({ showBack, title, showMenu, onMenuClick }: TopNavProps) {
  const router = useRouter()

  return (
    <header className="sticky top-0 z-30 bg-violet-50/80 backdrop-blur-sm border-b border-violet-100">
      <div className="flex items-center gap-3 px-4 py-3">
        {showMenu && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="w-8 h-8 hover:bg-violet-100 lg:hidden"
          >
            <Menu className="h-5 w-5 text-gray-700" />
          </Button>
        )}
        
        {showBack && (
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="gap-2 text-violet-600 hover:bg-violet-100 px-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back</span>
          </Button>
        )}

        {title && (
          <h1 className="text-lg font-medium text-gray-900">{title}</h1>
        )}
      </div>
    </header>
  )
}
