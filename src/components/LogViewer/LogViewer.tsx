import { useEffect, useState } from 'react';
import { useLogStore } from '@/store/LogStore';
import { useSettingsStore } from '@/store/SettingsStore';
import './LogViewer.css';

export function LogViewer() {
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const rawLogs = useLogStore((s) => s.logs);

  const [visibleLogs, setVisibleLogs] = useState<
    Array<{ id: number; text: string; type?: string; visible: boolean }>
  >([]);

  useEffect(() => {
    if (!notificationsEnabled) {
      setVisibleLogs([]);
    }
  }, [notificationsEnabled]);

  useEffect(() => {
    if (!notificationsEnabled) return;

    rawLogs.forEach((l) => {
      if (!visibleLogs.find((vl) => vl.id === l.id)) {
        setVisibleLogs((prev) => [...prev, { ...l, visible: true }]);
        setTimeout(() => {
          setVisibleLogs((prev) =>
            prev.map((vl) => (vl.id === l.id ? { ...vl, visible: false } : vl))
          );
        }, 50000);
        setTimeout(() => {
          setVisibleLogs((prev) => prev.filter((vl) => vl.id !== l.id));
        }, 55000);
      }
    });
    // eslint-disable-next-line
  }, [rawLogs, notificationsEnabled]);

  const handleDismiss = (id: number) => {
    setVisibleLogs((prev) =>
      prev.map((vl) => (vl.id === id ? { ...vl, visible: false } : vl))
    );
    setTimeout(() => {
      setVisibleLogs((prev) => prev.filter((vl) => vl.id !== id));
    }, 600); 
  };

  if (!notificationsEnabled) return null;

  return (
    <div className="log-viewer-floating">
      {visibleLogs.map((l) => (
        <div
          key={l.id}
          className={`log-entry-floating ${l.visible ? 'show' : 'hide'} ${l.type || ''}`}
          onClick={() => handleDismiss(l.id)}
          title="Скрыть уведомление"
        >
          <span className="log-text">{l.text}</span>
        </div>
      ))}
    </div>
  );
}
