export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center relative overflow-hidden flex-shrink-0"
              style={{ backgroundColor: '#1B2966' }}
            >
              <span className="text-white font-bold text-base leading-none">A</span>
              <span
                className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: '#F5A623' }}
              />
            </div>
            <span className="text-xl font-bold" style={{ color: '#1B2966' }}>
              Alvio.AI
            </span>
          </div>
          <p className="text-sm text-gray-500">Fakturaflow og udgiftsstyring</p>
        </div>
        {children}
      </div>
    </div>
  )
}
