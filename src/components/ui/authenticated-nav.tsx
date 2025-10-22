'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, Settings, User, Plus } from 'lucide-react'
import { Button } from './button'

export function AuthenticatedNav() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <>
      {/* Mobile Top Navigation */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-violet-50 border-b border-violet-100">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Hamburger Menu */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-9 h-9 hover:bg-violet-100"
            >
              <Menu className="h-5 w-5 text-gray-700" />
            </Button>

            {/* User Icon */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="absolute top-full left-4 mt-2 w-48 bg-white rounded-lg shadow-lg border border-violet-100 overflow-hidden">
            <div className="py-2">
              <Link href="/dashboard/create-event" onClick={() => setIsMobileMenuOpen(false)}>
                <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-violet-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center">
                    <Plus className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm text-gray-700">Create Event</span>
                </button>
              </Link>
              <Link href="/settings" onClick={() => setIsMobileMenuOpen(false)}>
                <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-violet-50 transition-colors">
                  <Settings className="h-5 w-5 text-violet-600" />
                  <span className="text-sm text-gray-700">Settings</span>
                </button>
              </Link>
              <Link href="/user" onClick={() => setIsMobileMenuOpen(false)}>
                <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-violet-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm text-gray-700">User</span>
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:block fixed left-0 top-0 h-full bg-violet-50 transition-all duration-300 z-50 ${
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
          {/* Top Section - Create Event */}
          <div className="flex flex-col gap-2 px-2">
            <Link href="/dashboard/create-event">
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 hover:bg-violet-100 ${
                  !isOpen ? 'px-2' : 'px-3'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
                  <Plus className="h-4 w-4 text-white" />
                </div>
                {isOpen && (
                  <span className="text-sm text-gray-700">Create Event</span>
                )}
              </Button>
            </Link>
          </div>

          {/* Bottom Navigation */}
          <div className="flex flex-col gap-2 px-2 pb-4">
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
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-white" />
                </div>
                {isOpen && <span className="text-sm text-gray-700">User</span>}
              </Button>
            </Link>
          </div>
        </nav>
      </aside>
    </>
  )
}
