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
    <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-sm border-b border-border">
      <div className="flex items-center gap-3 px-4 py-3">
        {showMenu && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="w-8 h-8 hover:bg-accent hover:text-accent-foreground lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        
        {showBack && (
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="gap-2 text-primary hover:bg-accent hover:text-accent-foreground px-3"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back</span>
          </Button>
        )}

        {title && (
          <h1 className="text-lg font-medium text-foreground">{title}</h1>
        )}
      </div>
    </header>
  )
}
