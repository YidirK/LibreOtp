import { StatusBar } from 'expo-status-bar';
import { version } from '../package.json';
import { StyleSheet, Text, View, Linking, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ⚠️ À adapter si besoin : lien vers la section "Self-hosting" du README GitHub
const SELF_HOST_README_URL = 'https://github.com/YidirK/LibreOTP#self-hosting';
import {
  BookOpen,
  Shield,
  Code,
  Key,
  Cloud,
  Heart,
  Bug,
  Coffee,
  Wallet,
  Copy,
  ChevronRight,
  ShieldAlert,
  AlertTriangle,
  Trash2,
  X,
  Download,
  Server,
  XCircle,
  Fingerprint,
  Lock,
  HelpCircle,
  Languages,
  Check,
} from 'lucide-react-native';
import { GithubIcon } from '../components/BrandIcons';
import { Divider, Button, Snackbar, Chip, TextInput, Switch } from 'react-native-paper';
import { useState, useEffect, useCallback } from 'react';
import * as Clipboard from 'expo-clipboard';
import Modal from "react-native-modal";
import * as FileSystem from 'expo-file-system/legacy';
import { ALERT_TYPE, Toast } from 'react-native-alert-notification';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Updates from 'expo-updates';
import { loadStoredPocketbaseUrl, setPocketbaseUrl, checkPocketbaseHealth } from '../lib/pocketbase';
import { SUPPORTED_LANGUAGES, changeLanguage } from '../lib/i18n';
import {
  isLockEnabled,
  setLockEnabled,
  hasPinSet,
  setPin,
  isBiometricAvailable,
  isBiometricEnabled,
  setBiometricEnabled,
} from '../lib/appLock';

export default function Settings() {
  const { t, i18n } = useTranslation();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarText, setSnackbarText] = useState('');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const navigation = useNavigation();

  // Verrouillage de l'application (Face ID / empreinte + code PIN)
  const [lockEnabled, setLockEnabledState] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(true);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [newPinValue, setNewPinValue] = useState('');
  const [confirmPinValue, setConfirmPinValue] = useState('');
  const [pinError, setPinError] = useState('');

  // Sélecteur de langue
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const currentLanguageLabel = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language)?.label
      || SUPPORTED_LANGUAGES[0].label;

  const handleSelectLanguage = async (languageCode) => {
    await changeLanguage(languageCode);
    setLanguageModalVisible(false);
  };

  useFocusEffect(
      useCallback(() => {
        const loadLockSettings = async () => {
          const [enabled, available, bioEnabled] = await Promise.all([
            isLockEnabled(),
            isBiometricAvailable(),
            isBiometricEnabled(),
          ]);
          setLockEnabledState(enabled);
          setBiometricAvailable(available);
          setBiometricEnabledState(bioEnabled);
        };
        loadLockSettings();
      }, [])
  );

  const openPinModal = () => {
    setNewPinValue('');
    setConfirmPinValue('');
    setPinError('');
    setPinModalVisible(true);
  };

  const handleToggleLock = async (value) => {
    if (value) {
      // Impossible d'activer le verrouillage sans code PIN défini au préalable
      openPinModal();
    } else {
      await setLockEnabled(false);
      setLockEnabledState(false);
      Toast.show({
        type: ALERT_TYPE.SUCCESS,
        title: t('settings.lock.disabledTitle'),
        textBody: t('settings.lock.disabledBody'),
      });
    }
  };

  const handleConfirmPin = async () => {
    if (newPinValue.length !== 4) {
      setPinError(t('settings.pinModal.errorLength'));
      return;
    }
    if (newPinValue !== confirmPinValue) {
      setPinError(t('settings.pinModal.errorMismatch'));
      return;
    }

    await setPin(newPinValue);
    await setLockEnabled(true);
    setLockEnabledState(true);
    setPinModalVisible(false);

    Toast.show({
      type: ALERT_TYPE.SUCCESS,
      title: t('settings.lock.enabledTitle'),
      textBody: t('settings.lock.enabledBody'),
    });
  };

  const handleToggleBiometric = async (value) => {
    await setBiometricEnabled(value);
    setBiometricEnabledState(value);
  };
  const [selfHostModalVisible, setSelfHostModalVisible] = useState(false);
  const [pocketbaseUrl, setPocketbaseUrlState] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [isConnected, setIsConnected] = useState(null); // null = vérification en cours
  const [checkingConnection, setCheckingConnection] = useState(false);

  const refreshConnectionStatus = async () => {
    setCheckingConnection(true);
    const url = await loadStoredPocketbaseUrl();
    setPocketbaseUrlState(url);
    const healthy = await checkPocketbaseHealth();
    setIsConnected(healthy);
    setCheckingConnection(false);
  };

  useFocusEffect(
      useCallback(() => {
        refreshConnectionStatus();
      }, [])
  );

  const openSelfHostModal = () => {
    setUrlInput(pocketbaseUrl);
    setSelfHostModalVisible(true);
  };

  const handleSaveSelfHostUrl = async () => {
    if (!urlInput.trim()) {
      Toast.show({
        type: ALERT_TYPE.ERROR,
        title: t('common.error'),
        textBody: t('settings.selfHostModal.errorEmptyUrl'),
      });
      return;
    }

    setCheckingConnection(true);
    const savedUrl = await setPocketbaseUrl(urlInput);
    setPocketbaseUrlState(savedUrl);
    const healthy = await checkPocketbaseHealth();
    setIsConnected(healthy);
    setCheckingConnection(false);
    setSelfHostModalVisible(false);

    Toast.show({
      type: healthy ? ALERT_TYPE.SUCCESS : ALERT_TYPE.WARNING,
      title: healthy ? t('settings.selfHostModal.connected') : t('settings.selfHostModal.unreachableTitle'),
      textBody: healthy
          ? t('settings.selfHostModal.successBody')
          : t('settings.selfHostModal.unreachableBody'),
    });
  };

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync("0x2aB5A31CF18f49581fb3a034ba7a494b54A5660A");
    setSnackbarText(t('settings.support.copiedAddress'));
    setSnackbarVisible(true);
  };

  const deleteFile = async (fileUri) => {
    try {
      await FileSystem.deleteAsync(fileUri);
      Toast.show({
        type: ALERT_TYPE.SUCCESS,
        title: t('settings.resetModal.doneTitle'),
        textBody: t('settings.resetModal.doneBody'),
      });
      navigation.navigate('Home');
    } catch (error) {
      if (error.code === 'ERR_FILE_SYSTEM_FILE_NOT_FOUND') {
        Toast.show({
          type: ALERT_TYPE.ERROR,
          title: t('common.error'),
          textBody: t('settings.resetModal.notFoundBody'),
        });
      } else {
        Toast.show({
          type: ALERT_TYPE.ERROR,
          title: t('common.error'),
          textBody: t('settings.resetModal.failedBody'),
        });
      }
    }
  };

  const handleResetData = () => {
    const fileToDelete = FileSystem.documentDirectory + 'LibreOtpData.json';
    deleteFile(fileToDelete);
    setDeleteModalVisible(false);
  };

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
      Toast.show({
        type: ALERT_TYPE.WARNING,
        title: t('settings.update.toastTitle'),
        textBody: t('settings.update.toastBody'),
      });
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (e) {
      console.log('Error updating the app:', e);
    }
  };

  return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>{t('settings.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('settings.subtitle')}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Card 1: About */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <BookOpen size={20} color="#6366F1" />
              <Text style={styles.cardTitle}>{t('settings.about.cardTitle')}</Text>
            </View>
            <Text style={styles.cardHighlight}>{t('settings.about.highlight')}</Text>

            <View style={styles.aboutList}>
              <View style={styles.aboutRow}>
                <Shield size={16} color="#6366F1" />
                <Text style={styles.aboutText}>{t('settings.about.noAds')}</Text>
              </View>
              <View style={styles.aboutRow}>
                <Code size={16} color="#6366F1" />
                <Text style={styles.aboutText}>{t('settings.about.openSource')}</Text>
              </View>
              <View style={styles.aboutRow}>
                <Key size={16} color="#6366F1" />
                <Text style={styles.aboutText}>{t('settings.about.importExport')}</Text>
              </View>
              <View style={styles.aboutRow}>
                <Cloud size={16} color="#6366F1" />
                <Text style={styles.aboutText}>{t('settings.about.encryptedBackups')}</Text>
              </View>
            </View>
          </View>

          {/* Card 2: Support Us */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Heart size={20} color="#EF4444" />
              <Text style={styles.cardTitle}>{t('settings.support.cardTitle')}</Text>
            </View>
            <Text style={styles.cardDescription}>
              {t('settings.support.description')}
            </Text>

            <View style={styles.linksContainer}>
              <TouchableOpacity
                  onPress={() => Linking.openURL('https://github.com/YidirK')}
                  style={styles.linkRow}
              >
                <View style={styles.linkLeft}>
                  <GithubIcon size={18} color="#FFFFFF" />
                  <Text style={styles.linkText}>{t('settings.support.star')}</Text>
                </View>
                <ChevronRight size={16} color="#64748B" />
              </TouchableOpacity>

              <TouchableOpacity
                  onPress={() => Linking.openURL('https://github.com/YidirK')}
                  style={styles.linkRow}
              >
                <View style={styles.linkLeft}>
                  <Bug size={18} color="#FFFFFF" />
                  <Text style={styles.linkText}>{t('settings.support.reportBug')}</Text>
                </View>
                <ChevronRight size={16} color="#64748B" />
              </TouchableOpacity>

              <TouchableOpacity
                  onPress={() => Linking.openURL('https://buymeacoffee.com/yidirk')}
                  style={styles.linkRow}
              >
                <View style={styles.linkLeft}>
                  <Coffee size={18} color="#FFFFFF" />
                  <Text style={styles.linkText}>{t('settings.support.buyCoffee')}</Text>
                </View>
                <ChevronRight size={16} color="#64748B" />
              </TouchableOpacity>

              <TouchableOpacity onPress={copyToClipboard} style={styles.linkRow}>
                <View style={styles.linkLeft}>
                  <Wallet size={18} color="#FFFFFF" />
                  <Text style={styles.linkText}>{t('settings.support.donate')}</Text>
                </View>
                <Copy size={16} color="#6366F1" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Card 3: Security Actions */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <ShieldAlert size={20} color="#F59E0B" />
              <Text style={styles.cardTitle}>{t('settings.security.cardTitle')}</Text>
            </View>

            <View style={styles.settingsActionList}>
              <TouchableOpacity style={styles.actionRow} onPress={openSelfHostModal} activeOpacity={0.7}>
                <View style={{ flex: 1 }}>
                  <View style={styles.selfHostTitleRow}>
                    <View
                        style={[
                          styles.statusDot,
                          checkingConnection
                              ? styles.statusDotChecking
                              : isConnected
                                  ? styles.statusDotConnected
                                  : styles.statusDotDisconnected,
                        ]}
                    />
                    <Text style={styles.actionRowTitle}>{t('settings.security.selfHostTitle')}</Text>
                  </View>
                  <Text style={styles.actionRowSubtitle} numberOfLines={1}>
                    {pocketbaseUrl
                        ? pocketbaseUrl
                        : t('settings.security.selfHostSubtitleEmpty')}
                  </Text>
                </View>
                <ChevronRight size={18} color="#64748B" />
              </TouchableOpacity>

              <Divider style={styles.rowDivider} />

              <TouchableOpacity
                  style={styles.actionRow}
                  onPress={() => Linking.openURL(SELF_HOST_README_URL)}
                  activeOpacity={0.7}
              >
                <View style={styles.selfHostTitleRow}>
                  <HelpCircle size={18} color="#6366F1" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionRowTitle}>{t('settings.security.selfHostGuideTitle')}</Text>
                    <Text style={styles.actionRowSubtitle}>{t('settings.security.selfHostGuideSubtitle')}</Text>
                  </View>
                </View>
                <ChevronRight size={18} color="#64748B" />
              </TouchableOpacity>

              <Divider style={styles.rowDivider} />

              <View style={styles.actionRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionRowTitle}>{t('settings.security.resetTitle')}</Text>
                  <Text style={styles.actionRowSubtitle}>{t('settings.security.resetSubtitle')}</Text>
                </View>
                <Button
                    mode="contained"
                    onPress={() => setDeleteModalVisible(true)}
                    style={styles.resetButton}
                    labelStyle={styles.resetButtonLabel}
                >
                  {t('settings.security.resetButton')}
                </Button>
              </View>
            </View>
          </View>

          {/* Card 4: Language */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Languages size={20} color="#6366F1" />
              <Text style={styles.cardTitle}>{t('settings.language.cardTitle')}</Text>
            </View>

            <TouchableOpacity
                style={styles.actionRow}
                onPress={() => setLanguageModalVisible(true)}
                activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.actionRowTitle}>{t('settings.language.rowTitle')}</Text>
                <Text style={styles.actionRowSubtitle}>{currentLanguageLabel}</Text>
              </View>
              <ChevronRight size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Card 5: App Lock */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Lock size={20} color="#6366F1" />
              <Text style={styles.cardTitle}>{t('settings.lock.cardTitle')}</Text>
            </View>
            <Text style={styles.cardDescription}>
              {t('settings.lock.description')}
            </Text>

            <View style={styles.settingsActionList}>
              <View style={styles.actionRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionRowTitle}>{t('settings.lock.codeLockTitle')}</Text>
                  <Text style={styles.actionRowSubtitle}>{t('settings.lock.codeLockSubtitle')}</Text>
                </View>
                <Switch value={lockEnabled} onValueChange={handleToggleLock} color="#6366F1" />
              </View>

              {lockEnabled && (
                  <>
                    <Divider style={styles.rowDivider} />

                    {biometricAvailable && (
                        <>
                          <View style={styles.actionRow}>
                            <View style={[styles.selfHostTitleRow, { flex: 1 }]}>
                              <Fingerprint size={18} color="#6366F1" />
                              <View style={{ flex: 1 }}>
                                <Text style={styles.actionRowTitle}>{t('settings.lock.biometricTitle')}</Text>
                                <Text style={styles.actionRowSubtitle}>{t('settings.lock.biometricSubtitle')}</Text>
                              </View>
                            </View>
                            <Switch value={biometricEnabled} onValueChange={handleToggleBiometric} color="#6366F1" />
                          </View>
                          <Divider style={styles.rowDivider} />
                        </>
                    )}

                    <TouchableOpacity style={styles.actionRow} onPress={openPinModal} activeOpacity={0.7}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.actionRowTitle}>{t('settings.lock.changeCodeTitle')}</Text>
                        <Text style={styles.actionRowSubtitle}>{t('settings.lock.changeCodeSubtitle')}</Text>
                      </View>
                      <ChevronRight size={18} color="#64748B" />
                    </TouchableOpacity>
                  </>
              )}
            </View>
          </View>

          {/* Version Footer */}
          <View style={styles.footer}>
            <Text style={styles.versionText}>{t('settings.versionFooter', { version })}</Text>
            {updateAvailable && (
                <Chip
                    icon={() => <Download size={18} color="#FFFFFF" />}
                    style={styles.updateChip}
                    textStyle={styles.updateChipText}
                    onPress={handleUpdate}
                >
                  {t('settings.update.chip')}
                </Chip>
            )}
          </View>
        </ScrollView>

        {/* Language Selector Modal */}
        <Modal
            isVisible={languageModalVisible}
            onBackdropPress={() => setLanguageModalVisible(false)}
            style={styles.modal}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setLanguageModalVisible(false)}>
              <XCircle size={26} color="#94A3B8" />
            </TouchableOpacity>

            <View style={[styles.modalIconContainer, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
              <Languages size={38} color="#6366F1" />
            </View>

            <Text style={styles.modalTitle}>{t('settings.language.modalTitle')}</Text>
            <Text style={styles.modalSubtitle}>{t('settings.language.modalSubtitle')}</Text>

            <View style={styles.languageList}>
              {SUPPORTED_LANGUAGES.map((lang) => (
                  <TouchableOpacity
                      key={lang.code}
                      style={styles.languageRow}
                      onPress={() => handleSelectLanguage(lang.code)}
                      activeOpacity={0.7}
                  >
                    <Text style={styles.languageRowText}>{lang.label}</Text>
                    {i18n.language === lang.code && <Check size={20} color="#6366F1" />}
                  </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {/* Set/Change PIN Modal */}
        <Modal
            isVisible={pinModalVisible}
            onBackdropPress={() => setPinModalVisible(false)}
            avoidKeyboard={true}
            style={styles.modal}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setPinModalVisible(false)}>
              <XCircle size={26} color="#94A3B8" />
            </TouchableOpacity>

            <View style={[styles.modalIconContainer, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
              <Lock size={38} color="#6366F1" />
            </View>

            <Text style={styles.modalTitle}>{t('settings.pinModal.title')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('settings.pinModal.subtitle')}
            </Text>

            {pinError !== '' && <Text style={styles.errorText}>{pinError}</Text>}

            <View style={styles.inputWrapper}>
              <TextInput
                  label={t('settings.pinModal.newCodeLabel')}
                  value={newPinValue}
                  onChangeText={(text) => {
                    setNewPinValue(text.replace(/[^0-9]/g, '').slice(0, 4));
                    setPinError('');
                  }}
                  style={[styles.modalInput, styles.pinInput]}
                  contentStyle={styles.pinInputContent}
                  textColor="#FFFFFF"
                  theme={{ colors: { onSurfaceVariant: '#94A3B8', primary: '#6366F1' } }}
                  mode="outlined"
                  outlineStyle={styles.modalInputOutline}
                  secureTextEntry
                  keyboardType="number-pad"
                  maxLength={4}
                  textAlign="center"
              />
            </View>

            <View style={styles.inputWrapper}>
              <TextInput
                  label={t('settings.pinModal.confirmCodeLabel')}
                  value={confirmPinValue}
                  onChangeText={(text) => {
                    setConfirmPinValue(text.replace(/[^0-9]/g, '').slice(0, 4));
                    setPinError('');
                  }}
                  style={[styles.modalInput, styles.pinInput]}
                  contentStyle={styles.pinInputContent}
                  textColor="#FFFFFF"
                  theme={{ colors: { onSurfaceVariant: '#94A3B8', primary: '#6366F1' } }}
                  mode="outlined"
                  outlineStyle={styles.modalInputOutline}
                  secureTextEntry
                  keyboardType="number-pad"
                  maxLength={4}
                  textAlign="center"
              />
            </View>

            <Button
                mode="contained"
                onPress={handleConfirmPin}
                style={styles.modalActionButton}
                labelStyle={styles.modalActionButtonLabel}
                icon={() => <Lock size={20} color="#FFFFFF" />}
            >
              {t('settings.pinModal.saveButton')}
            </Button>
          </View>
        </Modal>

        {/* Self-hosted PocketBase URL Modal */}
        <Modal
            isVisible={selfHostModalVisible}
            onBackdropPress={() => setSelfHostModalVisible(false)}
            avoidKeyboard={true}
            style={styles.modal}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setSelfHostModalVisible(false)}>
              <XCircle size={26} color="#94A3B8" />
            </TouchableOpacity>

            <View style={[styles.modalIconContainer, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
              <Server size={38} color="#6366F1" />
            </View>

            <Text style={styles.modalTitle}>{t('settings.selfHostModal.title')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('settings.selfHostModal.subtitle')}
            </Text>

            <View style={styles.selfHostStatusRow}>
              <View
                  style={[
                    styles.statusDot,
                    checkingConnection
                        ? styles.statusDotChecking
                        : isConnected
                            ? styles.statusDotConnected
                            : styles.statusDotDisconnected,
                  ]}
              />
              <Text style={styles.selfHostStatusText}>
                {checkingConnection
                    ? t('settings.selfHostModal.checking')
                    : isConnected
                        ? t('settings.selfHostModal.connected')
                        : t('settings.selfHostModal.disconnected')}
              </Text>
            </View>

            <TextInput
                label={t('settings.selfHostModal.urlLabel')}
                value={urlInput}
                onChangeText={setUrlInput}
                placeholder="https://mon-serveur.exemple.com"
                style={styles.modalInput}
                contentStyle={styles.modalInputContent}
                textColor="#FFFFFF"
                theme={{ colors: { onSurfaceVariant: '#94A3B8', primary: '#6366F1' } }}
                mode="outlined"
                outlineStyle={styles.modalInputOutline}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
            />

            <Button
                mode="contained"
                onPress={handleSaveSelfHostUrl}
                loading={checkingConnection}
                disabled={checkingConnection}
                style={styles.modalActionButton}
                labelStyle={styles.modalActionButtonLabel}
                icon={() => <Server size={20} color="#FFFFFF" />}
            >
              {t('settings.selfHostModal.saveButton')}
            </Button>
          </View>
        </Modal>

        {/* Reset Confirmation Modal */}
        <Modal
            isVisible={deleteModalVisible}
            onBackdropPress={() => setDeleteModalVisible(false)}
            style={styles.modal}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <AlertTriangle size={40} color="#EF4444" />
            </View>
            <Text style={styles.modalTitle}>{t('settings.resetModal.title')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('settings.resetModal.subtitle')}
            </Text>

            <View style={styles.modalButtonGroup}>
              <Button
                  mode="contained"
                  onPress={handleResetData}
                  style={styles.modalConfirmButton}
                  labelStyle={styles.modalButtonLabel}
                  icon={() => <Trash2 size={18} color="#FFFFFF" />}
              >
                {t('settings.resetModal.confirmButton')}
              </Button>

              <Button
                  mode="contained"
                  onPress={() => setDeleteModalVisible(false)}
                  style={styles.modalCancelButton}
                  labelStyle={styles.modalButtonLabel}
                  icon={() => <X size={18} color="#FFFFFF" />}
              >
                {t('common.cancel')}
              </Button>
            </View>
          </View>
        </Modal>

        <Snackbar
            visible={snackbarVisible}
            onDismiss={() => setSnackbarVisible(false)}
            duration={2500}
            style={styles.snackbar}
        >
          {snackbarText}
        </Snackbar>

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
    padding: 22,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  cardHighlight: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  cardDescription: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 20,
    marginBottom: 16,
  },
  aboutList: {
    gap: 12,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aboutText: {
    color: '#94A3B8',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  linksContainer: {
    gap: 6,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
  },
  linkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  linkText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  settingsActionList: {
    marginTop: 6,
  },
  actionRowDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    opacity: 0.5,
  },
  selfHostTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotConnected: {
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E',
    shadowOpacity: 0.6,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  statusDotDisconnected: {
    backgroundColor: '#EF4444',
  },
  statusDotChecking: {
    backgroundColor: '#F59E0B',
  },
  selfHostStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: '100%',
    marginBottom: 16,
  },
  selfHostStatusText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  actionRowTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionRowSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 14,
  },
  rowDivider: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 4,
  },
  resetButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    elevation: 0,
  },
  resetButtonLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginVertical: 4,
    marginHorizontal: 12,
  },
  footer: {
    alignItems: 'center',
    marginTop: 15,
    gap: 10,
  },
  versionText: {
    color: '#64748B',
    fontSize: 13,
  },
  updateChip: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
  },
  updateChipText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  snackbar: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  // Language list styles
  languageList: {
    width: '100%',
    gap: 6,
  },
  languageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    width: '100%',
  },
  languageRowText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
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
    width: SCREEN_WIDTH * 0.94,
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
  modalIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
    marginBottom: 24,
  },
  modalButtonGroup: {
    width: '100%',
    gap: 12,
  },
  modalConfirmButton: {
    backgroundColor: '#EF4444',
    borderRadius: 14,
    paddingVertical: 4,
  },
  modalCancelButton: {
    backgroundColor: '#334155',
    borderRadius: 14,
    paddingVertical: 4,
  },
  modalButtonLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 4,
  },
  // Inputs agrandis : largeur maximale du modal + hauteur/texte plus grands
  inputWrapper: {
    width: '100%',
    alignSelf: 'stretch',
  },
  modalInput: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: '#0F172A',
    marginBottom: 20,
    fontSize: 18,
    height: 62,
  },
  modalInputContent: {
    fontSize: 18,
    paddingHorizontal: 16,
  },
  modalInputOutline: {
    borderRadius: 14,
    borderWidth: 1.5,
  },
  // Champs code PIN : encore plus grands et centrés, chiffres bien lisibles
  pinInput: {
    height: 72,
    fontSize: 26,
  },
  pinInputContent: {
    fontSize: 26,
    letterSpacing: 18,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  modalActionButton: {
    backgroundColor: '#6366F1',
    borderRadius: 14,
    width: '100%',
    alignSelf: 'stretch',
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
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 10,
    fontWeight: '600',
  },
});