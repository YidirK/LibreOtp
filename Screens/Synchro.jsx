import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View , TouchableOpacity,Keyboard} from 'react-native';
import { TextInput ,Button} from 'react-native-paper';
import { useEffect,useState } from 'react';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ALERT_TYPE,  Toast } from 'react-native-alert-notification';
import Modal from "react-native-modal";
import forge from 'node-forge';


export default function Synchro() {
  const navigation = useNavigation();
  const [keyboardStatus, setKeyboardStatus] = useState(false);
  const [Passwordshow,setPasswordShow] = useState(false);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isModalImportVisible, setModalImportVisible] = useState(false);
  const [passwordkey, setPasswordKey] = useState("");
  const [passwordkeyshow,setPasswordKeyShow] = useState(false);
  const [file,setFile] = useState(null);


  const onClickShowPassword = () => setPasswordShow(!Passwordshow);
  const onClickShowPasswordKey = () => setPasswordKeyShow(!passwordkeyshow);
  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardStatus(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardStatus(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

   const ExportButton = () => {
    setModalVisible(!isModalVisible);
   }

const ImportButton = async () => {
  const File = await DocumentPicker.getDocumentAsync({ type: 'text/plain' })
  setFile(File)
  setModalImportVisible(true)
}
 

const HandleExport = async () => {
  if (passwordkey ==="") {
      setModalVisible(false);
    Toast.show({
      type: ALERT_TYPE.ERROR,
      title: 'Error',
      textBody: 'Please enter a password!',
    });
    return;
  }else{
  
  try {
    const fileUri = FileSystem.documentDirectory + 'LibreOtpData.json';
    const fileExists = await FileSystem.getInfoAsync(fileUri);
    setModalVisible(!isModalVisible);
    if (fileExists.exists) {
      const key = forge.pkcs5.pbkdf2(passwordkey, '', 1000, 32);
      const iv = forge.random.getBytesSync(16);
      var data = await FileSystem.readAsStringAsync(fileUri);
      var jsonData = JSON.parse(data);
      var Data = JSON.stringify(jsonData);
      const cipher = forge.cipher.createCipher('AES-CBC', key);
      cipher.start({iv: iv});
      cipher.update(forge.util.createBuffer(Data, 'utf8'));
      cipher.finish();

      const encrypted = forge.util.encode64(iv + cipher.output.getBytes());

      const tempFileUri = FileSystem.documentDirectory + 'LibreOtpDataEncrypted.txt';
      await FileSystem.writeAsStringAsync(tempFileUri, encrypted);
      await Sharing.shareAsync(tempFileUri);
      
      Toast.show({
        type: ALERT_TYPE.SUCCESS,
        title: 'Success',
        textBody: 'Exported Successfully!',
      });
    } else {
      Toast.show({
        type: ALERT_TYPE.ERROR,
        title: 'Error',
        textBody: 'No data to export!',
      });
    }
  } catch (error) {
    console.log(error);
    Toast.show({
      type: ALERT_TYPE.ERROR,
      title: 'Error',
      textBody: 'Error Exporting! ' + error,
    });
  }
}
};



const HandleImport = async () => {
  if (passwordkey ==="") {
    setModalImportVisible(false);
  Toast.show({
    type: ALERT_TYPE.ERROR,
    title: 'Error',
    textBody: 'Please enter a password!',
  });
  return;
}else{
  try {
    if (file.assets && file.assets[0] && file.assets[0].uri) {
      const encryptedFile = await FileSystem.readAsStringAsync(file.assets[0].uri);
      
      // Génération de la clé AES
      const key = forge.pkcs5.pbkdf2(passwordkey, '', 1000, 32);

      // Décodage base64 et extraction de l'IV
      const encryptedBytes = forge.util.decode64(encryptedFile);
      const iv = encryptedBytes.slice(0, 16);
      const encryptedData = encryptedBytes.slice(16);

      // Déchiffrement
      const decipher = forge.cipher.createDecipher('AES-CBC', key);
      decipher.start({iv: iv});
      decipher.update(forge.util.createBuffer(encryptedData));
      decipher.finish();

      const decryptedData = decipher.output.toString('utf8');
      console.log("Decrypted data:", decryptedData);

      const dataFilePath = FileSystem.documentDirectory + 'LibreOtpData.json';
      let mergedData = [];
      
      const fileInfo = await FileSystem.getInfoAsync(dataFilePath);
      
      if (fileInfo.exists) {
        const existingFileContent = await FileSystem.readAsStringAsync(dataFilePath);
        const existingData = JSON.parse(existingFileContent);
        mergedData = existingData.concat(JSON.parse(decryptedData));
      } else {
        mergedData = JSON.parse(decryptedData);
      }

      await FileSystem.writeAsStringAsync(dataFilePath, JSON.stringify(mergedData));

      Toast.show({
        type: ALERT_TYPE.SUCCESS,
        title: 'Success',
        textBody: 'Imported Successfully!',
      });
      navigation.navigate('Home');
      setModalImportVisible(false)
    } else {
      Toast.show({
        type: ALERT_TYPE.ERROR,
        title: 'Error',
        textBody: 'No file selected!',
      });
      setModalImportVisible(false)
    }
  } catch (error) {
    console.log(error);
      Toast.show({
        type: ALERT_TYPE.ERROR,
        title: 'Error',
        textBody: 'Error Importing! ' + error,
      });
    setModalImportVisible(false)
  }
}};

  

  return (
  
      <View style={styles.container}>
        <View >
      <Modal isVisible={isModalVisible} style={styles.ModalContainer}>
  <View style={{ backgroundColor:"#282828", height:250, width:300, borderRadius:20, alignItems:"center", justifyContent:"center",}}>
    <TouchableOpacity  style={{position:"absolute", top:3, left:5}} onPress={()=>setModalVisible(false)}>
    <Ionicons name='close-circle-outline' size={23} color="#ff2a2a"/>
    </TouchableOpacity>
    <Text style={{ fontSize:18,textAlign: "center",color:"#ffff" }}>Enter a password to export your data !</Text>
    <Text style={{ fontSize:11,textAlign: "center", color:"#ff2a2a", margin:3}}>Remember it, it's the only way to recover your data !!!</Text>
    <TextInput
      label="Password"
      value={passwordkey}
      onChangeText={passwordkey => setPasswordKey(passwordkey)}
      secureTextEntry={!passwordkeyshow}
      right={<TextInput.Icon icon="eye" onPress={onClickShowPasswordKey} color="#eeeeee"/>}
      style={{width: 260 ,backgroundColor:'#121212', margin:10}}
      textColor="#ffff"
      theme={{ colors: { onSurfaceVariant: 'white'} }}
      autoCapitalize='none'
    />
    <TouchableOpacity onPress={HandleExport}>
<Button icon={() =><Ionicons size={20} name='archive-outline'  color="#ffff"/>} mode="contained"  style={styles.buttonModal}>
    Export
  </Button>
  </TouchableOpacity>
  </View>
</Modal>
</View>

<Modal isVisible={isModalImportVisible} style={styles.ModalContainer}>
  <View style={{ backgroundColor:"#282828", height:250, width:300, borderRadius:20, alignItems:"center", justifyContent:"center",}}>
    <TouchableOpacity  style={{position:"absolute", top:3, left:5}} onPress={()=>setModalImportVisible(false)}>
    <Ionicons name='close-circle-outline' size={23} color="#ff2a2a"/>
    </TouchableOpacity>
    <Text style={{ fontSize:17,textAlign: "center" ,color:"#ffff"}}>Enter your password to import your data !</Text>
    <Text style={{ fontSize:11,textAlign: "center", color:"#ff2a2a", margin:3}}>The code is the same as the one you used to export your data.</Text>
    <TextInput
      label="Password"
      value={passwordkey}
      onChangeText={passwordkey => setPasswordKey(passwordkey)}
      secureTextEntry={!passwordkeyshow}
      right={<TextInput.Icon icon="eye" onPress={onClickShowPasswordKey} color="#eeeeee"/>}
      style={{width: 260 ,backgroundColor:'#121212', margin:10}}
      textColor="#ffff"
      theme={{ colors: { onSurfaceVariant: 'white'} }}
      autoCapitalize='none'
    />
    <TouchableOpacity onPress={HandleImport}>
<Button icon={() =><Ionicons size={20} name='archive-outline'  color="#ffff"/>} mode="contained"  style={styles.buttonModal}>
    Import
  </Button>
  </TouchableOpacity>
  </View>
</Modal>
    <View style={styles.formsContainer2} >
    <Text style={styles.Option2Text}>Login (comming with v-0.1.0)</Text>
    <Text style={styles.Option2Subtext}>Keep your keys synchronized in the cloud</Text>
    <View>
    <TextInput
      label="Email"
      style={{width: 300,marginBottom:20,backgroundColor:'#282828',}}
      textColor="#ffff"
      theme={{ colors: { onSurfaceVariant: 'white'} }}
    />
  <TextInput
      label="Password"
      secureTextEntry={!Passwordshow}
      right={<TextInput.Icon icon="eye" onPress={onClickShowPassword} color="#eeeeee"/>}
      style={{width: 300 ,backgroundColor:'#282828'}}
      textColor="#ffff"
      theme={{ colors: { onSurfaceVariant: 'white'} }}
    />
  <TouchableOpacity >
<Button  mode="contained"  style={styles.button} >
Sync Data
  </Button>
  </TouchableOpacity>
</View>
    </View>
{keyboardStatus===false && 
<View style={styles.DividerContainer}>
  <View style={styles.DividerLeft} />
  <View>
    <Text style={styles.DividerText}>OR</Text>
  </View>
  <View style={styles.DividerRight} />
</View>
}
{keyboardStatus===false && 
<View style={styles.formsContainer} >
  <View>
    <Text style={styles.Option2Text}>Import / Export Data</Text>
    <Text style={styles.Option2Subtext}>Keep your keys safe in case of data loss</Text>
  </View>
<View>
  <TouchableOpacity onPress={ImportButton}>
<Button icon={() =><Ionicons size={20} name='folder-open-outline' color="#6F54A9"/>} mode="outlined"  style={styles.buttonImport} textColor='#6F54A9'>
    Import
  </Button>
  </TouchableOpacity>
  <TouchableOpacity onPress={ExportButton}>
<Button icon={() =><Ionicons size={20} name='archive-outline'  color="#ffff"/>} mode="contained"  style={styles.button}>
    Export
  </Button>
  </TouchableOpacity>
</View>
</View>
}
      <StatusBar style="light" />
      </View>
      
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  
  },
  DividerContainer:{
    display: 'flex',
    flexDirection: 'row', 
    justifyContent: 'flex-center',
    alignItems: 'center',
    position: 'absolute',
    width: '100%',
    height: '100%',
    position: 'absolute',
    
  },
  DividerLeft: {
    flex: 1,
    height: 2, 
   backgroundColor: '#eeeeee',
   opacity: 0.7,
  },
  DividerRight: {
    flex: 1,
     height: 2, 
    backgroundColor: '#eeeeee',
    opacity: 0.7,
  },
  DividerText: {
    width: 50,
     textAlign: 'center' ,
     fontSize:15,
      color: '#eeeeee',
      opacity: 0.7,
  },
  TextInput:{
    width: 300,
  },
formsContainer:{
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  position: 'absolute',
  bottom: 95,
  width: '100%',
  height: '100%',
},
button:{
  width: 300,
  height: 40,
  marginTop: 20,
  borderRadius: 20,
  backgroundColor: '#6F54A9',
  alignItems: 'center',
  justifyContent: 'center',
},
buttonImport:{
  width: 300,
  height: 40,
  marginTop: 20,
  borderRadius: 20,
  backgroundColor: '#282828',
  alignItems: 'center',
  justifyContent: 'center',
  borderColor: '#6F54A9',
  borderWidth: 1,
},
IconAdd:{
  alignItems: 'center',
  },
  Option2Text:{
    color: '#6F54A9',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  Option2Subtext :{
    fontSize: 15,
    marginTop: 5,
    opacity: 0.7,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 18,
    color: '#eeeeee'
  },
  formsContainer2:{
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    position: 'absolute',
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 50,
  },
  buttonModal:{
    width: 260,
  height: 40,
  marginTop: 20,
  borderRadius: 20,
  backgroundColor: '#6F54A9',
  alignItems: 'center',
  justifyContent: 'center',
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
