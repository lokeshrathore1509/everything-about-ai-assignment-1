/**
 * Currency and date formatting helpers for SplitEase.
 * All backend amounts are strictly in integer paise.
 */

export function formatPaise(paise, showSign = false) {
  if (paise === null || paise === undefined || isNaN(paise)) {
    return '₹0.00';
  }

  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = (absPaise / 100).toFixed(2);
  const parts = rupees.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];

  // Indian number comma formatting: 1,00,000.00
  let formattedInteger = integerPart;
  if (integerPart.length > 3) {
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  }

  const result = `₹${formattedInteger}.${decimalPart}`;

  if (isNegative) {
    return `-${result}`;
  }
  if (showSign && paise > 0) {
    return `+${result}`;
  }
  return result;
}

export function paiseToDecimal(paise) {
  if (paise === null || paise === undefined || isNaN(paise)) {
    return '0.00';
  }
  return (Math.abs(paise) / 100).toFixed(2);
}

export function decimalToPaise(val) {
  if (val === null || val === undefined || val === '') return 0;
  const clean = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  if (isNaN(clean)) return 0;
  return Math.round(clean * 100);
}

export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) {
    return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (isYesterday) {
    return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

export function getCategoryBadge(category) {
  switch (category) {
    case 'Food':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: 'Utensils' };
    case 'Transportation':
      return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: 'Car' };
    case 'Entertainment':
      return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: 'Ticket' };
    case 'Utilities':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: 'Zap' };
    case 'Shopping':
      return { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', icon: 'ShoppingBag' };
    case 'Lodging':
      return { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: 'Home' };
    default:
      return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', icon: 'Receipt' };
  }
}
