import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { Clock, Grid, BarChart3, User } from 'lucide-react-native';
import { THEME } from '../constants';

// Screens
import ReceiptsHistoryScreen from '../screens/ReceiptsHistoryScreen';
import CameraCaptureScreen from '../screens/CameraCaptureScreen';
import ReceiptDetailScreen from '../screens/ReceiptDetailScreen';
// Stubs for other screens
const CategoriesScreen = () => <></>;
const InsightsScreen = () => <></>;
const ProfileScreen = () => <></>;

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: THEME.colors.blue,
        tabBarInactiveTintColor: THEME.colors.gray,
        tabBarStyle: { borderTopWidth: 0.5, borderTopColor: '#E5E5E5' }
      }}
    >
      <Tab.Screen 
        name="History" 
        component={ReceiptsHistoryScreen} 
        options={{ tabBarIcon: ({color}) => <Clock color={color} size={24} /> }} 
      />
      <Tab.Screen 
        name="Categories" 
        component={CategoriesScreen} 
        options={{ tabBarIcon: ({color}) => <Grid color={color} size={24} /> }} 
      />
      <Tab.Screen 
        name="Insights" 
        component={InsightsScreen} 
        options={{ tabBarIcon: ({color}) => <BarChart3 color={color} size={24} /> }} 
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ tabBarIcon: ({color}) => <User color={color} size={24} /> }} 
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen 
            name="CameraModal" 
            component={CameraCaptureScreen} 
            options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} 
        />
        <Stack.Screen 
            name="ReceiptDetail" 
            component={ReceiptDetailScreen} 
            options={{ presentation: 'card', animation: 'slide_from_right' }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}