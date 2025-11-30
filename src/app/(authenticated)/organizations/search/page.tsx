import { redirect } from 'next/navigation'
import { createClient } from '@/lib/server'
import { SearchOrganizationsView } from '@/components/organizations/search-organizations-view'

export default async function SearchOrganizationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-page">
      <SearchOrganizationsView userId={user.id} />
    </div>
  )
}
