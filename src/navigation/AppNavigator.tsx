import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { Clock, LayoutGrid, BarChart3, User } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useReceipts } from '../context/ReceiptContext';
import { colors, fonts } from '../theme';

import LaunchScreen from '../screens/auth/LaunchScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import ReceiptsHistoryScreen from '../screens/ReceiptsHistoryScreen';
import CameraCaptureScreen from '../screens/CameraCaptureScreen';
import ReceiptDetailScreen from '../screens/ReceiptDetailScreen';
import TaxSummaryScreen from '../screens/TaxSummaryScreen';
import ScanResultScreen from '../screens/ScanResultScreen';
import ScanSavedScreen from '../screens/ScanSavedScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { comingSoon } from '../screens/ComingSoonScreen';

const CategoriesScreen = comingSoon('Categories');
const InsightsScreen = comingSoon('Insights');

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, primary: colors.accent } };

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        tabBarStyle: { borderTopColor: '#D8D8DE' },
      }}
    >
      <Tab.Screen name="History" component={ReceiptsHistoryScreen} options={{ tabBarIcon: ({ color }) => <Clock color={color} size={24} /> }} />
      <Tab.Screen name="Categories" component={CategoriesScreen} options={{ tabBarIcon: ({ color }) => <LayoutGrid color={color} size={24} /> }} />
      <Tab.Screen name="Insights" component={InsightsScreen} options={{ tabBarIcon: ({ color }) => <BarChart3 color={color} size={24} /> }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: ({ color }) => <User color={color} size={24} /> }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { loading, user, hasOnboarded } = useAuth();
  const { loading: dataLoading } = useReceipts();

  if (loading || dataLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="CameraModal" component={CameraCaptureScreen} options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
            <Stack.Screen name="ScanResult" component={ScanResultScreen} options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="ScanSaved" component={ScanSavedScreen} options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="ReceiptDetail" component={ReceiptDetailScreen} />
            <Stack.Screen name="TaxSummary" component={TaxSummaryScreen} />
          </>
        ) : hasOnboarded ? (
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
    </NavigationContainer>
  );
}
