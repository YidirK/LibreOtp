import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Keyboard } from 'react-native';
import { TextInput, Button, Avatar } from 'react-native-paper';
import { useEffect, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { useNavigation } from '@react-navigation/native';
import { QrCode, PenTool, Camera, Scan, Key, CheckCircle } from 'lucide-react-native';
import { ALERT_TYPE, Toast } from 'react-native-alert-notification';
import { useTranslation } from 'react-i18next';

export default function Add({ route }) {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const [activeTab, setActiveTab] = useState('qr'); // 'qr' | 'manual'
    const [keytext, setKeyText] = useState('');
    const [nametext, setNameText] = useState('');
    const [keyboardStatus, setKeyboardStatus] = useState(false);

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

    // Listen to QR scan parameters
    useEffect(() => {
        if (route.params?.QrCodeData && route.params?.secret && route.params?.issuer) {
            setKeyText(route.params.secret);
            setNameText(route.params.issuer);
            setActiveTab('manual'); // Switch to manual tab to let user review
            Toast.show({
                type: ALERT_TYPE.SUCCESS,
                title: t('add.scannedToastTitle'),
                textBody: t('add.scannedToastBodyDetailed'),
            });
            // Clear navigation params
            navigation.setParams({
                QrCodeData: null,
                secret: null,
                issuer: null,
            });
        } else if (route.params?.QrCodeData) {
            // General parsed data
            setKeyText(route.params.QrCodeData);
            setActiveTab('manual');
            Toast.show({
                type: ALERT_TYPE.SUCCESS,
                title: t('add.scannedToastTitle'),
                textBody: t('add.scannedToastBodyGeneric'),
            });
            navigation.setParams({
                QrCodeData: null,
            });
        }
    }, [route.params?.QrCodeData, route.params?.secret, route.params?.issuer]);

    const storeData = async (newDataItem) => {
        const filePath = FileSystem.documentDirectory + 'LibreOtpData.json';
        try {
            let currentData = [];
            const fileInfo = await FileSystem.getInfoAsync(filePath);
            if (fileInfo.exists) {
                const fileContents = await FileSystem.readAsStringAsync(filePath);
                currentData = JSON.parse(fileContents);
            }
            currentData.push(newDataItem);
            await FileSystem.writeAsStringAsync(filePath, JSON.stringify(currentData));
        } catch (error) {
            console.error('Error storing data:', error);
        }
    };

    const validateTOTPSecret = (secret) => {
        const cleanSecret = secret.replace(/\s+/g, '').toUpperCase();
        const regex = /^[A-Z2-7]+=*$/;
        return regex.test(cleanSecret) && cleanSecret.length > 0;
    };

    const handleManualAdd = async () => {
        const cleanSecret = keytext.replace(/\s+/g, '').toUpperCase();
        const cleanName = nametext.trim();

        if (!cleanName) {
            Toast.show({
                type: ALERT_TYPE.ERROR,
                title: t('add.missingNameTitle'),
                textBody: t('add.missingNameBody'),
            });
            return;
        }

        if (validateTOTPSecret(cleanSecret)) {
            await storeData({ key: cleanSecret, name: cleanName });
            Toast.show({
                type: ALERT_TYPE.SUCCESS,
                title: t('common.success'),
                textBody: t('add.successBody'),
            });
            setKeyText("");
            setNameText("");
            setTimeout(() => {
                navigation.navigate('Home');
            }, 500);
        } else {
            Toast.show({
                type: ALERT_TYPE.ERROR,
                title: t('add.invalidKeyTitle'),
                textBody: t('add.invalidKeyBody'),
            });
        }
    };

    const handleScanQr = () => {
        navigation.navigate('CodeQrScan');
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>{t('add.title')}</Text>
                <Text style={styles.headerSubtitle}>{t('add.subtitle')}</Text>
            </View>

            {/* Modern Segmented Tab Bar */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'qr' && styles.activeTabButton]}
                    onPress={() => setActiveTab('qr')}
                >
                    <QrCode size={18} color={activeTab === 'qr' ? '#FFFFFF' : '#94A3B8'} />
                    <Text style={[styles.tabButtonText, activeTab === 'qr' && styles.activeTabButtonText]}>{t('add.tabQr')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'manual' && styles.activeTabButton]}
                    onPress={() => setActiveTab('manual')}
                >
                    <PenTool size={18} color={activeTab === 'manual' ? '#FFFFFF' : '#94A3B8'} />
                    <Text style={[styles.tabButtonText, activeTab === 'manual' && styles.activeTabButtonText]}>{t('add.tabManual')}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                {activeTab === 'qr' ? (
                    /* QR Code Tab View */
                    <View style={styles.tabView}>
                        <View style={styles.illustrationCard}>
                            <View style={styles.illustrationCircle}>
                                <Camera size={48} color="#6366F1" />
                            </View>
                            <Text style={styles.illustrationTitle}>{t('add.qr.title')}</Text>
                            <Text style={styles.illustrationText}>
                                {t('add.qr.description')}
                            </Text>
                        </View>

                        <Button
                            mode="contained"
                            onPress={handleScanQr}
                            style={styles.actionButton}
                            labelStyle={styles.actionButtonLabel}
                            icon={() => <Scan size={20} color="#FFFFFF" />}
                        >
                            {t('add.qr.openCamera')}
                        </Button>
                    </View>
                ) : (
                    /* Manual Saisie Tab View */
                    <View style={styles.tabView}>
                        {/* Visual Avatar Preview */}
                        {!keyboardStatus && (
                            <View style={styles.previewContainer}>
                                {nametext.trim().length > 0 ? (
                                    <Avatar.Text
                                        size={70}
                                        label={Array.from(nametext.trim())[0].toUpperCase()}
                                        backgroundColor='#6366F1'
                                        textColor="#FFFFFF"
                                        style={styles.avatarPreview}
                                    />
                                ) : (
                                    <Avatar.Icon
                                        size={70}
                                        icon={() => <Key size={38} color="#FFFFFF" />}
                                        backgroundColor='#1E293B'
                                        style={styles.avatarPreviewPlaceholder}
                                    />
                                )}
                                <Text style={styles.previewLabel}>{t('add.manual.previewLabel')}</Text>
                            </View>
                        )}

                        <View style={styles.formContainer}>
                            <TextInput
                                label={t('add.manual.nameLabel')}
                                mode="outlined"
                                value={nametext}
                                onChangeText={setNameText}
                                style={styles.textInput}
                                textColor="#FFFFFF"
                                theme={{ colors: { onSurfaceVariant: '#94A3B8', primary: '#6366F1' } }}
                                autoCapitalize="none"
                            />

                            <TextInput
                                label={t('add.manual.secretLabel')}
                                mode="outlined"
                                value={keytext}
                                onChangeText={setKeyText}
                                style={styles.textInput}
                                textColor="#FFFFFF"
                                theme={{ colors: { onSurfaceVariant: '#94A3B8', primary: '#6366F1' } }}
                                autoCapitalize="none"
                                keyboardType="visible-password"
                            />
                        </View>

                        <Button
                            mode="contained"
                            onPress={handleManualAdd}
                            style={styles.actionButton}
                            labelStyle={styles.actionButtonLabel}
                            icon={() => <CheckCircle size={20} color="#FFFFFF" />}
                        >
                            {t('add.manual.saveButton')}
                        </Button>
                    </View>
                )}
            </ScrollView>
            <StatusBar style="light" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
        paddingTop: 50,
    },
    headerContainer: {
        paddingHorizontal: 24,
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#94A3B8',
        marginTop: 2,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#1E293B',
        marginHorizontal: 24,
        borderRadius: 16,
        padding: 4,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
    },
    activeTabButton: {
        backgroundColor: '#6366F1',
        shadowColor: '#6366F1',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 3,
    },
    tabButtonText: {
        color: '#94A3B8',
        fontWeight: 'bold',
        fontSize: 14,
        marginLeft: 6,
    },
    activeTabButtonText: {
        color: '#FFFFFF',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 100, // Leave space for floating nav bar
    },
    tabView: {
        alignItems: 'center',
        width: '100%',
    },
    // QR view styles
    illustrationCard: {
        backgroundColor: '#1E293B',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        padding: 24,
        alignItems: 'center',
        width: '100%',
        marginBottom: 25,
    },
    illustrationCircle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    illustrationTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 10,
    },
    illustrationText: {
        fontSize: 14,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 22,
    },
    // Manual view styles
    previewContainer: {
        alignItems: 'center',
        marginVertical: 10,
    },
    avatarPreview: {
        shadowColor: '#6366F1',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 12,
        elevation: 5,
    },
    avatarPreviewPlaceholder: {
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    previewLabel: {
        marginTop: 8,
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
    },
    formContainer: {
        width: '100%',
        marginVertical: 15,
    },
    textInput: {
        backgroundColor: '#1E293B',
        marginBottom: 16,
        width: '100%',
    },
    actionButton: {
        backgroundColor: '#6366F1',
        borderRadius: 16,
        width: '100%',
        paddingVertical: 6,
        marginTop: 10,
        shadowColor: '#6366F1',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        elevation: 4,
    },
    actionButtonLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
});