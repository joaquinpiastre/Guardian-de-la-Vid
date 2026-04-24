import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radii, spacing, typography } from '../constants/theme';
import type { HistoryScreenProps } from '../navigation/types';
import { deleteDiagnosisById, listDiagnoses } from '../services/databaseService';
import type { Diagnosis } from '../types/diagnosis';

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * Lista cronológica de diagnósticos SQLite con acceso a detalle y eliminación local.
 */
export function HistoryScreen({ navigation }: HistoryScreenProps) {
  const [items, setItems] = useState<Diagnosis[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const rows = await listDiagnoses();
    setItems(rows);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const confirmDelete = (item: Diagnosis) => {
    Alert.alert(
      'Eliminar diagnóstico',
      `¿Desea eliminar el registro de "${item.label}" del ${formatDate(item.createdAt)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteDiagnosisById(item.id);
            await load();
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: Diagnosis }) => {
    const pct = Math.round(item.confidence * 100);
    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardMain}
          onPress={() => navigation.navigate('Detail', { id: item.id })}
          activeOpacity={0.75}
        >
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="file-document-outline" size={22} color={colors.primaryDark} />
            <Text style={[typography.caption, styles.date]}>{formatDate(item.createdAt)}</Text>
          </View>
          <Text style={[typography.subtitle, styles.label]}>{item.label}</Text>
          <Text style={[typography.body, styles.conf]}>Confianza: {pct}%</Text>
          <Text style={[typography.caption, styles.detailLink]}>Ver detalle →</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.trash}
          onPress={() => confirmDelete(item)}
          accessibilityLabel="Eliminar diagnóstico"
        >
          <MaterialCommunityIcons name="delete-outline" size={24} color={colors.danger} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons name="clipboard-text-off-outline" size={48} color={colors.textMuted} />
            <Text style={[typography.body, styles.emptyText]}>Aún no hay diagnósticos guardados.</Text>
            <Text style={[typography.caption, styles.emptyHint]}>
              Realice un análisis desde la pantalla principal y pulse “Guardar diagnóstico”.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  cardMain: {
    flex: 1,
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  date: {
    color: colors.textMuted,
  },
  label: {
    color: colors.primaryDark,
  },
  conf: {
    color: colors.text,
    marginTop: 4,
  },
  detailLink: {
    color: colors.primary,
    marginTop: 8,
    fontWeight: '600',
  },
  trash: {
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    backgroundColor: colors.background,
  },
  empty: {
    paddingTop: spacing.xl * 2,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.text,
  },
  emptyHint: {
    textAlign: 'center',
    color: colors.textMuted,
    lineHeight: 18,
  },
});
