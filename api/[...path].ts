import type { IncomingMessage, ServerResponse } from "node:http";
import app from "../artifacts/api-server/src/app";

type RequestHandler = (req: IncomingMessage, res: ServerResponse) => void;

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return (app as unknown as RequestHandler)(req, res);
}
