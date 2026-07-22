import React, { useEffect, useState, useRef } from 'react';
import { View, AppState } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import * as Linking from 'expo-linking';
import GlassTabBar from '../components/GlassTabBar';
import LockScreen from '../components/LockScreen';
import { isLockEnabled } from '../lib/appLock';

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
    navigationRef.current?.navigate('Add', { QrCodeData: url, secret, issuer });
  }
}

function NavBarContainer() {
  const navigationRef = useNavigationContainerRef();
  const [isLocked, setIsLocked] = useState(false);
  const [lockChecked, setLockChecked] = useState(false);
  const appState = useRef(AppState.currentState);

  // Au lancement de l'app : si le verrouillage est activé, on démarre verrouillé.
  useEffect(() => {
    const initLock = async () => {
      const enabled = await isLockEnabled();
      setIsLocked(enabled);
      setLockChecked(true);
    };
    initLock();
  }, []);

  // Dès que l'app repasse en arrière-plan (multitâche, verrouillage du téléphone...),
  // on la reverrouille immédiatement — elle ne se déverrouille que via LockScreen.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      const goingToBackground =
          appState.current === 'active' && nextAppState.match(/inactive|background/);

      if (goingToBackground) {
        const enabled = await isLockEnabled();
        if (enabled) {
          setIsLocked(true);
        }
      }

      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

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
      <View style={{ flex: 1 }}>
        <NavigationContainer ref={navigationRef} linking={linking}>
          <Stack.Navigator initialRouteName="Main" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Main" component={TabScreen} />
            <Stack.Screen name={singleOtp} component={SingleOtp} />
            <Stack.Screen name={CodeQr} component={CodeQrScan} />
          </Stack.Navigator>
        </NavigationContainer>

        {/* LockScreen se dimensionne lui-même en pixels réels (useWindowDimensions),
          donc il n'a plus besoin de dépendre de la taille de ce conteneur parent. */}
        {lockChecked && isLocked && <LockScreen onUnlock={() => setIsLocked(false)} />}
      </View>
  );
}

function TabScreen() {
  return (
      <Tab.Navigator
          initialRouteName={home}
          screenOptions={{ headerShown: false, tabBarShowLabel: false }}
          tabBar={(props) => <GlassTabBar {...props} />}
      >
        <Tab.Screen name={home} component={HomeStack} />
        <Tab.Screen name={add} component={Add} />
        <Tab.Screen name={Sync} component={Synchro} />
        <Tab.Screen name={settings} component={Settings} />
      </Tab.Navigator>
  );
}

export default NavBarContainer;