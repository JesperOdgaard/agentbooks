import { redirect } from 'next/navigation'
export default async function P({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/po-print/${id}`)
}
