import express, { type Application } from 'express';
import { type Server as HttpServer } from 'node:http';
import { type AddressInfo } from 'node:net';

import { dbConnection } from '../database/config.js';
import resourcesRoutes from '../routes/resources.routes.js';

export class Server {
  private app: Application;
  private port: number;
  private host: string;

  constructor() {
    this.app = express();
    this.port = Number(process.env.PORT || '8082');
    this.host = process.env.HOST || '127.0.0.1';

    this.app.use(express.json());
    this.routes();
  }

  private routes(): void {
    this.app.use('/api/resources', resourcesRoutes);

    this.app.use((req, res) => {
      res.status(404).json({ msg: 'Ruta no encontrada' });
    });
  }

  public async listen(): Promise<HttpServer> {
    await dbConnection();

    return new Promise((resolve, reject) => {
      const server = this.app.listen(this.port, this.host, () => {
        const address = server.address() as AddressInfo;
        console.log(`API de FreeHub: http://${this.host}:${address.port}`);
        resolve(server);
      });

      server.once('error', reject);
    });
  }
}
