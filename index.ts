// Polyfill Buffer para Hermes (React Native): jpeg-js lo usa al codificar imágenes.
// Debe estar antes de cualquier otro import.
import { Buffer } from 'buffer';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).Buffer = (global as any).Buffer ?? Buffer;

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
