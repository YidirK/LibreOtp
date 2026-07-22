import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { IconButton } from 'react-native-paper';
import { useEffect, useState, useRef } from 'react';
import { Camera, ChevronLeft, Zap, Image as ImageIcon } from 'lucide-react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions, scanFromURLAsync } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { ALERT_TYPE, Toast } from 'react-native-alert-notification';
import { useTranslation } from 'react-i18next';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CodeQrScan() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [galleryScanning, setGalleryScanning] = useState(false);


  const [mountCamera, setMountCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const readyTimeoutRef = useRef(null);

  useEffect(() => {
    if (!isFocused) {
      setMountCamera(false);
      setCameraReady(false);
      return;
    }

    setScanned(false);
    const mountTimer = setTimeout(() => setMountCamera(true), 150);
    return () => clearTimeout(mountTimer);
  }, [isFocused, cameraKey]);

  useEffect(() => {
    if (!mountCamera) return;


    readyTimeoutRef.current = setTimeout(() => {
      if (!cameraReady) {
        setMountCamera(false);
        setCameraKey((k) => k + 1);
      }
    }, 2500);

    return () => clearTimeout(readyTimeoutRef.current);
  }, [mountCamera, cameraReady]);

  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 2200,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 2200,
            useNativeDriver: true,
          }),
        ])
    ).start();
  }, [scanAnim]);

  const translateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, SCREEN_HEIGHT - 40],
  });

  const navigateWithScannedData = (data) => {
    try {
      const otpAuthRegex = /^otpauth:\/\/totp\/.+$/i;
      if (otpAuthRegex.test(data)) {
        const urlObj = new URL(data);
        const secret = urlObj.searchParams.get('secret') || '';
        const issuer = urlObj.searchParams.get('issuer') || '';
        navigation.navigate('Add', { QrCodeData: data, secret, issuer, fromScreen: 'CodeQrScan' });
      } else {
        navigation.navigate('Add', { QrCodeData: data });
      }
    } catch (error) {

      navigation.navigate('Add', { QrCodeData: data });
    }
  };

  const handleBarCodeScanned = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    navigateWithScannedData(data);
  };

  const pickImageAndScan = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({
          type: ALERT_TYPE.WARNING,
          title: t('scan.galleryPermissionTitle'),
          textBody: t('scan.galleryPermissionBody'),
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setGalleryScanning(true);
      const imageUri = result.assets[0].uri;
      const scannedResults = await scanFromURLAsync(imageUri, ['qr']);

      if (!scannedResults || scannedResults.length === 0) {
        Toast.show({
          type: ALERT_TYPE.DANGER,
          title: t('scan.noCodeFoundTitle'),
          textBody: t('scan.noCodeFoundBody'),
        });
        return;
      }

      navigateWithScannedData(scannedResults[0].data);
    } catch (error) {
      console.log('Erreur lors du scan depuis la galerie:', error);
      Toast.show({
        type: ALERT_TYPE.DANGER,
        title: t('common.error'),
        textBody: t('scan.readErrorBody'),
      });
    } finally {
      setGalleryScanning(false);
    }
  };

  const toggleFlash = () => {
    setFlashOn(!flashOn);
  };

  if (!permission) {
    return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('scan.initializing')}</Text>
        </View>
    );
  }

  if (!permission.granted) {
    return (
        <View style={styles.permissionContainer}>
          <Camera size={64} color="#6366F1" />
          <Text style={styles.permissionTitle}>{t('scan.permissionTitle')}</Text>
          <Text style={styles.permissionText}>
            {t('scan.permissionText')}
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>{t('scan.allowCamera')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.permissionBack} onPress={navigation.goBack}>
            <Text style={styles.permissionBackText}>{t('scan.back')}</Text>
          </TouchableOpacity>
        </View>
    );
  }

  return (
      <View style={styles.container}>

        {mountCamera && (
            <CameraView
                key={cameraKey}
                facing="back"
                enableTorch={flashOn}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ["qr"],
                }}
                onCameraReady={() => setCameraReady(true)}
                onMountError={(e) => {
                  console.log('Erreur de montage caméra:', e);
                  setMountCamera(false);
                  setCameraReady(false);
                  setCameraKey((k) => k + 1);
                }}
                style={styles.camera}
            />
        )}

        {!cameraReady && (
            <View style={styles.cameraLoadingOverlay} pointerEvents="none">
              <Text style={styles.loadingText}>{t('scan.initializing')}</Text>
            </View>
        )}


        <View style={styles.overlayContainer} pointerEvents="box-none">
          <View style={[styles.corner, styles.topLeft, { top: insets.top + 70 }]} />
          <View style={[styles.corner, styles.topRight, { top: insets.top + 70 }]} />
          <View style={[styles.corner, styles.bottomLeft, { bottom: insets.bottom + 110 }]} />
          <View style={[styles.corner, styles.bottomRight, { bottom: insets.bottom + 110 }]} />

          <Animated.View style={[styles.laserLine, { transform: [{ translateY }] }]} />

          <View style={[styles.topBar, { paddingTop: insets.top + 50 }]} pointerEvents="none">
            <Text style={styles.scanTitle}>{t('scan.scanTitle')}</Text>
            <Text style={styles.scanSubtitle}>{t('scan.scanSubtitle')}</Text>
          </View>

          <View style={[styles.controlsContainer, { bottom: insets.bottom + 30 }]}>
            <TouchableOpacity onPress={toggleFlash} style={[styles.controlButton, flashOn && styles.controlButtonActive]}>
              <Zap size={22} color={flashOn ? "#6366F1" : "#FFFFFF"} fill={flashOn ? "#6366F1" : "none"} />
            </TouchableOpacity>

            <TouchableOpacity
                onPress={pickImageAndScan}
                disabled={galleryScanning}
                style={[styles.controlButton, galleryScanning && styles.controlButtonActive]}
            >
              <ImageIcon size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.headerControls, { top: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft color="#FFFFFF" size={30} />
          </TouchableOpacity>
        </View>

        <StatusBar hidden />
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  cameraLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex:5,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 16,
  },
  // Permission styles
  permissionContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
  },
  permissionText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: '#6366F1',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 30,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  permissionBack: {
    marginTop: 20,
    padding: 10,
  },
  permissionBackText: {
    color: '#94A3B8',
    fontSize: 15,
  },
  // Overlay plein écran (transparent, ne masque plus la caméra)
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topBar: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  scanTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  scanSubtitle: {
    color: '#E2E8F0',
    fontSize: 13,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  // Coins décoratifs positionnés aux bords de l'écran
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#6366F1',
  },
  topLeft: {
    left: 20,
    borderLeftWidth: 4,
    borderTopWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    right: 20,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    left: 20,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    right: 20,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    borderBottomRightRadius: 12,
  },
  // Laser traversant tout l'écran
  laserLine: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 3,
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  // Floating navigation controls styles
  headerControls: {
    position: 'absolute',
    left: 20,
  },
  backButton: {
    padding: 4,
  },
  controlsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(30, 41, 59, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    borderColor: '#6366F1',
  },
  camera: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
});