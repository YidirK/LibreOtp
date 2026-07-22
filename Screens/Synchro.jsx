import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, Keyboard, ScrollView } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { useEffect, useState, useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
    FolderOpen,
    Archive,
    CloudDownload,
    CloudUpload,
    Lock,
    Key,
    XCircle,
    X,
    Cloud,
    LogIn,
    LogOut,
    Mail,
    UserPlus,
    RefreshCw,
} from 'lucide-react-native';
import { ALERT_TYPE, Toast } from 'react-native-alert-notification';
import Modal from "react-native-modal";
import forge from 'node-forge';
import { pb } from '../lib/pocketbase';
import { useTranslation } from 'react-i18next';

// Nom de la collection PocketBase où est stocké le blob chiffré de chaque utilisateur.
// Champs attendus : owner (relation -> users, unique), encrypted_blob (text)
const VAULT_COLLECTION = 'otp_vaults';

export default function Synchro() {
    const { t } = useTranslation();
    const navigation = useNavigation();
    const [keyboardStatus, setKeyboardStatus] = useState(false);
    const [passwordShow, setPasswordShow] = useState(false);
    const [isExportVisible, setIsExportVisible] = useState(false);
    const [isImportVisible, setIsImportVisible] = useState(false);
    const [passwordKey, setPasswordKey] = useState("");
    const [passwordKeyShow, setPasswordKeyShow] = useState(false);
    const [file, setFile] = useState(null);

    // --- Cloud (PocketBase) state ---
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authLoading, setAuthLoading] = useState(false);

    const [cloudModalVisible, setCloudModalVisible] = useState(false);
    const [cloudModalMode, setCloudModalMode] = useState('save'); // 'save' | 'restore'
    const [cloudPassphrase, setCloudPassphrase] = useState('');
    const [cloudPassphraseShow, setCloudPassphraseShow] = useState(false);
    const [cloudLoading, setCloudLoading] = useState(false);

    const onClickShowPassword = () => setPasswordShow(!passwordShow);
    const onClickShowPasswordKey = () => setPasswordKeyShow(!passwordKeyShow);

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

    const syncAuthState = useCallback(() => {
        setIsLoggedIn(pb.authStore.isValid);
        setUserEmail(pb.authStore.model?.email ?? '');
    }, []);

    useFocusEffect(
        useCallback(() => {
            syncAuthState();
        }, [syncAuthState])
    );

    useEffect(() => {
        // Garde l'état d'auth synchronisé si le token expire/est modifié ailleurs dans l'app
        const removeListener = pb.authStore.onChange(() => {
            syncAuthState();
        });
        return () => removeListener();
    }, [syncAuthState]);

    const openExportModal = () => {
        setPasswordKey("");
        setIsExportVisible(true);
    };

    const triggerImportPicker = async () => {
        try {
            const selectedFile = await DocumentPicker.getDocumentAsync({ type: 'text/plain' });
            if (selectedFile.canceled || !selectedFile.assets || selectedFile.assets.length === 0) {
                return;
            }
            setFile(selectedFile);
            setPasswordKey("");
            setIsImportVisible(true);
        } catch (err) {
            console.log('Error picking file:', err);
        }
    };

    // --- Helpers de chiffrement (réutilisés pour l'export local ET la synchro cloud) ---

    const encryptPayload = (plainJsonString, passphrase) => {
        const key = forge.pkcs5.pbkdf2(passphrase, '', 1000, 32);
        const iv = forge.random.getBytesSync(16);
        const cipher = forge.cipher.createCipher('AES-CBC', key);
        cipher.start({ iv: iv });
        cipher.update(forge.util.createBuffer(plainJsonString, 'utf8'));
        cipher.finish();
        return forge.util.encode64(iv + cipher.output.getBytes());
    };

    const decryptPayload = (encryptedBase64, passphrase) => {
        const key = forge.pkcs5.pbkdf2(passphrase, '', 1000, 32);
        const encryptedBytes = forge.util.decode64(encryptedBase64);
        const iv = encryptedBytes.slice(0, 16);
        const encryptedData = encryptedBytes.slice(16);

        const decipher = forge.cipher.createDecipher('AES-CBC', key);
        decipher.start({ iv: iv });
        decipher.update(forge.util.createBuffer(encryptedData));
        decipher.finish();
        return decipher.output.toString('utf8');
    };

    const handleExport = async () => {
        if (passwordKey === "") {
            setIsExportVisible(false);
            Toast.show({
                type: ALERT_TYPE.ERROR,
                title: t('common.error'),
                textBody: t('synchro.exportModal.errorEmptyPassword'),
            });
            return;
        }

        let tempFileUri = null;

        try {
            const fileUri = FileSystem.documentDirectory + 'LibreOtpData.json';
            const fileExists = await FileSystem.getInfoAsync(fileUri);
            setIsExportVisible(false);

            if (fileExists.exists) {
                // On laisse le temps à la modale de finir son animation de fermeture
                // avant de présenter la feuille de partage native : sur iOS, présenter
                // un UIActivityViewController pendant qu'une autre présentation native
                // est encore en cours de fermeture peut échouer silencieusement — et
                // laisser l'app dans un état où le partage ne fonctionne plus du tout
                // ensuite (exactement le "ça a marché une fois puis plus jamais").
                await new Promise((resolve) => setTimeout(resolve, 400));

                const data = await FileSystem.readAsStringAsync(fileUri);
                const jsonData = JSON.parse(data);
                const serialized = JSON.stringify(jsonData);

                const encrypted = encryptPayload(serialized, passwordKey);

                // Nom de fichier unique à chaque export (au lieu d'un nom fixe) : évite
                // tout conflit si le système d'exploitation garde une référence sur
                // l'ancien fichier après un partage précédent (AirDrop, Enregistrer
                // dans Fichiers, etc. peuvent le garder "verrouillé" un moment).
                tempFileUri = FileSystem.documentDirectory + `LibreOtpBackup-${Date.now()}.txt`;
                await FileSystem.writeAsStringAsync(tempFileUri, encrypted);

                const isSharingAvailable = await Sharing.isAvailableAsync();
                if (!isSharingAvailable) {
                    Toast.show({
                        type: ALERT_TYPE.ERROR,
                        title: t('common.error'),
                        textBody: t('synchro.exportModal.sharingUnavailableBody'),
                    });
                    return;
                }

                await Sharing.shareAsync(tempFileUri, {
                    mimeType: 'text/plain',
                    dialogTitle: t('synchro.exportModal.title'),
                });

                Toast.show({
                    type: ALERT_TYPE.SUCCESS,
                    title: t('synchro.exportModal.successTitle'),
                    textBody: t('synchro.exportModal.successBody'),
                });
            } else {
                Toast.show({
                    type: ALERT_TYPE.ERROR,
                    title: t('common.error'),
                    textBody: t('synchro.exportModal.noDataBody'),
                });
            }
        } catch (error) {
            console.log(error);
            Toast.show({
                type: ALERT_TYPE.ERROR,
                title: t('common.error'),
                textBody: t('synchro.exportModal.failedBody'),
            });
        } finally {
            if (tempFileUri) {
                try {
                    await FileSystem.deleteAsync(tempFileUri, { idempotent: true });
                } catch (cleanupError) {
                    console.log('Nettoyage du fichier temporaire échoué (sans gravité):', cleanupError);
                }
            }
        }
    };

    const handleImport = async () => {
        if (passwordKey === "") {
            setIsImportVisible(false);
            Toast.show({
                type: ALERT_TYPE.ERROR,
                title: t('common.error'),
                textBody: t('synchro.exportModal.errorEmptyPassword'),
            });
            return;
        }

        try {
            if (file && file.assets && file.assets[0] && file.assets[0].uri) {
                const encryptedFile = await FileSystem.readAsStringAsync(file.assets[0].uri);
                const decryptedData = decryptPayload(encryptedFile, passwordKey);

                const dataFilePath = FileSystem.documentDirectory + 'LibreOtpData.json';
                let mergedData = [];

                const fileInfo = await FileSystem.getInfoAsync(dataFilePath);
                if (fileInfo.exists) {
                    const existingFileContent = await FileSystem.readAsStringAsync(dataFilePath);
                    const existingData = JSON.parse(existingFileContent);

                    // Merge lists and prevent duplicates if applicable
                    const newImported = JSON.parse(decryptedData);
                    mergedData = existingData.concat(newImported);
                } else {
                    mergedData = JSON.parse(decryptedData);
                }

                await FileSystem.writeAsStringAsync(dataFilePath, JSON.stringify(mergedData));
                setIsImportVisible(false);
                Toast.show({
                    type: ALERT_TYPE.SUCCESS,
                    title: t('synchro.importModal.successTitle'),
                    textBody: t('synchro.importModal.successBody'),
                });
                navigation.navigate('Home');
            } else {
                setIsImportVisible(false);
                Toast.show({
                    type: ALERT_TYPE.ERROR,
                    title: t('synchro.importModal.noFileTitle'),
                    textBody: t('synchro.importModal.noFileBody'),
                });
            }
        } catch (error) {
            console.log(error);
            setIsImportVisible(false);
            Toast.show({
                type: ALERT_TYPE.ERROR,
                title: t('synchro.importModal.wrongPasswordTitle'),
                textBody: t('synchro.importModal.wrongPasswordBody'),
            });
        }
    };

    // --- Auth PocketBase ---

    const handleAuthSubmit = async () => {
        if (!email.trim() || !password) {
            Toast.show({
                type: ALERT_TYPE.ERROR,
                title: t('synchro.cloud.missingFieldsTitle'),
                textBody: t('synchro.cloud.missingFieldsBody'),
            });
            return;
        }

        setAuthLoading(true);
        try {
            if (authMode === 'register') {
                await pb.collection('users').create({
                    email: email.trim(),
                    password,
                    passwordConfirm: password,
                });
            }
            await pb.collection('users').authWithPassword(email.trim(), password);
            syncAuthState();
            setPassword('');
            Toast.show({
                type: ALERT_TYPE.SUCCESS,
                title: authMode === 'register' ? t('synchro.cloud.registeredTitle') : t('synchro.cloud.loggedInTitle'),
                textBody: t('synchro.cloud.authSuccessBody'),
            });
        } catch (error) {
            console.log(error);
            Toast.show({
                type: ALERT_TYPE.ERROR,
                title: t('common.error'),
                textBody: authMode === 'register'
                    ? t('synchro.cloud.registerFailedBody')
                    : t('synchro.cloud.loginFailedBody'),
            });
        } finally {
            setAuthLoading(false);
        }
    };

    const handleLogout = () => {
        pb.authStore.clear();
        syncAuthState();
        Toast.show({
            type: ALERT_TYPE.SUCCESS,
            title: t('synchro.cloud.loggedOutTitle'),
            textBody: t('synchro.cloud.loggedOutBody'),
        });
    };

    // --- Synchro cloud (sauvegarde / restauration du blob chiffré) ---

    const openCloudModal = (mode) => {
        setCloudModalMode(mode);
        setCloudPassphrase('');
        setCloudModalVisible(true);
    };

    const handleCloudSave = async () => {
        if (cloudPassphrase === '') {
            Toast.show({
                type: ALERT_TYPE.ERROR,
                title: t('common.error'),
                textBody: t('synchro.cloudModal.errorEmptyPasswordSave'),
            });
            return;
        }

        setCloudLoading(true);
        try {
            const fileUri = FileSystem.documentDirectory + 'LibreOtpData.json';
            const fileInfo = await FileSystem.getInfoAsync(fileUri);
            const localData = fileInfo.exists
                ? JSON.parse(await FileSystem.readAsStringAsync(fileUri))
                : [];

            const encryptedBlob = encryptPayload(JSON.stringify(localData), cloudPassphrase);
            const ownerId = pb.authStore.model.id;

            try {
                const existing = await pb.collection(VAULT_COLLECTION).getFirstListItem(`owner="${ownerId}"`);
                await pb.collection(VAULT_COLLECTION).update(existing.id, { encrypted_blob: encryptedBlob });
            } catch (err) {
                // Aucun enregistrement existant pour cet utilisateur -> on le crée
                await pb.collection(VAULT_COLLECTION).create({ owner: ownerId, encrypted_blob: encryptedBlob });
            }

            setCloudModalVisible(false);
            Toast.show({
                type: ALERT_TYPE.SUCCESS,
                title: t('synchro.cloudModal.savedTitle'),
                textBody: t('synchro.cloudModal.savedBody'),
            });
        } catch (error) {
            console.log(error);
            Toast.show({
                type: ALERT_TYPE.ERROR,
                title: t('common.error'),
                textBody: t('synchro.cloudModal.saveFailedBody'),
            });
        } finally {
            setCloudLoading(false);
        }
    };

    const handleCloudRestore = async () => {
        if (cloudPassphrase === '') {
            Toast.show({
                type: ALERT_TYPE.ERROR,
                title: t('common.error'),
                textBody: t('synchro.cloudModal.errorEmptyPasswordRestore'),
            });
            return;
        }

        setCloudLoading(true);
        try {
            const ownerId = pb.authStore.model.id;
            const record = await pb.collection(VAULT_COLLECTION).getFirstListItem(`owner="${ownerId}"`);
            const decrypted = decryptPayload(record.encrypted_blob, cloudPassphrase);
            const cloudData = JSON.parse(decrypted);

            const dataFilePath = FileSystem.documentDirectory + 'LibreOtpData.json';
            let mergedData = cloudData;

            const fileInfo = await FileSystem.getInfoAsync(dataFilePath);
            if (fileInfo.exists) {
                const existingData = JSON.parse(await FileSystem.readAsStringAsync(dataFilePath));
                mergedData = existingData.concat(cloudData);
            }

            await FileSystem.writeAsStringAsync(dataFilePath, JSON.stringify(mergedData));
            setCloudModalVisible(false);
            Toast.show({
                type: ALERT_TYPE.SUCCESS,
                title: t('synchro.cloudModal.restoredTitle'),
                textBody: t('synchro.cloudModal.restoredBody'),
            });
            navigation.navigate('Home');
        } catch (error) {
            console.log(error);
            const notFound = error?.status === 404;
            setCloudModalVisible(false);
            Toast.show({
                type: ALERT_TYPE.ERROR,
                title: notFound ? t('synchro.cloudModal.notFoundTitle') : t('synchro.importModal.wrongPasswordTitle'),
                textBody: notFound
                    ? t('synchro.cloudModal.notFoundBody')
                    : t('synchro.cloudModal.wrongPasswordBody'),
            });
        } finally {
            setCloudLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>{t('synchro.title')}</Text>
                <Text style={styles.headerSubtitle}>{t('synchro.subtitle')}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                {/* Card 1: Cloud Sync (PocketBase) */}
                <View style={styles.card}>
                    <View style={styles.iconBadge}>
                        <Cloud size={24} color="#6366F1" />
                    </View>
                    <Text style={styles.cardTitle}>{t('synchro.cloud.cardTitle')}</Text>
                    <Text style={styles.cardDescription}>
                        {t('synchro.cloud.description')}
                    </Text>

                    {!isLoggedIn ? (
                        <View style={styles.form}>
                            <View style={styles.authTabContainer}>
                                <TouchableOpacity
                                    style={[styles.authTabButton, authMode === 'login' && styles.authTabButtonActive]}
                                    onPress={() => setAuthMode('login')}
                                >
                                    <Text style={[styles.authTabText, authMode === 'login' && styles.authTabTextActive]}>{t('synchro.cloud.tabLogin')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.authTabButton, authMode === 'register' && styles.authTabButtonActive]}
                                    onPress={() => setAuthMode('register')}
                                >
                                    <Text style={[styles.authTabText, authMode === 'register' && styles.authTabTextActive]}>{t('synchro.cloud.tabRegister')}</Text>
                                </TouchableOpacity>
                            </View>

                            <TextInput
                                label={t('synchro.cloud.emailLabel')}
                                value={email}
                                onChangeText={setEmail}
                                style={styles.textInput}
                                textColor="#FFFFFF"
                                mode="outlined"
                                autoCapitalize="none"
                                keyboardType="email-address"
                                theme={{ colors: { onSurfaceVariant: '#94A3B8', primary: '#6366F1' } }}
                            />
                            <TextInput
                                label={t('synchro.cloud.passwordLabel')}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!passwordShow}
                                right={<TextInput.Icon icon={passwordShow ? "eye-off" : "eye"} onPress={onClickShowPassword} color="#94A3B8" />}
                                style={styles.textInput}
                                textColor="#FFFFFF"
                                mode="outlined"
                                autoCapitalize="none"
                                theme={{ colors: { onSurfaceVariant: '#94A3B8', primary: '#6366F1' } }}
                            />
                            <Button
                                mode="contained"
                                onPress={handleAuthSubmit}
                                loading={authLoading}
                                disabled={authLoading}
                                style={styles.actionButtonFull}
                                labelStyle={styles.buttonLabel}
                                icon={() => authMode === 'register' ? <UserPlus size={20} color="#FFFFFF" /> : <LogIn size={20} color="#FFFFFF" />}
                            >
                                {authMode === 'register' ? t('synchro.cloud.registerButton') : t('synchro.cloud.loginButton')}
                            </Button>
                        </View>
                    ) : (
                        <View style={styles.form}>
                            <View style={styles.loggedInRow}>
                                <Mail size={16} color="#6366F1" />
                                <Text style={styles.loggedInEmail} numberOfLines={1}>{userEmail}</Text>
                            </View>

                            <View style={styles.buttonGroup}>
                                <Button
                                    mode="outlined"
                                    onPress={() => openCloudModal('restore')}
                                    style={styles.importButton}
                                    textColor="#6366F1"
                                    labelStyle={styles.buttonLabel}
                                    icon={() => <CloudDownload size={20} color="#6366F1" />}
                                >
                                    {t('synchro.cloud.restoreButton')}
                                </Button>
                                <Button
                                    mode="contained"
                                    onPress={() => openCloudModal('save')}
                                    style={styles.exportButton}
                                    labelStyle={styles.buttonLabel}
                                    icon={() => <CloudUpload size={20} color="#FFFFFF" />}
                                >
                                    {t('synchro.cloud.saveButton')}
                                </Button>
                            </View>

                            <TouchableOpacity style={styles.logoutRow} onPress={handleLogout}>
                                <LogOut size={16} color="#EF4444" />
                                <Text style={styles.logoutText}>{t('synchro.cloud.logoutButton')}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Card 2: Local backup */}
                <View style={styles.card}>
                    <View style={styles.iconBadge}>
                        <FolderOpen size={24} color="#6366F1" />
                    </View>
                    <Text style={styles.cardTitle}>{t('synchro.local.cardTitle')}</Text>
                    <Text style={styles.cardDescription}>
                        {t('synchro.local.description')}
                    </Text>

                    <View style={styles.buttonGroup}>
                        <Button
                            mode="outlined"
                            onPress={triggerImportPicker}
                            style={styles.importButton}
                            textColor="#6366F1"
                            labelStyle={styles.buttonLabel}
                            icon={() => <CloudDownload size={20} color="#6366F1" />}
                        >
                            {t('synchro.local.importButton')}
                        </Button>

                        <Button
                            mode="contained"
                            onPress={openExportModal}
                            style={styles.exportButton}
                            labelStyle={styles.buttonLabel}
                            icon={() => <CloudUpload size={20} color="#FFFFFF" />}
                        >
                            {t('synchro.local.exportButton')}
                        </Button>
                    </View>
                </View>
            </ScrollView>

            {/* Export Password Modal */}
            <Modal
                avoidKeyboard={true}
                isVisible={isExportVisible}
                onBackdropPress={() => setIsExportVisible(false)}
                style={styles.modal}
            >
                <View style={styles.modalContent}>
                    <TouchableOpacity style={styles.modalCloseButton} onPress={() => setIsExportVisible(false)}>
                        <XCircle size={26} color="#94A3B8" />
                    </TouchableOpacity>

                    <View style={styles.modalIconContainer}>
                        <Lock size={38} color="#6366F1" />
                    </View>

                    <Text style={styles.modalTitle}>{t('synchro.exportModal.title')}</Text>
                    <Text style={styles.modalSubtitle}>
                        {t('synchro.exportModal.subtitle')}
                    </Text>

                    <TextInput
                        label={t('synchro.exportModal.passwordLabel')}
                        value={passwordKey}
                        onChangeText={setPasswordKey}
                        secureTextEntry={!passwordKeyShow}
                        right={<TextInput.Icon icon={passwordKeyShow ? "eye-off" : "eye"} onPress={onClickShowPasswordKey} color="#94A3B8" />}
                        style={styles.modalInput}
                        textColor="#FFFFFF"
                        theme={{ colors: { onSurfaceVariant: '#94A3B8', primary: '#6366F1' } }}
                        mode="outlined"
                        autoCapitalize="none"
                        autoFocus
                    />

                    <Button
                        mode="contained"
                        onPress={handleExport}
                        style={styles.modalActionButton}
                        labelStyle={styles.modalActionButtonLabel}
                        icon={() => <Archive size={20} color="#FFFFFF" />}
                    >
                        {t('synchro.exportModal.actionButton')}
                    </Button>
                </View>
            </Modal>

            {/* Import Password Modal */}
            <Modal
                avoidKeyboard={true}
                isVisible={isImportVisible}
                onBackdropPress={() => setIsImportVisible(false)}
                style={styles.modal}
            >
                <View style={styles.modalContent}>
                    <TouchableOpacity style={styles.modalCloseButton} onPress={() => setIsImportVisible(false)}>
                        <XCircle size={26} color="#94A3B8" />
                    </TouchableOpacity>

                    <View style={[styles.modalIconContainer, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                        <Key size={38} color="#6366F1" />
                    </View>

                    <Text style={styles.modalTitle}>{t('synchro.importModal.title')}</Text>
                    <Text style={styles.modalSubtitle}>
                        {t('synchro.importModal.subtitle')}
                    </Text>

                    <TextInput
                        label={t('synchro.importModal.passwordLabel')}
                        value={passwordKey}
                        onChangeText={setPasswordKey}
                        secureTextEntry={!passwordKeyShow}
                        right={<TextInput.Icon icon={passwordKeyShow ? "eye-off" : "eye"} onPress={onClickShowPasswordKey} color="#94A3B8" />}
                        style={styles.modalInput}
                        textColor="#FFFFFF"
                        theme={{ colors: { onSurfaceVariant: '#94A3B8', primary: '#6366F1' } }}
                        mode="outlined"
                        autoCapitalize="none"
                        autoFocus
                    />

                    <Button
                        mode="contained"
                        onPress={handleImport}
                        style={styles.modalActionButton}
                        labelStyle={styles.modalActionButtonLabel}
                        icon={() => <CloudDownload size={20} color="#FFFFFF" />}
                    >
                        {t('synchro.importModal.actionButton')}
                    </Button>
                </View>
            </Modal>

            {/* Cloud Save/Restore Passphrase Modal */}
            <Modal
                avoidKeyboard={true}
                isVisible={cloudModalVisible}
                onBackdropPress={() => setCloudModalVisible(false)}
                style={styles.modal}
            >
                <View style={styles.modalContent}>
                    <TouchableOpacity style={styles.modalCloseButton} onPress={() => setCloudModalVisible(false)}>
                        <XCircle size={26} color="#94A3B8" />
                    </TouchableOpacity>

                    <View style={styles.modalIconContainer}>
                        {cloudModalMode === 'save' ? <CloudUpload size={38} color="#6366F1" /> : <CloudDownload size={38} color="#6366F1" />}
                    </View>

                    <Text style={styles.modalTitle}>
                        {cloudModalMode === 'save' ? t('synchro.cloudModal.saveTitle') : t('synchro.cloudModal.restoreTitle')}
                    </Text>
                    <Text style={styles.modalSubtitle}>
                        {cloudModalMode === 'save'
                            ? t('synchro.cloudModal.saveSubtitle')
                            : t('synchro.cloudModal.restoreSubtitle')}
                    </Text>

                    <TextInput
                        label={t('synchro.cloudModal.passwordLabel')}
                        value={cloudPassphrase}
                        onChangeText={setCloudPassphrase}
                        secureTextEntry={!cloudPassphraseShow}
                        right={<TextInput.Icon icon={cloudPassphraseShow ? "eye-off" : "eye"} onPress={() => setCloudPassphraseShow(!cloudPassphraseShow)} color="#94A3B8" />}
                        style={styles.modalInput}
                        textColor="#FFFFFF"
                        theme={{ colors: { onSurfaceVariant: '#94A3B8', primary: '#6366F1' } }}
                        mode="outlined"
                        autoCapitalize="none"
                        autoFocus
                    />

                    <Button
                        mode="contained"
                        onPress={cloudModalMode === 'save' ? handleCloudSave : handleCloudRestore}
                        loading={cloudLoading}
                        disabled={cloudLoading}
                        style={styles.modalActionButton}
                        labelStyle={styles.modalActionButtonLabel}
                        icon={() => cloudModalMode === 'save' ? <CloudUpload size={20} color="#FFFFFF" /> : <RefreshCw size={20} color="#FFFFFF" />}
                    >
                        {cloudModalMode === 'save' ? t('synchro.cloudModal.saveButton') : t('synchro.cloudModal.restoreButton')}
                    </Button>
                </View>
            </Modal>

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
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 110,
    },
    card: {
        backgroundColor: '#1E293B',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        padding: 24,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 12,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    iconBadge: {
        width: 46,
        height: 46,
        borderRadius: 12,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    cardDescription: {
        fontSize: 13,
        color: '#94A3B8',
        lineHeight: 20,
        marginBottom: 20,
    },
    form: {
        gap: 12,
    },
    authTabContainer: {
        flexDirection: 'row',
        backgroundColor: '#0F172A',
        borderRadius: 12,
        padding: 4,
        marginBottom: 4,
    },
    authTabButton: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    authTabButtonActive: {
        backgroundColor: '#6366F1',
    },
    authTabText: {
        color: '#94A3B8',
        fontSize: 13,
        fontWeight: 'bold',
    },
    authTabTextActive: {
        color: '#FFFFFF',
    },
    textInputDisabled: {
        backgroundColor: '#0F172A',
        height: 52,
    },
    textInput: {
        backgroundColor: '#0F172A',
    },
    actionButtonFull: {
        backgroundColor: '#6366F1',
        borderRadius: 14,
        paddingVertical: 4,
        marginTop: 4,
    },
    loggedInRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#0F172A',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    loggedInEmail: {
        color: '#FFFFFF',
        fontSize: 13,
        flex: 1,
    },
    logoutRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
    },
    logoutText: {
        color: '#EF4444',
        fontSize: 13,
        fontWeight: '600',
    },
    buttonGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    importButton: {
        flex: 0.47,
        borderColor: '#6366F1',
        borderRadius: 14,
        borderWidth: 1,
        paddingVertical: 4,
    },
    exportButton: {
        flex: 0.47,
        backgroundColor: '#6366F1',
        borderRadius: 14,
        paddingVertical: 4,
    },
    buttonLabel: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    // Modal styles
    modal: {
        justifyContent: 'center',
        alignItems: 'center',
        margin: 0,
    },
    modalContent: {
        backgroundColor: '#1E293B',
        padding: 24,
        width: '85%',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 20,
        elevation: 10,
    },
    modalCloseButton: {
        position: 'absolute',
        top: 14,
        right: 14,
        padding: 4,
    },
    modalIconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 10,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 13,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    modalInput: {
        width: '100%',
        backgroundColor: '#0F172A',
        marginBottom: 20,
    },
    modalActionButton: {
        backgroundColor: '#6366F1',
        borderRadius: 14,
        width: '100%',
        paddingVertical: 6,
        shadowColor: '#6366F1',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 3,
    },
    modalActionButtonLabel: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
});