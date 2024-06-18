import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View , TouchableOpacity,Image} from 'react-native';
import { TOTP } from "totp-generator"
import {Card, ProgressBar,Snackbar} from 'react-native-paper';
import { useEffect, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';


export default function SingleOtp({ route }) {
  const { key, name } = route.params;
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
  return (
    <View style={styles.container}>
        <View style={styles.parametre}>
        <TouchableOpacity >
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
    }

  });
