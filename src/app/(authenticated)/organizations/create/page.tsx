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
    <div className="min-h-screen bg-gradient-page">
      <CreateOrganizationView userId={user.id} />
    </div>
  )
}
