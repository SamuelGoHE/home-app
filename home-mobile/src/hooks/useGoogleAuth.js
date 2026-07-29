import { useState } from 'react';
import { Alert } from 'react-native';
import { useAuthStore } from '../context/authStore';

// Los Client IDs de OAuth son públicos — no son secretos
// webClientId: cliente tipo "Web" en Google Console — en Android el idToken se emite contra este ID
const GOOGLE_WEB_CLIENT_ID = '622836904103-18gghmnio638epbjojopiscvmqko81ch.apps.googleusercontent.com';

// iosClientId: cliente tipo "iOS" en Google Console. Su Bundle ID debe ser el de app.json
// (com.samuelgomez.homeapp) y su ID invertido debe coincidir con "iosUrlScheme" en app.json.
const GOOGLE_IOS_CLIENT_ID = '622836904103-folvmcenrhp6br5r095hrm6n218imo4m.apps.googleusercontent.com';

// require() protegido: el módulo nativo no existe en Expo Go (lanza al importarse),
// solo está disponible en un development build. Así el resto de la app sigue funcionando en Expo Go.
let GoogleSignin = null;
let statusCodes = null;
try {
  const mod = require('@react-native-google-signin/google-signin');
  GoogleSignin = mod.GoogleSignin;
  statusCodes = mod.statusCodes;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
  });
} catch (e) {
  GoogleSignin = null;
}

export function useGoogleAuth() {
  const { loginWithOAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const signInWithGoogle = async () => {
    if (!GoogleSignin) {
      Alert.alert(
        'No disponible en Expo Go',
        'El login con Google requiere un development build de la app (eas build --profile development).'
      );
      return;
    }

    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const response = await GoogleSignin.signIn();

      // type === 'cancelled' cuando el usuario cierra el diálogo — no es un error
      if (response.type !== 'success') return;

      // id_token es un JWT firmado por Google — el backend lo verifica directamente
      const idToken = response.data?.idToken;
      if (!idToken) {
        Alert.alert('Error', 'Google no devolvió un token válido');
        return;
      }

      const result = await loginWithOAuth('google', idToken);
      if (!result.success) Alert.alert('Error al iniciar sesión', result.message);
    } catch (err) {
      if (statusCodes && err?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Google Play Services no está disponible en este dispositivo');
      } else {
        Alert.alert('Error', err?.message || 'No se pudo autenticar con Google');
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    signInWithGoogle,
    googleReady: !!GoogleSignin,
    googleLoading: loading,
  };
}
