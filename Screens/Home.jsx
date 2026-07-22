import React, { useState, useEffect, useRef, memo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image, RefreshControl, Animated, Easing } from 'react-native';
import { Card, IconButton, Menu, Divider, Button, Provider as PaperProvider, Searchbar } from 'react-native-paper';
import * as FileSystem from 'expo-file-system/legacy';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Apple, ShieldCheck, Plus, Maximize2, Trash2, X, Globe,Search , EllipsisVertical } from 'lucide-react-native';
import { GoogleIcon, GithubIcon, FacebookIcon, InstagramIcon, XIcon, LinkedinIcon, TwitchIcon, GitlabIcon } from '../components/BrandIcons';
import { ALERT_TYPE, Toast } from 'react-native-alert-notification';
import * as Clipboard from 'expo-clipboard';
import { TOTP } from "totp-generator";
import { useTranslation } from 'react-i18next';


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

const formatOtp = (code) => {
  if (code && code.length === 6) {
    return `${code.slice(0, 3)} ${code.slice(3)}`;
  }
  return code;
};

const OtpCard = memo(function OtpCard({ item, itemSubtitle, onCopy, onOpenMenu }) {
  const [otp, setOtp] = useState('------');
  const [isExpired, setIsExpired] = useState(false);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const expiresRef = useRef(0);
  const animationRef = useRef(null);

  useEffect(() => {
    let timeoutId;
    let mounted = true;

    const tick = () => {
      try {
        const { otp: code, expires } = TOTP.generate(item.key);
        if (!mounted) return;
        setOtp(code);


        if (expires !== expiresRef.current) {
          expiresRef.current = expires;
          const timeLeft = Math.max(0, expires - Date.now());
          const startValue = Math.min(1, timeLeft / 30000);

          if (animationRef.current) {
            animationRef.current.stop();
          }

          progressAnim.setValue(startValue);
          setIsExpired(false);

          animationRef.current = Animated.timing(progressAnim, {
            toValue: 0,
            duration: timeLeft,
            easing: Easing.linear,
            useNativeDriver: false,
          });
          animationRef.current.start();
        }

        const remaining = expires - Date.now();
        setIsExpired(remaining < 5000);
      } catch (err) {
      }

      timeoutId = setTimeout(tick, 1000);
    };

    tick();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [item.key]);

  const serviceStyle = getServiceStyle(item.name);

  return (
      <View style={styles.cardWrapper}>
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onCopy(otp, item.name)}
            onLongPress={(event) => onOpenMenu(event)}
            style={styles.card}
        >
          <View style={styles.cardContent}>
            <View style={[styles.iconContainer, { backgroundColor: serviceStyle.color + '15' }]}>
              <serviceStyle.icon color={serviceStyle.color} size={24} />
            </View>


            <View style={styles.detailsContainer}>
              <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.itemSubtitle} numberOfLines={1}>{itemSubtitle}</Text>
            </View>

            {/* Right: OTP Code */}
            <View style={styles.otpWrapper}>
              <Text style={[styles.otpText, isExpired && styles.otpTextExpired]}>
                {formatOtp(otp)}
              </Text>
            </View>

            {/* Dots action */}
            <IconButton
                icon={({ size, color }) => <EllipsisVertical size={size} color={color} />}
                iconColor="#94A3B8"
                size={20}
                onPress={(event) => onOpenMenu(event)}
                style={styles.moreButton}
            />
          </View>

          {/* Progress track at bottom — animée en continu, indépendamment des re-renders */}
          <View style={styles.progressTrack}>
            <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                    backgroundColor: isExpired ? '#EF4444' : '#6366F1',
                  },
                ]}
            />
          </View>
        </TouchableOpacity>
      </View>
  );
});

export default function Home() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [data, setData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Menu states
  const [visibleMenu, setVisibleMenu] = useState({});
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [selectedIndex, setSelectedIndex] = useState(null);

  const fetchData = async () => {
    try {
      const fileUri = FileSystem.documentDirectory + 'LibreOtpData.json';
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        setData([]);
        return;
      }
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const jsonData = JSON.parse(fileContent);
      setData(jsonData);
    } catch (error) {
      console.log('Error reading data, setting empty list:', error.message);
      setData([]);
    }
  };

  useFocusEffect(
      React.useCallback(() => {
        fetchData();
      }, [])
  );

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const openMenu = (index, event) => {
    const { pageX, pageY } = event.nativeEvent;
    setMenuPosition({ x: pageX, y: pageY });
    setSelectedIndex(index);
    setVisibleMenu((prevState) => ({
      ...prevState,
      [index]: true,
    }));
  };

  const closeMenu = (index) => {
    setVisibleMenu((prevState) => ({
      ...prevState,
      [index]: false,
    }));
  };

  const deleteItem = async () => {
    try {
      const newData = [...data];
      newData.splice(selectedIndex, 1);
      setData(newData);
      const fileUri = FileSystem.documentDirectory + 'LibreOtpData.json';
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(newData));
      closeMenu(selectedIndex);
      Toast.show({
        type: ALERT_TYPE.SUCCESS,
        title: t('home.deletedTitle'),
        textBody: t('home.deletedBody'),
      });
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const copyToClipboard = async (otp, name) => {
    await Clipboard.setStringAsync(otp);
    Toast.show({
      type: ALERT_TYPE.SUCCESS,
      title: t('common.copied'),
      textBody: t('home.copiedBody', { name }),
    });
  };

  const filteredData = data.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
      <PaperProvider>
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <Text style={styles.headerTitle}>{t('home.title')}</Text>
            <Text style={styles.headerSubtitle}>{t('home.subtitle')}</Text>
          </View>

          {data.length > 0 && (
              <Searchbar
                  placeholder={t('home.searchPlaceholder')}
                  onChangeText={setSearchQuery}
                  value={searchQuery}
                  style={styles.searchBar}
                  placeholderTextColor="#94A3B8"
                  iconColor="#6366F1"
                  icon={({ size, color }) => <Search size={size} color={color} />}
                  inputStyle={{ color: '#FFFFFF', minHeight: 0 }}
                  theme={{ colors: { primary: '#6366F1' } }}
              />
          )}

          <ScrollView
              style={styles.scrollContainer}
              contentContainerStyle={[styles.scrollContent, data.length === 0 && { flex: 1, justifyContent: 'center' }]}
              refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor="#6366F1"
                    colors={['#6366F1']}
                />
              }
          >
            {data.length === 0 ? (
                <View style={styles.NodataContainer}>
                  <Image source={require('../assets/NonOtpYet.png')} style={styles.NodataImage} resizeMode="contain" />
                  <Text style={styles.NodataText}>{t('home.emptyTitle')}</Text>
                  <Text style={styles.NodataSubtext}>{t('home.emptySubtitle')}</Text>
                  <Button
                      mode="contained"
                      onPress={() => navigation.navigate('Add')}
                      style={styles.NodataButton}
                      labelStyle={styles.NodataButtonLabel}
                      icon={() => <Plus size={20} color="#FFFFFF" />}
                  >
                    {t('home.addButton')}
                  </Button>
                </View>
            ) : (
                filteredData.map((item, index) => (
                    <View key={item.key + item.name + index}>
                      <OtpCard
                          item={item}
                          itemSubtitle={t('home.itemSubtitle')}
                          onCopy={copyToClipboard}
                          onOpenMenu={(event) => openMenu(index, event)}
                      />

                      <Menu
                          visible={visibleMenu[index] === true}
                          onDismiss={() => closeMenu(index)}
                          anchor={{ x: menuPosition.x, y: menuPosition.y }}
                          contentStyle={styles.menuContent}
                      >
                        <Menu.Item
                            onPress={() => {
                              closeMenu(index);
                              navigation.navigate('SingleOtp', {
                                key: `${item.key}`,
                                name: `${item.name}`,
                                index: `${index}`,
                              });
                            }}
                            title={t('home.menuView')}
                            titleStyle={styles.menuItemText}
                            leadingIcon={() => <Maximize2 size={20} color="#6366F1" />}
                        />
                        <Divider style={styles.menuDivider} />
                        <Menu.Item
                            onPress={deleteItem}
                            title={t('home.menuDelete')}
                            titleStyle={[styles.menuItemText, { color: '#EF4444' }]}
                            leadingIcon={() => <Trash2 size={20} color="#EF4444" />}
                        />
                        <Divider style={styles.menuDivider} />
                        <Menu.Item
                            onPress={() => closeMenu(index)}
                            title={t('home.menuCancel')}
                            titleStyle={styles.menuItemText}
                            leadingIcon={() => <X size={20} color="#94A3B8" />}
                        />
                      </Menu>
                    </View>
                ))
            )}
          </ScrollView>
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
  headerContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 2,
  },
  searchBar: {
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    elevation: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 100, // Leave space for floating bottom tab
  },
  cardWrapper: {
    marginBottom: 14,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContainer: {
    flex: 1,
    marginLeft: 14,
  },
  itemName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  otpWrapper: {
    marginRight: 4,
  },
  otpText: {
    color: '#6366F1',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  otpTextExpired: {
    color: '#EF4444',
  },
  moreButton: {
    margin: 0,
    padding: 0,
  },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    width: '100%',
  },
  progressBar: {
    height: '100%',
  },
  // Menu styles
  menuContent: {
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
  // No Data styles
  NodataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  NodataImage: {
    width: 280,
    height: 220,
    marginBottom: 20,
  },
  NodataText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  NodataSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 30,
    lineHeight: 20,
  },
  NodataButton: {
    marginTop: 25,
    borderRadius: 14,
    backgroundColor: '#6366F1',
    paddingVertical: 4,
    paddingHorizontal: 12,
    shadowColor: '#6366F1',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 5,
  },
  NodataButtonLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});