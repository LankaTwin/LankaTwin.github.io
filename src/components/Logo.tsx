import { useId } from 'react'
import { markSvg } from '../brand/logo'

/** The LankaTwin mark (see src/brand/logo.ts). */
export function Mark({ className = 'size-7', detail = false }: { className?: string; detail?: boolean }) {
  const id = `lt${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  return <span className={`inline-block shrink-0 [&>svg]:block [&>svg]:h-full [&>svg]:w-full ${className}`} aria-hidden dangerouslySetInnerHTML={{ __html: markSvg({ id, detail }) }} />
}

/** "LankaTwin" with the second word in the lagoon colour; `full` adds the full name beneath. */
export function Wordmark({ className = '', full }: { className?: string; full?: string }) {
  const name = <span className="font-extrabold tracking-tight">Lanka<span className="text-lagoon">Twin</span></span>
  if (!full) return <span className={className}>{name}</span>
  return (
    <span className={`flex flex-col leading-none ${className}`}>
      {name}
      <span className="mt-0.5 text-[10px] font-medium tracking-normal text-muted">{full}</span>
    </span>
  )
}
