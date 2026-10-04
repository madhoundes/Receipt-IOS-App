import React from 'react';
import { colors } from '../theme';

export const toDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fromDay = (s: string) => {
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

/** Web build of DateField: the browser's own date input. */
export function DateField({ value, onChange, label, max }: { value: string; onChange: (day: string) => void; label: string; max?: Date }) {
  return React.createElement('input', {
    type: 'date', value, max: max ? toDay(max) : undefined, 'aria-label': label,
    onChange: (e: any) => { if (e.target.value) onChange(e.target.value); },
    style: {
      font: 'inherit', fontSize: 17, color: colors.text, background: colors.fill, border: 0, borderRadius: 8, height: 34, padding: '0 10px',
      colorScheme: colors.bg === '#000000' ? 'dark' : 'light',
    },
  });
}
