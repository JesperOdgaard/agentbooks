'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createInvoiceFromUpload } from './actions'
import { scanInvoiceWithAI } from './scan-action'
import { Upload, Camera, CheckCircle, AlertCircle, Loader2, X, ScanLine } from 'lucide-react'

const ALLOWED_EXT = ['pdf', 'png', 'jpg', 'jpeg']
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
const MAX_SIZE_MB = 20

interface UploadItem {
  id: string
  file: File
  status: 'queued' | 'uploading' | 'scanning' | 'done' | 'error'
  invoiceId?: string
  error?: string
  progress: number
}

function fileExt(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return ALLOWED_EXT.includes(ext) ? ext : 'pdf'
}

function isAllowed(file: File): boolean {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return ALLOWED_TYPES.includes(file.type) || ALLOWED_EXT.includes(ext)
}

export function InvoiceUploadZone() {
  const [orgId, setOrgId] = useState<string | null>(null)
  // Ref sikrer at uploadOne altid læser den seneste orgId — ingen race condition
  const orgIdRef = useRef<string | null>(null)

  // Hent orgId klient-side — virker uanset server-side session-state
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return

      // Prøv først organization_members-tabellen
      supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle()
        .then(({ data }) => {
          const id = data?.organization_id ?? (user.user_metadata?.organization_id as string | undefined)
          if (id) {
            orgIdRef.current = id
            setOrgId(id)
          }
        })
    })
  }, [])
  const router = useRouter()
  const [dragOver, setDragOver] = useState(false)
  const [items, setItems] = useState<UploadItem[]>([])
  const [collapsed, setCollapsed] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  // Tæller til at håndtere dragLeave korrekt når musen bevæger sig over child-elementer
  const dragCounter = useRef(0)
  const uploadingRef = useRef(false)

  const updateItem = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)))
  }, [])

  async function uploadOne(item: UploadItem) {
    // Vent op til 3 sek på at orgId indlæses (race condition ved hurtig upload)
    if (!orgIdRef.current) {
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 100))
        if (orgIdRef.current) break
      }
    }
    if (!orgIdRef.current) {
      updateItem(item.id, { status: 'error', error: 'Ingen organisation fundet — prøv at genindlæse siden', progress: 0 })
      return
    }
    const ext = fileExt(item.file)
    const storagePath = `${orgIdRef.current}/${item.id}/faktura.${ext}`

    updateItem(item.id, { status: 'uploading', progress: 20 })

    const supabase = createClient()
    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(storagePath, item.file, { upsert: true, contentType: item.file.type || 'application/octet-stream' })

    if (uploadError) {
      updateItem(item.id, { status: 'error', error: uploadError.message, progress: 0 })
      return
    }

    updateItem(item.id, { progress: 75 })

    const result = await createInvoiceFromUpload(storagePath, item.file.name, ext, item.file.size)

    if (result.error || !result.invoiceId) {
      updateItem(item.id, { status: 'error', error: result.error ?? 'Ukendt fejl', progress: 0 })
      return
    }

    updateItem(item.id, { status: 'scanning', invoiceId: result.invoiceId, progress: 90 })

    // AI-scanning (springer over på Starter-plan)
    await scanInvoiceWithAI(result.invoiceId)

    updateItem(item.id, { status: 'done', invoiceId: result.invoiceId, progress: 100 })
    router.refresh()
  }

  async function processQueue(newItems: UploadItem[]) {
    // Tilføj til listen med det samme
    setItems((prev) => [...prev, ...newItems])

    // Hvis der allerede uploades, lad den kørende loop håndtere dem
    if (uploadingRef.current) return
    uploadingRef.current = true

    // Upload ét ad gangen
    for (const item of newItems) {
      await uploadOne(item)
    }

    uploadingRef.current = false
  }

  function enqueue(files: File[]) {
    const valid = files
      .filter((f) => isAllowed(f) && f.size <= MAX_SIZE_MB * 1024 * 1024)
      .map((f): UploadItem => ({
        id: crypto.randomUUID(),
        file: f,
        status: 'queued',
        progress: 0,
      }))

    if (valid.length === 0) return
    setCollapsed(false)
    processQueue(valid)
  }

  // ── Drag handlers — bruger tæller for at undgå false dragLeave ved child-elementer ──

  function onDragEnter(e: React.DragEvent) {
    e.preventDefault()
    dragCounter.current += 1
    if (dragCounter.current === 1) setDragOver(true)
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault()
    dragCounter.current -= 1
    if (dragCounter.current === 0) setDragOver(false)
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault() // PÅKRÆVET for at tillade drop
    e.dataTransfer.dropEffect = 'copy'
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    dragCounter.current = 0
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    enqueue(files)
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    enqueue(Array.from(e.target.files ?? []))
    e.target.value = '' // Nulstil så samme fil kan vælges igen
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((it) => it.id !== id))
  }

  const busyCount = items.filter((i) => i.status === 'uploading' || i.status === 'queued' || i.status === 'scanning').length
  const doneCount = items.filter((i) => i.status === 'done').length
  const errorCount = items.filter((i) => i.status === 'error').length

  return (
    <div className="mb-6">
      {/* Drop-zone */}
      <div
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={`relative border-2 border-dashed rounded-xl px-6 py-7 text-center transition-all ${
          dragOver
            ? 'border-emerald-400 bg-emerald-50 scale-[1.005]'
            : 'border-gray-200 bg-white hover:border-emerald-300 hover:bg-gray-50'
        }`}
      >
        {/* Indhold — IKKE pointer-events-none, da det kan forstyrre drag */}
        <div className="flex flex-col items-center gap-1 select-none">
          <Upload size={22} className={`mb-1 ${dragOver ? 'text-emerald-500' : 'text-gray-400'}`} />
          <p className="text-sm font-medium text-gray-700">
            {dragOver ? 'Slip filerne her' : 'Træk fakturaer hertil eller klik for at uploade'}
          </p>
          <p className="text-xs text-gray-400">
            Understøtter PDF, PNG, JPG · Batch-upload mulig
          </p>
          {/* Klik-knap midt i zonen */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 px-4 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
          >
            Vælg filer
          </button>
        </div>

        {/* Kamera-knap */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="absolute top-3 right-3 flex flex-col items-center gap-0.5 text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-white"
        >
          <Camera size={18} />
          <span className="text-[10px]">Kamera</span>
        </button>
      </div>

      {/* Skjulte inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg"
        className="hidden"
        onChange={onFileInput}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFileInput}
      />

      {/* Upload-kø */}
      {items.length > 0 && (
        <div className="mt-3 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2 text-sm">
              {busyCount > 0 ? (
                <>
                  <Loader2 size={14} className="animate-spin text-emerald-500" />
                  <span className="text-gray-700 font-medium">
                    Uploader {busyCount} fil{busyCount !== 1 ? 'er' : ''}…
                  </span>
                </>
              ) : errorCount === 0 ? (
                <>
                  <CheckCircle size={14} className="text-emerald-500" />
                  <span className="text-gray-700 font-medium">{doneCount} oprettet</span>
                </>
              ) : (
                <>
                  <AlertCircle size={14} className="text-orange-500" />
                  <span className="text-gray-700 font-medium">
                    {doneCount} oprettet, {errorCount} fejlede
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              {busyCount === 0 && (
                <button
                  type="button"
                  onClick={() => setItems([])}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Ryd
                </button>
              )}
              <button
                type="button"
                onClick={() => setCollapsed((v) => !v)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                {collapsed ? 'Vis' : 'Skjul'}
              </button>
            </div>
          </div>

          {!collapsed && (
            <ul className="divide-y divide-gray-50">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-shrink-0 w-6 flex items-center justify-center">
                    {item.status === 'uploading' || item.status === 'queued' ? (
                      <Loader2 size={15} className="animate-spin text-emerald-500" />
                    ) : item.status === 'scanning' ? (
                      <ScanLine size={15} className="animate-pulse text-blue-500" />
                    ) : item.status === 'done' ? (
                      <CheckCircle size={15} className="text-emerald-500" />
                    ) : (
                      <AlertCircle size={15} className="text-red-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-gray-800 truncate">{item.file.name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {(item.file.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                    </div>
                    {(item.status === 'uploading' || item.status === 'scanning') && (
                      <div className="mt-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${item.status === 'scanning' ? 'bg-blue-400' : 'bg-emerald-400'}`}
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}
                    {item.status === 'scanning' && (
                      <p className="text-xs text-blue-500 mt-0.5">AI aflæser faktura…</p>
                    )}
                    {item.status === 'error' && (
                      <p className="text-xs text-red-500 mt-0.5">{item.error}</p>
                    )}
                    {item.status === 'done' && item.invoiceId && (
                      <a
                        href={`/fakturaer/${item.invoiceId}`}
                        className="text-xs text-emerald-600 hover:underline mt-0.5 block"
                      >
                        Udfyld fakturadetaljer →
                      </a>
                    )}
                  </div>

                  {(item.status === 'done' || item.status === 'error') && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="flex-shrink-0 text-gray-300 hover:text-gray-500 ml-1"
                    >
                      <X size={13} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
