import { SidebarNav } from "@/components/ui/sidebar-nav"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-card">
      <SidebarNav />
      <main className="flex-1 md:ml-16 pt-16 md:pt-0">
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 p-6 md:p-10">
          <div className="flex w-full max-w-sm flex-col gap-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
