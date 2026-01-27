/**
 * Simple markdown-like formatting for job descriptions.
 * Renders **text** as bold. Escapes HTML to prevent XSS.
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (c) => map[c] ?? c)
}

/**
 * Parse markdown-like formatting and return HTML string.
 * Supports: **bold**, bullet points (• or -), and line breaks.
 * Use with dangerouslySetInnerHTML only when the source is trusted (e.g. job poster JD).
 */
export function renderSimpleMarkdown(text: string): string {
  if (!text || typeof text !== 'string') return ''

  const escaped = escapeHtml(text)

  // Split by newlines to process line by line
  const lines = escaped.split('\n')
  const processedLines: string[] = []
  let inList = false

  for (let i = 0; i < lines.length; i++) {
    // Normalize multiple spaces to single space, then trim
    let line = lines[i].replace(/\s+/g, ' ').trim()

    // Handle bold text
    line = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

    // Check if this is a bullet point line
    const bulletMatch = line.match(/^[•\-\*]\s*(.*)$/)

    if (bulletMatch) {
      if (!inList) {
        processedLines.push('<ul class="list-disc list-inside space-y-1 my-2">')
        inList = true
      }
      processedLines.push(`<li>${bulletMatch[1]}</li>`)
    } else {
      // Close list if we were in one
      if (inList) {
        processedLines.push('</ul>')
        inList = false
      }

      // Skip empty lines to reduce unnecessary spacing
      if (line === '') {
        // Only add a small break if the previous line wasn't empty (avoid multiple breaks)
        if (i > 0 && lines[i - 1].trim() !== '') {
          processedLines.push('<p class="mb-1"></p>')
        }
        continue
      }
      
      // Check if line looks like a header (ends with colon or all caps section)
      const isHeader = /^[A-Z][A-Za-z\s]+:$/.test(line) ||
                      /^(Summary|Responsibilities|Requirements|Skills|Qualifications|Nice to Have|About|Overview|Description|Experience|Benefits|What you|Who you|Your role|The role|Key|Required|Preferred|Duties|Tasks):?$/i.test(line.replace(/<[^>]*>/g, ''))

      if (isHeader) {
        // Reduced spacing: mt-2 instead of mt-4, mb-1 instead of mb-2
        processedLines.push(`<p class="font-semibold mt-2 mb-1">${line}</p>`)
      } else {
        // Reduced spacing: mb-1 instead of mb-2
        processedLines.push(`<p class="mb-1">${line}</p>`)
      }
    }
  }

  // Close any open list
  if (inList) {
    processedLines.push('</ul>')
  }

  return processedLines.join('\n')
}
