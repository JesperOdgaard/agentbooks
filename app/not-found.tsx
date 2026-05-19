import Link from 'next/link'
import { FileQuestion } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <FileQuestion size={28} className="text-emerald-500" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
        <p className="text-lg font-semibold text-gray-700 mb-2">Siden findes ikke</p>
        <p className="text-sm text-gray-400 mb-8">
          Den side du leder efter eksisterer ikke eller er blevet flyttet.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 text-white text-sm font-medium rounded-xl hover:bg-emerald-600 transition-colors"
        >
          Tilbage til dashboard
        </Link>
      </div>
    </div>
  )
}
