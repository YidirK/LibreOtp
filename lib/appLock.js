import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';

// Toutes les données de verrouillage (code PIN inclus, sous forme de hash) sont
// stockées dans expo-secure-store (Keychain iOS / EncryptedSharedPreferences Android),
// jamais dans le JSON en clair utilisé pour les comptes TOTP.
const ENABLED_KEY = 'applock_enabled';
const PIN_HASH_KEY = 'applock_pin_hash';
const BIOMETRIC_KEY = 'applock_biometric_enabled';

export const isLockEnabled = async () => {
    const value = await SecureStore.getItemAsync(ENABLED_KEY);
    return value === 'true';
};

export const setLockEnabled = async (enabled) => {
    await SecureStore.setItemAsync(ENABLED_KEY, enabled ? 'true' : 'false');
};

export const hasPinSet = async () => {
    const hash = await SecureStore.getItemAsync(PIN_HASH_KEY);
    return !!hash;
};

const hashPin = (pin) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);

export const setPin = async (pin) => {
    const hash = await hashPin(pin);
    await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
};

export const verifyPin = async (pin) => {
    const stored = await SecureStore.getItemAsync(PIN_HASH_KEY);
    if (!stored) return false;
    const hash = await hashPin(pin);
    return hash === stored;
};

export const removePin = async () => {
    await SecureStore.deleteItemAsync(PIN_HASH_KEY);
};

// Biométrie (Face ID / Touch ID / empreinte)

export const isBiometricEnabled = async () => {
    const value = await SecureStore.getItemAsync(BIOMETRIC_KEY);
    return value !== 'false'; // activé par défaut si disponible
};

export const setBiometricEnabled = async (enabled) => {
    await SecureStore.setItemAsync(BIOMETRIC_KEY, enabled ? 'true' : 'false');
};

export const isBiometricAvailable = async () => {
    try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        if (!hasHardware) return false;
        return await LocalAuthentication.isEnrolledAsync();
    } catch (e) {
        return false;
    }
};

export const authenticateWithBiometrics = async () => {
    try {
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Déverrouillez LibreOTP',
            cancelLabel: 'Utiliser le code',
            // On gère nous-mêmes le repli (écran de code PIN maison), on désactive donc
            // le repli natif vers le code de déverrouillage du téléphone.
            disableDeviceFallback: true,
        });
        return result.success;
    } catch (e) {
        return false;
    }
};