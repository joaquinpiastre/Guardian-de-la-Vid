import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  Share,
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

function escapeCsvField(value: string): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsvContent(items: Diagnosis[]): string {
  const headers = ['ID', 'Fecha', 'Diagnóstico', 'Confianza (%)', 'Riesgo', 'Recomendación'];
  const rows = items.map((item) => [
    item.id,
    item.createdAt,
    item.label,
    (item.confidence * 100).toFixed(1),
    item.riskLevel,
    item.recommendation,
  ]);
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvField).join(','));
  return lines.join('\n');
}

/**
 * Lista cronológica de diagnósticos SQLite con acceso a detalle, eliminación y exportación CSV.
 */
export function HistoryScreen({ navigation }: HistoryScreenProps) {
  const [items, setItems] = useState<Diagnosis[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  const exportCsv = async () => {
    if (items.length === 0) {
      Alert.alert('Sin datos', 'No hay diagnósticos para exportar.');
      return;
    }
    setExporting(true);
    try {
      const csvContent = buildCsvContent(items);
      await Share.share({
        title: 'Historial Guardian Vid',
        message: csvContent,
      });
    } catch {
      Alert.alert('Error', 'No se pudo exportar el historial.');
    } finally {
      setExporting(false);
    }
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
      {/* Barra de herramientas superior */}
      {items.length > 0 ? (
        <View style={styles.toolbar}>
          <Text style={[typography.caption, styles.toolbarCount]}>
            {items.length} diagnóstico{items.length !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity
            style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
            onPress={() => void exportCsv()}
            disabled={exporting}
            accessibilityLabel="Exportar historial como CSV"
          >
            <MaterialCommunityIcons
              name="export-variant"
              size={18}
              color={exporting ? colors.textMuted : colors.primaryDark}
            />
            <Text style={[typography.caption, exporting ? styles.exportLabelMuted : styles.exportLabel]}>
              Exportar CSV
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

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
              Realice un análisis desde la pantalla principal y pulse "Guardar diagnóstico".
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
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  toolbarCount: {
    color: colors.textMuted,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.primaryMuted,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  exportBtnDisabled: {
    opacity: 0.5,
  },
  exportLabel: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  exportLabelMuted: {
    color: colors.textMuted,
    fontWeight: '600',
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
