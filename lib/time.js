/**
 * Bangladesh Standard Time (BST) is UTC+6.
 * Standard Next.js server times run in UTC. To calculate correct weekly boundaries
 * for Bangladesh, we must shift the timeline.
 */

/**
 * Converts a standard Date object into a Date representing BST (UTC+6) wall time
 * @param {Date} date 
 * @returns {Date}
 */
export function getBDTime(date = new Date()) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  return new Date(utc + 3600000 * 6);
}

/**
 * Gets the UTC start and end boundaries of a BST week (Monday to Sunday)
 * for a given date.
 * @param {Date} date 
 * @returns {{ startOfWeek: Date, endOfWeek: Date }} UTC Dates representing BST week boundaries
 */
export function getWeekBoundariesBD(date = new Date()) {
  const bst = getBDTime(date);
  const day = bst.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // Calculate difference to Monday of current week
  // Sunday (0) should go back 6 days.
  // Monday (1) should go back 0 days.
  // Tuesday (2) should go back 1 day, etc.
  const diffToMonday = bst.getDate() - (day === 0 ? 6 : day - 1);
  
  const monday = new Date(bst);
  monday.setDate(diffToMonday);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  // Convert BST wall clock dates back to absolute UTC dates for database queries
  const startOfWeekUTC = new Date(monday.getTime() - 3600000 * 6);
  const endOfWeekUTC = new Date(sunday.getTime() - 3600000 * 6);
  
  return {
    startOfWeek: startOfWeekUTC,
    endOfWeek: endOfWeekUTC,
  };
}

/**
 * Formats a UTC date to a BST date string (YYYY-MM-DD)
 * @param {Date} date 
 * @returns {string}
 */
export function formatBDDateString(date = new Date()) {
  const bst = getBDTime(date);
  const yyyy = bst.getFullYear();
  const mm = String(bst.getMonth() + 1).padStart(2, '0');
  const dd = String(bst.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Sets a standard date to start of BST day, mapped to UTC
 * @param {Date|string} dateInput 
 * @returns {Date} Start of BST day in UTC
 */
export function getStartOfDayBDinUTC(dateInput) {
  const date = new Date(dateInput);
  const bst = getBDTime(date);
  bst.setHours(0, 0, 0, 0);
  return new Date(bst.getTime() - 3600000 * 6);
}
