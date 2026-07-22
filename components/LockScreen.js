import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScanFace, Delete } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
    verifyPin,
    isBiometricEnabled,
    isBiometricAvailable,
    authenticateWithBiometrics,
} from '../lib/appLock';

const PIN_LENGTH = 4;

export default function LockScreen({ onUnlock }) {
    const insets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions();
    const isCompact = height < 700;
    const isTablet = width >= 600;

    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [biometricReady, setBiometricReady] = useState(false);
    const [now, setNow] = useState(new Date());
    const hasTriedBiometricsOnMount = useRef(false);

    // Transition douce à la sortie, comme un vrai écran plutôt qu'un popup
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    // Pulsation douce de l'icône Face ID, façon écran de verrouillage iOS
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000 * 15);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
            ])
        ).start();
    }, [pulseAnim]);

    const dismiss = useCallback(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1.05, duration: 220, useNativeDriver: true }),
        ]).start(() => onUnlock());
    }, [fadeAnim, scaleAnim, onUnlock]);

    const tryBiometrics = useCallback(async () => {
        const [available, enabled] = await Promise.all([isBiometricAvailable(), isBiometricEnabled()]);
        setBiometricReady(available && enabled);
        if (available && enabled) {
            const success = await authenticateWithBiometrics();
            if (success) dismiss();
        }
    }, [dismiss]);

    useEffect(() => {
        if (!hasTriedBiometricsOnMount.current) {
            hasTriedBiometricsOnMount.current = true;
            tryBiometrics();
        }
    }, [tryBiometrics]);

    const handleDigitPress = async (digit) => {
        if (pin.length >= PIN_LENGTH) return;
        const newPin = pin + digit;
        setPin(newPin);
        setError('');

        if (newPin.length === PIN_LENGTH) {
            const valid = await verifyPin(newPin);
            if (valid) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                dismiss();
            } else {
                setError('Code incorrect');
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                setTimeout(() => setPin(''), 400);
            }
        }
    };

    const handleBackspace = () => {
        setPin((prev) => prev.slice(0, -1));
        setError('');
    };

    const timeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dateLabel = now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' });

    const keySize = isTablet ? 84 : isCompact ? 64 : 72;
    const keyGap = isCompact ? 6 : 8;
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    width,
                    height,
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                },
            ]}
        >
            <View style={styles.glowTop} pointerEvents="none" />

            <View style={[styles.content, { paddingTop: insets.top + (isCompact ? 20 : 50), paddingBottom: insets.bottom + 20 }]}>
                {/* Horloge, façon écran de verrouillage iOS */}
                <View style={styles.clockBlock}>
                    <Text style={[styles.timeText, { fontSize: isTablet ? 96 : isCompact ? 56 : 72 }]}>{timeLabel}</Text>
                    <Text style={styles.dateText}>{dateLabel}</Text>
                </View>

                {/* Face ID */}
                <View style={styles.faceIdBlock}>
                    <TouchableOpacity onPress={tryBiometrics} activeOpacity={0.7} disabled={!biometricReady}>
                        <Animated.View
                            style={[
                                styles.faceIdCircle,
                                { transform: [{ scale: biometricReady ? pulseAnim : 1 }], opacity: biometricReady ? 1 : 0.3 },
                            ]}
                        >
                            <ScanFace size={34} color="#FFFFFF" />
                        </Animated.View>
                    </TouchableOpacity>
                    <Text style={styles.faceIdLabel}>
                        {biometricReady ? 'Regardez votre appareil pour déverrouiller' : 'LibreOTP verrouillé'}
                    </Text>
                </View>

                {/* Code PIN */}
                <View style={styles.pinBlock}>
                    <View style={styles.dotsRow}>
                        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                            <View key={i} style={[styles.dot, pin.length > i && styles.dotFilled]} />
                        ))}
                    </View>

                    <View style={styles.errorSlot}>
                        {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    </View>

                    <View style={[styles.keypad, { width: keySize * 3 + keyGap * 6 }]}>
                        {keys.map((digit) => (
                            <TouchableOpacity
                                key={digit}
                                style={[styles.key, { width: keySize, height: keySize, borderRadius: keySize / 2, margin: keyGap }]}
                                onPress={() => handleDigitPress(digit)}
                                activeOpacity={0.6}
                            >
                                <Text style={[styles.keyText, { fontSize: keySize * 0.36 }]}>{digit}</Text>
                            </TouchableOpacity>
                        ))}

                        <View style={{ width: keySize, height: keySize, margin: keyGap }} />

                        <TouchableOpacity
                            style={[styles.key, { width: keySize, height: keySize, borderRadius: keySize / 2, margin: keyGap }]}
                            onPress={() => handleDigitPress('0')}
                            activeOpacity={0.6}
                        >
                            <Text style={[styles.keyText, { fontSize: keySize * 0.36 }]}>0</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.key, { width: keySize, height: keySize, borderRadius: keySize / 2, margin: keyGap }]}
                            onPress={handleBackspace}
                            activeOpacity={0.6}
                        >
                            <Delete size={keySize * 0.32} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        backgroundColor: '#0F172A',
        zIndex: 999,
        elevation: 999,
        overflow: 'hidden',
    },
    glowTop: {
        position: 'absolute',
        top: -150,
        left: -100,
        right: -100,
        height: 400,
        borderRadius: 300,
        backgroundColor: 'rgba(99, 102, 241, 0.18)',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
    },
    clockBlock: {
        alignItems: 'center',
    },
    timeText: {
        color: '#FFFFFF',
        fontWeight: '600',
        letterSpacing: 1,
    },
    dateText: {
        color: 'rgba(255, 255, 255, 0.75)',
        fontSize: 16,
        fontWeight: '500',
        marginTop: 4,
        textTransform: 'capitalize',
    },
    faceIdBlock: {
        alignItems: 'center',
    },
    faceIdCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    faceIdLabel: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 13,
        marginTop: 14,
        textAlign: 'center',
    },
    pinBlock: {
        alignItems: 'center',
        width: '100%',
    },
    dotsRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 8,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.7)',
        backgroundColor: 'transparent',
    },
    dotFilled: {
        backgroundColor: '#FFFFFF',
        borderColor: '#FFFFFF',
    },
    errorSlot: {
        height: 22,
        marginBottom: 4,
        justifyContent: 'center',
    },
    errorText: {
        color: '#F87171',
        fontSize: 13,
        fontWeight: '600',
    },
    keypad: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: 16,
    },
    key: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    keyText: {
        color: '#FFFFFF',
        fontWeight: '500',
    },
});