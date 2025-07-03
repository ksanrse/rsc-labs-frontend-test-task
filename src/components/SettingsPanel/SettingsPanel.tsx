import { useState } from 'react';
import { useChannelStore } from '@/store/ChannelStore';
import { useSettingsStore } from '@/store/SettingsStore';
import { toggleUnstable, getUnstableState } from '@/mocks/handlers';
import './SettingsPanel.css';

interface SettingsPanelProps {
  onClearMessages: () => void;
}

export function SettingsPanel({ onClearMessages }: SettingsPanelProps) {
  const pingAll = useChannelStore((s) => s.pingAll);
  const {
    pingInterval,
    setPingInterval,
    messageInterval,
    setMessageInterval,
    bufferSize,
    setBufferSize,
    notificationsEnabled,
    setNotificationsEnabled,
  } = useSettingsStore();
  const [unstableEnabled, setUnstableEnabled] = useState(getUnstableState());

  const handleToggleUnstable = () => {
    toggleUnstable();
    setUnstableEnabled(getUnstableState());
    pingAll();
  };

  return (
    <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
      <h2>Настройки</h2>
      <p>Тут все для оценки работоспособности.</p>

      <div className="spacer"></div>

      <div>
        <div className="setting-item">
          <h3>Уведомления</h3>
          <label className="toggle-switch">
            <input
              type="checkbox"
              id="notifications-toggle"
              checked={notificationsEnabled}
              onChange={(e) => setNotificationsEnabled(e.target.checked)}
            />
            <span className="slider round"></span>
          </label>
        </div>
        <p className="description">
          Вообще все уведомления, которые можно придумать в этом мире, кроме
          тех, которых в этом мире нет.
        </p>
      </div>

      <div>
        <div className="setting-item">
          <h3>Тестово выключить сервера</h3>
          <label className="toggle-switch">
            <input
              type="checkbox"
              id="unstable-channels-toggle"
              checked={unstableEnabled}
              onChange={handleToggleUnstable}
            />
            <span className="slider round"></span>
          </label>
        </div>
        <p className="description">
          Просто выключает сервера. Только для дебага.
        </p>
      </div>

      <div>
        <div className="setting-item">
          <h3>Авто-пинг</h3>
          <input
            type="number"
            id="ping-interval-input"
            value={pingInterval / 1000}
            onChange={(e) => setPingInterval(Number(e.target.value) * 1000)}
            min="1"
            step="1"
            className="ping-interval-input"
          />
        </div>
        <p className="description">
          Частота проверки состояния серверов. В секундах.
        </p>
      </div>

      <div className="setting-item">
        <label>Частота новых сообщений (мс):</label>
        <input
          type="number"
          min={500}
          value={messageInterval}
          onChange={(e) => setMessageInterval(Number(e.target.value))}
        />
      </div>

      <div className="setting-item">
        <label>Размер буфера сообщений:</label>
        <input
          type="number"
          min={1}
          max={50}
          value={bufferSize}
          onChange={(e) => setBufferSize(Number(e.target.value))}
        />
      </div>

      <div className="spacer"></div>

      <button className="delete-button" onClick={onClearMessages}>
        Очистить все сообщения
      </button>
    </div>
  );
}
