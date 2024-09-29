import { Server } from './server/server';

(async () => {
  await new Server({
    port: 3000,
    ssr: true,
    csr: true,
  }).start();
})();
