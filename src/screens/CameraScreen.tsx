import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radii, spacing, typography } from '../constants/theme';
import type { CameraScreenProps } from '../navigation/types';

const TIPS = ['Buena iluminación', 'Hoja enfocada', 'Evitar sombras', 'Capturar una sola hoja'];

/**
 * Captura con `expo-camera` y selección alternativa por galería (`expo-image-picker`).
 * Entrega la URI local a `ResultScreen` para el pipeline offline.
 */
export function CameraScreen({ navigation }: CameraScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [libraryGranted, setLibraryGranted] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);

  const ensureLibraryPermission = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const ok = status === 'granted';
    setLibraryGranted(ok);
    if (!ok) {
      Alert.alert('Permiso requerido', 'Se necesita acceso a la galería para elegir una foto.');
    }
    return ok;
  }, []);

  const openGallery = async () => {
    const ok = libraryGranted || (await ensureLibraryPermission());
    if (!ok) {
      return;
    }
    setBusy(true);
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
      });
      if (!picked.canceled && picked.assets[0]?.uri) {
        navigation.navigate('Result', { imageUri: picked.assets[0].uri });
      }
    } finally {
      setBusy(false);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current || !cameraReady) {
      Alert.alert('Espere', 'La cámara aún se está preparando.');
      return;
    }
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) {
        navigation.navigate('Result', { imageUri: photo.uri });
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo capturar la imagen. Intente nuevamente.');
    } finally {
      setBusy(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <MaterialCommunityIcons name="camera-off" size={48} color={colors.textMuted} />
          <Text style={[typography.body, styles.permText]}>
            La app necesita permiso de cámara para fotografiar la hoja sin subir datos a internet.
          </Text>
          <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
            <Text style={[typography.button, styles.permButtonLabel]}>Conceder permiso</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.cameraBox}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          onCameraReady={() => setCameraReady(true)}
        />
        {busy ? (
          <View style={styles.busyOverlay}>
            <ActivityIndicator size="large" color={colors.white} />
          </View>
        ) : null}
      </View>

      <View style={styles.tipsCard}>
        <View style={styles.tipsHeader}>
          <MaterialCommunityIcons name="lightbulb-on-outline" size={20} color={colors.primaryDark} />
          <Text style={[typography.subtitle, styles.tipsTitle]}>Consejos para una buena foto</Text>
        </View>
        {TIPS.map((tip) => (
          <View key={tip} style={styles.tipRow}>
            <MaterialCommunityIcons name="check-circle-outline" size={18} color={colors.primaryLight} />
            <Text style={[typography.body, styles.tipText]}>{tip}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.outline]}
          onPress={openGallery}
          disabled={busy}
        >
          <MaterialCommunityIcons name="image-multiple-outline" size={24} color={colors.primaryDark} />
          <Text style={[typography.button, styles.outlineLabel]}>Galería</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.shutter]}
          onPress={takePicture}
          disabled={busy}
        >
          <MaterialCommunityIcons name="camera" size={28} color={colors.white} />
          <Text style={[typography.button, styles.shutterLabel]}>Capturar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  permText: {
    textAlign: 'center',
    color: colors.text,
    lineHeight: 22,
  },
  permButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
  },
  permButtonLabel: {
    color: colors.white,
  },
  cameraBox: {
    flex: 1,
    margin: spacing.md,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primaryDark,
  },
  camera: {
    flex: 1,
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipsCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  tipsTitle: {
    color: colors.primaryDark,
    fontSize: 16,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipText: {
    color: colors.text,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  actionBtn: {
    flex: 1,
    minHeight: 54,
    borderRadius: radii.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  outline: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primaryDark,
  },
  outlineLabel: {
    color: colors.primaryDark,
  },
  shutter: {
    backgroundColor: colors.primaryDark,
  },
  shutterLabel: {
    color: colors.white,
  },
});
