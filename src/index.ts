import { Server } from './server/server';

(async () => {
  await new Server({
    port: 3000,
    logger: (type, msg) => {
      console.log('Server', type, msg);
    },
  }).start();
})();
