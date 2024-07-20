import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View , TouchableOpacity,Image} from 'react-native';
import { TOTP } from "totp-generator"
import {Card, ProgressBar,Snackbar,Provider as PaperProvider,Menu, Divider,TextInput ,Button} from 'react-native-paper';
import { useEffect, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import { ALERT_TYPE, Toast } from 'react-native-alert-notification';
import Modal from "react-native-modal";

export default function SingleOtp({ route }) {
  const { key, name , index} = route.params;
    const navigation = useNavigation();
    const [otp , setOtp] = useState('')
    const [timeLeft, setTimeLeft] = useState(0)
    const [visible, setVisible] = useState(false);
    const onDismissSnackBar = () => setVisible(false);
    useEffect(() => {
      const interval = setInterval(() => {
        const { otp, expires } = TOTP.generate(key)
        setOtp(otp)
        const currentTime = new Date().getTime();
        const timeLeft = (expires - currentTime)/1.47;
        setTimeLeft(timeLeft)
      }
      , 150);
      return () => clearInterval(interval);
    }
    , [key]);
  
    const copyToClipboard = async () => {
      await Clipboard.setStringAsync(otp);
      setVisible(!visible) 
    };

    //menu 
    const [visibleMenu, setVisibleMenu] = useState({});
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });



    const openMenu = (event) => {
      const { pageX, pageY } = event.nativeEvent;
      setMenuPosition({ x: pageX, y: pageY });
      setVisibleMenu(true);
    };
  
    const closeMenu = () => {
      setVisibleMenu(false);
    };
    const deleteItem = async () => {
      try {
        const fileUri = FileSystem.documentDirectory + 'LibreOtpData.json';
        const fileContent = await FileSystem.readAsStringAsync(fileUri);
        const jsonData = JSON.parse(fileContent);
        const newData = [...jsonData];
        newData.splice(index, 1);
        await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(newData));
        closeMenu();
        navigation.goBack();
        Toast.show({
          type: ALERT_TYPE.SUCCESS,
          title: 'Success',
          textBody: 'Item deleted successfully !',
        });
      } catch (error) {
        console.error('Error deleting item:', error); 
      }
    }

    //edit name of item
    const [modelVisibel, setModelVisible] = useState(false);
    const [newName, setNewName] = useState('');
    const [erroText, setErrorText] = useState();

    const editItem = async () => {
      if (newName === '') {
        setErrorText("Please enter a new name !")
        return;
      }else{
        try {
          const fileUri = FileSystem.documentDirectory + 'LibreOtpData.json';
          const fileContent = await FileSystem.readAsStringAsync(fileUri);
          const jsonData = JSON.parse(fileContent);
          const newData = [...jsonData];
          newData[index].name = newName;
          await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(newData));
          setModelVisible(false);
          navigation.goBack();
          Toast.show({
            type: ALERT_TYPE.SUCCESS,
            title: 'Success',
            textBody: 'Item edited successfully !',
          });
        } catch (error) {
          console.error('Error editing item:', error);
        }
      }
    }

    const handleEditItem = () => {
      setModelVisible(true);
      closeMenu();
    }

  return (
    <PaperProvider>
    <View style={styles.container}>
    <Modal isVisible={modelVisibel} style={styles.ModalContainer}>
  <View style={{ backgroundColor:"#282828", height:250, width:300, borderRadius:20, alignItems:"center", justifyContent:"center",}}>
    <TouchableOpacity  style={{position:"absolute", top:3, left:5}} onPress={()=>setModelVisible(false)}>
    <Ionicons name='close-circle-outline' size={23} color="#ff2a2a"/>
    </TouchableOpacity>
    <Text style={{ fontSize:17,textAlign: "center" ,color:"#ffff"}}>Edit the key name !</Text>
    {erroText &&
    <Text style={{ fontSize:11,textAlign: "center", color:"#ff2a2a", margin:3}}>{erroText}</Text>
  }
    <TextInput
      label="Key name"
      value={newName}
      onChangeText={newName => setNewName(newName)}
      style={{width: 260 ,backgroundColor:'#121212', margin:10}}
      textColor="#ffff"
      theme={{ colors: { onSurfaceVariant: 'white'} }}
      autoCapitalize='none'
    />
    <TouchableOpacity onPress={editItem}>
<Button icon={() =><Ionicons size={20}  name="pencil-outline" color="#ffff"/>} mode="contained"  style={styles.buttonModal}>
    Edit
  </Button>
  </TouchableOpacity>
  </View>
</Modal>
       <Menu
               visible={visibleMenu}
               onDismiss={() => closeMenu()}
               anchor={{ x: menuPosition.x, y: menuPosition.y }}
               >
               <Menu.Item  title="Delete" titleStyle={{color:"#ff2a2a"}} onPress={deleteItem} leadingIcon={() =><Ionicons
                      size={25}
                      
                      name="trash-outline"
                      color="#ff2a2a"
                    />}/>
               <Divider />
               <Menu.Item  title="Edit name" onPress={handleEditItem} leadingIcon={() =><Ionicons
                      size={25}
                      name="pencil-outline"
                      color="#6F54A9"
                    />}/>
               <Divider />
               <Menu.Item onPress={() => closeMenu()} title="Cancel" leadingIcon={() =><Ionicons
                      size={25}
                      name="close-outline"
                      color="#6F54A9"
                    />} />
             </Menu>
        <View style={styles.parametre}>
        <TouchableOpacity onPress={(event) => openMenu(event)}>
            <Ionicons name='ellipsis-vertical-circle-outline' color="#6F54A9" size={30} />
            </TouchableOpacity>
        </View>
        <View style={styles.back}>
        <TouchableOpacity onPress={navigation.goBack}>
            <Ionicons name='chevron-back-circle-outline' color="#6F54A9" size={30} />
            </TouchableOpacity>
        </View>
        <View style={styles.nameView}>
        <Text style={styles.nameText}>{name}</Text>
        </View>
        <TouchableOpacity onPress={copyToClipboard}>
    <Card style={styles.card}>
        <Text style={styles.otptext}>{otp}</Text>
   </Card>
   </TouchableOpacity>
     <ProgressBar progress={timeLeft} color="#6F54A9" style={styles.ProgressBar}/>
     <View style={styles.copyView}>
     <TouchableOpacity onPress={copyToClipboard}>
       <Ionicons name="copy" size={30} color="#6F54A9" />
       </TouchableOpacity>
     </View>
     <View style={styles.Snackbar}>
     <Snackbar
        visible={visible}
        style={{width:300,height:5,borderRadius: 20,}}
        onDismiss={onDismissSnackBar}
        action={{
          label: 'ok',
          onPress: () => {
          },
        }}>
        Code copied to clipboard !
      </Snackbar>
     </View>
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
    },
    card : {
    padding: 10,
    width: 300,
    height: 100,
    margin: 10,
    borderRadius: 20,
    backgroundColor: '#282828'
    },
    ProgressBar: {
      width: 200,
      height: 10,
      borderRadius: 10,
     
    },
    subtitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    subtitle: {
      color: '#ffffff',
      fontSize: 20,
      fontWeight: 'bold',
      textAlign: 'center',
      marginRight: 10,
    },
    copyView:{
        position: 'absolute',
        bottom: 25,
        right: 25,
    },
    otptext:{
        fontSize: 55,
        textAlign: 'center',
        margin:10,
        color:'#eeeeee'
    },
    parametre:{
        position: 'absolute',
        top: 50,
        right: 20,
    },
    back:{
        position: 'absolute',
        top: 50,
        left: 20,
    },
    nameView:{
        position: 'absolute',
        top: 150,
    },
    nameText:{
        fontSize: 40,
        fontWeight: 'bold',
        color:'#eeeeee'
    },
    iconApp:{
        width: 80,
        height: 80,
    },
    iconAppView:{
        position: 'absolute',
        top: 150,
    },
    Snackbar:{
        position: 'absolute',
        bottom:40,
        left:23,
    },
    ModalContainer: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'absolute',
      width: '90%',
      height: '90%',
    },

  });
