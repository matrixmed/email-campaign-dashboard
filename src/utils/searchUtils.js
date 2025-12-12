/**
 * Multi-term search utility
 * Supports "&" as OR operator for searching multiple terms
 * Each term can have multiple space-separated words that ALL must match
 * Supports "--term" for exclusions (must come after the main search)
 *
 * Examples:
 * - "ht 25" → matches campaigns containing BOTH "ht" AND "25" (e.g., "HT in... November 2025")
 * - "custom email & hot topics" → matches campaigns containing ("custom" AND "email") OR ("hot" AND "topics")
 * - "NHR & HT 25 & JCADTV" → matches "NHR" OR ("HT" AND "25") OR "JCADTV"
 * - "NHR --JCAD" → matches "NHR" but excludes anything with "JCAD"
 * - "HT 25 --uplizna --november" → matches "HT" AND "25" but excludes "uplizna" or "november"
 */

export const matchesSearchTerm = (text, searchTerm) => {
  if (!searchTerm || !searchTerm.trim()) return true;
  if (!text) return false;

  const textLower = text.toLowerCase();

  // Extract exclusion terms (words starting with --)
  const exclusionPattern = /\s+--(\S+)/g;
  const exclusions = [];
  let match;
  while ((match = exclusionPattern.exec(searchTerm)) !== null) {
    exclusions.push(match[1].toLowerCase());
  }

  // Remove exclusion terms from search term for main matching
  const mainSearchTerm = searchTerm.replace(/\s+--\S+/g, '').trim();

  // Check exclusions first - if any exclusion matches, return false
  if (exclusions.some(excl => textLower.includes(excl))) {
    return false;
  }

  // If no main search term (only exclusions), return true (exclusions already checked)
  if (!mainSearchTerm) return true;

  // Split by "&" to get multiple search terms (OR groups)
  const orTerms = mainSearchTerm.split('&').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);

  if (orTerms.length === 0) return true;

  // Return true if ANY of the OR terms match
  // Each OR term can have multiple words that ALL must match (AND within the term)
  return orTerms.some(term => {
    const words = term.split(/\s+/).filter(w => w.length > 0);
    // All words in this term must be present in the text
    return words.every(word => textLower.includes(word));
  });
};

/**
 * Filter an array of items based on search term
 * @param {Array} items - Array of items to filter
 * @param {string} searchTerm - Search term (supports & for OR)
 * @param {string|function} fieldOrGetter - Field name or getter function to extract searchable text
 */
export const filterBySearchTerm = (items, searchTerm, fieldOrGetter) => {
  if (!searchTerm || !searchTerm.trim()) return items;

  const getText = typeof fieldOrGetter === 'function'
    ? fieldOrGetter
    : (item) => item[fieldOrGetter];

  return items.filter(item => matchesSearchTerm(getText(item), searchTerm));
};
