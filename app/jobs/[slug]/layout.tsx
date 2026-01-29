// Force dynamic rendering so /jobs/[slug] always fetches fresh data
// and avoids serving cached/wrong content (e.g. post-job or list)
export const dynamic = 'force-dynamic'

export default function JobSlugLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
