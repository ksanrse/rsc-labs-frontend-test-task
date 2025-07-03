import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useChannelStore } from './ChannelStore';
import { useSettingsStore } from './SettingsStore';
import { useLogStore } from './LogStore';

function resetChannels() {
  useChannelStore.setState({
    channels: [
      { id: '1', name: 'main', status: 'connected', latency: 20 },
      { id: '2', name: 'reserve-1', status: 'idle', latency: 100 },
      { id: '3', name: 'reserve-2', status: 'idle', latency: 200 },
      { id: '4', name: 'other-1', status: 'idle', latency: 150 },
      { id: '5', name: 'other-2', status: 'idle', latency: 300 },
      { id: '6', name: 'failover', status: 'unavailable', latency: 999 },
    ],
  });
}

type EventBusEvent = { type: string; id?: string } & Record<string, unknown>;

const events: EventBusEvent[] = [];
vi.mock('@/events', () => ({
  eventBus: {
    emit: (type: string, payload: Record<string, unknown>) =>
      events.push({ type, ...payload }),
  },
}));

describe('ChannelStore', () => {
  beforeEach(() => {
    resetChannels();
    vi.restoreAllMocks();
    events.length = 0;
    useSettingsStore.getState().setNotificationsEnabled(true);
    useLogStore.getState().clearLogs();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    const logs = useLogStore.getState().logs;
    if (logs.length > 0) {
      console.log('--- Logs for test ---');
      logs.forEach((log) => console.log(`[${log.type}] ${log.text}`));
      console.log('---------------------');
    }
  });

  it('устанавливает latency и статус', () => {
    useChannelStore.getState().setLatency('2', 55);
    expect(
      useChannelStore.getState().channels.find((c) => c.id === '2')?.latency
    ).toBe(55);

    useChannelStore.getState().setStatus('2', 'unavailable');
    expect(
      useChannelStore.getState().channels.find((c) => c.id === '2')?.status
    ).toBe('unavailable');
  });

  it('переключается на резерв при отказе основного', () => {
    useChannelStore.getState().setStatus('1', 'unavailable');
    useChannelStore.getState().setStatus('2', 'connected');
    const connected = useChannelStore
      .getState()
      .channels.find((c) => c.status === 'connected');
    expect(connected?.id).toBe('2');
  });

  it('возвращается на основной канал если он восстановился и быстрее', async () => {
    useChannelStore.getState().setStatus('1', 'unavailable');
    useChannelStore.getState().setStatus('2', 'connected');
    global.fetch = vi.fn(async (url: string | URL) => {
      const path = url.toString();
      let delay = 100;
      if (path.endsWith('/1')) delay = 10;
      if (path.endsWith('/2')) delay = 50;
      await new Promise((r) => setTimeout(r, delay));
      return { ok: true } as Response;
    }) as unknown as typeof fetch;
    await useChannelStore.getState().pingAll();

    const connected = useChannelStore
      .getState()
      .channels.find((c) => c.status === 'connected');
    expect(connected?.id).toBe('1');
    expect(
      events.some((e) => e.type === 'CHANNEL_SWITCHED' && e.id === '1')
    ).toBe(true);
  });

  it('не возвращается на основной канал если он медленнее', async () => {
    useChannelStore.getState().setStatus('1', 'unavailable');
    useChannelStore.getState().setStatus('2', 'connected');
    global.fetch = vi.fn(async (url: string | URL) => {
      const path = url.toString();
      let delay = 100;
      if (path.endsWith('/1')) delay = 200;
      if (path.endsWith('/2')) delay = 10;
      await new Promise((r) => setTimeout(r, delay));
      return { ok: true } as Response;
    }) as unknown as typeof fetch;
    await useChannelStore.getState().pingAll();

    const connected = useChannelStore
      .getState()
      .channels.find((c) => c.status === 'connected');
    expect(connected?.id).toBe('2');
    expect(
      events.some((e) => e.type === 'CHANNEL_SWITCHED' && e.id === '1')
    ).toBe(false);
  });

  it('при равной задержке выбирает канал с меньшим id', async () => {
    useChannelStore.getState().setStatus('1', 'idle');
    useChannelStore.getState().setStatus('2', 'idle');
    global.fetch = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return { ok: true } as Response;
    }) as unknown as typeof fetch;
    await useChannelStore.getState().pingAll();

    const connected = useChannelStore
      .getState()
      .channels.find((c) => c.status === 'connected');
    expect(connected?.id).toBe('1');
  });

  it('никогда не делает больше одного connected', async () => {
    global.fetch = vi.fn(async () => ({ ok: true })) as unknown as typeof fetch;
    await useChannelStore.getState().pingAll();
    const connectedChannels = useChannelStore
      .getState()
      .channels.filter((c) => c.status === 'connected');
    expect(connectedChannels.length).toBe(1);
  });

  it('корректно отрабатывает CHANNEL_ALL_UNAVAILABLE', async () => {
    global.fetch = vi.fn(async () => ({
      ok: false,
    })) as unknown as typeof fetch;
    await useChannelStore.getState().pingAll();
    expect(events.some((e) => e.type === 'CHANNEL_ALL_UNAVAILABLE')).toBe(true);

    const allUnavailable = useChannelStore
      .getState()
      .channels.every((c) => c.status === 'unavailable');
    expect(allUnavailable).toBe(true);
  });

  it('race-condition: результат более раннего pingAll не ломает стейт', async () => {
    let resolveSlow: () => void;
    const slow = new Promise<void>((resolve) => {
      resolveSlow = resolve;
    });
    let fastResolved = false;
    global.fetch = vi.fn(async (url: string | URL) => {
      if (url.toString().endsWith('/1')) {
        await slow;
        return { ok: true } as Response;
      }
      return { ok: true } as Response;
    }) as unknown as typeof fetch;

    const p1 = useChannelStore.getState().pingAll();

    global.fetch = vi.fn(async () => ({ ok: true })) as unknown as typeof fetch;
    await useChannelStore
      .getState()
      .pingAll()
      .then(() => {
        fastResolved = true;
      });

    resolveSlow!();
    await p1;

    expect(fastResolved).toBe(true);
    const connected = useChannelStore
      .getState()
      .channels.filter((c) => c.status === 'connected');
    expect(connected.length).toBe(1);
  });

  it('getActiveChannelId возвращает id активного', () => {
    useChannelStore.getState().setStatus('2', 'connected');
    const activeId = useChannelStore.getState().getActiveChannelId();
    expect(activeId).toBe('2');
  });

  it('getActiveChannelId возвращает null если никто не connected', () => {
    useChannelStore.setState((state) => ({
      channels: state.channels.map((c) => ({
        ...c,
        status: c.status === 'connected' ? 'idle' : c.status,
      })),
    }));
    const activeId = useChannelStore.getState().getActiveChannelId();
    expect(activeId).toBeNull();
  });

  it('не переключается немедленно если включён delaySwitch и делает switch после setDelaySwitch(false)', async () => {
    useChannelStore.getState().setDelaySwitch(true);

    expect(
      useChannelStore.getState().channels.find((c) => c.id === '1')?.status
    ).toBe('connected');
    expect(useChannelStore.getState().delaySwitch).toBe(true);
    expect(useChannelStore.getState().pendingSwitch).toBe(false);

    global.fetch = vi.fn(async (url: string | URL) => {
      const path = url.toString();
      if (path.endsWith('/1')) {
        return { ok: false } as Response;
      }
      return { ok: true } as Response;
    }) as unknown as typeof fetch;

    useChannelStore.getState().setStatus('1', 'unavailable');

    expect(useChannelStore.getState().pendingSwitch).toBe(true);
    expect(
      useChannelStore.getState().channels.find((c) => c.status === 'connected')
    ).toBeUndefined();

    await useChannelStore.getState().setDelaySwitch(false);

    const connected = useChannelStore
      .getState()
      .channels.find((c) => c.status === 'connected');
    expect(connected?.id).toBe('2');

    expect(useChannelStore.getState().pendingSwitch).toBe(false);
  });
});
