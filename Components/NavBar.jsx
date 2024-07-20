import React, { useEffect, useRef } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { createStackNavigator } from '@react-navigation/stack';
import * as Linking from 'expo-linking';

// Screens
import Home from '../Screens/Home';
import Add from '../Screens/Add';
import SingleOtp from '../Screens/SingleOtp';
import Synchro from '../Screens/Synchro';
import CodeQrScan from '../Screens/CodeQrScan';
import Settings from '../Screens/Settings';

// Screen names
const home = "Home";
const add = "Add";
const Sync = "Sync";
const singleOtp = "SingleOtp";
const CodeQr = "CodeQrScan";
const settings = "Settings";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name={home} component={Home} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function handleOpenURL(event, navigationRef) {
  const url = event.url;
  const otpAuthRegex = /^otpauth:\/\/totp\/.+$/;

  if (otpAuthRegex.test(url)) {
    const urlObj = new URL(url);
    const params = new URLSearchParams(urlObj.search);
    const secret = params.get('secret');
    const issuer = params.get('issuer');
    navigationRef.current?.navigate('Add', {QrCodeData: url, secret, issuer });
  }
}

function NavBarContainer() {
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    const getUrlAsync = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) handleOpenURL({ url: initialUrl }, navigationRef);

      const listener = (event) => handleOpenURL(event, navigationRef);
      Linking.addEventListener('url', listener);

      return () => {
        Linking.removeEventListener('url', listener);
      };
    };

    getUrlAsync();
  }, [navigationRef]);

  const linking = {
    prefixes: [Linking.createURL('/')],
    config: {
      screens: {
        Main: 'main',
        SingleOtp: 'singleOtp',
        CodeQrScan: 'codeQrScan',
      },
    },
  };

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <Stack.Navigator initialRouteName="Main" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={TabScreen} />
        <Stack.Screen name={singleOtp} component={SingleOtp} />
        <Stack.Screen name={CodeQr} component={CodeQrScan} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function TabScreen() {
  return (
    <Tab.Navigator
      initialRouteName={home}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          let rn = route.name;

          if (rn === home) {
            iconName = focused ? 'home' : 'home-outline';
          } else if (rn === add) {
            iconName = focused ? 'duplicate' : 'duplicate-outline';
          } else if (rn === Sync) {
            iconName = focused ? 'cloud-upload' : 'cloud-upload-outline';
          }
          else if (rn === settings) {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarStyle: {
          backgroundColor: '#282828',
        },
      })}
      tabBarOptions={{
        activeTintColor: '#6F54A9',
        inactiveTintColor: 'grey',
        labelStyle: { fontSize: 10 },
      }}
    >
      <Tab.Screen name={home} component={HomeStack} options={{ headerShown: false }} />
      <Tab.Screen name={add} component={Add} options={{ headerShown: false }} />
      <Tab.Screen name={Sync} component={Synchro} options={{ headerShown: false }} />
      <Tab.Screen name={settings} component={Settings} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}

export default NavBarContainer;
