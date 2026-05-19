import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Prøv at hente org fra user metadata først (hurtig, ingen DB-query)
  const metaOrgId = user.user_metadata?.organization_id as string | undefined
  const metaOrgRole = user.user_metadata?.role as string | undefined

  let orgName = 'Min virksomhed'
  let userFullName = user.user_metadata?.full_name as string | null ?? null

  if (metaOrgId) {
    // Hent org-navn fra databasen
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', metaOrgId)
      .single()
    if (org) orgName = org.name
  } else {
    // Fallback: søg i organization_members
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, organizations(name)')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (!membership) {
      // Bruger er logget ind men har ingen org — vis fejlside i stedet for redirect-loop
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md text-center">
            <h1 className="text-xl font-bold text-gray-900 mb-2">Ingen virksomhed fundet</h1>
            <p className="text-gray-500 text-sm mb-4">
              Din konto er ikke tilknyttet en virksomhed. Kontakt support eller opret en ny virksomhed.
            </p>
            <a
              href="/login"
              className="inline-block px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600"
            >
              Log ud og prøv igen
            </a>
          </div>
        </div>
      )
    }

    const org = membership.organizations as { name: string } | null
    if (org) orgName = org.name
  }

  // Hent profil (navn)
  if (!userFullName) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    userFullName = profile?.full_name ?? null
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        orgName={orgName}
        userFullName={userFullName}
        userEmail={user.email ?? ''}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
