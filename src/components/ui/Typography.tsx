import React from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import { colors } from '@/constants/theme';

type P = { children: React.ReactNode; style?: StyleProp<TextStyle> };

export const Eyebrow = ({ children, style }: P) => (
  <Text style={[{ fontSize: 14, lineHeight: 20, color: colors.muted }, style]}>{children}</Text>
);
export const SectionTitle = ({ children, style }: P) => (
  <Text style={[{ fontSize: 18, lineHeight: 26, fontWeight: '600', color: colors.forest }, style]}>{children}</Text>
);
export const Body = ({ children, style }: P) => (
  <Text style={[{ fontSize: 14, lineHeight: 20, color: colors.muted }, style]}>{children}</Text>
);
export const Hint = ({ children, style }: P) => (
  <Text style={[{ fontSize: 12, lineHeight: 17, color: colors.muted }, style]}>{children}</Text>
);
