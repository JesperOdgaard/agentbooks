import { getInvitationByToken } from './actions'
import { InvitationForm } from './invitation-form'
import Link from 'next/link'

export default async function InvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  // Ingen token i URL
  if (!token) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Intet invitationslink</h2>
        <p className="text-gray-500 text-sm">Der er ikke angivet et gyldigt invitationslink.</p>
        <Link href="/login" className="inline-block mt-4 text-sm text-emerald-600 hover:underline">
          Gå til login →
        </Link>
      </div>
    )
  }

  // Hent invitation fra DB
  const invitation = await getInvitationByToken(token)

  // Ugyldig eller udløbet token
  if (!invitation) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Invitation ugyldig</h2>
        <p className="text-gray-500 text-sm mb-1">
          Invitationen er enten udløbet, allerede brugt eller ugyldig.
        </p>
        <p className="text-xs text-gray-400">Kontakt din administrator for at få en ny invitation.</p>
        <Link href="/login" className="inline-block mt-4 text-sm text-emerald-600 hover:underline">
          Gå til login →
        </Link>
      </div>
    )
  }

  return <InvitationForm invitation={invitation} token={token} />
}
