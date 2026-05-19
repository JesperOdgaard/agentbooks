import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ExpenseCreateForm } from './expense-form'

export default async function NyRejseafregningPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ny rejseafregning</h1>
        <p className="text-gray-500 text-sm mt-1">Registrér udlæg og rejseomkostninger</p>
      </div>

      <ExpenseCreateForm />
    </div>
  )
}
