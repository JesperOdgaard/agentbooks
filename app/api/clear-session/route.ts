import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const response = NextResponse.redirect('http://localhost:3000/signup')
  return response
}
