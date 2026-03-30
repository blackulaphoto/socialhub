import express, { type Router } from "express";

export function createSessionMiddleware(userId?: number) {
  return (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.session = {
      userId,
      destroy(callback?: (err?: unknown) => void) {
        this.userId = undefined as never;
        callback?.();
      },
    } as express.Request["session"];
    next();
  };
}

export function createTestApp(router: Router, userId?: number) {
  const app = express();
  app.use(express.json());
  app.use(createSessionMiddleware(userId));
  app.use(router);
  return app;
}
