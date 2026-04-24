import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from './src/constants/theme';
import type { RootStackParamList } from './src/navigation/types';
import { initDatabase } from './src/services/databaseService';
import { CameraScreen } from './src/screens/CameraScreen';
import { DetailScreen } from './src/screens/DetailScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ResultScreen } from './src/screens/ResultScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Raíz de la app: proveedor de navegación + tema académico + inicialización de SQLite.
 */
export default function App() {
  useEffect(() => {
    void initDatabase();
  }, []);

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

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <StatusBar style="dark" />
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: { backgroundColor: colors.primaryDark },
            headerTintColor: colors.white,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              title: 'Inicio',
              headerShown: true,
            }}
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
            options={{
              title: 'Diagnóstico',
              headerBackTitle: 'Atrás',
            }}
          />
          <Stack.Screen
            name="History"
            component={HistoryScreen}
            options={{
              title: 'Historial',
              headerBackTitle: 'Atrás',
            }}
          />
          <Stack.Screen
            name="Detail"
            component={DetailScreen}
            options={{
              title: 'Detalle',
              headerBackTitle: 'Atrás',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
