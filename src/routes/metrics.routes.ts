import { Router } from "express";
import { metricsService } from "../services/MetricsService";

const router = Router();

/**
 * @swagger
 * /metrics/summary:
 *   get:
 *     summary: Get current metrics snapshot
 *     tags: [Metrics]
 *     responses:
 *       200:
 *         description: Metrics snapshot
 */
router.get("/summary", async (_req, res) => {
  const system = await metricsService.collectSystemResources();
  const external = await metricsService.checkExternalStatus();
  const snapshot = metricsService.getSnapshot();
  res.json({ system, external, snapshot });
});

/**
 * @swagger
 * /metrics/historical:
 *   get:
 *     summary: Get historical metrics for a metric name
 *     tags: [Metrics]
 *     parameters:
 *       - in: query
 *         name: metric
 *         schema:
 *           type: string
 *         required: true
 *       - in: query
 *         name: windowMinutes
 *         schema:
 *           type: integer
 *           default: 60
 *       - in: query
 *         name: aggregation
 *         schema:
 *           type: string
 *           enum: [avg, min, max, p95]
 *           default: avg
 */
router.get("/historical", (req, res) => {
  const { metric, windowMinutes, aggregation } = req.query as Record<string, string>;
  if (!metric) {
    res.status(400).json({ error: "metric is required" });
    return;
  }
  const window = Number(windowMinutes || 60);
  const agg = (aggregation as any) || "avg";
  const result = metricsService.getHistorical(metric, window, agg);
  res.json(result);
});

/**
 * @swagger
 * /metrics/prometheus:
 *   get:
 *     summary: Prometheus metrics endpoint
 *     tags: [Metrics]
 */
router.get("/prometheus", async (_req, res) => {
  // ensure latest sample collected
  await metricsService.collectSystemResources();
  await metricsService.checkExternalStatus();
  const body = metricsService.getPrometheusMetrics();
  res.set("Content-Type", "text/plain; version=0.0.4");
  res.send(body);
});

/**
 * @swagger
 * /metrics/dashboard:
 *   get:
 *     summary: Monitoring dashboard
 *     tags: [Metrics]
 */
router.get("/dashboard", (_req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PayStell Monitoring Dashboard</title>
  <link rel="preconnect" href="https://fonts.gstatic.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { font-family: Inter, system-ui, sans-serif; margin: 0; background: #0b132b; color: #e0e0e0; }
    header { padding: 16px 24px; background: #1c2541; display: flex; align-items: center; justify-content: space-between; }
    h1 { font-size: 20px; margin: 0; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; padding: 16px; }
    .card { background: #3a506b; border-radius: 12px; padding: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
    canvas { width: 100%; height: 240px; }
    .footer { text-align: center; padding: 12px; color: #93a3b1; }
    .pill { background: #5bc0be; color: #0b132b; border-radius: 999px; padding: 6px 10px; font-weight: 600; }
  </style>
</head>
<body>
  <header>
    <h1>PayStell Monitoring Dashboard</h1>
    <span id="throughput" class="pill">RPS: --</span>
  </header>
  <div class="grid">
    <div class="card"><h2>CPU %</h2><canvas id="cpu"></canvas></div>
    <div class="card"><h2>Memory RSS</h2><canvas id="memory"></canvas></div>
    <div class="card"><h2>Top Routes by Requests</h2><canvas id="routes"></canvas></div>
    <div class="card"><h2>API Latency P95</h2><canvas id="latency"></canvas></div>
  </div>
  <div class="footer">Prometheus: <code>/metrics/prometheus</code> • Summary: <code>/metrics/summary</code></div>
  <script>
    async function fetchSummary() {
      const res = await fetch('/metrics/summary');
      return res.json();
    }
    async function fetchSeries(metric) {
      const res = await fetch('/metrics/historical?metric=' + encodeURIComponent(metric) + '&windowMinutes=60&aggregation=avg');
      return res.json();
    }

    const cpuCtx = document.getElementById('cpu').getContext('2d');
    const memCtx = document.getElementById('memory').getContext('2d');
    const routesCtx = document.getElementById('routes').getContext('2d');
    const latencyCtx = document.getElementById('latency').getContext('2d');

    const cpuChart = new Chart(cpuCtx, { type: 'line', data: { labels: [], datasets: [{ label: 'CPU %', data: [], borderColor: '#5bc0be' }] }, options: { scales: { y: { beginAtZero: true, suggestedMax: 100 } } } });
    const memChart = new Chart(memCtx, { type: 'line', data: { labels: [], datasets: [{ label: 'RSS (MB)', data: [], borderColor: '#f0b67f' }] }, options: { scales: { y: { beginAtZero: true } } } });
    const routesChart = new Chart(routesCtx, { type: 'bar', data: { labels: [], datasets: [{ label: 'Requests', data: [], backgroundColor: '#9cd9d6' }] } });
    const latencyChart = new Chart(latencyCtx, { type: 'bar', data: { labels: [], datasets: [{ label: 'P95 (ms)', data: [], backgroundColor: '#f67280' }] } });

    async function refresh() {
      const summary = await fetchSummary();
      document.getElementById('throughput').textContent = 'RPS: ' + (summary.snapshot.requests.throughputRps || 0);

      const cpuSeries = await fetchSeries('cpu_percent');
      const memSeries = await fetchSeries('memory_rss_bytes');

      cpuChart.data.labels = cpuSeries.points.map(p => new Date(p.ts).toLocaleTimeString());
      cpuChart.data.datasets[0].data = cpuSeries.points.map(p => p.value);
      cpuChart.update();

      memChart.data.labels = memSeries.points.map(p => new Date(p.ts).toLocaleTimeString());
      memChart.data.datasets[0].data = memSeries.points.map(p => (p.value / (1024*1024)).toFixed(2));
      memChart.update();

      const routeEntries = Object.entries(summary.snapshot.requests.byRoute || {}).sort((a,b) => b[1].count - a[1].count).slice(0, 10);
      routesChart.data.labels = routeEntries.map(([k]) => k);
      routesChart.data.datasets[0].data = routeEntries.map(([,v]) => v.count);
      routesChart.update();

      latencyChart.data.labels = routeEntries.map(([k]) => k);
      latencyChart.data.datasets[0].data = routeEntries.map(([,v]) => v.p95LatencyMs);
      latencyChart.update();
    }

    refresh();
    setInterval(refresh, 5000);
  </script>
</body>
</html>`;
  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

export default router;