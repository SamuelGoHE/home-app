# Mobile (`home-mobile/`)

Expo SDK ~54 (React Native 0.81, React 19). **No usa Expo Go** — depende de módulos nativos (`@react-native-google-signin/google-signin`) que no existen en el runtime de Expo Go, por eso el proyecto incluye `expo-dev-client` y `home-mobile/eas.json` define perfiles de build (`development`, `preview`, `production`) para generar un cliente de desarrollo propio vía EAS Build.

## Estructura

```
home-mobile/
├── App.js                # Navegación completa (stacks + tabs), un solo archivo
├── index.js                # Entry point: registerRootComponent(App)
├── src/
│   ├── screens/             # 22 pantallas (convención de nombres inconsistente, ver quality-report.md)
│   ├── components/           # GoogleSignInButton, PasswordChecklist
│   ├── context/authStore.js   # Igual que el frontend, pero con AsyncStorage
│   ├── hooks/
│   │   ├── useApi.js           # Idéntico byte a byte al del frontend
│   │   ├── useChat.js           # Igual que frontend, adaptado a AsyncStorage
│   │   ├── useGoogleAuth.js      # Google Sign-In nativo (no OAuth por WebView)
│   │   └── useNotifications.js   # Igual que frontend + polling cada 10s
│   ├── services/api.js          # axios con AsyncStorage en vez de localStorage
│   └── utils/favorites.js        # Igual que frontend, con AsyncStorage
```

## Navegación (`App.js`)

Un único archivo (~250+ líneas) define **9 stack navigators independientes** (`createNativeStackNavigator`) anidados dentro de un **bottom tab navigator** (`createBottomTabNavigator`), con un set de tabs para cliente y otro para trabajador (se decide qué set mostrar según `user.role` del `authStore`). Cada stack agrupa las pantallas alcanzables desde ese tab (ej. `HomeStack` → Home, Quote, Results, WorkerDetail, Calendar).

No hay una carpeta `navigation/` separada — toda la configuración de navegación vive directamente en `App.js`. Es manejable al tamaño actual del proyecto, pero seguirá creciendo con cada pantalla nueva (ver [`quality-report.md`](quality-report.md)).

## Duplicación con el frontend web

`home-mobile` y `home-frontend` **no comparten código** (no hay paquete común ni workspace), pero varios archivos son casi idénticos, adaptados solo en la capa de almacenamiento (`localStorage` en web → `AsyncStorage`, asíncrono, en mobile):

| Archivo | Diferencia real con su equivalente en `home-frontend` |
|---|---|
| `hooks/useApi.js` | **Ninguna** — 100% idéntico |
| `context/authStore.js` | Storage async (`AsyncStorage` vs `localStorage`) + un campo extra `needsWorkerOnboarding` (mobile tiene una pantalla de onboarding para trabajadores nuevos que el web no tiene) |
| `services/api.js` | `baseURL` absoluta (`EXPO_PUBLIC_API_URL`) en vez de relativa (RN no tiene proxy de dev server como Vite); resto de la lógica de interceptors (refresh automático en 401) es la misma |
| `utils/favorites.js` | Mismas funciones, versión async |

Ver el análisis completo de esta duplicación (y por qué vale la pena extraerla a un paquete compartido) en [`quality-report.md`](quality-report.md).

## Autenticación

- **Email/password y OAuth vía backend**: igual que el frontend, contra `/api/auth/*`.
- **Google Sign-In nativo** (`hooks/useGoogleAuth.js`): usa el SDK nativo de Google (`@react-native-google-signin/google-signin`), no un flujo OAuth por WebView. Configurado con dos client IDs (públicos, no son secretos): uno "Web" (`webClientId`, usado también para verificar en Android) y uno "iOS" (`iosClientId`, debe coincidir con el bundle ID y el `iosUrlScheme` de `app.json`). El módulo nativo se importa con `try/catch` porque **no existe en Expo Go** — si falla el `require()`, el botón de Google queda deshabilitado con un mensaje explicando que se necesita un development build, en vez de crashear toda la app.
- El JWT resultante (`idToken`) se manda tal cual al backend (`POST /api/auth/oauth`), que lo verifica contra Google — mismo flujo que describe [`authentication.md`](authentication.md).

## Estilos: NativeWind

`babel.config.js` y `metro.config.js` están configurados con `nativewind` (Tailwind para React Native) — confirmado en uso real (25 archivos usan `className`). El plugin de Babel de `react-native-reanimated`/`react-native-worklets` **no está configurado** en `babel.config.js`, y no se encontró ningún uso de `Animated`/`reanimated`/`worklet` en el código — ambas dependencias parecen instaladas pero sin usar (ver [`quality-report.md`](quality-report.md)).

## Variable de entorno: `EXPO_PUBLIC_API_URL`

`src/services/api.js` y `src/hooks/useChat.js` leen `process.env.EXPO_PUBLIC_API_URL`, con un **fallback hardcodeado a una IP de LAN específica** (`http://192.168.40.14:3000/api`) si la variable no está definida. Esa IP es la de la red del desarrollador original — para probar en un dispositivo físico en otra red hay que crear `home-mobile/.env` con la IP correcta (ver el README). Desde un emulador Android en la misma máquina, `10.0.2.2` apunta al `localhost` del host; desde un simulador iOS, `localhost` funciona directo.

## Build y distribución

No hay carpetas `ios/`/`android/` versionadas (managed workflow puro, con `expo-dev-client` para los módulos nativos) — se generan al vuelo con `expo prebuild` o directamente en la nube con `eas build`. `home-mobile/eas.json` define 3 perfiles:
- `development` — `developmentClient: true`, distribución interna (para instalar el dev client y luego iterar con `expo start`).
- `preview` — distribución interna (para QA).
- `production` — `autoIncrement: true` (incrementa el build number automáticamente en cada build).

No hay ningún workflow de CI que dispare estos builds automáticamente — se ejecutan a mano (`npx eas build --profile ...`). Ver [`deployment.md`](deployment.md).
