import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { POCreateForm } from './po-create-form'

export default async function NyIndkoebsOrdrePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('id, name')
    .eq('status', 'active')
    .order('name', { ascending: true })

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ny indkøbsordre</h1>
        <p className="text-gray-500 text-sm mt-1">Udfyld oplysningerne og tilføj varer/ydelser</p>
      </div>

      <POCreateForm suppliers={suppliers ?? []} />
    </div>
  )
}
