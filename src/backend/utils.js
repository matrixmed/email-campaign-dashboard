/**
 * Parse date strings in various formats to JavaScript Date objects
 * @param {string} dateString - Date string to parse
 * @returns {Date|null} Parsed Date object or null if invalid
 */
export function parseDate(dateString) {
  if (!dateString) return null;
  
  try {
    // Handle ISO format
    if (dateString.includes('T') || dateString.includes('Z')) {
      return new Date(dateString);
    }
    
    // Handle YYYY-MM-DD format
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return new Date(dateString);
    }
    
    // Handle MM/DD/YYYY format
    if (dateString.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const [month, day, year] = dateString.split('/').map(Number);
      return new Date(year, month - 1, day);
    }
    
    // Handle textual date formats like "January 15, 2025"
    return new Date(dateString);
  } catch (e) {
    console.error(`Error parsing date ${dateString}:`, e);
    return null;
  }
}

/**
 * Format a date to a readable string
 * @param {Date|string} date - Date to format
 * @param {string} format - Format string ('short', 'medium', 'long')
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = 'medium') {
  if (!date) return '';
  
  try {
    // Convert string to Date if needed
    const dateObj = typeof date === 'string' ? parseDate(date) : date;
    
    if (!dateObj || isNaN(dateObj.getTime())) {
      return '';
    }
    
    switch (format) {
      case 'short':
        return dateObj.toLocaleDateString();
      case 'long':
        return dateObj.toLocaleDateString(undefined, { 
          weekday: 'long',
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      case 'medium':
      default:
        return dateObj.toLocaleDateString(undefined, { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
    }
  } catch (e) {
    console.error(`Error formatting date ${date}:`, e);
    return '';
  }
}

/**
 * Calculate date range for a timeframe object
 * @param {object} timeframe - Timeframe specification
 * @returns {object} Object with start and end dates
 */
export function calculateDateRange(timeframe) {
  if (!timeframe) return { start: null, end: null };
  
  const result = { start: null, end: null };
  const currentYear = new Date().getFullYear();
  
  // Map month names to numbers (0-based)
  const monthMap = {
    'january': 0, 'february': 1, 'march': 2, 'april': 3,
    'may': 4, 'june': 5, 'july': 6, 'august': 7,
    'september': 8, 'october': 9, 'november': 10, 'december': 11
  };
  
  // Handle year
  const year = timeframe.year || currentYear;
  
  // Handle simple month specification
  if (timeframe.month && typeof timeframe.month === 'string') {
    const monthIndex = monthMap[timeframe.month.toLowerCase()];
    if (monthIndex !== undefined) {
      result.start = new Date(year, monthIndex, 1);
      // End date is start of next month minus 1 day
      result.end = new Date(year, monthIndex + 1, 0);
    }
  }
  
  // Handle month range (startMonth-endMonth)
  if (timeframe.startMonth && timeframe.endMonth) {
    const startMonthIndex = monthMap[timeframe.startMonth.toLowerCase()];
    const endMonthIndex = monthMap[timeframe.endMonth.toLowerCase()];
    
    if (startMonthIndex !== undefined && endMonthIndex !== undefined) {
      result.start = new Date(year, startMonthIndex, 1);
      result.end = new Date(year, endMonthIndex + 1, 0);
    }
  }
  
  // Handle quarter
  if (timeframe.quarter) {
    const quarterStartMonth = (timeframe.quarter - 1) * 3;
    result.start = new Date(year, quarterStartMonth, 1);
    result.end = new Date(year, quarterStartMonth + 3, 0);
  }
  
  return result;
}

/**
 * Calculate percentage with proper handling of edge cases
 * @param {number} numerator - Numerator value
 * @param {number} denominator - Denominator value
 * @param {number} precision - Decimal precision
 * @returns {number} Calculated percentage or 0 for invalid inputs
 */
export function calculatePercentage(numerator, denominator, precision = 2) {
  if (typeof numerator !== 'number' || typeof denominator !== 'number') {
    return 0;
  }
  
  if (denominator === 0) {
    return 0;
  }
  
  const percentage = (numerator / denominator) * 100;
  
  // Check for NaN or Infinity
  if (!isFinite(percentage)) {
    return 0;
  }
  
  // Round to specified precision
  return Number(percentage.toFixed(precision));
}

/**
 * Safely access nested object properties
 * @param {object} obj - Object to access
 * @param {string} path - Dot-notation path to property
 * @param {*} defaultValue - Default value if property doesn't exist
 * @returns {*} Property value or defaultValue
 */
export function getNestedValue(obj, path, defaultValue = null) {
  if (!obj || !path) return defaultValue;
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return defaultValue;
    }
    current = current[key];
  }
  
  return current !== undefined ? current : defaultValue;
}

/**
 * Clean and normalize text for comparison
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
export function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Find best match for a term in a list of terms
 * @param {string} searchTerm - Term to match
 * @param {string[]} possibleMatches - Possible matches
 * @returns {string|null} Best matching term or null if no good match
 */
export function findBestMatch(searchTerm, possibleMatches) {
  if (!searchTerm || !possibleMatches || !Array.isArray(possibleMatches)) {
    return null;
  }
  
  const normalizedSearch = normalizeText(searchTerm);
  
  // Try exact match first
  const exactMatch = possibleMatches.find(match => 
    normalizeText(match) === normalizedSearch
  );
  
  if (exactMatch) return exactMatch;
  
  // Try contains match
  const containsMatches = possibleMatches.filter(match => 
    normalizeText(match).includes(normalizedSearch) || 
    normalizedSearch.includes(normalizeText(match))
  );
  
  if (containsMatches.length === 1) return containsMatches[0];
  
  // If multiple contains matches, return the shortest one
  if (containsMatches.length > 1) {
    return containsMatches.sort((a, b) => a.length - b.length)[0];
  }
  
  return null;
}

/**
 * Group data by a specific field
 * @param {Array} data - Array of objects to group
 * @param {string} field - Field to group by
 * @returns {Object} Grouped data
 */
export function groupBy(data, field) {
  if (!data || !Array.isArray(data) || !field) {
    return {};
  }
  
  return data.reduce((grouped, item) => {
    const key = getNestedValue(item, field);
    
    if (key === null || key === undefined) {
      return grouped;
    }
    
    const groupKey = String(key);
    grouped[groupKey] = grouped[groupKey] || [];
    grouped[groupKey].push(item);
    
    return grouped;
  }, {});
}

/**
 * Format a number for display
 * @param {number} value - Number to format
 * @param {number} decimals - Decimal places
 * @returns {string} Formatted number
 */
export function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }
  
  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  
  return value.toFixed(decimals);
}

export default {
  parseDate,
  formatDate,
  calculateDateRange,
  calculatePercentage,
  getNestedValue,
  normalizeText,
  findBestMatch,
  groupBy,
  formatNumber
};