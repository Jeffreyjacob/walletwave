import { NextFunction, Request, RequestHandler, Response } from 'express';

export const AsyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next).catch(next));
  };
};
