// Mock mínimo de expo-constants para el entorno de tests (node).
// apiUrl.js solo lee expoConfig?.hostUri; con esto resuelve a localhost.
module.exports = {
  __esModule: true,
  default: { expoConfig: { hostUri: 'localhost:8081' } },
};
