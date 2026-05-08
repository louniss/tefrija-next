import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import strings from './strings';

const initialState = {
  firstTime: true,
  selectedLanguage: 'en',
  translations: strings,
};

// useLocalize for short
const uL = create(
  persist(
    (set, get) => ({
      ...initialState,

      setLanguage(lang) {
        set({selectedLanguage: lang, firstTime: false});
      },

      t(key) {
        const state = get();
        const {selectedLanguage, translations} = state;
        return translations[selectedLanguage][key] || key;
      },

      async init() {
        const state = JSON.parse(await AsyncStorage.getItem('localizeState'));

        set({
          ...state?.state,
        });

        return state?.state;
      },
    }),

    {
      name: 'localizeState',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export default uL;
