'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, Settings, User, LogIn, X, Building2 } from 'lucide-react'
import { Button } from './button'
import { ThemeToggle } from './theme-toggle'

export function SidebarNav() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <>
      {/* Mobile Top Navigation - visible on small screens */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Hamburger Menu */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-9 h-9 hover:bg-accent hover:text-accent-foreground"
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* User Icon */}
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <User className="h-4 w-4 text-primary-foreground" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <ThemeToggle />
            
            {/* Login / Sign Up Button */}
            <Link href="/login">
              <Button
                variant="ghost"
                className="text-primary hover:bg-accent hover:text-accent-foreground text-sm font-medium"
              >
                Login / Sign Up
              </Button>
            </Link>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="absolute top-full left-4 mt-2 w-48 bg-card rounded-lg shadow-lg border border-border overflow-hidden">
            <div className="py-2">
              <Link href="/user" onClick={() => setIsMobileMenuOpen(false)}>
                <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent hover:text-accent-foreground transition-colors">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <span className="text-sm text-foreground">User</span>
                </button>
              </Link>
              <Link href="/organizations" onClick={() => setIsMobileMenuOpen(false)}>
                <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent hover:text-accent-foreground transition-colors">
                  <Building2 className="h-5 w-5 text-primary" />
                  <span className="text-sm text-foreground">Organizations</span>
                </button>
              </Link>
              <Link href="/settings" onClick={() => setIsMobileMenuOpen(false)}>
                <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent hover:text-accent-foreground transition-colors">
                  <Settings className="h-5 w-5 text-primary" />
                  <span className="text-sm text-foreground">Settings</span>
                </button>
              </Link>
              
              {/* Theme Toggle in Mobile Menu */}
              <div className="border-t border-border mt-2 pt-2">
                <div className="flex items-center gap-3 px-4 py-3">
                  <ThemeToggle />
                  <span className="text-sm text-foreground">Toggle Theme</span>
                </div>
              </div>
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

      {/* Desktop Sidebar - visible on medium screens and up */}
      <aside
        className={`hidden md:block fixed left-0 top-0 h-full bg-card border-r border-border transition-all duration-300 z-50 ${
          isOpen ? 'w-48' : 'w-16'
        }`}
      >
        {/* Menu Toggle */}
        <div className="p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            className="w-8 h-8 hover:bg-accent hover:text-accent-foreground"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col justify-between h-[calc(100%-5rem)]">
          <div className="flex flex-col gap-2 px-2">
            {/* Organizations */}
            <Link href="/organizations">
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 hover:bg-accent hover:text-accent-foreground ${
                  !isOpen ? 'px-2' : 'px-3'
                }`}
              >
                <Building2 className="h-5 w-5 text-primary shrink-0" />
                {isOpen && <span className="text-sm text-foreground">Organizations</span>}
              </Button>
            </Link>
          </div>

          {/* Bottom Navigation */}
          <div className="flex flex-col gap-2 px-2 pb-4">
            {/* Theme Toggle */}
            <div className={`flex items-center ${!isOpen ? 'justify-center px-2' : 'justify-start px-3 gap-3'}`}>
              <ThemeToggle />
              {isOpen && <span className="text-sm text-foreground">Theme</span>}
            </div>

            {/* Login/Sign Up */}
            <Link href="/login">
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 hover:bg-accent hover:text-accent-foreground ${
                  !isOpen ? 'px-2' : 'px-3'
                }`}
              >
                <LogIn className="h-5 w-5 text-primary shrink-0" />
                {isOpen && (
                  <span className="text-sm text-foreground">Login / Sign Up</span>
                )}
              </Button>
            </Link>

            {/* Settings */}
            <Link href="/settings">
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 hover:bg-accent hover:text-accent-foreground ${
                  !isOpen ? 'px-2' : 'px-3'
                }`}
              >
                <Settings className="h-5 w-5 text-primary shrink-0" />
                {isOpen && <span className="text-sm text-foreground">Settings</span>}
              </Button>
            </Link>

            {/* User */}
            <Link href="/user">
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 hover:bg-accent hover:text-accent-foreground ${
                  !isOpen ? 'px-2' : 'px-3'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
                {isOpen && <span className="text-sm text-foreground">User</span>}
              </Button>
            </Link>
          </div>
        </nav>
      </aside>
    </>
  )
}
