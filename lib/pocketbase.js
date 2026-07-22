import PocketBase, { AsyncAuthStore } from 'pocketbase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// URL par défaut si l'utilisateur n'a configuré aucun serveur perso dans
// Réglages > Sécurité & Données > Auto-hébergement.
export const DEFAULT_POCKETBASE_URL = 'https://db.hergol.me';

const CUSTOM_URL_STORAGE_KEY = 'pb_custom_base_url';

const authStore = new AsyncAuthStore({
    save: async (serialized) => AsyncStorage.setItem('pb_auth', serialized),
    initial: AsyncStorage.getItem('pb_auth'),
    clear: async () => AsyncStorage.removeItem('pb_auth'),
});

export const pb = new PocketBase(DEFAULT_POCKETBASE_URL, authStore);

pb.autoCancellation(false);


export const loadStoredPocketbaseUrl = async () => {
    try {
        const stored = await AsyncStorage.getItem(CUSTOM_URL_STORAGE_KEY);
        if (stored) {
            pb.baseURL = stored;
            return stored;
        }
    } catch (e) {
        console.log('Erreur lecture URL PocketBase stockée:', e);
    }
    return DEFAULT_POCKETBASE_URL;
};


export const setPocketbaseUrl = async (url) => {
    const trimmed = url.trim().replace(/\/+$/, '');
    pb.baseURL = trimmed;
    await AsyncStorage.setItem(CUSTOM_URL_STORAGE_KEY, trimmed);
    return trimmed;
};


export const checkPocketbaseHealth = async () => {
    try {
        await pb.health.check();
        return true;
    } catch (e) {
        return false;
    }
};