import { create } from 'zustand';
import { useSettingsStore } from './SettingsStore';

export interface LogEntry {
  id: number;
  ts: number;
  text: string;
  type?: 'info' | 'warn' | 'error';
}

interface LogState {
  logs: LogEntry[];
  addLog: (text: string, type?: LogEntry['type']) => void;
  clearLogs: () => void;
}

export const useLogStore = create<LogState>((set) => ({
  logs: [],
  addLog: (text, type = 'info') => {
    const enabled = useSettingsStore.getState().notificationsEnabled;
    if (!enabled) return;

    const ts = Date.now();
    const id = ts + Math.floor(Math.random() * 100000);
    set((state) => ({
      logs: [
        ...state.logs.slice(-9), 
        { id, ts, text, type },
      ],
    }));
  },
  clearLogs: () => set({ logs: [] }),
}));
