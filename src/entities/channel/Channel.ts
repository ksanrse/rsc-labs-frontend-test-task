export class Channel {
  constructor(public id: string, private url: string) {}
  async ping(): Promise<number> {
    const res = await fetch(`${this.url}/ping/${this.id}`);
    if (!res.ok) throw new Error('Ping failed');
    const data: { ts: number } = await res.json();
    return data.ts;
  }
  async send(payload: { id: string; message: string }) {
    const res = await fetch(`${this.url}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Send failed');
    return await res.json();
  }
}
