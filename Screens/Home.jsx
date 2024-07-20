import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView ,Image} from 'react-native';
import { Avatar, Card, IconButton, Menu, Divider, Button, Provider as PaperProvider } from 'react-native-paper';
import * as FileSystem from 'expo-file-system';
import PTRView from 'react-native-pull-to-refresh';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function Home({ route }) {
  const navigation = useNavigation();
  const [data, setData] = useState([]);
  console.log(data);
  const [visibleMenu, setVisibleMenu] = useState({});
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedIndex, setSelectedIndex] = useState(null);

  const fetchData = async () => {
    try {
      const fileUri = FileSystem.documentDirectory + 'LibreOtpData.json';
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const jsonData = JSON.parse(fileContent);
      setData(jsonData);
    } catch (error) {
      console.error('Error reading data:', error);
      console.log(error.code);
        setData([]);
    }
  };

  const openMenu = (index, event) => {
    const { pageX, pageY } = event.nativeEvent;
    setMenuPosition({ x: pageX, y: pageY });
    setSelectedIndex(index);
    setVisibleMenu((prevState) => ({
      ...prevState,
      [index]: true,
    }));
  };

  const closeMenu = (index) => {
    setVisibleMenu((prevState) => ({
      ...prevState,
      [index]: false,
    }));
  };

  const deleteItem = async () => {
    try {
      const newData = [...data];
      newData.splice(selectedIndex, 1);
      setData(newData);
      const fileUri = FileSystem.documentDirectory + 'LibreOtpData.json';
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(newData));
      closeMenu(selectedIndex);
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const pullToRefresh = async () => {
    await fetchData();
  };

  const HandleAddKey = () => {
    navigation.navigate('Add');
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchData();
    }, [])
  );

  useEffect(() => {
    fetchData();
  }
  , []);
 
  const iconExists = (iconName) => {

    const ioniconsList = [
      'logo-discord',
      'logo-twitter',
      'logo-facebook',
      'logo-github',
      'logo-google',
      'logo-instagram',
      'logo-linkedin',
      'logo-microsoft',
      'logo-pinterest',
      'logo-reddit',
      'logo-skype',
      'logo-snapchat',
    ];
    return ioniconsList.includes(iconName);
  };
  

  return (
    <PaperProvider>
      <View style={styles.container}>
      <PTRView onRefresh={pullToRefresh}>
        {data.length === 0  && ( 
          <View style={styles.NodataContainer}>
            <Image source={require('../assets/NonOtpYet.png')} style={styles.NodataImage} />
            <Text style={styles.NodataText}>No Key found</Text>
            <TouchableOpacity onPress={HandleAddKey}>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Add')}
              style={styles.NodataButton} icon={() =><Ionicons size={20} name='key-outline' color="#ffff" />}>
              Add Key
            </Button>
            </TouchableOpacity>
          </View>
        
        )}
        {data.length > 0 && ( 
        <ScrollView style={styles.scrollContainer}>
          {data.length > 0 &&
            data.map((item, index) => (
              <>
              <TouchableOpacity key={index} onLongPress={(event) => openMenu(index, event)}  onPress={() => {
    navigation.navigate('SingleOtp', {
      key: `${item.key}`,
      name: `${item.name}`,
      index: `${index}`,
    });
  }}>
                <Card.Title
                  key={index}
                  style={styles.card}
                  title={<Text style={styles.title}>{item.name}</Text>}
                  left={(props) => (
                    <Ionicons
                          size={20}
                          {...props}
                          name={iconExists('logo-' + item.name.toLowerCase().replace(/\s/g, '')) ? 'logo-' + item.name.toLowerCase().replace(/\s/g, '') : 'key-outline'}
                          color="#ffff"
                        />
                        
                  )}
                  right={(props) => (
                    <IconButton
                    {...props}
                    icon="dots-vertical"
                    onPress={(event) => openMenu(index, event)}
                    iconColor="#6F54A9"
                  />
                  )}
                  >
                </Card.Title>
              </TouchableOpacity>
               <Menu
               visible={visibleMenu[index] === true}
               onDismiss={() => closeMenu(index)}
               anchor={{ x: menuPosition.x, y: menuPosition.y }}
               >
               <Menu.Item onPress={deleteItem} title="Delete" titleStyle={{color:"#ff2a2a"}} leadingIcon={() =><Ionicons
                      size={25}
                      
                      name="trash-outline"
                      color="#ff2a2a"
                    />}/>
               <Divider />
               <Menu.Item onPress={() => closeMenu(index)} title="Cancel" leadingIcon={() =><Ionicons
                      size={25}
                      name="close-outline"
                      color="#6F54A9"
                    />} />
             </Menu>
             </>
            ))}
        </ScrollView>
        )}
        </PTRView>
        <StatusBar style="light" />
      </View>
    </PaperProvider>
   
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex:5,
  },
  card: {
    padding: 10,
    width: 300,
    height: 100,
    margin: 10,
    borderRadius: 20,
    backgroundColor: '#282828',
  },
  scrollContainer: {
    flex: 1,
    marginTop: 30,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginRight: 10,
  },
  NodataContainer:{
    marginTop: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  NodataImage:{
    width: 400,
    height: 300,
  },
  NodataText:{
    fontSize: 20,
    fontWeight: 'bold',
    color:"#eeeeee"
  },
  NodataButton :{
    width: 300,
    height: 40,
    marginTop: 20,
    borderRadius: 20,
    backgroundColor: '#6F54A9',
    alignItems: 'center',
    justifyContent: 'center',
  }
});
