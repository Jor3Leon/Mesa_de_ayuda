import DOMPurify from 'dompurify';

/**
 * Strict HTML sanitizer for rich-text rendering
 * Allows standard formatting tags while stripping all executable scripts,
 * iframes, dangerous URI schemes, and inline event handlers.
 */
export function sanitizeHtml(dirtyHtml) {
  if (!dirtyHtml || typeof dirtyHtml !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(dirtyHtml, {
    ALLOWED_TAGS: [
      'b', 'strong', 'i', 'em', 'u', 's', 'strike',
      'p', 'br', 'div', 'span',
      'ul', 'ol', 'li',
      'blockquote', 'code', 'pre',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'a'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'title'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'style', 'meta', 'link', 'svg', 'canvas'],
    FORBID_ATTR: [
      'onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur',
      'onchange', 'onsubmit', 'onkeydown', 'onkeypress', 'onkeyup',
      'onmouseenter', 'onmouseleave', 'onpointerdown', 'onpointerup'
    ],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target', 'rel'],
    RETURN_TRUSTED_TYPE: false,
  });
}

export default sanitizeHtml;
