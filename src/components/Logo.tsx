import { useId } from 'react'
import { markSvg } from '../brand/logo'

/** The LankaTwin mark (see src/brand/logo.ts). */
export function Mark({ className = 'size-7', detail = false }: { className?: string; detail?: boolean }) {
  const id = `lt${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return <span className={`inline-block shrink-0 [&>svg]:block [&>svg]:h-full [&>svg]:w-full ${className}`} aria-hidden dangerouslySetInnerHTML={{ __html: markSvg({ id, detail }) }} />
}

/** "LankaTwin" with the second word in the lagoon colour. */
export function Wordmark({ className = '' }: { className?: string }) {
  return <span className={`font-extrabold tracking-tight ${className}`}>Lanka<span className="text-lagoon">Twin</span></span>
}
