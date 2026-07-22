import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from '../locales/en.json';
import fr from '../locales/fr.json';
import { loadStoredLanguage, setStoredLanguage, clearStoredLanguage } from './language';


export const SUPPORTED_LANGUAGES = [
    { code: 'fr', label: 'Français' },
    { code: 'en', label: 'English' },
];

const resources = {
    en: { translation: en },
    fr: { translation: fr },
};

const getDeviceLanguage = () => {
    try {
        const deviceLocales = Localization.getLocales();
        const deviceCode = deviceLocales?.[0]?.languageCode;
        const isSupported = SUPPORTED_LANGUAGES.some((l) => l.code === deviceCode);
        return isSupported ? deviceCode : 'en';
    } catch (error) {
        return 'en';
    }
};


export const initI18n = async () => {
    const storedLanguage = await loadStoredLanguage();
    const initialLanguage = storedLanguage || getDeviceLanguage();

    if (!i18n.isInitialized) {
        await i18n.use(initReactI18next).init({
            resources,
            lng: initialLanguage,
            fallbackLng: 'en',
            compatibilityJSON: 'v3',
            interpolation: { escapeValue: false },
        });
    }

    return i18n;
};


export const changeLanguage = async (languageCode) => {
    await i18n.changeLanguage(languageCode);
    await setStoredLanguage(languageCode);
};

export const useSystemLanguage = async () => {
    await clearStoredLanguage();
    await i18n.changeLanguage(getDeviceLanguage());
};

export default i18n;