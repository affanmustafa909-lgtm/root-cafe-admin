export const money = (v = 0) =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(
    v,
  );

export const dateTime = (v?: string | Date | null) => {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
};

export const dateOnly = (v?: string | Date | null) => {
  if (!v) return '—';
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IE', { dateStyle: 'medium' }).format(d);
};

export const titleCase = (v = '') =>
  v.toLowerCase().replaceAll('_', ' ').replace(/(^|\s)\S/g, (s) => s.toUpperCase());

export type StatusTone = 'gray' | 'blue' | 'green' | 'red' | 'amber';

export const orderStatusTone = (status?: string): StatusTone => {
  switch (status) {
    case 'RECEIVED':
      return 'blue';
    case 'PREPARING':
      return 'amber';
    case 'READY_FOR_PICKUP':
      return 'green';
    case 'COMPLETED':
      return 'gray';
    default:
      return 'gray';
  }
};

export const paymentStatusTone = (status?: string): StatusTone => {
  const s = (status || '').toUpperCase();
  if (s === 'PAID') return 'green';
  if (s === 'FAILED' || s === 'REFUNDED') return 'red';
  return 'amber';
};
