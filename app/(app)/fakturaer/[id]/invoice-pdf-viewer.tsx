'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateInvoiceFile } from '../actions'
import { FileText, Upload, Download, Maximize2, Minimize2 } from 'lucide-react'

export function InvoicePdfViewer({
  invoiceId,
  orgId,
  signedUrl,
  fileName,
}: {
  invoiceId: string
  orgId: string
  signedUrl: string | null
  fileName: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localUrl, setLocalUrl] = useState<string | null>(signedUrl)
  const [localFileName, setLocalFileName] = useState<string | null>(fileName)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    const allowed = ['application/pdf', 'image/png', 'image/jpeg']
    if (!allowed.includes(file.type)) {
      setError('Kun PDF, PNG og JPG er tilladt')
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('Filen må maksimalt være 20 MB')
      return
    }

    setError(null)
    setUploading(true)

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'pdf'
    const validExt = ['pdf', 'png', 'jpg', 'jpeg'].includes(ext) ? ext : 'pdf'
    const storagePath = `${orgId}/${invoiceId}/faktura.${validExt}`

    const supabase = createClient()
    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(storagePath, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      setError('Upload fejlede: ' + uploadError.message)
      setUploading(false)
      return
    }

    // Lav signed URL til preview
    const { data: signedData } = await supabase.storage
      .from('invoices')
      .createSignedUrl(storagePath, 3600)

    // Opdatér DB
    const result = await updateInvoiceFile(invoiceId, storagePath, file.name, validExt, file.size)
    if (result.error) {
      setError(result.error)
    } else {
      setLocalUrl(signedData?.signedUrl ?? null)
      setLocalFileName(file.name)
    }

    setUploading(false)
    // Nulstil input så samme fil kan uploades igen
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Upload-zone (ingen fil endnu) ────────────────────────────────────────
  if (!localUrl) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Fakturadokument</h2>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const file = e.dataTransfer.files[0]
            if (file) handleFile(file)
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-emerald-400 bg-emerald-50'
              : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
          } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
        >
          <Upload size={28} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">
            {uploading ? 'Uploader...' : 'Træk og slip faktura her'}
          </p>
          <p className="text-xs text-gray-400 mt-1">eller klik for at vælge fil</p>
          <p className="text-xs text-gray-300 mt-3">PDF, PNG eller JPG · Maks. 20 MB</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      </div>
    )
  }

  // ── Viewer (fil eksisterer) ───────────────────────────────────────────────
  const isPdf = (localFileName ?? '').toLowerCase().endsWith('.pdf')

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header-bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={15} className="text-gray-400 flex-shrink-0" />
          <span className="text-sm font-semibold text-gray-900">Fakturadokument</span>
          {localFileName && (
            <span className="text-xs text-gray-400 truncate hidden sm:block">
              · {localFileName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <a
            href={localUrl}
            download={localFileName ?? 'faktura'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-2.5 py-1.5 rounded-lg hover:bg-white transition-colors"
          >
            <Download size={12} />
            Download
          </a>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-2.5 py-1.5 rounded-lg hover:bg-white transition-colors disabled:opacity-50"
          >
            <Upload size={12} />
            {uploading ? 'Uploader...' : 'Erstat'}
          </button>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-2.5 py-1.5 rounded-lg hover:bg-white transition-colors"
          >
            {expanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            {expanded ? 'Minimer' : 'Udvid'}
          </button>
        </div>
      </div>

      {/* Dokumentvisning */}
      <div className={`transition-all duration-200 ${expanded ? 'h-[80vh]' : 'h-[520px]'}`}>
        {isPdf ? (
          <iframe
            src={`${localUrl}#toolbar=1&navpanes=0&scrollbar=1`}
            className="w-full h-full border-0 block"
            title="Faktura PDF"
          />
        ) : (
          <div className="w-full h-full overflow-auto flex items-center justify-center bg-gray-50 p-6">
            <img
              src={localUrl}
              alt="Faktura"
              className="max-w-full max-h-full object-contain rounded-lg shadow"
            />
          </div>
        )}
      </div>

      {/* Skjult file-input til erstat */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
      {error && (
        <p className="text-sm text-red-600 px-5 py-2 border-t border-gray-100">{error}</p>
      )}
    </div>
  )
}
