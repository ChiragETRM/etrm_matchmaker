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
 * Parse **bold** markdown and return HTML string.
 * Use with dangerouslySetInnerHTML only when the source is trusted (e.g. job poster JD).
 */
export function renderSimpleMarkdown(text: string): string {
  if (!text || typeof text !== 'string') return ''
  const escaped = escapeHtml(text)
  return escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}
