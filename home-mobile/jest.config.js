// Config de tests de la capa de lógica (stores, cliente HTTP, utilidades).
// No renderiza pantallas RN: usa entorno node y un babel propio para tests
// (evita el preset expo/nativewind, que requiere contexto nativo).
module.exports = {
  testEnvironment: 'node',
  watchman: false,
  transform: {
    // configFile/babelrc false: NO cargar el babel.config.js del proyecto (preset
    // expo + nativewind), que inyecta imports ESM (expo/virtual/env.js) y necesita
    // contexto nativo. En tests basta preset-env apuntando a node.
    '^.+\\.[jt]sx?$': ['babel-jest', {
      configFile: false,
      babelrc: false,
      presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
    }],
  },
  // zustand publica ESM; hay que transpilarlo (el resto de node_modules se ignora).
  transformIgnorePatterns: ['node_modules/(?!(zustand)/)'],
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$':
      '@react-native-async-storage/async-storage/jest/async-storage-mock.js',
    '^expo-constants$': '<rootDir>/test/__mocks__/expo-constants.js',
  },
  testMatch: ['<rootDir>/test/**/*.test.js'],
};
