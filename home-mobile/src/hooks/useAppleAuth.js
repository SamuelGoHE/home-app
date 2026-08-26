import { useState } from 'react';
import { Platform, Alert } from 'react-native';
import { useAuthStore } from '../context/authStore';

// require() protegido: expo-apple-authentication solo tiene módulo nativo en
// iOS — en Android/web el import no rompe la app, solo queda inutilizable.
let AppleAuthentication = null;
try {
  AppleAuthentication = require('expo-apple-authentication');
} catch (e) {
  AppleAuthentication = null;
}

export function useAppleAuth() {
  const { loginWithOAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const signInWithApple = async () => {
    if (Platform.OS !== 'ios' || !AppleAuthentication) {
      Alert.alert('No disponible', 'Iniciar sesión con Apple solo está disponible en iOS.');
      return;
    }

    setLoading(true);
    try {
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        Alert.alert('No disponible', 'Este dispositivo no admite Iniciar sesión con Apple.');
        return;
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken, fullName, email } = credential;
      if (!identityToken) {
        Alert.alert('Error', 'Apple no devolvió un token válido');
        return;
      }

      // Apple solo envía nombre/email en el PRIMER login del usuario — se
      // pasan como fallback para que el backend los use si el token no trae
      // email (logins posteriores solo traen el `sub`, ver verifyOAuthToken.js).
      const fallbackName = fullName?.givenName
        ? `${fullName.givenName} ${fullName.familyName || ''}`.trim()
        : undefined;

      const result = await loginWithOAuth('apple', identityToken, {
        name: fallbackName,
        email: email || undefined,
      });
      if (!result.success) Alert.alert('Error al iniciar sesión', result.message);
    } catch (err) {
      if (err.code === 'ERR_REQUEST_CANCELED') return; // el usuario cerró el diálogo
      Alert.alert('Error', err?.message || 'No se pudo autenticar con Apple');
    } finally {
      setLoading(false);
    }
  };

  return {
    signInWithApple,
    appleReady: Platform.OS === 'ios' && !!AppleAuthentication,
    appleLoading: loading,
  };
}
