import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';

import { colors } from './src/constants/theme';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import type { RootStackParamList } from './src/navigation/types';
import { initDatabase } from './src/services/databaseService';
import { logout } from './src/services/authService';
import { syncPendingDiagnoses } from './src/services/syncService';
import { CameraScreen } from './src/screens/CameraScreen';
import { DetailScreen } from './src/screens/DetailScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { ResultScreen } from './src/screens/ResultScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primaryDark} />
    </View>
  );
}

/**
 * Navegador principal: muestra Login si no hay sesión, app completa si hay sesión.
 * También escucha cambios de conectividad para sincronizar diagnósticos pendientes.
 */
function AppNavigator() {
  const { user, loading, isGuest, exitGuestMode } = useAuth();

  useEffect(() => {
    void initDatabase();
  }, []);

  // Sincronización automática al recuperar conexión
  useEffect(() => {
    if (!user) return;
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        void syncPendingDiagnoses(user.uid);
      }
    });
    return unsubscribe;
  }, [user]);

  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: colors.primaryDark,
      background: colors.background,
      card: colors.white,
      text: colors.text,
      border: colors.border,
      notification: colors.primaryLight,
    },
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="dark" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.primaryDark },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {!user && !isGuest ? (
          // ── Sin sesión y sin modo invitado: solo pantalla de login ──
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          // ── Con sesión: flujo completo de la app ──
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={({ navigation }) => ({
                title: 'Inicio',
                headerRight: () => (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('History')}
                    style={{ paddingHorizontal: 8 }}
                    accessibilityLabel="Ver historial"
                  >
                    <MaterialCommunityIcons name="history" size={26} color={colors.white} />
                  </TouchableOpacity>
                ),
                headerLeft: () => (
                  <TouchableOpacity
                    onPress={() => { if (isGuest) exitGuestMode(); else void logout(); }}
                    style={{ paddingHorizontal: 8 }}
                    accessibilityLabel={isGuest ? 'Volver al inicio de sesión' : 'Cerrar sesión'}
                  >
                    <MaterialCommunityIcons name="logout" size={24} color={colors.white} />
                  </TouchableOpacity>
                ),
              })}
            />
            <Stack.Screen
              name="Camera"
              component={CameraScreen}
              options={({ navigation }) => ({
                title: 'Capturar hoja',
                headerBackTitle: 'Atrás',
                headerRight: () => (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('History')}
                    style={{ paddingHorizontal: 12, paddingVertical: 6 }}
                    accessibilityLabel="Abrir historial"
                  >
                    <MaterialCommunityIcons name="history" size={26} color={colors.white} />
                  </TouchableOpacity>
                ),
              })}
            />
            <Stack.Screen
              name="Result"
              component={ResultScreen}
              options={{ title: 'Diagnóstico', headerBackTitle: 'Atrás' }}
            />
            <Stack.Screen
              name="History"
              component={HistoryScreen}
              options={{ title: 'Historial', headerBackTitle: 'Atrás' }}
            />
            <Stack.Screen
              name="Detail"
              component={DetailScreen}
              options={{ title: 'Detalle', headerBackTitle: 'Atrás' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
