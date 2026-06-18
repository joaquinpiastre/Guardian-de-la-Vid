import * as Location from 'expo-location';

/**
 * Snapshot de ubicación + clima en el momento de un diagnóstico.
 * Se guarda junto al registro para poder correlacionar enfermedades con condiciones climáticas.
 */
export interface WeatherSnapshot {
  latitude: number;
  longitude: number;
  temperatureC: number;
  humidityPercent: number;
  weatherCode: number;
  conditionText: string;
  /** ISO 8601, hora real reportada por el servicio meteorológico (no la del dispositivo). */
  observedAt: string;
}

/** Tabla de códigos WMO (usada por Open-Meteo) → texto legible en español. */
const WEATHER_CODE_TEXT: Record<number, string> = {
  0: 'Despejado',
  1: 'Mayormente despejado',
  2: 'Parcialmente nublado',
  3: 'Nublado',
  45: 'Niebla',
  48: 'Niebla con escarcha',
  51: 'Llovizna débil',
  53: 'Llovizna moderada',
  55: 'Llovizna intensa',
  56: 'Llovizna helada débil',
  57: 'Llovizna helada intensa',
  61: 'Lluvia débil',
  63: 'Lluvia moderada',
  65: 'Lluvia intensa',
  66: 'Lluvia helada débil',
  67: 'Lluvia helada intensa',
  71: 'Nevada débil',
  73: 'Nevada moderada',
  75: 'Nevada intensa',
  77: 'Granizo pequeño',
  80: 'Chubascos débiles',
  81: 'Chubascos moderados',
  82: 'Chubascos violentos',
  85: 'Chubascos de nieve débiles',
  86: 'Chubascos de nieve intensos',
  95: 'Tormenta',
  96: 'Tormenta con granizo débil',
  99: 'Tormenta con granizo intenso',
};

function weatherCodeToText(code: number): string {
  return WEATHER_CODE_TEXT[code] ?? 'Condición desconocida';
}

async function ensureLocationPermission(): Promise<boolean> {
  const { status: existing } = await Location.getForegroundPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

/**
 * Obtiene ubicación GPS actual + clima en esa posición (Open-Meteo, sin API key).
 * Nunca lanza: ante cualquier fallo (permiso denegado, GPS apagado, sin internet) devuelve `null`
 * para no bloquear el guardado del diagnóstico.
 */
export async function getCurrentWeatherSnapshot(): Promise<WeatherSnapshot | null> {
  try {
    const granted = await ensureLocationPermission();
    if (!granted) return null;

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const { latitude, longitude } = position.coords;

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`;

    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const current = data?.current;
    if (!current) return null;

    return {
      latitude,
      longitude,
      temperatureC: Number(current.temperature_2m),
      humidityPercent: Number(current.relative_humidity_2m),
      weatherCode: Number(current.weather_code),
      conditionText: weatherCodeToText(Number(current.weather_code)),
      observedAt: String(current.time),
    };
  } catch (e) {
    console.warn('[Guardián de la Vid] No se pudo obtener clima/ubicación.', e);
    return null;
  }
}
