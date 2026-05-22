import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OFFLINE_AI_NOTICE } from '../constants/strings';
import { colors, radii, spacing, typography } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import type { HomeScreenProps } from '../navigation/types';

/**
 * Pantalla de bienvenida: accesos claros al flujo de análisis y al historial.
 */
export function HomeScreen({ navigation }: HomeScreenProps) {
  const { user } = useAuth();
  const displayName = user?.displayName ?? user?.email ?? '';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroIcon}>
          <MaterialCommunityIcons name="barley" size={48} color={colors.primaryLight} />
        </View>
        <Text style={[typography.title, styles.title]}>Guardián de la Vid</Text>
        <Text style={[typography.subtitle, styles.subtitle]}>
          Detección temprana de enfermedades en hojas de vid
        </Text>

        {displayName ? (
          <View style={styles.userBadge}>
            <MaterialCommunityIcons name="account-circle-outline" size={18} color={colors.primary} />
            <Text style={[typography.caption, styles.userTxt]} numberOfLines={1}>
              {displayName}
            </Text>
            <MaterialCommunityIcons name="cloud-check-outline" size={16} color={colors.success} />
          </View>
        ) : null}

        <View style={styles.notice}>
          <MaterialCommunityIcons name="cloud-off-outline" size={22} color={colors.primary} />
          <Text style={[typography.body, styles.noticeText]}>{OFFLINE_AI_NOTICE}</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.primary]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Camera')}
          accessibilityRole="button"
          accessibilityLabel="Analizar hoja con la cámara"
        >
          <MaterialCommunityIcons name="camera-outline" size={26} color={colors.white} />
          <Text style={[typography.button, styles.primaryLabel]}>Analizar hoja</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondary]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('History')}
          accessibilityRole="button"
          accessibilityLabel="Ver historial de diagnósticos"
        >
          <MaterialCommunityIcons name="history" size={26} color={colors.primaryDark} />
          <Text style={[typography.button, styles.secondaryLabel]}>Ver historial</Text>
        </TouchableOpacity>

        <Text style={[typography.caption, styles.footer]}>
          Herramienta de apoyo para viticultores de Mendoza.{'\n'}
          Con cuenta: los diagnósticos se sincronizan en la nube automáticamente.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.md,
  },
  heroIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.primaryDark,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    alignSelf: 'center',
    backgroundColor: colors.primaryMuted,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.primary,
    maxWidth: '90%',
  },
  userTxt: {
    color: colors.primaryDark,
    fontWeight: '600',
    flexShrink: 1,
  },
  notice: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  noticeText: {
    flex: 1,
    color: colors.text,
    lineHeight: 22,
  },
  button: {
    minHeight: 56,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  primary: {
    backgroundColor: colors.primaryDark,
  },
  primaryLabel: {
    color: colors.white,
  },
  secondary: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primaryDark,
  },
  secondaryLabel: {
    color: colors.primaryDark,
  },
  footer: {
    marginTop: spacing.lg,
    textAlign: 'center',
    color: colors.textMuted,
    lineHeight: 18,
  },
});
