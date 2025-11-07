import { redirect } from 'next/navigation'
import { createClient } from '@/lib/server'
import Link from 'next/link'
import { Calendar } from 'lucide-react'

export default async function Home() {
  // Check if user is authenticated and redirect to dashboard
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (session) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
              <Calendar className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            NFC Attendance System
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Streamline your event attendance tracking with NFC technology. 
            Manage events, track attendance, and analyze participation all in one place.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link 
              href="/sign-up"
              className="w-full sm:w-auto px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors shadow-lg hover:shadow-xl"
            >
              Get Started
            </Link>
            <Link 
              href="/login"
              className="w-full sm:w-auto px-8 py-3 bg-card hover:bg-accent text-primary font-medium rounded-lg border-2 border-primary transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-card rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow border border-border">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Event Management</h3>
            <p className="text-muted-foreground">
              Create and manage events with ease. Track attendance in real-time.
            </p>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow border border-border">
            <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-accent-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">NFC Technology</h3>
            <p className="text-muted-foreground">
              Quick and secure check-ins using NFC-enabled devices.
            </p>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow border border-border">
            <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-secondary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Analytics</h3>
            <p className="text-muted-foreground">
              Get insights into attendance patterns and event participation.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16 border-t border-border">
        <div className="text-center text-muted-foreground text-sm">
          <p>© 2025 NFC Attendance System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
