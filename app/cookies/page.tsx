export const metadata = {
  title: 'Cookie Policy – Hand Picked ETRM/CTRM Jobs',
}

export default function CookiePolicyPage() {
  const lastUpdated = '29 January 2026'
  const contactEmail = 'privacy@learnetrm.com'

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow">
        <h1 className="text-3xl font-bold mb-2">Cookie Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {lastUpdated}</p>

        <div className="prose prose-gray max-w-none text-sm leading-relaxed space-y-6">
          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">1. What Are Cookies</h2>
            <p>
              Cookies are small text files stored on your device when you visit a website.
              They help the site function correctly and can remember your preferences.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">2. Cookies We Use</h2>
            <p>
              We use only <strong>strictly necessary cookies</strong> required for the Platform to function.
              We do <strong>not</strong> use advertising, analytics, or tracking cookies.
            </p>

            <table className="w-full text-sm border border-gray-200 mt-3">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-2 border-b">Cookie Name</th>
                  <th className="text-left p-2 border-b">Purpose</th>
                  <th className="text-left p-2 border-b">Duration</th>
                  <th className="text-left p-2 border-b">Type</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border-b font-mono text-xs">next-auth.session-token</td>
                  <td className="p-2 border-b">Keeps you signed in after Google authentication</td>
                  <td className="p-2 border-b">30 days</td>
                  <td className="p-2 border-b">Strictly necessary</td>
                </tr>
                <tr>
                  <td className="p-2 border-b font-mono text-xs">next-auth.csrf-token</td>
                  <td className="p-2 border-b">Protects against cross-site request forgery attacks</td>
                  <td className="p-2 border-b">Session</td>
                  <td className="p-2 border-b">Strictly necessary</td>
                </tr>
                <tr>
                  <td className="p-2 border-b font-mono text-xs">next-auth.callback-url</td>
                  <td className="p-2 border-b">Remembers which page to redirect to after sign-in</td>
                  <td className="p-2 border-b">Session</td>
                  <td className="p-2 border-b">Strictly necessary</td>
                </tr>
                <tr>
                  <td className="p-2 border-b font-mono text-xs">next-auth.state</td>
                  <td className="p-2 border-b">Secures the OAuth sign-in flow (PKCE)</td>
                  <td className="p-2 border-b">15 minutes</td>
                  <td className="p-2 border-b">Strictly necessary</td>
                </tr>
                <tr>
                  <td className="p-2 border-b font-mono text-xs">cookie-consent</td>
                  <td className="p-2 border-b">Remembers your cookie consent choice</td>
                  <td className="p-2 border-b">365 days</td>
                  <td className="p-2 border-b">Strictly necessary</td>
                </tr>
              </tbody>
            </table>

            <p className="mt-3 text-gray-600">
              In production, cookie names are prefixed with <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">__Secure-</code> and
              are transmitted only over HTTPS with HttpOnly and SameSite=Lax flags for security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">3. Third-Party Cookies</h2>
            <p>
              If CAPTCHA protection is enabled, Cloudflare Turnstile may set cookies
              to verify you are a real user. These cookies are governed by{' '}
              <a
                href="https://www.cloudflare.com/privacypolicy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                Cloudflare&apos;s Privacy Policy
              </a>.
            </p>
            <p className="mt-2">
              Google OAuth authentication involves a redirect to Google&apos;s servers during sign-in.
              Google&apos;s cookies are governed by{' '}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                Google&apos;s Privacy Policy
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">4. Managing Cookies</h2>
            <p>
              You can control and delete cookies through your browser settings. Note that
              disabling strictly necessary cookies will prevent you from signing in and using
              authenticated features of the Platform.
            </p>
            <ul className="list-disc ml-6 space-y-1 mt-2">
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Chrome</a></li>
              <li><a href="https://support.mozilla.org/en-US/kb/clear-cookies-and-site-data-firefox" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Firefox</a></li>
              <li><a href="https://support.apple.com/en-gb/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Safari</a></li>
              <li><a href="https://support.microsoft.com/en-us/windows/manage-cookies-in-microsoft-edge-view-allow-block-delete-and-use-168dab11-0753-043d-7c16-ede5947fc64d" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Edge</a></li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">5. Changes to This Policy</h2>
            <p>
              We may update this Cookie Policy if we introduce new functionality that requires
              additional cookies. Any changes will be reflected on this page with an updated date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">6. Contact</h2>
            <p>
              Questions about our use of cookies? Email{' '}
              <a href={`mailto:${contactEmail}`} className="text-blue-600 underline">{contactEmail}</a>{' '}
              or see our <a href="/privacy" className="text-blue-600 underline">Privacy Policy</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
