import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from './src/context/AuthContext';
import { ReceiptProvider } from './src/context/ReceiptContext';
import AppNavigator from './src/navigation/AppNavigator';
import { initReminders } from './src/utils/reminders';

SplashScreen.preventAutoHideAsync().catch(() => {});
initReminders();

// The app uses the system font (SF Pro on iOS), so there is nothing to load before the first screen.
export default function App() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ReceiptProvider>
            <AppNavigator />
          </ReceiptProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
