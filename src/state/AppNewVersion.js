import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';

const CURRENT_VERSION = '0.1.8';

const useAppNewVersion = create((set, get) => ({
  updateAvailable: false,
  updateUrl: '',
  versionDescription: '',
  loading: true,
  async checkForUpdates() {
    set({loading: true});
    const updateUrl = 'https://white-tooth-c8bc.abcwork.workers.dev/';

    const response = await fetch(updateUrl, {cache: 'no-store'});
    if (response.ok) {
      const data = await response.json();
      if (data.version !== CURRENT_VERSION) {
        set({
          updateAvailable: true,
          updateUrl: data.url,
          versionDescription: data.description,
        });

        return data;
      }
    }
    set({loading: false});

    return false;
  },
}));

export default useAppNewVersion;
