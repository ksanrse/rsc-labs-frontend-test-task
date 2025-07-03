import { create } from 'zustand';

interface SettingsState {
  pingInterval: number;
  setPingInterval: (interval: number) => void;

  messageInterval: number;
  setMessageInterval: (interval: number) => void;

  bufferSize: number;
  setBufferSize: (n: number) => void;

  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
}

const PING_INTERVAL_KEY = 'pingInterval';
const DEFAULT_PING_INTERVAL = 3000;

const MSG_INTERVAL_KEY = 'messageInterval';
const DEFAULT_MSG_INTERVAL = 4000;

const BUFFER_SIZE_KEY = 'bufferSize';
const DEFAULT_BUFFER_SIZE = 10;

const NOTIFY_KEY = 'notificationsEnabled';
const DEFAULT_NOTIFY = true;

export const useSettingsStore = create<SettingsState>((set) => ({
  pingInterval:
    Number(localStorage.getItem(PING_INTERVAL_KEY)) || DEFAULT_PING_INTERVAL,
  setPingInterval: (interval: number) => {
    localStorage.setItem(PING_INTERVAL_KEY, String(interval));
    set({ pingInterval: interval });
  },

  messageInterval:
    Number(localStorage.getItem(MSG_INTERVAL_KEY)) || DEFAULT_MSG_INTERVAL,
  setMessageInterval: (interval: number) => {
    localStorage.setItem(MSG_INTERVAL_KEY, String(interval));
    set({ messageInterval: interval });
  },

  bufferSize:
    Number(localStorage.getItem(BUFFER_SIZE_KEY)) || DEFAULT_BUFFER_SIZE,
  setBufferSize: (n: number) => {
    localStorage.setItem(BUFFER_SIZE_KEY, String(n));
    set({ bufferSize: n });
  },

  notificationsEnabled:
    localStorage.getItem(NOTIFY_KEY) === null
      ? DEFAULT_NOTIFY
      : localStorage.getItem(NOTIFY_KEY) === 'true',
  setNotificationsEnabled: (enabled: boolean) => {
    localStorage.setItem(NOTIFY_KEY, String(enabled));
    set({ notificationsEnabled: enabled });
  },
}));
