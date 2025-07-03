type ChannelEventType =
  | 'CHANNEL_STATUS_CHANGED'
  | 'CHANNEL_BECAME_AVAILABLE'
  | 'CHANNEL_ALL_UNAVAILABLE'
  | 'CHANNEL_SWITCHED';

type ChannelEventPayload =
  | { type: 'CHANNEL_STATUS_CHANGED'; id: string; status: string }
  | { type: 'CHANNEL_BECAME_AVAILABLE'; id: string }
  | { type: 'CHANNEL_ALL_UNAVAILABLE' }
  | { type: 'CHANNEL_SWITCHED'; id: string };

type ChannelEventListener = (payload: ChannelEventPayload) => void;

class EventBus {
  private listeners: Record<ChannelEventType, ChannelEventListener[]> = {
    CHANNEL_STATUS_CHANGED: [],
    CHANNEL_BECAME_AVAILABLE: [],
    CHANNEL_ALL_UNAVAILABLE: [],
    CHANNEL_SWITCHED: [],
  };

  on<T extends ChannelEventType>(
    type: T,
    listener: (payload: Extract<ChannelEventPayload, { type: T }>) => void
  ) {
    this.listeners[type].push(listener as ChannelEventListener);
  }

  off<T extends ChannelEventType>(
    type: T,
    listener: (payload: Extract<ChannelEventPayload, { type: T }>) => void
  ) {
    this.listeners[type] = this.listeners[type].filter((l) => l !== listener);
  }

  emit<T extends ChannelEventType>(
    type: T,
    payload: Extract<ChannelEventPayload, { type: T }>
  ) {
    for (const listener of this.listeners[type]) {
      listener(payload);
    }
  }
}

export const eventBus = new EventBus();
