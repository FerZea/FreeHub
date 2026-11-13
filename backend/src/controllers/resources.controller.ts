import { type Request, type Response } from 'express';

import { ResourceModel } from '../models/resource.model.js';

export const getResources = async (req: Request, res: Response) => {
  try {
    const resources = await ResourceModel.find().sort({ createdAt: -1, _id: -1 });

    return res.status(200).json({ data: resources });
  } catch (error) {
    console.error('Error al consultar publicaciones:', error);

    return res.status(500).json({
      msg: 'No se pudieron consultar las publicaciones',
    });
  }
};
