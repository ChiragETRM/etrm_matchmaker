export default function ApplicationSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-white p-8 rounded-lg shadow text-center">
        <div className="mb-6">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold mb-4 text-green-600">
            Application Submitted!
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Congratulations — we will send your CV to the recruiter.
          </p>
          <p className="text-gray-500 text-sm">
            The recruiter will review your application and contact you directly
            if you're a good fit for the role.
          </p>
        </div>
        <a
          href="/jobs"
          className="inline-block px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
        >
          Browse Other Jobs
        </a>
      </div>
    </div>
  )
}