import React, { useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, DarkTheme, DefaultTheme, NavigationState } from '@react-navigation/native';
import { TabBar } from '../components/TabBar';
import { useAuth } from '../context/AuthContext';
import { useReceipts } from '../context/ReceiptContext';
import { useAppScheme } from '../context/useAppScheme';
import { colors } from '../theme';

import LaunchScreen from '../screens/auth/LaunchScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ReceiptsHistoryScreen from '../screens/ReceiptsHistoryScreen';
import CameraCaptureScreen from '../screens/CameraCaptureScreen';
import ReceiptDetailScreen from '../screens/ReceiptDetailScreen';
import OriginalPhotoScreen from '../screens/OriginalPhotoScreen';
import RemindersScreen from '../screens/RemindersScreen';
import TaxSummaryScreen from '../screens/TaxSummaryScreen';
import ExportScreen from '../screens/ExportScreen';
import ScanResultScreen from '../screens/ScanResultScreen';
import ScanSavedScreen from '../screens/ScanSavedScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import InsightsScreen from '../screens/InsightsScreen';
import CategoriesScreen from '../screens/categories/CategoriesScreen';
import CategoryDetailScreen from '../screens/categories/CategoryDetailScreen';
import ManageCategoriesScreen from '../screens/categories/ManageCategoriesScreen';
import EditCategoryScreen from '../screens/categories/EditCategoryScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();


/** Tabs from the design: Home · Receipts · Categories · HST, plus the round Scan button in the bar. */
function MainTabs() {
  return (
    <Tab.Navigator tabBar={props => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Receipts" component={ReceiptsHistoryScreen} />
      <Tab.Screen name="Categories" component={CategoriesScreen} />
      <Tab.Screen name="HST" component={TaxSummaryScreen} />
    </Tab.Navigator>
  );
}

const modal = { presentation: 'modal', animation: 'slide_from_bottom' } as const;
const fullScreen = { presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false } as const;

/** Everything a signed-in user can reach. */
export function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Main" component={MainTabs} />
      {/* B · Capture */}
      <Stack.Screen name="CameraModal" component={CameraCaptureScreen} options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="ScanResult" component={ScanResultScreen} options={fullScreen} />
      <Stack.Screen name="ScanSaved" component={ScanSavedScreen} options={fullScreen} />
      {/* C · Receipts */}
      <Stack.Screen name="ReceiptDetail" component={ReceiptDetailScreen} />
      <Stack.Screen name="OriginalPhoto" component={OriginalPhotoScreen} options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
      <Stack.Screen name="Reminders" component={RemindersScreen} />
      {/* D · Insights and HST */}
      <Stack.Screen name="Insights" component={InsightsScreen} />
      <Stack.Screen name="Export" component={ExportScreen} options={modal} />
      {/* E · Categories */}
      <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} />
      <Stack.Screen name="ManageCategories" component={ManageCategoriesScreen} />
      <Stack.Screen name="EditCategory" component={EditCategoryScreen} options={modal} />
      {/* F · Profile */}
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={modal} />
    </Stack.Navigator>
  );
}

function AuthStack({ hasOnboarded }: { hasOnboarded: boolean }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      {hasOnboarded ? (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Launch" component={LaunchScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { loading, user, hasOnboarded } = useAuth();
  const { loading: dataLoading } = useReceipts();
  // Sets the palette before any screen below renders.
  const scheme = useAppScheme();
  // Kept across the remount that a Light/Dark switch causes, so the user stays on the same screen.
  const navState = useRef<NavigationState | undefined>(undefined);

  if (loading || dataLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.accentFill, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = { ...base, colors: { ...base.colors, background: colors.bg, card: colors.card, text: colors.text, border: colors.separator, primary: colors.accent } };

  return (
    <NavigationContainer key={scheme} theme={navTheme} initialState={navState.current} onStateChange={s => { navState.current = s; }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {user ? <AppStack /> : <AuthStack hasOnboarded={hasOnboarded} />}
    </NavigationContainer>
  );
}
