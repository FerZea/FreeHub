import 'dotenv/config';
import mongoose from 'mongoose';

import { Server } from './models/server.js';

const server = new Server();

server.listen().catch(async (error) => {
  console.error('No se pudo iniciar la API de FreeHub:', error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});
