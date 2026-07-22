import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { TOTP } from "totp-generator";
import { Card, ProgressBar, Provider as PaperProvider, Menu, Divider, TextInput, Button } from 'react-native-paper';
import { useEffect, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { ShieldCheck, Globe, ChevronLeft, MoreVertical, PenTool, Trash2, XCircle, Copy, Save, X, Apple } from 'lucide-react-native';
import { GoogleIcon, GithubIcon, FacebookIcon, InstagramIcon, XIcon, LinkedinIcon, TwitchIcon, GitlabIcon } from '../components/BrandIcons';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import { ALERT_TYPE, Toast } from 'react-native-alert-notification';
import Modal from "react-native-modal";
import { useTranslation } from 'react-i18next';

export default function SingleOtp({ route }) {
  const { t } = useTranslation();
  const { key, name, index } = route.params;
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  // Échelle simple : les petits écrans (ex: iPhone SE, vieux Android) reçoivent
  // des tailles de police réduites pour que "Précédent / Actuel / Suivant" ne
  // déborde jamais sur une seule ligne.
  const isCompact = width < 360;
  const isTablet = width >= 600;
  const centerFontSize = isTablet ? 44 : isCompact ? 30 : 36;
  const sideFontSize = isTablet ? 22 : isCompact ? 15 : 18;
  const otpCardPaddingH = isCompact ? 6 : 12;
  const [otp, setOtp] = useState('');
  const [previousOtp, setPreviousOtp] = useState('');
  const [nextOtp, setNextOtp] = useState('');
  const [progress, setProgress] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [isExpired, setIsExpired] = useState(false);

  // Modal & Menu states
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newName, setNewName] = useState(name);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    const updateOtp = () => {
      try {
        const { otp, expires } = TOTP.generate(key);
        setOtp(otp);
        const currentTime = Date.now();
        const timeLeft = expires - currentTime;
        const normalizedProgress = Math.max(0, Math.min(1, timeLeft / 30000));
        setProgress(normalizedProgress);

        const sec = Math.ceil(timeLeft / 1000);
        setSecondsLeft(sec);
        setIsExpired(timeLeft < 5000);

        // Code précédent et suivant, décalés d'une période de 30s (utile en cas de
        // dérive d'horloge ou pour préparer le prochain code avant l'expiration).
        const { otp: prevCode } = TOTP.generate(key, { timestamp: currentTime - 30000 });
        const { otp: nextCode } = TOTP.generate(key, { timestamp: currentTime + 30000 });
        setPreviousOtp(prevCode);
        setNextOtp(nextCode);
      } catch (err) {
        console.error('Error generating OTP in SingleOtp:', err);
      }
    };

    updateOtp();
    const interval = setInterval(updateOtp, 250);
    return () => clearInterval(interval);
  }, [key]);

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(otp);
    Toast.show({
      type: ALERT_TYPE.SUCCESS,
      title: t('common.copied'),
      textBody: t('singleOtp.copiedCurrentBody'),
    });
  };

  const copyOtpValue = async (value, message) => {
    if (!value) return;
    await Clipboard.setStringAsync(value);
    Toast.show({
      type: ALERT_TYPE.SUCCESS,
      title: t('common.copied'),
      textBody: message,
    });
  };

  const openMenu = (event) => {
    const { pageX, pageY } = event.nativeEvent;
    setMenuPosition({ x: pageX, y: pageY });
    setMenuVisible(true);
  };

  const closeMenu = () => {
    setMenuVisible(false);
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
      navigation.navigate('Home');
      Toast.show({
        type: ALERT_TYPE.SUCCESS,
        title: t('singleOtp.deletedTitle'),
        textBody: t('singleOtp.deletedBody'),
      });
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const editItem = async () => {
    if (newName.trim() === '') {
      setErrorText(t('singleOtp.editModal.errorEmpty'));
      return;
    }
    try {
      const fileUri = FileSystem.documentDirectory + 'LibreOtpData.json';
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const jsonData = JSON.parse(fileContent);
      const newData = [...jsonData];
      newData[index].name = newName.trim();
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(newData));
      setEditModalVisible(false);
      navigation.navigate('Home');
      Toast.show({
        type: ALERT_TYPE.SUCCESS,
        title: t('singleOtp.editModal.editedTitle'),
        textBody: t('singleOtp.editModal.editedBody'),
      });
    } catch (error) {
      console.error('Error editing item:', error);
    }
  };

  const handleEditClick = () => {
    setEditModalVisible(true);
    closeMenu();
  };

  // Helper to map brand styles
  const getServiceStyle = (name) => {
    const lower = name.toLowerCase();
    if (lower.includes('google')) return { icon: GoogleIcon, color: '#EA4335' };
    if (lower.includes('github')) return { icon: GithubIcon, color: '#FFFFFF' };
    if (lower.includes('discord')) return { icon: Globe, color: '#5865F2' };
    if (lower.includes('facebook')) return { icon: FacebookIcon, color: '#1877F2' };
    if (lower.includes('instagram')) return { icon: InstagramIcon, color: '#E1306C' };
    if (lower.includes('twitter') || lower.includes('x')) return { icon: XIcon, color: '#1DA1F2' };
    if (lower.includes('microsoft') || lower.includes('outlook') || lower.includes('office') || lower.includes('windows')) return { icon: Globe, color: '#00A4EF' };
    if (lower.includes('linkedin')) return { icon: LinkedinIcon, color: '#0077B5' };
    if (lower.includes('reddit')) return { icon: Globe, color: '#FF4500' };
    if (lower.includes('twitch')) return { icon: TwitchIcon, color: '#9146FF' };
    if (lower.includes('apple')) return { icon: Apple, color: '#A2AAAD' };
    if (lower.includes('amazon')) return { icon: Globe, color: '#FF9900' };
    if (lower.includes('gitlab')) return { icon: GitlabIcon, color: '#FC6D26' };

    return { icon: ShieldCheck, color: '#6366F1' };
  };

  const serviceStyle = getServiceStyle(name);

  const formatOtp = (code) => {
    if (code && code.length === 6) {
      return `${code.slice(0, 3)}   ${code.slice(3)}`;
    }
    return code;
  };

  return (
      <PaperProvider>
        <View style={styles.container}>
          {/* Header bar */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <ChevronLeft color="#FFFFFF" size={28} />
            </TouchableOpacity>
            <Text style={styles.headerText}>{t('singleOtp.headerTitle')}</Text>
            <TouchableOpacity onPress={openMenu} style={styles.menuTriggerButton}>
              <MoreVertical color="#FFFFFF" size={26} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* Brand Icon & Name */}
            <View style={styles.brandContainer}>
              <View style={[styles.largeIconWrapper, { backgroundColor: serviceStyle.color + '15', borderColor: serviceStyle.color + '40' }]}>
                <serviceStyle.icon size={64} color={serviceStyle.color} />
              </View>
              <Text style={styles.nameText}>{name}</Text>
              <Text style={styles.typeText}>{t('singleOtp.type')}</Text>
            </View>

            {/* OTP Code Card — Précédent / Actuel / Suivant */}
            <View style={[styles.otpCard, { paddingHorizontal: otpCardPaddingH }]}>
              <View style={styles.otpRow}>
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => copyOtpValue(previousOtp, t('singleOtp.copiedPreviousBody'))}
                    style={styles.otpSideSlot}
                >
                  <Text style={styles.otpSideLabel} numberOfLines={1} adjustsFontSizeToFit>{t('singleOtp.previous')}</Text>
                  <Text
                      style={[styles.otpSideCode, { fontSize: sideFontSize }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.6}
                  >
                    {formatOtp(previousOtp)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.8} onPress={copyToClipboard} style={styles.otpCenterSlot}>
                  <Text style={styles.otpCenterLabel} numberOfLines={1} adjustsFontSizeToFit>{t('singleOtp.current')}</Text>
                  <Text
                      style={[styles.otpCodeText, { fontSize: centerFontSize }, isExpired && styles.otpCodeTextExpired]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.6}
                  >
                    {formatOtp(otp)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => copyOtpValue(nextOtp, t('singleOtp.copiedNextBody'))}
                    style={styles.otpSideSlot}
                >
                  <Text style={styles.otpSideLabel} numberOfLines={1} adjustsFontSizeToFit>{t('singleOtp.next')}</Text>
                  <Text
                      style={[styles.otpSideCode, { fontSize: sideFontSize }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.6}
                  >
                    {formatOtp(nextOtp)}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.tapToCopyText} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
                {t('singleOtp.tapToCopy')}
              </Text>
            </View>

            {/* Timer Progress */}
            <View style={styles.timerContainer}>
              <ProgressBar
                  progress={progress}
                  color={isExpired ? '#EF4444' : '#6366F1'}
                  style={styles.progressBar}
              />
              <Text style={[styles.timerText, isExpired && styles.timerTextExpired]}>
                {t('singleOtp.expiresInPrefix')} <Text style={styles.boldTimerText}>{t('singleOtp.secondsCount', { count: secondsLeft })}</Text>
              </Text>
            </View>

            {/* Action buttons */}
            <View style={styles.actionButtonsContainer}>
              <Button
                  mode="contained"
                  onPress={copyToClipboard}
                  style={styles.copyButton}
                  labelStyle={styles.copyButtonLabel}
                  icon={() => <Copy size={20} color="#FFFFFF" />}
              >
                {t('singleOtp.copyButton')}
              </Button>

              <View style={styles.secondaryActions}>
                <Button
                    mode="outlined"
                    onPress={handleEditClick}
                    style={styles.editButton}
                    textColor="#FFFFFF"
                    labelStyle={styles.actionButtonLabel}
                    icon={() => <PenTool size={18} color="#FFFFFF" />}
                >
                  {t('singleOtp.editButton')}
                </Button>

                <Button
                    mode="outlined"
                    onPress={deleteItem}
                    style={styles.deleteButton}
                    textColor="#EF4444"
                    labelStyle={styles.actionButtonLabel}
                    icon={() => <Trash2 size={18} color="#EF4444" />}
                >
                  {t('singleOtp.deleteButton')}
                </Button>
              </View>
            </View>
          </ScrollView>

          {/* Dropdown Menu */}
          <Menu
              visible={menuVisible}
              onDismiss={closeMenu}
              anchor={{ x: menuPosition.x, y: menuPosition.y }}
              contentStyle={styles.dropdownMenu}
          >
            <Menu.Item
                onPress={handleEditClick}
                title={t('singleOtp.menuEditName')}
                titleStyle={styles.menuItemText}
                leadingIcon={() => <PenTool size={20} color="#FFFFFF" />}
            />
            <Divider style={styles.menuDivider} />
            <Menu.Item
                onPress={deleteItem}
                title={t('singleOtp.menuDeleteKey')}
                titleStyle={[styles.menuItemText, { color: '#EF4444' }]}
                leadingIcon={() => <Trash2 size={20} color="#EF4444" />}
            />
            <Divider style={styles.menuDivider} />
            <Menu.Item
                onPress={closeMenu}
                title={t('singleOtp.menuClose')}
                titleStyle={styles.menuItemText}
                leadingIcon={() => <X size={20} color="#94A3B8" />}
            />
          </Menu>

          {/* Edit Modal */}
          <Modal
              avoidKeyboard={true}
              isVisible={editModalVisible}
              onBackdropPress={() => setEditModalVisible(false)}
              style={styles.modal}
          >
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setEditModalVisible(false)}>
                <XCircle size={26} color="#94A3B8" />
              </TouchableOpacity>

              <Text style={styles.modalTitle}>{t('singleOtp.editModal.title')}</Text>
              <Text style={styles.modalSubtitle}>{t('singleOtp.editModal.subtitle')}</Text>

              {errorText !== '' && (
                  <Text style={styles.errorText}>{errorText}</Text>
              )}

              <TextInput
                  label={t('singleOtp.editModal.nameLabel')}
                  value={newName}
                  onChangeText={(text) => {
                    setNewName(text);
                    setErrorText('');
                  }}
                  style={styles.textInput}
                  textColor="#FFFFFF"
                  theme={{ colors: { onSurfaceVariant: '#94A3B8', primary: '#6366F1' } }}
                  mode="outlined"
                  autoCapitalize="none"
                  autoFocus
              />

              <Button
                  mode="contained"
                  onPress={editItem}
                  style={styles.modalSaveButton}
                  labelStyle={styles.modalSaveButtonLabel}
                  icon={() => <Save size={20} color="#FFFFFF" />}
              >
                {t('common.save')}
              </Button>
            </View>
          </Modal>

          <StatusBar style="light" />
        </View>
      </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 50,
  },
  backButton: {
    padding: 4,
  },
  menuTriggerButton: {
    padding: 4,
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 40,
    alignItems: 'center',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 35,
  },
  largeIconWrapper: {
    width: 110,
    height: 110,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 3,
  },
  nameText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  typeText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 6,
  },
  otpCard: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 28,
    paddingHorizontal: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 6,
  },
  otpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  otpCenterSlot: {
    flex: 1.4,
    minWidth: 0,
    alignItems: 'center',
  },
  otpSideSlot: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    opacity: 0.55,
  },
  otpCenterLabel: {
    color: '#6366F1',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  otpSideLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  otpSideCode: {
    color: '#94A3B8',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  otpCodeText: {
    fontSize: 36,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    color: '#6366F1',
    letterSpacing: 1,
  },
  otpCodeTextExpired: {
    color: '#EF4444',
  },
  tapToCopyText: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 16,
    fontWeight: '500',
  },
  timerContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  progressBar: {
    width: '80%',
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  timerText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94A3B8',
  },
  boldTimerText: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  timerTextExpired: {
    color: '#EF4444',
  },
  actionButtonsContainer: {
    width: '100%',
  },
  copyButton: {
    backgroundColor: '#6366F1',
    borderRadius: 16,
    paddingVertical: 6,
    marginBottom: 16,
    shadowColor: '#6366F1',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  copyButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  secondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editButton: {
    flex: 0.48,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 2,
  },
  deleteButton: {
    flex: 0.48,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 2,
  },
  actionButtonLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Dropdown Menu
  dropdownMenu: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    elevation: 8,
  },
  menuItemText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  menuDivider: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    marginTop: 10,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
  },
  textInput: {
    width: '100%',
    backgroundColor: '#0F172A',
    marginBottom: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 10,
    fontWeight: '600',
  },
  modalSaveButton: {
    backgroundColor: '#6366F1',
    borderRadius: 14,
    width: '100%',
    paddingVertical: 4,
  },
  modalSaveButtonLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});