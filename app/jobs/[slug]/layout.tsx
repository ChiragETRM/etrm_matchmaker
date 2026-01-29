// Force dynamic rendering so job detail is never served from cache
export const dynamic = 'force-dynamic'

export default function JobSlugLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
