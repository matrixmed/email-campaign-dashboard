export const matchesSearchTerm = (text, searchTerm) => {
  if (!searchTerm || !searchTerm.trim()) return true;
  if (!text) return false;

  const textLower = text.toLowerCase();

  const exclusionPattern = /\s+--(\S+)/g;
  const exclusions = [];
  let match;
  while ((match = exclusionPattern.exec(searchTerm)) !== null) {
    exclusions.push(match[1].toLowerCase());
  }

  const mainSearchTerm = searchTerm.replace(/\s+--\S+/g, '').trim();

  if (exclusions.some(excl => textLower.includes(excl))) {
    return false;
  }

  if (!mainSearchTerm) return true;

  const orTerms = mainSearchTerm.split('&').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);

  if (orTerms.length === 0) return true;

  return orTerms.some(term => {
    const words = term.split(/\s+/).filter(w => w.length > 0);
    return words.every(word => textLower.includes(word));
  });
};

export const filterBySearchTerm = (items, searchTerm, fieldOrGetter) => {
  if (!searchTerm || !searchTerm.trim()) return items;

  const getText = typeof fieldOrGetter === 'function'
    ? fieldOrGetter
    : (item) => item[fieldOrGetter];

  return items.filter(item => matchesSearchTerm(getText(item), searchTerm));
};
