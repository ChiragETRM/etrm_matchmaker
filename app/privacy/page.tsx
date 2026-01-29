export const metadata = {
  title: 'Privacy Policy – Hand Picked ETRM/CTRM Jobs',
}

export default function PrivacyPolicyPage() {
  const lastUpdated = '29 January 2026'
  const contactEmail = 'privacy@learnetrm.com'

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: {lastUpdated}</p>

        <div className="prose prose-gray max-w-none text-sm leading-relaxed space-y-6">
          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">1. Who We Are</h2>
            <p>
              LearnETRM (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates the Hand Picked ETRM/CTRM Jobs
              platform (the &quot;Platform&quot;), a curated job discovery and candidate screening service
              focused on Energy Trading &amp; Risk Management roles. We act as a data controller for the
              personal data we collect through the Platform.
            </p>
            <p>
              For privacy-related enquiries, contact us at{' '}
              <a href={`mailto:${contactEmail}`} className="text-blue-600 underline">{contactEmail}</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">2. Data We Collect</h2>
            <p>We collect the following categories of personal data:</p>
            <table className="w-full text-sm border border-gray-200 mt-2">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-2 border-b">Category</th>
                  <th className="text-left p-2 border-b">Data</th>
                  <th className="text-left p-2 border-b">Source</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 border-b font-medium">Identity</td>
                  <td className="p-2 border-b">Full name, Google profile picture</td>
                  <td className="p-2 border-b">Google SSO / Application form</td>
                </tr>
                <tr>
                  <td className="p-2 border-b font-medium">Contact</td>
                  <td className="p-2 border-b">Email address, phone number, LinkedIn URL</td>
                  <td className="p-2 border-b">Application form / Google SSO</td>
                </tr>
                <tr>
                  <td className="p-2 border-b font-medium">Professional</td>
                  <td className="p-2 border-b">CV/Resume, questionnaire answers (skills, experience, work authorisation)</td>
                  <td className="p-2 border-b">Application form</td>
                </tr>
                <tr>
                  <td className="p-2 border-b font-medium">Technical</td>
                  <td className="p-2 border-b">IP address (for approximate geolocation), browser cookies</td>
                  <td className="p-2 border-b">Automatic collection</td>
                </tr>
                <tr>
                  <td className="p-2 border-b font-medium">Job alerts</td>
                  <td className="p-2 border-b">Email address, subscription preferences</td>
                  <td className="p-2 border-b">Subscription form</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-2">
              We do <strong>not</strong> collect: payment/financial information, government ID numbers,
              health data, biometric data, social media activity beyond LinkedIn URLs, or data from minors under 16.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">3. Lawful Basis for Processing</h2>
            <p>Under the GDPR, we rely on the following legal bases:</p>
            <ul className="list-disc ml-6 space-y-1 mt-2">
              <li><strong>Consent (Art. 6(1)(a)):</strong> Job alert subscriptions, sharing your data with hiring companies, email communications.</li>
              <li><strong>Contract performance (Art. 6(1)(b)):</strong> Processing your job application and delivering the recruitment service you requested.</li>
              <li><strong>Legitimate interest (Art. 6(1)(f)):</strong> Fraud prevention, platform security, service improvement.</li>
              <li><strong>Legal obligation (Art. 6(1)(c)):</strong> Compliance with applicable employment and data protection laws.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">4. How We Use Your Data</h2>
            <ul className="list-disc ml-6 space-y-1 mt-2">
              <li>To match you with relevant ETRM/CTRM job opportunities</li>
              <li>To share your application (CV, answers, contact details) with the specific recruiter/employer for the role you applied to</li>
              <li>To send application confirmations and status updates</li>
              <li>To send job alert emails (only if you subscribed)</li>
              <li>To provide the &quot;Near Me&quot; job filtering feature (using approximate IP-based geolocation — we do not track precise location)</li>
              <li>To prevent fraud and abuse (rate limiting, CAPTCHA)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">5. Data Sharing</h2>
            <p>We share your personal data only with:</p>
            <ul className="list-disc ml-6 space-y-1 mt-2">
              <li><strong>Recruiters/Employers:</strong> When you apply to a specific role, your application data is shared with the recruiter or hiring company associated with that role — and only that role.</li>
              <li><strong>Service providers:</strong> Email delivery (Postmark/SMTP), database hosting (PostgreSQL provider), authentication (Google OAuth), CAPTCHA (Cloudflare Turnstile).</li>
            </ul>
            <p className="mt-2 font-medium">
              We do NOT sell, rent, or trade your personal data to third parties for marketing or any other purpose.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">6. Data Retention</h2>
            <ul className="list-disc ml-6 space-y-1 mt-2">
              <li><strong>Job applications:</strong> Retained for 12 months after the associated job expires, then automatically deleted.</li>
              <li><strong>User accounts (recruiter):</strong> Retained while your account is active. You may request deletion at any time.</li>
              <li><strong>Job alert subscriptions:</strong> Retained until you unsubscribe.</li>
              <li><strong>Job postings:</strong> Automatically expire after 30 days.</li>
              <li><strong>Server logs:</strong> Retained for up to 30 days for security monitoring.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">7. Your Rights (GDPR / UK GDPR / CCPA)</h2>
            <p>You have the right to:</p>
            <ul className="list-disc ml-6 space-y-1 mt-2">
              <li><strong>Access</strong> your personal data (Art. 15 GDPR)</li>
              <li><strong>Rectify</strong> inaccurate personal data (Art. 16)</li>
              <li><strong>Erase</strong> your personal data (&quot;right to be forgotten&quot;) (Art. 17)</li>
              <li><strong>Restrict processing</strong> of your data (Art. 18)</li>
              <li><strong>Data portability</strong> — receive your data in a machine-readable format (Art. 20)</li>
              <li><strong>Object</strong> to processing based on legitimate interest (Art. 21)</li>
              <li><strong>Withdraw consent</strong> at any time, without affecting lawfulness of prior processing (Art. 7(3))</li>
            </ul>
            <p className="mt-2">
              <strong>California residents (CCPA):</strong> You have the right to know what personal information
              we collect, request deletion, and opt out of the sale of personal information. We do not sell personal information.
            </p>
            <p className="mt-2">
              To exercise any of these rights, email{' '}
              <a href={`mailto:${contactEmail}`} className="text-blue-600 underline">{contactEmail}</a>{' '}
              or use the data management options in your{' '}
              <a href="/dashboard" className="text-blue-600 underline">account dashboard</a>.
              We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">8. Cookies</h2>
            <p>
              We use strictly necessary cookies for authentication and session management.
              We do not use advertising or tracking cookies. For full details, see our{' '}
              <a href="/cookies" className="text-blue-600 underline">Cookie Policy</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">9. Security</h2>
            <p>
              We implement appropriate technical and organisational measures to protect your data, including:
              encrypted data in transit (HTTPS/TLS), secure authentication (Google OAuth with PKCE),
              HTTP-only session cookies, input validation, rate limiting, and access controls.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">10. International Transfers</h2>
            <p>
              Your data may be processed in countries outside the EEA/UK where our service providers
              operate (e.g. cloud hosting, email delivery). Where transfers occur, we ensure appropriate
              safeguards are in place (e.g. Standard Contractual Clauses).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">11. Children</h2>
            <p>
              The Platform is not intended for individuals under the age of 16. We do not knowingly
              collect personal data from children. If you believe we have collected data from a minor,
              please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Material changes will be communicated
              via the Platform or by email. The &quot;Last updated&quot; date at the top indicates the most recent revision.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mt-6 mb-2">13. Contact &amp; Complaints</h2>
            <p>
              If you have questions about this policy or wish to exercise your rights, contact:{' '}
              <a href={`mailto:${contactEmail}`} className="text-blue-600 underline">{contactEmail}</a>.
            </p>
            <p className="mt-2">
              If you are unsatisfied with our response, you have the right to lodge a complaint with
              your local data protection authority (e.g. the ICO in the UK, CNIL in France, or your
              state Attorney General in the US).
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
