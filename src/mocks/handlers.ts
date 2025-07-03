import { http, HttpResponse } from 'msw';
import { faker } from '@faker-js/faker';

let unstable = false;
export const toggleUnstable = () => {
  unstable = !unstable;
};

export const getUnstableState = () => unstable;

function getRandomId() {
  return `ch-${faker.number.int({ min: 1000, max: 9999 })}`;
}
function getRandomMessage() {
  return faker.hacker.phrase();
}

export const handlers = [
  http.post<
    never,
    { id: string; message: string },
    { id: string; echo: string }
  >('/api/send', async ({ request }) => {
    const { id, message } = await request.json();
    if (unstable) {
      return new HttpResponse(null, { status: 503 });
    }
    return HttpResponse.json({ id, echo: message });
  }),

  http.get<{ id: string }, never, { ts: number }>(
    '/api/ping/:id',
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async ({ params: { id } }) => {
      if (unstable) {
        return new HttpResponse(null, { status: 503 });
      }
      if (Math.random() < 0.1) {
        return new HttpResponse(null, { status: 503 });
      }
      const delay = 20 + Math.floor(Math.random() * 480);
      await new Promise((res) => setTimeout(res, delay));
      return HttpResponse.json({ ts: Date.now() });
    }
  ),

  http.get('/api/mock-message', async () => {
    await new Promise((res) => setTimeout(res, Math.random() * 200));
    return HttpResponse.json({
      id: getRandomId(),
      message: getRandomMessage(),
    });
  }),
];
