import { createSupplier } from '../actions'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NyLeverandoerPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/leverandoerer" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft size={16} />
          Tilbage til leverandører
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Ny leverandør</h1>
        <p className="text-gray-500 text-sm mt-1">Tilføj en ny leverandør til din organisation</p>
      </div>

      <form action={createSupplier} className="space-y-6">
        {/* Stamoplysninger */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Stamoplysninger</h2>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Navn <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="Leverandørens navn"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="cvr" className="block text-sm font-medium text-gray-700 mb-1">
                CVR-nummer
              </label>
              <input
                id="cvr"
                name="cvr"
                type="text"
                placeholder="12345678"
                maxLength={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="payment_terms" className="block text-sm font-medium text-gray-700 mb-1">
                Betalingsbetingelser (dage)
              </label>
              <input
                id="payment_terms"
                name="payment_terms"
                type="number"
                min="0"
                max="365"
                defaultValue="30"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Kontaktoplysninger */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Kontaktoplysninger</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="kontakt@leverandoer.dk"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Telefon
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+45 12 34 56 78"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
              Adresse
            </label>
            <input
              id="address"
              name="address"
              type="text"
              placeholder="Gadenavn 1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-1">
                Postnummer
              </label>
              <input
                id="postal_code"
                name="postal_code"
                type="text"
                placeholder="1234"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                By
              </label>
              <input
                id="city"
                name="city"
                type="text"
                placeholder="København"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Bankoplysninger */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Bankoplysninger</h2>
          <div>
            <label htmlFor="iban" className="block text-sm font-medium text-gray-700 mb-1">
              IBAN
            </label>
            <input
              id="iban"
              name="iban"
              type="text"
              placeholder="DK5000400440116243"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="bank_reg_no" className="block text-sm font-medium text-gray-700 mb-1">
                Reg.nr.
              </label>
              <input
                id="bank_reg_no"
                name="bank_reg_no"
                type="text"
                placeholder="0040"
                maxLength={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="bank_account_no" className="block text-sm font-medium text-gray-700 mb-1">
                Kontonummer
              </label>
              <input
                id="bank_account_no"
                name="bank_account_no"
                type="text"
                placeholder="0440116243"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Noter */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Interne noter
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Tilføj interne noter om leverandøren..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2.5 px-6 rounded-lg text-sm transition-colors"
          >
            Opret leverandør
          </button>
          <Link
            href="/leverandoerer"
            className="py-2.5 px-6 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Annuller
          </Link>
        </div>
      </form>
    </div>
  )
}
