/**
 * Format price in Indian Rupees
 */
export function formatPrice(amount) {
  return `₹${Number(amount).toFixed(0)}`;
}

/**
 * Format date/time
 */
export function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function formatTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatDateTime(dateStr) {
  return `${formatDate(dateStr)} at ${formatTime(dateStr)}`;
}

/**
 * Format relative time
 */
export function timeAgo(dateStr) {
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return formatDate(dateStr);
}

/**
 * Status display info
 */
export const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'pending', icon: '⏳' },
  preparing: { label: 'Preparing', color: 'preparing', icon: '👨‍🍳' },
  ready: { label: 'Ready', color: 'ready', icon: '✅' },
  completed: { label: 'Completed', color: 'completed', icon: '🎉' },
  cancelled: { label: 'Cancelled', color: 'cancelled', icon: '❌' },
};

/**
 * Category display info
 */
export const CATEGORY_CONFIG = {
  breakfast: { label: 'Breakfast', emoji: '🌅' },
  lunch: { label: 'Lunch', emoji: '🍽️' },
  snacks: { label: 'Snacks', emoji: '🍿' },
  beverages: { label: 'Beverages', emoji: '☕' },
};

/**
 * Truncate text
 */
export function truncate(text, maxLength = 60) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
