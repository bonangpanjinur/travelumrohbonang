import { Router, type RequestHandler } from "express";
2	import { pool } from "@workspace/db";
3	import { HealthCheckResponse } from "@workspace/api-zod";
4	
5	const router = Router();
6	
7	const healthz: RequestHandler = (req: any, res: any) => {
8	  const data = HealthCheckResponse.parse({ status: "ok" });
9	  res.json(data);
10	};
11	
12	router.get("/healthz", healthz);
13	
14	const health: RequestHandler = async (req: any, res: any) => {
15	  const start = Date.now();
16	
17	  let dbStatus: "ok" | "error" = "error";
18	  let dbLatencyMs: number | null = null;
19	  let dbError: string | null = null;
20	
21	  try {
22	    const client = await pool.connect();
23	    try {
24	      await client.query("SELECT 1");
25	      dbLatencyMs = Date.now() - start;
26	      dbStatus = "ok";
27	    } finally {
28	      client.release();
29	    }
30	  } catch (err) {
31	    dbError = err instanceof Error ? err.message : "Unknown database error";
32	  }
33	
34	  const overallStatus = dbStatus === "ok" ? "ok" : "degraded";
35	  const httpStatus = overallStatus === "ok" ? 200 : 503;
36	
37	  res.status(httpStatus).json({
38	    status: overallStatus,
39	    timestamp: new Date().toISOString(),
40	    services: {
41	      database: {
42	        status: dbStatus,
43	        latencyMs: dbLatencyMs,
44	        ...(dbError ? { error: dbError } : {}),
45	      },
46	    },
47	  });
48	};
49	
50	router.get("/health", health);
51	
52	export default router;
53	
