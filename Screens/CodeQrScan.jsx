import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View , TouchableOpacity,Image,Button} from 'react-native';
import { Avatar, Card, IconButton,ProgressBar,Snackbar} from 'react-native-paper';
import { useEffect, useState,useRef } from 'react';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { CameraView, Camera ,FlashMode} from "expo-camera/next";

export default function CodeQrScan({ route }) {
    const navigation = useNavigation();
    const [visible, setVisible] = useState(false);
    const onDismissSnackBar = () => setVisible(false);
    const onToggleSnackBar = () => setVisible(!visible);
    const [hasPermission, setHasPermission] = useState(null);
    const [scanned, setScanned] = useState(false);
    const [flashOn, setFlashOn] = useState(false);
    const cameraRef = useRef(null);
    
    useEffect(() => {
        const getCameraPermissions = async () => {
          const { status } = await Camera.requestCameraPermissionsAsync();
          setHasPermission(status === "granted");
        };
    
        getCameraPermissions();
      }, []);
    
      const handleBarCodeScanned = ({data }) => {
        setScanned(true);
        navigation.navigate('Add', {
            QrCodeData: `${data}`,
          });
      };
    

      if (hasPermission === null) {
        return <Text>Requesting for camera permission</Text>;
      }
      if (hasPermission === false) {
        return <Text>No access to camera</Text>;
      }
      const toggleFlash =() => {
        setFlashOn(!flashOn);
    };
  return (
    <View style={styles.container}>
       <CameraView
       enableTorch={flashOn}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barCodeTypes: ["qr", "pdf417"],
        }}
        style={StyleSheet.absoluteFillObject}
      />
                <View style={styles.clearArea} />
                <View style={{ position: 'absolute', bottom: 20, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                        <IconButton icon="flash" color="#fff" size={25} onPress={toggleFlash} />
                    </View>
                    <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                        <IconButton icon="image" color="#fff" size={25} onPress={() => {}} />
                    </View>
                </View>
                 
           
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
        <View>
        
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
  
    title:{
        fontSize:30,
        textAlign: 'center',
        margin:10,
        marginBottom: 50,
        color:'#ffff',
        zIndex: 2,
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
    clearArea: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      width: 200,
      height: 200,
      marginLeft: -100,
      marginTop: -100,
      borderRadius: 20,
      borderWidth: 3,
      borderColor: '#fff',
      backgroundColor: 'transparent',
  },


  });
