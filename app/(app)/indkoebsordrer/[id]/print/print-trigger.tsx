'use client'

import { useEffect } from 'react'

export function PrintTrigger() {
  useEffect(() => {
    // Lille delay så siden når at rendere
    const t = setTimeout(() => window.print(), 400)
    return () => clearTimeout(t)
  }, [])
  return null
}
