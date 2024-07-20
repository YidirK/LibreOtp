import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View , TouchableOpacity,ScrollView , Keyboard} from 'react-native';
import { TextInput,Snackbar ,Button,Avatar} from 'react-native-paper';
import { useEffect,useState } from 'react';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ALERT_TYPE, Toast } from 'react-native-alert-notification';

export default function Add({route}) {
  const navigation = useNavigation();
  const [keytext,setKeyText] = useState('');
  const[nametext,setNameText] = useState('');
  const [textError,setTextError] = useState('');
  const [colorSnackBar,setColorSnackBar] = useState('red');
  const [visible, setVisible] = useState(false);
  const [keyboardStatus, setKeyboardStatus] = useState(false);
  const onDismissSnackBar = () => setVisible(false);

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

  useEffect(() => {                       
if (route.params?.QrCodeData && route.params?.secret && route.params?.issuer) {
  setKeyText(route.params?.secret)
  setNameText(route.params?.issuer)
  setVisible(true)
  setTextError('Key Scanned Successfully !')
  setColorSnackBar('green')
  console.log(route.params?.secret)
  console.log(route.params?.issuer)
  navigation.setParams({
    QrCodeData: null,
    secret: null,
    issuer: null
  });

}else if (route.params?.QrCodeData) {
  setKeyText(route.params.QrCodeData)
  console.log(route.params.QrCodeData)
  setVisible(true)
  setTextError('Key Scanned Successfully !')
  setColorSnackBar('green')
  navigation.setParams({
    QrCodeData: null
  });
}
  }, [route.params?.QrCodeData,route.params?.secret,route.params?.issuer]);

  const storeData = async (data) => {
    const filePath = FileSystem.documentDirectory + 'LibreOtpData.json';

    try {
        let currentData = [];
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        
        if (fileInfo.exists) {
            const fileContents = await FileSystem.readAsStringAsync(filePath);
            currentData = JSON.parse(fileContents);
        }
        currentData.push(...data);
        await FileSystem.writeAsStringAsync(filePath, JSON.stringify(currentData));
    } catch (error) {
        console.error('Error storing data:', error);
    }
};
  
const validateTOTPSecret = (keytext) => {
  const regex = /^[A-Z2-7]+=*$/;
  return regex.test(keytext);
};



const HandleManuelAdd = () => {
  if (validateTOTPSecret(keytext)) {
  
    storeData([{ key: `${keytext}`, name: `${nametext}` }]);
    Toast.show({
      type: ALERT_TYPE.SUCCESS,
      title: 'Success',
      textBody: 'Added Successfully !',
    });
    setKeyText(""); 
    setNameText("");
    setTimeout(() => {
      navigation.navigate('Home');
    }, 500); 
  } else {
    setVisible(true);
    setTextError('Invalid Key !');
    setColorSnackBar('red');
  }
};
  const HandleScanQr = () => {
    navigation.navigate('CodeQrScan');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {keyboardStatus===false && 
    <View style={styles.formsContainer2} >
    <Text style={styles.Option2Text}>QR Code</Text>
    <Text style={styles.Option2Subtext}>Scan the QR Code</Text>
    <View>
  <TouchableOpacity onPress={HandleScanQr}>
<Button icon={() =><Ionicons size={20} name='qr-code-outline'  color="#ffff"/>} mode="contained"  style={styles.button}>
    Scan the QR Code
  </Button>
  </TouchableOpacity>
</View>
    </View>
}
{keyboardStatus===false && 
<View style={styles.DividerContainer}>
  <View style={styles.DividerLeft} />
  <View>
    <Text style={styles.DividerText}>OR</Text>
  </View>
  <View style={styles.DividerRight} />
</View>
}
<View style={styles.formsContainer} >
  <View>
    <Text style={styles.Option2Text}>Manuel Add</Text>
    <Text style={styles.Option2Subtext}>Enter the key and the name</Text>
  </View>
  <View style={styles.IconAdd}>
    <TouchableOpacity>
    {nametext.length>0 && 
    <Avatar.Text size={70} label={Array.from(nametext)[0].toUpperCase()} maxFontSizeMultiplier={1} backgroundColor='#6F54A9'/>
}
    {nametext.length===0 && 
  <Avatar.Icon size={70} icon={() =><Ionicons size={40} name='image-outline' color="#ffff"/>} backgroundColor='#6F54A9'/>
  }
  </TouchableOpacity>
  </View>
<View>
<TextInput
      label="Key"
      mode="outlined"
      textColor="#ffff"
      theme={{ colors: { onSurfaceVariant: 'white'} }}
      value={keytext}
      onChangeText={keytext => setKeyText(keytext)}
      style={styles.TextInput}
      autoCapitalize='none'
      keyboardType='visible-password'
    />
    <TextInput
      label="Name"
      mode="outlined"
      textColor="#ffff"
      value={nametext}
      theme={{ colors: { onSurfaceVariant: 'white'} }}
      onChangeText={nametext => setNameText(nametext)}
      style={styles.TextInput}
      autoCapitalize='none'
    />
</View>
<View>
  <TouchableOpacity onPress={HandleManuelAdd}>
<Button icon="plus" mode="contained"  style={styles.button}>
    Add
  </Button>
  </TouchableOpacity>
</View>
</View>
      <View style={styles.Snackbar}>
     <Snackbar
        visible={visible}
        style={{width:300,height:5,borderRadius: 20,backgroundColor:`${colorSnackBar}` , }}
        onDismiss={onDismissSnackBar}
        action={{
          label: 'ok',
          onPress: () => {
          },
        }}>
          {textError}
      </Snackbar>
     </View>
      <StatusBar style="light" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  DividerContainer:{
    flexDirection: 'row', 
    position: 'absolute',
    top: 300,
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
     top: -8,
     opacity: 0.7,
  },
  TextInput:{
    width: 300 ,
    backgroundColor:'#282828'
  },
  Snackbar:{
    position: 'absolute',
    bottom:40,
    left:23,
},
formsContainer:{
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  position: 'absolute',
  bottom: 45,
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
  formsContainer2: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    position: 'absolute',
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 100,
 

  },

});
