import React from 'react';
import { KeyboardTypeOptions, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius } from '@/constants/theme';

interface Props {
  label: string;
  value: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  editable?: boolean;
  error?: string;
  hint?: string;
}

export function Input({ label, value, onChangeText, placeholder, secure, keyboardType, autoCapitalize = 'none', editable = true, error, hint }: Props) {
  return (
    <View>
      <View style={[styles.box, !!error && { borderColor: colors.coral }, !editable && { opacity: 0.6 }]}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9AA9A3"
          secureTextEntry={secure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          editable={editable}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.control, minHeight: 80, paddingHorizontal: 15, paddingTop: 10, paddingBottom: 6 },
  label: { fontSize: 11, lineHeight: 16, fontWeight: '500', color: colors.muted },
  input: { fontSize: 16, lineHeight: 23, fontWeight: '500', color: colors.forest, paddingVertical: 4, minHeight: 36 },
  error: { fontSize: 12, color: colors.coral, marginTop: 4, marginLeft: 4 },
  hint: { fontSize: 12, color: colors.muted, marginTop: 4, marginLeft: 4 },
});
