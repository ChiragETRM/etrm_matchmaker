import { redirect } from 'next/navigation'

export default function JobRedirectPage({ params }: { params: { slug: string } }) {
  redirect(`/jobs/${params.slug}`)
}
