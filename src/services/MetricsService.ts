import os from "os";
import process from "process";
import logger from "../utils/logger";
import { configurationService } from "./ConfigurationService";
import AppDataSource from "../config/db";
import { redisClient } from "../config/redisConfig";
import stellarConfig from "../config/stellarConfig";
import { sendEmail } from "../utils/mailer";
import { Request, Response } from "express";

// Types
export type Numeric = number;

type TimeSeriesPoint = { ts: number; value: Numeric };

type Aggregation = "avg" | "min" | "max" | "p95";

type RouteKey = string; // `${method} ${route}`

interface SystemResources {
  cpuPercent: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  loadAvg: number[];
  uptimeSec: number;
  disk?: {
    free?: number;
    size?: number;
  };
}

interface ExternalStatus {
  database: {
    status: "OK" | "FAIL";
    latencyMs: number;
  };
  redis: {
    status: "OK" | "FAIL";
    latencyMs: number;
  };
  stellar: {
    status: "OK" | "FAIL";
    latencyMs: number;
  };
}

interface MetricsSnapshot {
  timestamp: number;
  system: SystemResources;
  external: ExternalStatus;
  requests: {
    total: number;
    byRoute: Record<RouteKey, { count: number; errorCount: number; avgLatencyMs: number; p95LatencyMs: number }>;
    throughputRps: number; // rolling 60s
  };
}

// Simple percentile calculator
function percentile(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(p * (sorted.length - 1));
  return sorted[idx];
}

class MetricsService {
  private static _instance: MetricsService;

  // Request metrics
  private routeCounters: Map<RouteKey, { count: number; errorCount: number; latencies: number[] }> = new Map();
  private totalRequests = 0;
  private lastRequestsTimestamps: number[] = []; // for throughput

  // Time series storage
  private timeSeries: Map<string, TimeSeriesPoint[]> = new Map();
  private retentionPoints = 5000;

  // Alerts
  private lastAlertSentAt: Map<string, number> = new Map();
  private minAlertIntervalMs = 10 * 60 * 1000; // 10 minutes

  private constructor() {}

  static get instance(): MetricsService {
    if (!MetricsService._instance) MetricsService._instance = new MetricsService();
    return MetricsService._instance;
  }

  observeRequest(req: Request, res: Response, startHrTime: [number, number]) {
    const diff = process.hrtime(startHrTime);
    const durationMs = diff[0] * 1000 + diff[1] / 1e6;
    const route = req.route?.path || req.originalUrl || req.url || "unknown";
    const method = req.method;
    const status = res.statusCode;
    const key: RouteKey = `${method} ${route}`;

    const entry = this.routeCounters.get(key) || { count: 0, errorCount: 0, latencies: [] };
    entry.count += 1;
    if (status >= 500) entry.errorCount += 1;
    entry.latencies.push(durationMs);
    if (entry.latencies.length > 1000) entry.latencies.shift();
    this.routeCounters.set(key, entry);

    this.totalRequests += 1;
    const now = Date.now();
    this.lastRequestsTimestamps.push(now);
    // keep only last 60s
    const cutoff = now - 60_000;
    while (this.lastRequestsTimestamps.length && this.lastRequestsTimestamps[0] < cutoff) {
      this.lastRequestsTimestamps.shift();
    }

    // Alert for slow request
    this.maybeAlert("api_latency", durationMs, async () => {
      const rawLatency = await configurationService.getConfig("METRICS_API_LATENCY_THRESHOLD_MS", "1000");
      const threshold = Number(rawLatency ?? 1000);
      return durationMs > threshold;
    }, `High API latency: ${durationMs.toFixed(2)}ms for ${method} ${route}`);
  }

  async collectSystemResources(): Promise<SystemResources> {
    const memory = process.memoryUsage();
    const uptimeSec = process.uptime();
    const cpuUsage = process.cpuUsage();
    const cores = os.cpus().length || 1;
    const cpuPercent = (((cpuUsage.user + cpuUsage.system) / 1000) / (uptimeSec * 1000 * cores)) * 100;

    const resources: SystemResources = {
      cpuPercent: Number(cpuPercent.toFixed(2)),
      memory: {
        rss: memory.rss,
        heapTotal: memory.heapTotal,
        heapUsed: memory.heapUsed,
        external: memory.external,
      },
      loadAvg: os.loadavg(),
      uptimeSec,
    };

    // Optional disk metrics via dynamic import
    try {
      // @ts-ignore - optional dependency
      const mod = await import("check-disk-space");
      const checkDiskSpace = (mod as any).default || mod;
      const disk = await checkDiskSpace(process.platform === "win32" ? "C:" : "/");
      resources.disk = { free: disk.free, size: disk.size };
    } catch (err) {
      // Not installed or failed; skip
    }

    // Store time series
    this.pushSeries("cpu_percent", resources.cpuPercent);
    this.pushSeries("memory_rss_bytes", resources.memory.rss);
    this.pushSeries("memory_heap_used_bytes", resources.memory.heapUsed);

    // Alerts
    const rawCpu = await configurationService.getConfig("METRICS_CPU_THRESHOLD", "85");
    const cpuThreshold = Number(rawCpu ?? 85);
    if (resources.cpuPercent > cpuThreshold) {
      this.triggerAlert("cpu_threshold", `CPU usage high: ${resources.cpuPercent}%`);
    }
    const rawMem = await configurationService.getConfig("METRICS_MEMORY_THRESHOLD", "85");
    const memThreshold = Number(rawMem ?? 85);
    const memPercent = (resources.memory.heapUsed / resources.memory.heapTotal) * 100;
    if (!isNaN(memPercent) && memPercent > memThreshold) {
      this.triggerAlert("memory_threshold", `Memory usage high: ${memPercent.toFixed(2)}%`);
    }

    return resources;
  }

  async checkExternalStatus(): Promise<ExternalStatus> {
    const status: ExternalStatus = {
      database: { status: "OK", latencyMs: 0 },
      redis: { status: "OK", latencyMs: 0 },
      stellar: { status: "OK", latencyMs: 0 },
    };

    // DB
    try {
      if (!AppDataSource.isInitialized) await AppDataSource.initialize();
      const dbStart = Date.now();
      await AppDataSource.query("SELECT 1");
      status.database.latencyMs = Date.now() - dbStart;
      this.pushSeries("db_latency_ms", status.database.latencyMs);
      const rawDb = await configurationService.getConfig("METRICS_DB_LATENCY_THRESHOLD_MS", "500");
      const dbThreshold = Number(rawDb ?? 500);
      if (status.database.latencyMs > dbThreshold) this.triggerAlert("db_latency", `DB latency high: ${status.database.latencyMs}ms`);
    } catch (err) {
      status.database.status = "FAIL";
      this.triggerAlert("db_down", `Database check failed: ${(err as Error)?.message}`);
    }

    // Redis
    try {
      const redisStart = Date.now();
      const pingResult = await redisClient.ping();
      status.redis.latencyMs = Date.now() - redisStart;
      this.pushSeries("redis_latency_ms", status.redis.latencyMs);
      if (pingResult !== "PONG") throw new Error("Redis ping failed");
    } catch (err) {
      status.redis.status = "FAIL";
      this.triggerAlert("redis_down", `Redis check failed: ${(err as Error)?.message}`);
    }

    // Stellar
    try {
      const stellarStart = Date.now();
      const resp = await fetch(stellarConfig.STELLAR_HORIZON_URL);
      status.stellar.latencyMs = Date.now() - stellarStart;
      this.pushSeries("stellar_latency_ms", status.stellar.latencyMs);
      if (!resp.ok) throw new Error(`Stellar ${resp.status}`);
    } catch (err) {
      status.stellar.status = "FAIL";
      this.triggerAlert("stellar_down", `Stellar check failed: ${(err as Error)?.message}`);
    }

    return status;
  }

  getSnapshot(): MetricsSnapshot {
    const byRoute: MetricsSnapshot["requests"]["byRoute"] = {};
    for (const [key, entry] of this.routeCounters.entries()) {
      const avg = entry.latencies.length ? entry.latencies.reduce((a, b) => a + b, 0) / entry.latencies.length : 0;
      const p95 = percentile(entry.latencies, 0.95);
      byRoute[key] = { count: entry.count, errorCount: entry.errorCount, avgLatencyMs: Number(avg.toFixed(2)), p95LatencyMs: Number(p95.toFixed(2)) };
    }

    const now = Date.now();
    const cutoff = now - 60_000;
    const throughputRps = this.lastRequestsTimestamps.filter((t) => t >= cutoff).length / 60;

    return {
      timestamp: now,
      system: {
        cpuPercent: this.getLatest("cpu_percent") || 0,
        memory: {
          rss: this.getLatest("memory_rss_bytes") || 0,
          heapTotal: process.memoryUsage().heapTotal,
          heapUsed: this.getLatest("memory_heap_used_bytes") || 0,
          external: process.memoryUsage().external,
        },
        loadAvg: os.loadavg(),
        uptimeSec: process.uptime(),
      },
      external: {
        database: { status: "OK", latencyMs: this.getLatest("db_latency_ms") || 0 },
        redis: { status: "OK", latencyMs: this.getLatest("redis_latency_ms") || 0 },
        stellar: { status: "OK", latencyMs: this.getLatest("stellar_latency_ms") || 0 },
      },
      requests: { total: this.totalRequests, byRoute, throughputRps: Number(throughputRps.toFixed(2)) },
    };
  }

  // Time series helpers
  private pushSeries(name: string, value: Numeric) {
    const arr = this.timeSeries.get(name) || [];
    arr.push({ ts: Date.now(), value });
    if (arr.length > this.retentionPoints) arr.shift();
    this.timeSeries.set(name, arr);
  }

  private getLatest(name: string): number | undefined {
    const arr = this.timeSeries.get(name);
    if (!arr || !arr.length) return undefined;
    return arr[arr.length - 1].value;
  }

  getHistorical(name: string, windowMinutes = 60, aggregation: Aggregation = "avg"): { metric: string; points: TimeSeriesPoint[]; aggregated?: number } {
    const arr = this.timeSeries.get(name) || [];
    const cutoff = Date.now() - windowMinutes * 60_000;
    const points = arr.filter((p) => p.ts >= cutoff);
    let aggregated: number | undefined;
    if (points.length) {
      const values = points.map((p) => p.value);
      switch (aggregation) {
        case "avg":
          aggregated = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case "min":
          aggregated = Math.min(...values);
          break;
        case "max":
          aggregated = Math.max(...values);
          break;
        case "p95":
          aggregated = percentile(values, 0.95);
          break;
      }
    }
    return { metric: name, points, aggregated };
  }

  // Prometheus exposition format (0.0.4)
  getPrometheusMetrics(): string {
    const snapshot = this.getSnapshot();
    const lines: string[] = [];

    const push = (l: string) => lines.push(l);

    // Gauges: CPU, memory
    push(`# HELP paystell_cpu_percent CPU usage percent`);
    push(`# TYPE paystell_cpu_percent gauge`);
    push(`paystell_cpu_percent ${snapshot.system.cpuPercent}`);

    push(`# HELP paystell_memory_rss_bytes Resident set size in bytes`);
    push(`# TYPE paystell_memory_rss_bytes gauge`);
    push(`paystell_memory_rss_bytes ${snapshot.system.memory.rss}`);

    push(`# HELP paystell_memory_heap_used_bytes Heap used bytes`);
    push(`# TYPE paystell_memory_heap_used_bytes gauge`);
    push(`paystell_memory_heap_used_bytes ${snapshot.system.memory.heapUsed}`);

    // External latencies
    push(`# HELP paystell_db_latency_ms Database query latency in ms`);
    push(`# TYPE paystell_db_latency_ms gauge`);
    push(`paystell_db_latency_ms ${snapshot.external.database.latencyMs}`);

    push(`# HELP paystell_redis_latency_ms Redis ping latency in ms`);
    push(`# TYPE paystell_redis_latency_ms gauge`);
    push(`paystell_redis_latency_ms ${snapshot.external.redis.latencyMs}`);

    push(`# HELP paystell_stellar_latency_ms Stellar Horizon latency in ms`);
    push(`# TYPE paystell_stellar_latency_ms gauge`);
    push(`paystell_stellar_latency_ms ${snapshot.external.stellar.latencyMs}`);

    // Counters per route and latency p95
    push(`# HELP paystell_api_request_total Total API requests by route/method/status`);
    push(`# TYPE paystell_api_request_total counter`);
    for (const [key, data] of Object.entries(snapshot.requests.byRoute)) {
      const [method, route] = key.split(" ");
      push(`paystell_api_request_total{route="${route}",method="${method}"} ${data.count}`);
      push(`paystell_api_error_total{route="${route}",method="${method}"} ${data.errorCount}`);
      push(`paystell_api_latency_ms_p95{route="${route}",method="${method}"} ${data.p95LatencyMs}`);
      push(`paystell_api_latency_ms_avg{route="${route}",method="${method}"} ${data.avgLatencyMs}`);
    }

    push(`# HELP paystell_throughput_rps Requests per second (rolling 60s)`);
    push(`# TYPE paystell_throughput_rps gauge`);
    push(`paystell_throughput_rps ${snapshot.requests.throughputRps}`);

    return lines.join("\n");
  }

  // Alerts
  private async triggerAlert(key: string, message: string) {
    const now = Date.now();
    const last = this.lastAlertSentAt.get(key) || 0;
    if (now - last < this.minAlertIntervalMs) return;
    this.lastAlertSentAt.set(key, now);

    logger.warn(`ALERT: ${message}`);

    try {
      const recipients = ((await configurationService.getConfig("METRICS_ALERT_EMAILS", "")) as string)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (recipients.length) {
        await sendEmail({
          to: recipients.join(","),
          subject: "[PayStell] Monitoring Alert",
          html: `<p>${message}</p><p>Time: ${new Date().toISOString()}</p>`,
        });
      }
    } catch (err) {
      logger.error("Failed to send alert email", { error: (err as Error)?.message });
    }
  }

  private async maybeAlert(key: string, value: number, predicate: () => Promise<boolean>, message: string) {
    try {
      if (await predicate()) this.triggerAlert(key, message);
    } catch (err) {
      logger.error("Alert predicate failed", { error: (err as Error)?.message });
    }
  }
}

export const metricsService = MetricsService.instance;