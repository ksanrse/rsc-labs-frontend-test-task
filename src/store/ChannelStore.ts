import { create } from 'zustand';
import { useLogStore } from '@/store/LogStore';
import { eventBus } from '@/events';

export type ChannelStatus = 'connected' | 'unavailable' | 'idle';

export interface Channel {
  id: string;
  name: string;
  status: ChannelStatus;
  latency: number;
}

interface ChannelState {
  channels: Channel[];
  setStatus: (id: string, status: ChannelStatus) => void;
  setLatency: (id: string, latency: number) => void;
  pingAll: () => Promise<void>;
  getActiveChannelId: () => string | null;
  delaySwitch: boolean;
  setDelaySwitch: (delay: boolean) => void;
  pendingSwitch: boolean;
  recentlyFailedId?: string | null;
}

type PingResult = {
  id: string;
  name: string;
  status: ChannelStatus;
  latency: number;
};

let pingVersion = 0;

export const useChannelStore = create<ChannelState>((set, get) => ({
  channels: [
    { id: '1', name: 'main', status: 'connected', latency: 20 },
    { id: '2', name: 'reserve-1', status: 'idle', latency: 100 },
    { id: '3', name: 'reserve-2', status: 'idle', latency: 200 },
    { id: '4', name: 'other-1', status: 'idle', latency: 150 },
    { id: '5', name: 'other-2', status: 'idle', latency: 300 },
    { id: '6', name: 'failover', status: 'unavailable', latency: 999 },
  ],

  delaySwitch: false,
  pendingSwitch: false,
  recentlyFailedId: null,

  setDelaySwitch: async (delay: boolean) => {
    set({ delaySwitch: delay });
    useLogStore.getState().addLog(`setDelaySwitch: delay=${delay}, pendingSwitch=${get().pendingSwitch}`, 'info');
    if (!delay && get().pendingSwitch) {
      set({ pendingSwitch: false });
      useLogStore.getState().addLog(`setDelaySwitch: calling pingAll due to pendingSwitch`, 'info');
      await get().pingAll();
    }
  },

  setStatus: (id, status) => {
    useLogStore.getState().addLog(`setStatus: id=${id}, status=${status}, delaySwitch=${get().delaySwitch}, pendingSwitch=${get().pendingSwitch}`, 'info');
    const prevConnected = get().channels.find((c) => c.status === 'connected');
    if (prevConnected && prevConnected.id === id && status === 'unavailable') {
      useLogStore.getState().addLog(`setStatus: Active channel ${id} becoming unavailable. delaySwitch=${get().delaySwitch}`, 'info');
      if (get().delaySwitch) {
        set((state) => ({
          channels: state.channels.map((c) =>
            c.id === id
              ? { ...c, status: 'unavailable' as ChannelStatus }
              : c.status === 'connected'
                ? { ...c, status: 'idle' as ChannelStatus }
                : c
          ),
          pendingSwitch: true,
        }));
        eventBus.emit('CHANNEL_STATUS_CHANGED', {
          type: 'CHANNEL_STATUS_CHANGED',
          id,
          status: 'unavailable',
        });
        useLogStore.getState().addLog(`setStatus: delaySwitch is ON, pendingSwitch set to true. No immediate switch.`, 'info');
        return;
      }
    }

    set((state) => {
      let channels = state.channels;
      if (status === 'connected') {
        channels = channels.map((c) =>
          c.id === id
            ? { ...c, status }
            : c.status === 'connected'
              ? { ...c, status: 'idle' }
              : c
        );
      } else {
        channels = channels.map((c) => (c.id === id ? { ...c, status } : c));
      }
      const prev = state.channels.find((c) => c.id === id);
      if (prev && prev.status === 'unavailable' && status !== 'unavailable') {
        useLogStore
          .getState()
          .addLog(
            `Канал ${prev.name} (${prev.id}) восстановлен и снова доступен`,
            'info'
          );
      }
      return { channels };
    });

    eventBus.emit('CHANNEL_STATUS_CHANGED', {
      type: 'CHANNEL_STATUS_CHANGED',
      id,
      status,
    });
    if (status !== 'unavailable') {
      eventBus.emit('CHANNEL_BECAME_AVAILABLE', {
        type: 'CHANNEL_BECAME_AVAILABLE',
        id,
      });
    }

    const allUnavailable = get().channels.every((c) =>
      c.id === id ? status === 'unavailable' : c.status === 'unavailable'
    );
    if (allUnavailable) {
      eventBus.emit('CHANNEL_ALL_UNAVAILABLE', {
        type: 'CHANNEL_ALL_UNAVAILABLE',
      });
    }

    const current = get().channels.find((c) => c.status === 'connected');
    if (
      current &&
      current.id === id &&
      status === 'unavailable' &&
      !get().delaySwitch
    ) {
      useLogStore.getState().addLog(`setStatus: delaySwitch is OFF, performing immediate pingAll.`, 'info');
      void get().pingAll();
    }
  },

  setLatency: (id, latency) => {
    set((state) => ({
      channels: state.channels.map((c) =>
        c.id === id ? { ...c, latency } : c
      ),
    }));
  },

  pingAll: async () => {
    pingVersion++;
    const myVersion = pingVersion;
    const { channels } = get();
    const addLog = useLogStore.getState().addLog;

    const pingResults: PingResult[] = await Promise.all(
      channels.map(async (chan) => {
        const t0 = performance.now();
        try {
          const resp = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/ping/${chan.id}`);
          if (!resp.ok) throw new Error();
          const latency = Math.round(performance.now() - t0);
          return {
            id: chan.id,
            name: chan.name,
            status: 'idle' as ChannelStatus,
            latency,
          };
        } catch {
          return {
            id: chan.id,
            name: chan.name,
            status: 'unavailable' as ChannelStatus,
            latency: 9999,
          };
        }
      })
    );

    if (myVersion !== pingVersion) return;

    set((state) => {
      let updatedChannels = state.channels.map((c) => {
        const res = pingResults.find((r) => r.id === c.id);
        return res ? { ...c, status: res.status, latency: res.latency } : c;
      });

      const alive = updatedChannels.filter((c) => c.status !== 'unavailable');

      if (alive.length > 0) {
        const fastest = alive.reduce((best, cur) => {
          if (cur.latency < best.latency) return cur;
          if (cur.latency === best.latency) {
            return cur.id < best.id ? cur : best;
          }
          return best;
        }, alive[0]);

        updatedChannels = updatedChannels.map((c) =>
          c.id === fastest.id
            ? { ...c, status: 'connected' as ChannelStatus }
            : c.status === 'unavailable'
              ? c
              : { ...c, status: 'idle' as ChannelStatus }
        );

        const was = state.channels.find((c) => c.status === 'connected');
        if (!was || was.id !== fastest.id) {
          addLog(
            `Активный канал выбран: ${fastest.name} (${fastest.id}) — ${fastest.latency}мс`,
            'info'
          );
          eventBus.emit('CHANNEL_SWITCHED', {
            type: 'CHANNEL_SWITCHED',
            id: fastest.id,
          });
        }
      } else {
        addLog('Нет ни одного доступного канала!', 'error');
        eventBus.emit('CHANNEL_ALL_UNAVAILABLE', {
          type: 'CHANNEL_ALL_UNAVAILABLE',
        });
      }

      return { channels: updatedChannels };
    });
  },

  getActiveChannelId: () => {
    const connected = get().channels.find((c) => c.status === 'connected');
    return connected?.id ?? null;
  },
}));
