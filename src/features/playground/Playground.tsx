import './Playground.css';
import { useEffect, useRef, useState } from 'react';

import { ServerList } from '@/components/ServerList/ServerList';
import { LogViewer } from '@/components/LogViewer/LogViewer';
import { MessageCard } from '@/components/MessageCard/MessageCard';
import { useChannelStore } from '@/store/ChannelStore';
import { useSettingsStore } from '@/store/SettingsStore';
import SettingsButton from '@/components/SettingsButton/SettingsButton';
import { UnavailableOverlay } from '@/components/UnavailableOverlay/UnavailableOverlay';
import { SettingsPanel } from '@/components/SettingsPanel/SettingsPanel';
import { ModalStack } from '@/components/ModalStack/ModalStack';

interface SentMessage {
  id: string;
  message: string;
}

export default function Playground() {
  const pingAll = useChannelStore((s) => s.pingAll);
  const pingInterval = useSettingsStore((s) => s.pingInterval);
  const messageInterval = useSettingsStore((s) => s.messageInterval);
  const bufferSize = useSettingsStore((s) => s.bufferSize);

  const channels = useChannelStore((s) => s.channels);
  const allUnavailable =
    channels.length > 0 && channels.every((c) => c.status === 'unavailable');

  const [messages, setMessages] = useState<SentMessage[]>(() => {
    const stored = localStorage.getItem('messages');
    return stored
      ? (JSON.parse(stored) as SentMessage[]).filter(
          (m) => m && typeof m.id === 'string' && typeof m.message === 'string'
        )
      : [];
  });
  useEffect(() => {
    localStorage.setItem('messages', JSON.stringify(messages));
  }, [messages]);

  const [buffer, setBuffer] = useState<SentMessage[]>([]);
  const bufferRef = useRef(buffer);
  useEffect(() => {
    bufferRef.current = buffer;
  }, [buffer]);
  const fillingRef = useRef(false);

  useEffect(() => {
    pingAll();
    const t = setInterval(pingAll, pingInterval);
    return () => clearInterval(t);
  }, [pingAll, pingInterval]);

  useEffect(() => {
    let stopped = false;
    async function fillBuffer() {
      if (fillingRef.current) return;

      fillingRef.current = true;

      while (!stopped) {
        const channels = useChannelStore.getState().channels;
        const getActiveChannelId =
          useChannelStore.getState().getActiveChannelId;
        const activeId = getActiveChannelId();
        const active = channels.find((c) => c.id === activeId);

        if (!active || active.status === 'unavailable') {
          await new Promise((res) => setTimeout(res, 500));
          continue;
        }
        if (buffer.length >= bufferSize) {
          await new Promise((res) => setTimeout(res, 100));
          continue;
        }
        try {
          const latency = active.latency ?? 0;
          const resp = await fetch(
            `${import.meta.env.VITE_API_BASE_URL || ''}/api/mock-message`
          );
          if (resp.ok) {
            const contentType = resp.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              let data;
              try {
                data = await resp.json();
              } catch (jsonError) {
                console.error(
                  'Ошибка парсинга JSON при заполнении буфера:',
                  jsonError,
                  'Ответ:',
                  await resp.text()
                );
                return; 
              }

              if (
                data &&
                typeof data.id === 'string' &&
                typeof data.message === 'string'
              ) {
                const { id, message } = data;
                await new Promise((res) => setTimeout(res, latency));
                setBuffer((prev) =>
                  prev.length < bufferSize ? [...prev, { id, message }] : prev
                );
              } else {
                console.warn(
                  'Получены некорректные данные сообщения при заполнении буфера:',
                  data
                );
              }
            } else {
              console.warn(
                'Ответ не является JSON при заполнении буфера:',
                await resp.text()
              );
            }
          } else {
            console.error(
              'Ошибка при получении сообщения для буфера:',
              resp.status,
              resp.statusText
            );
          }
        } catch (error) {
          console.error('Ошибка при запросе сообщения для буфера:', error);
        }
      }
      fillingRef.current = false;
    }
    fillBuffer();
    return () => {
      stopped = true;
      fillingRef.current = false;
    };
  }, [buffer.length, bufferSize]);

  const isFetchingMessageRef = useRef(false);

  useEffect(() => {
    let stopped = false;
    const timer = setInterval(async () => {
      if (stopped || isFetchingMessageRef.current) return;

      const currentBuffer = bufferRef.current;
      if (currentBuffer.length > 0) {
        setBuffer((prev) => {
          const [first, ...rest] = prev;
          if (
            first &&
            typeof first.id === 'string' &&
            typeof first.message === 'string'
          ) {
            setMessages((msgs) => [first, ...msgs]);
          } else {
            console.warn('Некорректный элемент в буфере:', first);
          }
          return rest;
        });
      } else {
        const channels = useChannelStore.getState().channels;
        const getActiveChannelId =
          useChannelStore.getState().getActiveChannelId;
        const activeId = getActiveChannelId();
        const active = channels.find((c) => c.id === activeId);
        if (!active || active.status === 'unavailable') {
          return;
        }

        isFetchingMessageRef.current = true; 
        try {
          const resp = await fetch(
            `${import.meta.env.VITE_API_BASE_URL || ''}/api/mock-message`
          );
          if (resp.ok) {
            const contentType = resp.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              let data;
              try {
                data = await resp.json();
              } catch (jsonError) {
                console.error(
                  'Ошибка парсинга JSON при прямом добавлении:',
                  jsonError,
                  'Ответ:',
                  await resp.text()
                );
                return;
              }

              if (
                data &&
                typeof data.id === 'string' &&
                typeof data.message === 'string'
              ) {
                const { id, message } = data;
                setMessages((msgs) => [{ id, message }, ...msgs]);
              } else {
                console.warn(
                  'Получены некорректные данные сообщения при прямом добавлении:',
                  data
                );
              }
            } else {
              console.warn('Ответ не является JSON:', await resp.text());
            }
          } else {
            console.error(
              'Ошибка при получении сообщения:',
              resp.status,
              resp.statusText
            );
          }
        } catch (error) {
          console.error('Ошибка при запросе сообщения:', error);
        } finally {
          isFetchingMessageRef.current = false;
        }
      }
    }, messageInterval);
    return () => {
      stopped = true;
      clearInterval(timer);
      isFetchingMessageRef.current = false;
    };
  }, [messageInterval]);

  const bufferCount = buffer.length;

  const [showSettings, setShowSettings] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);

  useEffect(() => {
    if (allUnavailable && bufferCount === 0) setOverlayVisible(true);
    else setOverlayVisible(false);
  }, [allUnavailable, bufferCount]);

  const modals: React.ReactNode[] = [];
  if (overlayVisible) {
    modals.push(<UnavailableOverlay key="unavailable" />);
  }
  if (showSettings) {
    modals.push(
      <SettingsPanel
        key="settings"
        onClearMessages={() => {
          setMessages([]);
          localStorage.removeItem('messages');
        }}
      />
    );
  }

  return (
    <div className="playground-container">
      <ServerList />
      <SettingsButton onClick={() => setShowSettings((s) => !s)} />

      <ModalStack
        modals={modals}
        onOverlayClick={() => {
          setShowSettings(false);
          setOverlayVisible(false);
        }}
      />

      <main className="playground-main">
        <section className="playground-section">
          {bufferCount > 0 && (
            <div className="playground-buffer-section">
              Буфер сообщений: {bufferCount}
            </div>
          )}
          {messages.map((m, i) => (
            <MessageCard key={`${m.id}-${i}`} id={m.id} message={m.message} />
          ))}
        </section>
        <section className="playground-section log-section">
          <LogViewer />
        </section>
      </main>
    </div>
  );
}
