import React, { useEffect } from 'react';
import './global.css';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Briefcase, Tag, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from './src/context/authStore';

// ── Auth ──────────────────────────────────────────────────────────
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';

// ── Tabs cliente ──────────────────────────────────────────────────
import HomeScreen from './src/screens/HomeScreen';
import ServicesScreen from './src/screens/ServicesScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// ── Tab trabajador ────────────────────────────────────────────────
import WorkerHomeScreen from './src/screens/WorkerHomeScreen';
import WorkerOnboardingScreen from './src/screens/WorkerOnboardingScreen';

// ── Flujo de cotización ───────────────────────────────────────────
import QuoteScreen from './src/screens/QuoteScreen';
import ResultsScreen from './src/screens/ResultsScreen';

// ── Perfil y subpantallas ─────────────────────────────────────────
import ProfileEditScreen from './src/screens/Profileeditscreen';
import MyRatingsScreen from './src/screens/Myratingscreen';
import HelpCenterScreen from './src/screens/Helpcenterscreen';
import AppSettingsScreen from './src/screens/Appsettingsscreen';

// ── Flujo trabajador ──────────────────────────────────────────────
import WorkerDetailScreen from './src/screens/Workerdetailscreen';

// ── Pantallas adicionales ─────────────────────────────────────────
import ProjectsScreen from './src/screens/Projectsscreen';
import ProjectDetailScreen from './src/screens/Projectdetailscreen';
import CalendarScreen from './src/screens/Calendarscreen';
import ChatScreen from './src/screens/Chatscreen';
import ChatsListScreen from './src/screens/Chatslistscreen';
import RatingScreen from './src/screens/Ratingscreen';
import PaymentScreen from './src/screens/PaymentScreen';
import BankAccountScreen from './src/screens/BankAccountScreen';
import SecurityScreen from './src/screens/Securityscreen';

// ── Instancias de navegadores (una por stack, nunca compartidas) ──
const RootStack  = createNativeStackNavigator();
const AppStack   = createNativeStackNavigator();
const HomeStack  = createNativeStackNavigator();
const SvcStack   = createNativeStackNavigator();
const ProjStack  = createNativeStackNavigator();
const ProfStack  = createNativeStackNavigator();
const WkrHomeStack = createNativeStackNavigator();
const WkrProjStack = createNativeStackNavigator();
const WkrProfStack = createNativeStackNavigator();

const Tab = createBottomTabNavigator();

// La barra crece con el área segura del dispositivo (barra de gestos de
// Android / home indicator de iOS) para que los botones nunca queden debajo.
const getTabBarStyle = (insets) => ({
  height: 60 + Math.max(insets.bottom, 8),
  paddingBottom: Math.max(insets.bottom, 8),
  paddingTop: 8,
  borderTopColor: '#f3f4f6',
  backgroundColor: '#ffffff',
});

const TAB_LABEL_STYLE = { fontSize: 11, fontWeight: '600' };

const SCREEN_OPTS = { headerShown: false };

/* ── Stacks cliente ──────────────────────────────────────────────── */
function HomeTabStack() {
  return (
    <HomeStack.Navigator screenOptions={SCREEN_OPTS}>
      <HomeStack.Screen name="HomeTabScreen" component={HomeScreen} />
      <HomeStack.Screen name="Quote"         component={QuoteScreen} />
      <HomeStack.Screen name="Results"       component={ResultsScreen} />
      <HomeStack.Screen name="WorkerDetail"  component={WorkerDetailScreen} />
      <HomeStack.Screen name="Calendar"      component={CalendarScreen} />
      <HomeStack.Screen name="ChatsList"     component={ChatsListScreen} />
    </HomeStack.Navigator>
  );
}

function ServicesTabStack() {
  return (
    <SvcStack.Navigator screenOptions={SCREEN_OPTS}>
      <SvcStack.Screen name="ServicesTabScreen" component={ServicesScreen} />
      <SvcStack.Screen name="Quote"             component={QuoteScreen} />
      <SvcStack.Screen name="Results"           component={ResultsScreen} />
      <SvcStack.Screen name="WorkerDetail"      component={WorkerDetailScreen} />
      <SvcStack.Screen name="Calendar"          component={CalendarScreen} />
    </SvcStack.Navigator>
  );
}

function ProjectsTabStack() {
  return (
    <ProjStack.Navigator screenOptions={SCREEN_OPTS}>
      <ProjStack.Screen name="ProjectsTabScreen" component={ProjectsScreen} />
      <ProjStack.Screen name="ProjectDetail"     component={ProjectDetailScreen} />
      <ProjStack.Screen name="Chat"              component={ChatScreen} />
      <ProjStack.Screen name="Rating"            component={RatingScreen} />
      <ProjStack.Screen name="Payment"           component={PaymentScreen} />
    </ProjStack.Navigator>
  );
}

function ProfileTabStack() {
  return (
    <ProfStack.Navigator screenOptions={SCREEN_OPTS}>
      <ProfStack.Screen name="ProfileTabScreen" component={ProfileScreen} />
      <ProfStack.Screen name="ProfileEdit"      component={ProfileEditScreen} />
      <ProfStack.Screen name="MyRatings"        component={MyRatingsScreen} />
      <ProfStack.Screen name="Help"             component={HelpCenterScreen} />
      <ProfStack.Screen name="AppSettings"      component={AppSettingsScreen} />
      <ProfStack.Screen name="Security"         component={SecurityScreen} />
    </ProfStack.Navigator>
  );
}

/* ── Stacks trabajador ───────────────────────────────────────────── */
function WorkerHomeTabStack() {
  return (
    <WkrHomeStack.Navigator screenOptions={SCREEN_OPTS}>
      <WkrHomeStack.Screen name="WorkerHomeTabScreen" component={WorkerHomeScreen} />
      <WkrHomeStack.Screen name="MyRatings"           component={MyRatingsScreen} />
    </WkrHomeStack.Navigator>
  );
}

function WorkerProjectsTabStack() {
  return (
    <WkrProjStack.Navigator screenOptions={SCREEN_OPTS}>
      <WkrProjStack.Screen name="ProjectsTabScreen" component={ProjectsScreen} />
      <WkrProjStack.Screen name="ProjectDetail"     component={ProjectDetailScreen} />
      <WkrProjStack.Screen name="Chat"              component={ChatScreen} />
    </WkrProjStack.Navigator>
  );
}

function WorkerProfileTabStack() {
  return (
    <WkrProfStack.Navigator screenOptions={SCREEN_OPTS}>
      <WkrProfStack.Screen name="ProfileTabScreen" component={ProfileScreen} />
      <WkrProfStack.Screen name="ProfileEdit"      component={ProfileEditScreen} />
      <WkrProfStack.Screen name="MyRatings"        component={MyRatingsScreen} />
      <WkrProfStack.Screen name="Help"             component={HelpCenterScreen} />
      <WkrProfStack.Screen name="AppSettings"      component={AppSettingsScreen} />
      <WkrProfStack.Screen name="Security"         component={SecurityScreen} />
      <WkrProfStack.Screen name="BankAccount"      component={BankAccountScreen} />
    </WkrProfStack.Navigator>
  );
}

/* ── Tabs cliente ────────────────────────────────────────────────── */
function ClientTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, focused }) => {
          const s = focused ? 24 : 22;
          const sw = focused ? 2.5 : 1.8;
          if (route.name === 'HomeTab')      return <Home      size={s} color={color} strokeWidth={sw} />;
          if (route.name === 'ServicesTab')  return <Tag       size={s} color={color} strokeWidth={sw} />;
          if (route.name === 'ProjectsTab')  return <Briefcase size={s} color={color} strokeWidth={sw} />;
          if (route.name === 'ProfileTab')   return <User      size={s} color={color} strokeWidth={sw} />;
        },
        tabBarActiveTintColor: '#E8432D',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: getTabBarStyle(insets),
        tabBarLabelStyle: TAB_LABEL_STYLE,
      })}
    >
      <Tab.Screen name="HomeTab"      component={HomeTabStack}      options={{ tabBarLabel: 'Inicio' }} />
      <Tab.Screen name="ServicesTab"  component={ServicesTabStack}  options={{ tabBarLabel: 'Servicios' }} />
      <Tab.Screen
        name="ProjectsTab"
        component={ProjectsTabStack}
        options={{ tabBarLabel: 'Proyectos' }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            // Tocar el tab siempre debe mostrar el listado, no quedarse en el
            // último detalle abierto (p.ej. al entrar desde "Proyectos recién
            // completados" en el Home y luego cambiar de pestaña).
            navigation.navigate('ProjectsTab', { screen: 'ProjectsTabScreen' });
          },
        })}
      />
<Tab.Screen name="ProfileTab"   component={ProfileTabStack}   options={{ tabBarLabel: 'Perfil' }} />
    </Tab.Navigator>
  );
}

/* ── Tabs trabajador ─────────────────────────────────────────────── */
function WorkerTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, focused }) => {
          const s = focused ? 24 : 22;
          const sw = focused ? 2.5 : 1.8;
          if (route.name === 'WorkerHomeTab') return <Home      size={s} color={color} strokeWidth={sw} />;
          if (route.name === 'ProjectsTab')   return <Briefcase size={s} color={color} strokeWidth={sw} />;
          if (route.name === 'ProfileTab')    return <User      size={s} color={color} strokeWidth={sw} />;
        },
        tabBarActiveTintColor: '#E8432D',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: getTabBarStyle(insets),
        tabBarLabelStyle: TAB_LABEL_STYLE,
      })}
    >
      <Tab.Screen name="WorkerHomeTab" component={WorkerHomeTabStack}     options={{ tabBarLabel: 'Inicio' }} />
      <Tab.Screen
        name="ProjectsTab"
        component={WorkerProjectsTabStack}
        options={{ tabBarLabel: 'Trabajos' }}
        listeners={({ navigation }) => ({
          tabPress: () => {
            navigation.navigate('ProjectsTab', { screen: 'ProjectsTabScreen' });
          },
        })}
      />
      <Tab.Screen name="ProfileTab"    component={WorkerProfileTabStack}  options={{ tabBarLabel: 'Perfil' }} />
    </Tab.Navigator>
  );
}

/* ── Rutas autenticadas ──────────────────────────────────────────── */
function AppRoutes() {
  const { user, needsWorkerOnboarding } = useAuthStore();
  const isWorker = user?.role === 'trabajador';

  return (
    <AppStack.Navigator screenOptions={SCREEN_OPTS}>
      {isWorker && needsWorkerOnboarding ? (
        // Trabajador recién registrado: configura su perfil antes de entrar
        <AppStack.Screen name="WorkerOnboarding" component={WorkerOnboardingScreen} />
      ) : (
        <AppStack.Screen
          name="MainTabs"
          component={isWorker ? WorkerTabs : ClientTabs}
        />
      )}
    </AppStack.Navigator>
  );
}

/* ── Root ────────────────────────────────────────────────────────── */
export default function App() {
  const { isAuthenticated, fetchMe } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) fetchMe();
  }, [isAuthenticated]);

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={SCREEN_OPTS}>
        {isAuthenticated ? (
          <RootStack.Screen name="AppRoutes" component={AppRoutes} />
        ) : (
          <RootStack.Group>
            <RootStack.Screen name="Welcome"        component={WelcomeScreen} />
            <RootStack.Screen name="Login"          component={LoginScreen} />
            <RootStack.Screen name="Register"       component={RegisterScreen} />
            <RootStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </RootStack.Group>
        )}
      </RootStack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
