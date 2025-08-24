const sanitizeHtml = require('sanitize-html')

// Tytuły: bez HTML
function sanitizeTitle(text) {
  const s = String(text ?? '')
  return sanitizeHtml(s, { allowedTags: [], allowedAttributes: {} }).trim()
}

// Treść artykułu: lekki whitelist (proste formatowanie + linki)
const BODY_CFG = {
  allowedTags: [
    'b','i','em','strong',
    'a',
    'p','br','ul','ol','li',
    'blockquote','code','pre'
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel']
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  disallowedTagsMode: 'discard',
  transformTags: {
    a: (tagName, attribs) => ({
      tagName: 'a',
      attribs: {
        ...attribs,
        target: '_blank',
        rel: 'noopener noreferrer nofollow ugc'
      }
    })
  }
}

function sanitizeBody(html) {
  const s = String(html ?? '')
  return sanitizeHtml(s, BODY_CFG).trim()
}

// Komentarze: jeszcze prostszy whitelist (tekst + linki)
function sanitizeComment(str = '') {
  return sanitizeHtml(String(str), {
    allowedTags: ['b','i','em','strong','u','br','a'],
    allowedAttributes: { a: ['href', 'title', 'target', 'rel'] },
    allowedSchemes: ['http', 'https', 'mailto'],
    disallowedTagsMode: 'discard',
    transformTags: {
      a: (tagName, attribs) => ({
        tagName: 'a',
        attribs: {
          ...attribs,
          target: '_blank',
          rel: 'noopener noreferrer nofollow ugc'
        }
      })
    }
  }).trim()
}

module.exports = { sanitizeTitle, sanitizeBody, sanitizeComment }
