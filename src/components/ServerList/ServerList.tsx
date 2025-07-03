import { useState, useRef, useMemo } from 'react';
import './ServerList.css';
import { useChannelStore } from '@/store/ChannelStore';

export function ServerList({ onUnavailable }: { onUnavailable?: () => void }) {
  const channels = useChannelStore((s) => s.channels);

  const allUnavailable =
    channels.length > 0 && channels.every((c) => c.status === 'unavailable');

  if (allUnavailable && onUnavailable) {
    onUnavailable();
  }

  const sortedChannels = useMemo(() => {
    const available = channels
      .filter((c) => c.status !== 'unavailable')
      .sort((a, b) => a.latency - b.latency);
    const unavailable = channels.filter((c) => c.status === 'unavailable');
    return [...available, ...unavailable];
  }, [channels]);

  const [expanded, setExpanded] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleClick = () => {
    if (expanded) {
      setShowContent(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setExpanded(false), 350);
    } else {
      setExpanded(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setShowContent(true), 400);
    }
  };

  const visibleServers = expanded ? sortedChannels : sortedChannels.slice(0, 1);

  return (
    <div
      className={
        `server-widget${expanded ? ' open' : ''}` +
        (allUnavailable ? ' unavailable' : '')
      }
      onClick={handleClick}
    >
      <div className={`server-grid${expanded ? ' expanded' : ''}`}>
        {visibleServers.map((srv, idx) => (
          <div
            key={srv.id}
            className={[
              'server-row',
              srv.status === 'connected' ? 'active' : '',
              idx === 0 ? 'first' : '',
              showContent || !expanded ? 'show' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className={`server-dot ${srv.status}`} title={srv.name} />
            <span className={'server-latency' + (idx === 0 ? ' main' : '')}>
              {srv.status === 'unavailable' ? '—' : `${srv.latency}мс`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
