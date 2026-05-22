import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radii, spacing, typography } from '../constants/theme';
import { login, register, getAuthErrorMessage } from '../services/authService';

/**
 * Pantalla de acceso: alterná entre Login y Registro con un solo botón.
 * También permite continuar sin cuenta (uso offline puro).
 */
export function LoginScreen() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (isRegistering && !trimmedName) {
      Alert.alert('Falta el nombre', 'Ingresá tu nombre para registrarte.');
      return;
    }
    if (!trimmedEmail || !password) {
      Alert.alert('Campos incompletos', 'Completá el correo y la contraseña.');
      return;
    }

    setLoading(true);
    try {
      if (isRegistering) {
        await register(trimmedEmail, password, trimmedName);
      } else {
        await login(trimmedEmail, password);
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      Alert.alert(
        isRegistering ? 'Error al registrarse' : 'Error al ingresar',
        getAuthErrorMessage(code),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons name="barley" size={40} color={colors.primaryLight} />
            </View>
            <Text style={[typography.title, styles.title]}>Guardián de la Vid</Text>
            <Text style={[typography.body, styles.subtitle]}>
              {isRegistering ? 'Creá tu cuenta para guardar diagnósticos en la nube' : 'Ingresá para sincronizar tus diagnósticos'}
            </Text>
          </View>

          {/* Formulario */}
          <View style={styles.form}>
            {isRegistering ? (
              <View style={styles.inputGroup}>
                <Text style={[typography.caption, styles.label]}>Nombre</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Tu nombre"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                  returnKeyType="next"
                  editable={!loading}
                />
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={[typography.caption, styles.label]}>Correo electrónico</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="correo@ejemplo.com"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[typography.caption, styles.label]}>Contraseña</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={isRegistering ? 'Mínimo 6 caracteres' : '••••••••'}
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={() => void handleSubmit()}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword((v) => !v)}
                  accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <MaterialCommunityIcons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.disabled]}
              onPress={() => void handleSubmit()}
              disabled={loading}
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={[typography.button, styles.primaryBtnTxt]}>
                  {isRegistering ? 'Crear cuenta' : 'Ingresar'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.switchBtn}
              onPress={() => {
                setIsRegistering((v) => !v);
                setName('');
                setPassword('');
              }}
              disabled={loading}
            >
              <Text style={[typography.caption, styles.switchTxt]}>
                {isRegistering
                  ? '¿Ya tenés cuenta? Ingresá'
                  : '¿No tenés cuenta? Registrate'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Separador */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={[typography.caption, styles.dividerTxt]}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Modo offline */}
          <View style={styles.offlineSection}>
            <MaterialCommunityIcons name="cloud-off-outline" size={18} color={colors.textMuted} />
            <Text style={[typography.caption, styles.offlineTxt]}>
              La IA funciona 100% sin internet. Sin cuenta, los diagnósticos se guardan solo en el dispositivo.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl * 2,
    paddingTop: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.primaryDark,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 22,
  },
  form: {
    gap: spacing.md,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  label: {
    color: colors.text,
    fontWeight: '600',
  },
  input: {
    height: 50,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRightWidth: 0,
  },
  eyeBtn: {
    height: 50,
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopRightRadius: radii.sm,
    borderBottomRightRadius: radii.sm,
  },
  primaryBtn: {
    height: 54,
    backgroundColor: colors.primaryDark,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  primaryBtnTxt: {
    color: colors.white,
  },
  disabled: {
    opacity: 0.6,
  },
  switchBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  switchTxt: {
    color: colors.primary,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerTxt: {
    color: colors.textMuted,
  },
  offlineSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  offlineTxt: {
    flex: 1,
    color: colors.textMuted,
    lineHeight: 19,
  },
});
