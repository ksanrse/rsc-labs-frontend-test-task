import { describe, it, expect } from 'vitest';
import { Channel } from './Channel';
import { toggleUnstable } from '@/mocks/handlers';

const baseUrl = '/api'; 

describe('Channel', () => {
  const chan = new Channel('test-id', baseUrl);

  it('успешно выполняет ping и возвращает ts', async () => {
    const ts = await chan.ping();
    expect(typeof ts).toBe('number');
    expect(ts).toBeGreaterThan(0);
  });

  it('кидает ошибку при неуспешном ping', async () => {
    toggleUnstable();
    await expect(chan.ping()).rejects.toThrow('Ping failed');
    toggleUnstable();
  });

  it('успешно шлёт и эхо-ответ возвращает правильную форму', async () => {
    const payload = { id: '123', message: 'hello' };
    const resp = await chan.send(payload);
    expect(resp).toEqual({ id: '123', echo: 'hello' });
  });

  it('ошибка при send, когда unstable', async () => {
    toggleUnstable();
    await expect(chan.send({ id: 'x', message: 'y' })).rejects.toThrow(
      'Send failed'
    );
    toggleUnstable();
  });
});
