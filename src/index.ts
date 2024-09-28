import { Server } from './server/server';

new Server({
  port: 3000,
  logger: (type, msg) => {
    console.log('Server', type, msg);
  },
}).start(() => {
  console.log('Server', 'started');
});
