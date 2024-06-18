import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import NavBarContainer from './Components/NavBar';
import {AlertNotificationRoot} from 'react-native-alert-notification';

export default function App() {
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
