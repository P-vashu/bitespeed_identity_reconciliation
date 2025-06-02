import { Request, Response } from 'express';
import { handleIdentify } from '../utils/contactUtils';

export const identifyContact = async (req: Request, res: Response) => {
  try {
    const result = await handleIdentify(req.body);
    res.status(200).json({ contact: result });
  } catch (error) {
    res.status(500).json({ error: 'Something went wrong' });
  }
};
