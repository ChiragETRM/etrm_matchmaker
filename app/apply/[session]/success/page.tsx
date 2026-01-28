export default function ApplicationSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-2xl w-full bg-white p-5 sm:p-8 rounded-lg shadow text-center">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-green-600">
            Congratulations! You have applied for the role!
          </h1>
          <p className="text-gray-500 text-sm">
            The recruiter will review your application and contact you directly
            if you&apos;re a good fit for the role.
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