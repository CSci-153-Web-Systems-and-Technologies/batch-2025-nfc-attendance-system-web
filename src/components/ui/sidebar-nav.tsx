'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, Settings, User, LogIn } from 'lucide-react'
import { Button } from './button'

export function SidebarNav() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full bg-violet-50 transition-all duration-300 z-50 ${
          isOpen ? 'w-48' : 'w-16'
        }`}
      >
        {/* Menu Toggle */}
        <div className="p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            className="w-8 h-8 hover:bg-violet-100"
          >
            <Menu className="h-5 w-5 text-gray-700" />
          </Button>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col justify-between h-[calc(100%-5rem)]">
          <div className="flex flex-col gap-2 px-2">
            {/* Add additional nav items here if needed */}
          </div>

          {/* Bottom Navigation */}
          <div className="flex flex-col gap-2 px-2 pb-4">
            {/* Login/Sign Up */}
            <Link href="/login">
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 hover:bg-violet-100 ${
                  !isOpen ? 'px-2' : 'px-3'
                }`}
              >
                <LogIn className="h-5 w-5 text-violet-600 shrink-0" />
                {isOpen && (
                  <span className="text-sm text-gray-700">Login / Sign Up</span>
                )}
              </Button>
            </Link>

            {/* Settings */}
            <Link href="/settings">
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 hover:bg-violet-100 ${
                  !isOpen ? 'px-2' : 'px-3'
                }`}
              >
                <Settings className="h-5 w-5 text-violet-600 shrink-0" />
                {isOpen && <span className="text-sm text-gray-700">Settings</span>}
              </Button>
            </Link>

            {/* User */}
            <Link href="/user">
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 hover:bg-violet-100 ${
                  !isOpen ? 'px-2' : 'px-3'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-white" />
                </div>
                {isOpen && <span className="text-sm text-gray-700">User</span>}
              </Button>
            </Link>
          </div>
        </nav>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
