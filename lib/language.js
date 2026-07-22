import * as FileSystem from 'expo-file-system/legacy';

const SETTINGS_FILE = FileSystem.documentDirectory + 'LibreOtpLanguage.json';


export const loadStoredLanguage = async () => {
    try {
        const fileInfo = await FileSystem.getInfoAsync(SETTINGS_FILE);
        if (!fileInfo.exists) return null;
        const content = await FileSystem.readAsStringAsync(SETTINGS_FILE);
        const parsed = JSON.parse(content);
        return parsed.language || null;
    } catch (error) {
        console.log('Error loading stored language:', error);
        return null;
    }
};


export const setStoredLanguage = async (languageCode) => {
    try {
        await FileSystem.writeAsStringAsync(SETTINGS_FILE, JSON.stringify({ language: languageCode }));
    } catch (error) {
        console.log('Error saving stored language:', error);
    }
};


export const clearStoredLanguage = async () => {
    try {
        const fileInfo = await FileSystem.getInfoAsync(SETTINGS_FILE);
        if (fileInfo.exists) {
            await FileSystem.deleteAsync(SETTINGS_FILE);
        }
    } catch (error) {
        console.log('Error clearing stored language:', error);
    }
};