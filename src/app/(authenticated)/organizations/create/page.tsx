import { redirect } from 'next/navigation'
import { createClient } from '@/lib/server'
import { CreateOrganizationView } from '@/components/organizations/create-organization-view'

export default async function CreateOrganizationPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50">
      <CreateOrganizationView userId={user.id} />
    </div>
  )
}
