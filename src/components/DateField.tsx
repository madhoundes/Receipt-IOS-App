import React from 'react';
import { Platform, Pressable, Text } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { colors, font, getScheme, themedStyles } from '../theme';

/** 'YYYY-MM-DD' for a local date. */
export const toDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** Local noon for a 'YYYY-MM-DD' string, so time zones never shift the day. Falls back to today. */
export const fromDay = (s: string) => {
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

/** Native date picker: the compact iOS control, or a pill that opens the Android dialog. */
export function DateField({ value, onChange, label, max }: { value: string; onChange: (day: string) => void; label: string; max?: Date }) {
  const date = fromDay(value);
  if (Platform.OS === 'android') {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${date.toDateString()}. Change`} style={styles.pill}
        onPress={() => DateTimePickerAndroid.open({ value: date, mode: 'date', maximumDate: max, onChange: (e, d) => { if (e.type === 'set' && d) onChange(toDay(d)); } })}>
        <Text style={styles.pillText}>{date.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
      </Pressable>
    );
  }
  return (
    <DateTimePicker value={date} mode="date" display="compact" maximumDate={max} accentColor={colors.accent} themeVariant={getScheme()}
      accessibilityLabel={label} onChange={(_, d) => { if (d) onChange(toDay(d)); }} />
  );
}

const styles = themedStyles(() => ({
  pill: { height: 34, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.fill, justifyContent: 'center' },
  pillText: { ...font.regular, fontSize: 17, color: colors.text },
}));
