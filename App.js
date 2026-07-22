import './backHandlerShim';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import NavBarContainer from './components/NavBar';
import {AlertNotificationRoot} from 'react-native-alert-notification';
import { initI18n } from './lib/i18n.js';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initI18n().then(() => setReady(true));
  }, []);

  if (!ready) return null;
  return (
    <>
    <AlertNotificationRoot>
    <NavBarContainer/>
    </AlertNotificationRoot>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
