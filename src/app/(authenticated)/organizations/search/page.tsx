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
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50">
      <SearchOrganizationsView userId={user.id} />
    </div>
  )
}
