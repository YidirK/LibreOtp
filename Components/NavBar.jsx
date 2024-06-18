import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { createStackNavigator } from '@react-navigation/stack';
// Screens
import Home from '../Screens/Home';
import Add from '../Screens/Add';
import SingleOtp from '../Screens/SingleOtp';
import Synchro from '../Screens/Synchro';
import CodeQrScan from '../Screens/CodeQrScan';
import Settings from '../Screens/Settings';

//Screen names
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

function NavBarContainer() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={home} headerMode="none">
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
        labelStyle: {  fontSize: 10 },
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
