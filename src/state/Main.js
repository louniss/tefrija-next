import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';

const initialState = {
  continueWatching: [],
};

const useMainState = create(
  persist(
    (set, get) => {
      return {
        ...initialState,

        addToContinueWatching(item) {
          const state = get();
          const continueWatching = state.continueWatching;

          const itemId = continueWatching.findIndex(({id}) => id === item.id);

          if (itemId !== -1) {
            let splicedItem = continueWatching.splice(itemId, 1);

            splicedItem[0].season = item.season;
            splicedItem[0].episode = item.episode;

            continueWatching.unshift({
              ...splicedItem[0],
            });

            set({
              continueWatching,
            });
          } else {
            set({
              continueWatching: [item, ...continueWatching],
            });
          }
        },

        updateTime(id, time) {
          const state = get();
          const continueWatching = state.continueWatching;

          const itemId = continueWatching.findIndex(
            ({id: itemId}) => itemId === id,
          );

          if (itemId !== -1) {
            const item = continueWatching[itemId];

            if (item.type === 'tv') {
              if (!item.time) {
                item.time = [];
              }

              if (!item.time[item.season]) {
                item.time[item.season] = [];
              }

              item.time[item.season][item.episode] = time;
            } else {
              item.time = time;
            }
          }

          set({
            continueWatching,
          });
        },

        getById(id) {
          const state = get();
          const continueWatching = state.continueWatching;

          const itemId = continueWatching.findIndex(
            ({id: itemId}) => itemId === id,
          );

          if (itemId !== -1) {
            return continueWatching[itemId];
          }

          return null;
        },

        async clearState() {
          await AsyncStorage.clear();
          set(initialState);
          set({appLoading: false});
        },

        async init() {
          const state = JSON.parse(await AsyncStorage.getItem('mainState'));

          set({
            ...state?.state,
          });

          return state?.state;
        },
      };
    },

    {
      name: 'mainState',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export default useMainState;
