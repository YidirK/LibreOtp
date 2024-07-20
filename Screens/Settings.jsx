import { StatusBar } from 'expo-status-bar';
import { version } from '../package.json';
import { StyleSheet, Text, View ,Linking, TouchableOpacity,} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Divider ,Button,Snackbar,Chip} from 'react-native-paper';
import {useState,useEffect} from 'react';
import * as Clipboard from 'expo-clipboard';
import Modal from "react-native-modal";
import * as FileSystem from 'expo-file-system';
import { ALERT_TYPE, Toast } from 'react-native-alert-notification';
import { useNavigation} from '@react-navigation/native';
import * as Updates from 'expo-updates'; 

export default function Settings({ route }) {
  const [visible, setVisible] = useState(false);
  const showModal = () => setVisible(true);
  const hideModal = () => setVisible(false);
  const onDismissSnackBar = () => setSnackbarVisible(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbartext, setSnackbarText] = useState('');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const navigation = useNavigation();

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync("0x2aB5A31CF18f49581fb3a034ba7a494b54A5660A");
    setSnackbarVisible(true);
    setSnackbarText('Code copied to clipboard !')
  };
  const deleteFile = async (fileUri) => {
    try {
      await FileSystem.deleteAsync(fileUri);
      console.log('File deleted successfully');
      Toast.show({
        type: ALERT_TYPE.SUCCESS,
        title: 'Success',
        textBody: 'Deleted successfully',
      });
      navigation.navigate('Home');

    } catch (error) {
      if (error.code === 'ERR_FILE_SYSTEM_FILE_NOT_FOUND') {
        console.log('File not found');
        Toast.show({
          type: ALERT_TYPE.ERROR,
          title: 'Error',
          textBody: 'File not found',
        });
        return;
      }else{
        Toast.show({
          type: ALERT_TYPE.ERROR,
          title: 'Error',
          textBody: 'Error deleting file',
        });
      }
    
    }
  };
  
  const HandleDelte = () =>{
    const fileToDelete = FileSystem.documentDirectory + 'LibreOtpData.json';
    deleteFile(fileToDelete);
    hideModal();
    
  }

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        const { isAvailable } = await Updates.checkForUpdateAsync();
        if (isAvailable) {
          setUpdateAvailable(true);
        }
      } catch (e) {
        console.log('Error checking for updates:', e);
      }
    };

    checkForUpdates();
  }, []);

  const handleUpdate = async () => {
    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync(); 
    } catch (e) {
      console.log('Error updating the app:', e);
    }
  };

  return (
  
    <View style={styles.container} >
      <View>
      <Modal isVisible={visible} style={styles.ModalContainer}>
      <View style={{ backgroundColor:"#282828", height:250, width:300, borderRadius:20, alignItems:"center", justifyContent:"center",}}>
        <Ionicons name='warning' size={50} color="#ff2a2a"/>
      <Text style={{color:'#eeeeee',fontSize:15, marginBottom:10}}>Are you sure you want to delete all your data ?</Text>
      <View style={{
  flexDirection: "row", 
  justifyContent: "space-between", 
  marginVertical: 10 
}}>
  <Button 
    style={{
      backgroundColor: "#ff2a2a",
      marginRight: 10 
    }} 
    icon={() => (<Ionicons name='trash-outline' size={19} color="#eeeeee"/>)} 
    mode="contained" 
    onPress={HandleDelte}
  >
    Delete
  </Button>
  <Button 
    style={{
      backgroundColor: "#6F54A9",
   
    }} 
    icon={() => (<Ionicons name='close-outline' size={19} color="#eeeeee"/>)} 
    mode="contained" 
    onPress={hideModal}
  >
    Cancel
  </Button>
</View>
      </View>
      </Modal>

      </View>
        <View style={styles.SettingsContainer}>
        <View style={styles.textContainer}>
        <Text style={{color:'#eeeeee',fontSize:15}}><Ionicons name='settings-outline' size={19} color="#6F54A9"/>  Settings</Text>
        </View>
        <Divider/>
        <View style={styles.textContainerAbout}>
        <Text style={{color:'#eeeeee', fontSize:15, fontWeight: 'bold', flexDirection: 'row', alignItems: 'center'}}>
  <Ionicons name='book-outline' size={19} color="#6F54A9"/>
  <Text >About</Text>
</Text>
   
  <Text style={{color:'#eeeeee', fontSize:18, fontWeight: 'bold', marginTop: 10}}>
    Free for everyone, made with love &lt;3
</Text>
  
<View style={{marginTop: 10}}>
    <Text style={{color:'#eeeeee', fontSize:15}}>
      • No ads, no tracking, no data collection
    </Text>
    <Text style={{color:'#eeeeee', fontSize:15}}>
      • Open source
    </Text>
    <Text style={{color:'#eeeeee', fontSize:15}}>
      • Import & export your data
    </Text>
    <Text style={{color:'#eeeeee', fontSize:15}}>
      • Encrypted Cloud Synchronization
    </Text>
</View>
</View>
        <Divider/>
        <View style={styles.textContainerAbout}>
        <Text style={{color:'#eeeeee', fontSize:15, fontWeight: 'bold', flexDirection: 'row', alignItems: 'center'}}>
  <Ionicons name='hand-right-outline' size={19} color="#6F54A9"/>
  <Text >Support us</Text>
</Text>
  
  <Text style={{color:'#eeeeee', fontSize:18, fontWeight: 'bold', marginTop: 10}}>
  Support the Development of LibreOTP
</Text>
  
<View style={{marginTop: 10}}>
<TouchableOpacity onPress={() => Linking.openURL('https://github.com/YidirK')} style={{marginTop:2}}>
    <Text style={{color:'#eeeeee', fontSize:15}}>
      • GitHub Stars
    </Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={() => Linking.openURL('https://github.com/YidirK')} style={{marginTop:8}}>
    <Text style={{color:'#eeeeee', fontSize:15}}>
      • Report a Bug
    </Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={() => Linking.openURL('https://buymeacoffee.com/yidirk')} style={{marginTop:8}}>
    <Text style={{color:'#eeeeee', fontSize:15}}>
      • Buy me a beer
    </Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={copyToClipboard} style={{marginTop:8}}>
    <Text style={{color:'#eeeeee', fontSize:15}} >
      • BUSD : 0x2aB5A31CF18f49581fb3a034ba7a494b54A5660A
    </Text>
    </TouchableOpacity> 
</View>
</View>
        <Divider/>
        <View style={styles.textContainer}>
        <Text style={{color:'#eeeeee',fontSize:15}}><Ionicons name='settings-outline' size={19} color="#6F54A9"/>  Self Hosting: Coming soon</Text>
        </View>
        <Divider/>
        <View style={styles.textContainer}>
        <Text style={{color:'#eeeeee',fontSize:15, marginBottom:10}}><Ionicons name='trash-outline' size={19} color="#ff2a2a"/>  Delete all Data:</Text>
        <Button style={{backgroundColor:"#ff2a2a"}} icon={()=>(<Ionicons name='trash-outline' size={19} color="#eeeeee"/>)} mode="contained" onPress={showModal}>
        Delete
  </Button>
        </View>
        <Divider/>
        <View style={styles.textContainer}>
        <Text style={{color:'#eeeeee',fontSize:15}}><Ionicons name='receipt-outline' size={19} color="#6F54A9"/>  App Version: V-{version}</Text>
        {updateAvailable && (
        <Chip 
        icon={() => <Ionicons name='cloud-download-outline' size={19} color="#eeeeee"/>}
          style={styles.updateChip} 
          onPress={handleUpdate}
        >
          New version available! !
        </Chip>
        )}
        </View>
        </View>
        <View style={styles.Snackbar}>
     <Snackbar
        visible={snackbarVisible}
        style={{width:300,height:5,borderRadius: 20,}}
        onDismiss={onDismissSnackBar}
        action={{
          label: 'ok',
          onPress: () => {
          },
        }}>
        {snackbartext}
      </Snackbar>
     </View>
     <StatusBar style="light" />
   </View>
 
  );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#121212',
      alignItems: 'center',
    justifyContent: 'center',
    },
    SettingsContainer:{
        position: 'absolute',
       top: 30,
        left: 0,
        right: 0,
    },
    textContainer:{
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 10,
      alignItems:'flex-end',
      alignContent:'flex-end',
      },ModalContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        width: '90%',
        height: '90%',
      },
      textContainerAbout: {
        padding: 20,
        backgroundColor: '#333333',
        borderRadius: 10,
        marginVertical: 10,
        zIndex:1000
      },
      Snackbar:{
          position: 'absolute',
          bottom:40,
          left:23,
      }, updateChip: {
        backgroundColor: '#6F54A9',
        zIndex: 1001,
      }

  });
