import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/constants/theme';

export interface Option { value: string; label: string }
interface Props { label: string; value: string; options: Option[]; onChange: (v: string) => void; placeholder?: string; error?: string }

/** Looks like <Input/>; tapping opens a bottom sheet list. */
export function SelectField({ label, value, options, onChange, placeholder = 'Select…', error }: Props) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View>
      <Pressable onPress={() => setOpen(true)} style={[styles.box, !!error && { borderColor: colors.coral }]} accessibilityRole="button" accessibilityLabel={label}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{label}</Text>
          <Text style={[styles.value, !current && { color: '#9AA9A3' }]} numberOfLines={1}>{current?.label ?? placeholder}</Text>
        </View>
        <Ionicons name="chevron-down" size={20} color={colors.muted} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Modal transparent visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>{label}</Text>
          <FlatList
            data={options}
            keyExtractor={(o) => o.value}
            ListEmptyComponent={<Text style={styles.empty}>No options available.</Text>}
            renderItem={({ item }) => (
              <Pressable onPress={() => { onChange(item.value); setOpen(false); }} style={styles.opt}>
                <Text style={[styles.optText, item.value === value && { fontWeight: '700', color: colors.green }]}>{item.label}</Text>
                {item.value === value ? <Ionicons name="checkmark" size={20} color={colors.green} /> : null}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.control, minHeight: 80, paddingHorizontal: 15, paddingVertical: 10 },
  label: { fontSize: 11, lineHeight: 16, fontWeight: '500', color: colors.muted },
  value: { fontSize: 16, lineHeight: 23, fontWeight: '500', color: colors.forest, marginTop: 6 },
  error: { fontSize: 12, color: colors.coral, marginTop: 4, marginLeft: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(16,43,39,0.35)' },
  sheet: { backgroundColor: colors.warm, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '60%' },
  sheetTitle: { fontSize: 18, fontWeight: '600', color: colors.forest, marginBottom: 8 },
  opt: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  optText: { fontSize: 16, color: colors.forest },
  empty: { color: colors.muted, paddingVertical: 16 },
});
