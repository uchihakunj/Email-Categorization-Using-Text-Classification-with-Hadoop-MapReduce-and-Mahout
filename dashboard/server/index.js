import express from "express";
import multer from "multer";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const app = express();
const port = process.env.PORT || 8787;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
const TOOLS_DIR = path.join(PROJECT_ROOT, "tools");
const LOCAL_MAHOUT_DIR = path.join(TOOLS_DIR, "mahout");
const LOCAL_HADOOP_DIR = path.join(TOOLS_DIR, "hadoop");
const ARTIFACTS_DIR = path.join(PROJECT_ROOT, "artifacts");
const ARTIFACTS_MODEL_DIR = path.join(ARTIFACTS_DIR, "model_sa");
const ARTIFACTS_LABELS_FILE = path.join(ARTIFACTS_DIR, "labelindex_sa");
const RESULTS_DIR = path.join(PROJECT_ROOT, "results");
const DEMO_BATCH_FILE = path.join(PROJECT_ROOT, "data", "demo_batch_upload.csv");
const FEEDBACK_DIR = path.join(PROJECT_ROOT, "data", "feedback");
const FEEDBACK_LOCAL_PATH =
  process.env.FEEDBACK_LOCAL_PATH || path.join(FEEDBACK_DIR, "feedback_labels.csv");
const FEEDBACK_HDFS_PATH = process.env.FEEDBACK_HDFS_PATH || "/email_project/feedback/feedback_labels.csv";
const FEEDBACK_STORE = (process.env.FEEDBACK_STORE || "local+hdfs").toLowerCase();
const FEEDBACK_FIELDS = ["sender", "subject", "body", "predicted", "actual", "timestamp"];

const HDFS_MODEL = "/email_project/model_sa";
const HDFS_LABELS = "/email_project/labelindex_sa";
const LOCAL_CACHE_DIR = path.join(os.tmpdir(), "email-model-cache");
const LOCAL_MODEL_DIR = path.join(LOCAL_CACHE_DIR, "model_sa");
const LOCAL_LABELS_FILE = path.join(LOCAL_CACHE_DIR, "labelindex_sa");
const JOB_TTL_MS = 30 * 60 * 1000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FAST_MODE = process.env.FAST_MODE !== "0";
const BATCH_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_BATCH_ROWS = 500;
const MAX_BATCH_BYTES = 2 * 1024 * 1024;

let modelDir = LOCAL_MODEL_DIR;
let labelsFile = LOCAL_LABELS_FILE;

const jobStore = new Map();
const resultCache = new Map();
const batchStore = new Map();
const feedbackStore = {
  total: 0,
  confusion: {
    important: { important: 0, spam: 0 },
    spam: { important: 0, spam: 0 }
  }
};

let hdfsFeedbackQueue = Promise.resolve();
let hdfsFeedbackHasFile = null;

const upload = multer({
  dest: path.join(os.tmpdir(), "batch-uploads"),
  limits: { fileSize: MAX_BATCH_BYTES }
});

app.use(express.json({ limit: "1mb" }));

const run = (cmd) =>
  new Promise((resolve, reject) => {
    const toolEnv = [
      `if [ -d "${LOCAL_MAHOUT_DIR}/bin" ]; then export MAHOUT_HOME="${LOCAL_MAHOUT_DIR}"; export PATH="${LOCAL_MAHOUT_DIR}/bin:$PATH"; fi`,
      `if [ -d "${LOCAL_HADOOP_DIR}/bin" ]; then export HADOOP_HOME="${LOCAL_HADOOP_DIR}"; export HADOOP_CONF_DIR="${LOCAL_HADOOP_DIR}/etc/hadoop"; export PATH="${LOCAL_HADOOP_DIR}/bin:${LOCAL_HADOOP_DIR}/sbin:$PATH"; fi`
    ].join("; ");
    execFile(
      "bash",
      ["-lc", `source /root/.bashrc; ${toolEnv}; ${cmd}`],
      { maxBuffer: 1024 * 1024 * 8 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }
        resolve(stdout.trim());
      }
    );
  });

const ensureLocalModel = async () => {
  await fs.mkdir(LOCAL_CACHE_DIR, { recursive: true });
  try {
    await Promise.all([fs.access(ARTIFACTS_MODEL_DIR), fs.access(ARTIFACTS_LABELS_FILE)]);
    modelDir = ARTIFACTS_MODEL_DIR;
    labelsFile = ARTIFACTS_LABELS_FILE;
    return;
  } catch {
    try {
      await Promise.all([fs.access(LOCAL_MODEL_DIR), fs.access(LOCAL_LABELS_FILE)]);
      modelDir = LOCAL_MODEL_DIR;
      labelsFile = LOCAL_LABELS_FILE;
      return;
    } catch {
      await run(`hdfs dfs -get -f ${HDFS_MODEL} ${LOCAL_CACHE_DIR}`);
      await run(`hdfs dfs -get -f ${HDFS_LABELS} ${LOCAL_CACHE_DIR}`);
      modelDir = LOCAL_MODEL_DIR;
      labelsFile = LOCAL_LABELS_FILE;
    }
  }
};

const parseLabelIndex = (raw) => {
  const byIndex = {};
  raw.split("\n").forEach((line) => {
    const parts = line.trim().split("\t");
    if (parts.length === 2 && /^\d+$/.test(parts[1])) {
      byIndex[Number(parts[1])] = parts[0];
    }
  });
  return byIndex;
};

const parseScoreLine = (raw) => {
  const lines = raw.split("\n");
  // Mahout output keys may include dots or path separators, so accept any non-space token.
  const line = lines.find((entry) => /^\S+\s+\{/.test(entry.trim()));
  if (!line) {
    return null;
  }
  const match = line.trim().match(/^(\S+)\s+\{(.*)\}$/);
  if (!match) {
    return null;
  }
  const labelKey = match[1];
  const scores = {};
  const pairs = match[2].matchAll(/(\d+):([-0-9.]+)/g);
  for (const [, idx, value] of pairs) {
    scores[Number(idx)] = Number(value);
  }
  return { labelKey, scores };
};

const getCacheKey = (content) =>
  crypto.createHash("sha256").update(content).digest("hex");

const pruneStores = () => {
  const now = Date.now();
  for (const [jobId, job] of jobStore.entries()) {
    if (now - job.updatedAt > JOB_TTL_MS) {
      jobStore.delete(jobId);
    }
  }
  for (const [cacheKey, entry] of resultCache.entries()) {
    if (now - entry.updatedAt > CACHE_TTL_MS) {
      resultCache.delete(cacheKey);
    }
  }
  for (const [batchId, entry] of batchStore.entries()) {
    if (now - entry.updatedAt > BATCH_TTL_MS) {
      batchStore.delete(batchId);
    }
  }
};

const normalizeLabel = (value) => {
  const text = String(value || "").toLowerCase();
  if (text.includes("spam")) {
    return "spam";
  }
  return "important";
};

const getLatestReportPath = async () => {
  try {
    const entries = await fs.readdir(RESULTS_DIR);
    const candidates = entries.filter((name) => /^sa_stem_metrics_\d{4}-\d{2}-\d{2}\.txt$/.test(name));
    if (!candidates.length) {
      return null;
    }
    const withStats = await Promise.all(
      candidates.map(async (name) => ({
        name,
        stat: await fs.stat(path.join(RESULTS_DIR, name))
      }))
    );
    withStats.sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
    return path.join(RESULTS_DIR, withStats[0].name);
  } catch {
    return null;
  }
};

const parsePipelineReport = (raw) => {
  const readNumber = (regex) => {
    const match = raw.match(regex);
    return match ? Number(match[1]) : null;
  };
  const readFloat = (regex) => {
    const match = raw.match(regex);
    return match ? Number.parseFloat(match[1]) : null;
  };

  const total = readNumber(/Total:\s*(\d+)/i);
  const accuracy = readFloat(/Accuracy:\s*([0-9.]+)/i);
  const spamPrecision = readFloat(/Spam precision:\s*([0-9.]+)/i);
  const spamRecall = readFloat(/Spam recall:\s*([0-9.]+)/i);
  const spamF1 = readFloat(/Spam F1:\s*([0-9.]+)/i);

  const importantRow = raw.match(/important:\s*(\d+)\s+(\d+)/i);
  const spamRow = raw.match(/spam:\s*(\d+)\s+(\d+)/i);

  const confusion = {
    important: {
      important: importantRow ? Number(importantRow[1]) : null,
      spam: importantRow ? Number(importantRow[2]) : null
    },
    spam: {
      important: spamRow ? Number(spamRow[1]) : null,
      spam: spamRow ? Number(spamRow[2]) : null
    }
  };

  const importantTotal =
    confusion.important.important !== null && confusion.important.spam !== null
      ? confusion.important.important + confusion.important.spam
      : null;
  const spamTotal =
    confusion.spam.important !== null && confusion.spam.spam !== null
      ? confusion.spam.important + confusion.spam.spam
      : null;

  return {
    total,
    accuracy,
    spamPrecision,
    spamRecall,
    spamF1,
    confusion,
    classBalance: {
      important: importantTotal,
      spam: spamTotal
    }
  };
};

const softmaxConfidence = (scores, predictedIndex) => {
  const values = Object.values(scores);
  if (!values.length) {
    return 0;
  }
  const max = Math.max(...values);
  let sum = 0;
  const expScores = {};
  for (const [idx, value] of Object.entries(scores)) {
    const expValue = Math.exp(value - max);
    expScores[idx] = expValue;
    sum += expValue;
  }
  const predicted = expScores[predictedIndex] || 0;
  return sum ? predicted / sum : 0;
};

const computeRisk = (label, confidence) => {
  if (label === "Spam") {
    if (confidence >= 0.9) {
      return "High";
    }
    if (confidence >= 0.75) {
      return "Medium";
    }
    return "Low";
  }
  if (confidence >= 0.9) {
    return "Low";
  }
  if (confidence >= 0.75) {
    return "Medium";
  }
  return "Low";
};

const buildHeuristicResult = ({ sender, subject, body }) => {
  const text = `${sender} ${subject} ${body}`.toLowerCase();
  let score = 0;
  const signals = [];

  if (/https?:\/\//.test(text)) {
    score += 2;
    signals.push("Link present");
  }
  if (/\b(verify|verification|account|suspend|urgent|password|login|reset)\b/.test(text)) {
    score += 2;
    signals.push("Urgent request");
  }
  if (/\b(invoice|payment|wire|bank|billing)\b/.test(text)) {
    score += 1;
    signals.push("Financial terms");
  }
  if (/\b(project|milestone|update|meeting|schedule|report|quarterly)\b/.test(text)) {
    score -= 1;
    signals.push("Business context");
  }

  const isSpam = score >= 2;
  const base = 0.6;
  const confidence = Math.min(0.9, base + Math.min(Math.abs(score), 3) * 0.1);
  const label = isSpam ? "Spam" : "Important";
  const risk = computeRisk(label, confidence);
  const riskScore = Math.round(confidence * 100);

  if (!signals.length) {
    signals.push(isSpam ? "Suspicious intent" : "Business tone");
  }

  return {
    label,
    confidence,
    risk,
    riskScore,
    signals,
    scores: {
      spam: null,
      important: null
    },
    source: "heuristic"
  };
};

const parseCsvRows = (raw) => {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < raw.length; i += 1) {
    const char = raw[i];
    if (char === "\"") {
      if (inQuotes && raw[i + 1] === "\"") {
        field += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && raw[i + 1] === "\n") {
        i += 1;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
};

const parseCsvRecords = (raw) => {
  const rows = parseCsvRows(raw);
  if (!rows.length) {
    return { error: "CSV is empty.", records: [] };
  }

  const headers = rows.shift().map((value) => value.trim().toLowerCase());
  const senderIndex = headers.indexOf("sender");
  const subjectIndex = headers.indexOf("subject");
  const bodyIndex = headers.indexOf("body");

  if (senderIndex < 0 || subjectIndex < 0 || bodyIndex < 0) {
    return { error: "CSV must include sender, subject, and body columns.", records: [] };
  }

  const records = rows
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row) => ({
      sender: row[senderIndex] || "",
      subject: row[subjectIndex] || "",
      body: row[bodyIndex] || ""
    }));

  return { records, error: null };
};

const escapeCsv = (value) => {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const formatCsvLine = (values) => values.map(escapeCsv).join(",");

const appendFeedbackLocal = async (csvLine) => {
  await fs.mkdir(path.dirname(FEEDBACK_LOCAL_PATH), { recursive: true });
  try {
    await fs.access(FEEDBACK_LOCAL_PATH);
    await fs.appendFile(FEEDBACK_LOCAL_PATH, `\n${csvLine}`);
  } catch {
    const header = formatCsvLine(FEEDBACK_FIELDS);
    await fs.writeFile(FEEDBACK_LOCAL_PATH, `${header}\n${csvLine}`);
  }
};

const appendFeedbackHdfs = async (csvLine, includeHeader) => {
  const tempPath = path.join(os.tmpdir(), `feedback-${crypto.randomUUID()}.csv`);
  const payload = includeHeader
    ? `${formatCsvLine(FEEDBACK_FIELDS)}\n${csvLine}\n`
    : `${csvLine}\n`;

  await fs.writeFile(tempPath, payload, "utf8");
  try {
    if (includeHeader) {
      await run(`hdfs dfs -mkdir -p ${path.posix.dirname(FEEDBACK_HDFS_PATH)}`);
      await run(`hdfs dfs -put -f ${tempPath} ${FEEDBACK_HDFS_PATH}`);
    } else {
      await run(`hdfs dfs -appendToFile ${tempPath} ${FEEDBACK_HDFS_PATH}`);
    }
  } finally {
    await fs.rm(tempPath, { force: true });
  }
};

const enqueueFeedbackHdfs = (csvLine) => {
  hdfsFeedbackQueue = hdfsFeedbackQueue
    .then(async () => {
      let exists = hdfsFeedbackHasFile;
      if (exists === null) {
        try {
          await run(`hdfs dfs -test -e ${FEEDBACK_HDFS_PATH}`);
          exists = true;
        } catch {
          exists = false;
        }
      }

      await appendFeedbackHdfs(csvLine, !exists);
      hdfsFeedbackHasFile = true;
    })
    .catch((error) => {
      hdfsFeedbackHasFile = null;
      console.warn("Failed to persist feedback to HDFS:", error.message || error);
    });
};

const readFeedbackRecent = async (limit) => {
  try {
    const raw = await fs.readFile(FEEDBACK_LOCAL_PATH, "utf8");
    const rows = parseCsvRows(raw);
    if (!rows.length) {
      return [];
    }
    const header = rows.shift().map((value) => value.trim().toLowerCase());
    const indexMap = FEEDBACK_FIELDS.reduce((acc, field, idx) => {
      const headerIndex = header.indexOf(field);
      acc[field] = headerIndex >= 0 ? headerIndex : idx;
      return acc;
    }, {});

    const records = rows
      .filter((row) => row.some((cell) => cell.trim()))
      .map((row) => ({
        sender: row[indexMap.sender] || "",
        subject: row[indexMap.subject] || "",
        body: row[indexMap.body] || "",
        predicted: row[indexMap.predicted] || "",
        actual: row[indexMap.actual] || "",
        timestamp: row[indexMap.timestamp] || ""
      }));

    if (!records.length) {
      return [];
    }

    const start = Math.max(records.length - limit, 0);
    return records.slice(start).reverse();
  } catch {
    return [];
  }
};

const buildBatchCsv = (results) => {
  const header = [
    "sender",
    "subject",
    "body",
    "label",
    "confidence",
    "risk",
    "riskScore",
    "signals"
  ];

  const rows = results.map((item) => [
    item.sender,
    item.subject,
    item.body,
    item.label,
    item.confidence,
    item.risk,
    item.riskScore,
    Array.isArray(item.signals) ? item.signals.join("; ") : ""
  ]);

  return [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
};

app.post("/api/classify", async (req, res) => {
  const sender = req.body?.sender || "";
  const subject = req.body?.subject || "";
  const body = req.body?.body || "";
  const content = `From: ${sender}\nSubject: ${subject}\n\n${body}`.trim();

  if (!content) {
    res.status(400).json({ error: "No email content provided." });
    return;
  }

  pruneStores();
  const cacheKey = getCacheKey(content);
  const cached = resultCache.get(cacheKey);
  if (cached) {
    res.json({ status: "done", ...cached.result });
    return;
  }

  const jobId = crypto.randomUUID();
  const now = Date.now();
  jobStore.set(jobId, { status: "queued", createdAt: now, updatedAt: now });
  const preview = buildHeuristicResult({ sender, subject, body });
  if (FAST_MODE) {
    res.json({ status: "done", ...preview });
    return;
  }

  res.status(202).json({ status: "queued", jobId, preview });

  setImmediate(async () => {
    const jobStart = Date.now();
    jobStore.set(jobId, { status: "running", createdAt: now, updatedAt: jobStart });

    const requestId = crypto.randomUUID();
    const workDir = path.join(os.tmpdir(), `email-infer-${requestId}`);
    const inputDir = path.join(workDir, "input");
    const seqDir = path.join(workDir, "seq");
    const vecDir = path.join(workDir, "vectors");
    const outDir = path.join(workDir, "output");

    try {
      await ensureLocalModel();

      await fs.rm(workDir, { recursive: true, force: true });
      await fs.mkdir(path.join(inputDir, "important"), { recursive: true });
      await fs.writeFile(path.join(inputDir, "important", "email.txt"), content, "utf8");

      await run(`MAHOUT_LOCAL=1 mahout seqdirectory -i ${inputDir} -o ${seqDir} -c -xm sequential`);
      await run(`MAHOUT_LOCAL=1 mahout seq2sparse -i ${seqDir} -o ${vecDir} -lnorm -nv -wt tfidf`);
      await run(
        `MAHOUT_LOCAL=1 mahout testnb -i ${vecDir}/tf-vectors -o ${outDir} -m ${modelDir} -l ${labelsFile} -ow -seq`
      );

      const [outputRaw, labelRaw] = await Promise.all([
        run(`HADOOP_CLASSPATH=$(mahout classpath) hadoop fs -text file://${outDir}/part-*`),
        fs.readFile(labelsFile, "utf8")
      ]);

      const parsed = parseScoreLine(outputRaw);
      if (!parsed) {
        throw new Error("No classifier output returned.");
      }

      const { labelKey, scores } = parsed;
      const labelIndex = parseLabelIndex(labelRaw);
      let predictedLabel = labelKey;
      let confidence = 0.5;

      if (Object.keys(scores).length) {
        const predictedIndex = Object.keys(scores).reduce((best, idx) => {
          if (best === null) {
            return Number(idx);
          }
          return scores[idx] > scores[best] ? Number(idx) : best;
        }, null);

        predictedLabel = labelIndex[predictedIndex] || String(predictedIndex);
        confidence = softmaxConfidence(scores, predictedIndex);
      }

      const normalizedLabel = String(predictedLabel).toLowerCase();
      const label = normalizedLabel === "spam" ? "Spam" : "Important";
      const risk = computeRisk(label, confidence);
      const riskScore = Math.round(confidence * 100);

      const signals = [];
      if (label === "Spam") {
        signals.push("Suspicious intent", "Link check recommended");
      } else {
        signals.push("Business tone", "Low anomaly score");
      }

      const result = {
        label,
        confidence,
        risk,
        riskScore,
        signals,
        scores: {
          spam: scores[1] ?? null,
          important: scores[0] ?? null
        }
      };

      const finishedAt = Date.now();
      jobStore.set(jobId, { status: "done", createdAt: now, updatedAt: finishedAt, result });
      resultCache.set(cacheKey, { result, updatedAt: finishedAt });
    } catch (error) {
      jobStore.set(jobId, {
        status: "error",
        createdAt: now,
        updatedAt: Date.now(),
        error: error.message || "Classification failed."
      });
    } finally {
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  });
});

app.get("/api/classify/:jobId", (req, res) => {
  pruneStores();
  const job = jobStore.get(req.params.jobId);
  if (!job) {
    res.status(404).json({ status: "error", error: "Job not found." });
    return;
  }

  if (job.status === "done") {
    res.json({ status: "done", ...job.result });
    return;
  }

  if (job.status === "error") {
    res.status(500).json({ status: "error", error: job.error });
    return;
  }

  res.json({ status: job.status });
  return;
});

app.get("/api/reports/latest", async (_req, res) => {
  const reportPath = await getLatestReportPath();
  if (!reportPath) {
    res.status(404).json({ error: "Report not found." });
    return;
  }
  res.download(reportPath);
});

app.get("/api/pipeline/latest", async (_req, res) => {
  const reportPath = await getLatestReportPath();
  if (!reportPath) {
    res.status(404).json({ error: "Report not found." });
    return;
  }

  try {
    const raw = await fs.readFile(reportPath, "utf8");
    const parsed = parsePipelineReport(raw);
    res.json(parsed);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to read report." });
  }
});

app.get("/api/artifacts/labelindex", async (_req, res) => {
  try {
    await ensureLocalModel();
    res.download(labelsFile);
  } catch (error) {
    res.status(500).json({ error: error.message || "Artifact not available." });
  }
});

app.get("/api/batch-demo", async (_req, res) => {
  try {
    await fs.access(DEMO_BATCH_FILE);
    res.download(DEMO_BATCH_FILE);
  } catch {
    res.status(404).json({ error: "Demo CSV not found." });
  }
});

app.post("/api/batch", upload.single("file"), async (req, res) => {
  pruneStores();

  if (!req.file) {
    res.status(400).json({ error: "No file uploaded." });
    return;
  }

  let raw = "";
  try {
    raw = await fs.readFile(req.file.path, "utf8");
  } finally {
    await fs.unlink(req.file.path).catch(() => {});
  }

  const { records, error } = parseCsvRecords(raw);
  if (error) {
    res.status(400).json({ error });
    return;
  }

  if (records.length > MAX_BATCH_ROWS) {
    res.status(400).json({ error: `Batch too large. Max ${MAX_BATCH_ROWS} rows.` });
    return;
  }

  const results = records.map((record, index) => {
    const scored = buildHeuristicResult(record);
    return {
      id: index + 1,
      sender: record.sender,
      subject: record.subject,
      body: record.body,
      label: scored.label,
      confidence: scored.confidence,
      risk: scored.risk,
      riskScore: scored.riskScore,
      signals: scored.signals
    };
  });

  const total = results.length;
  const spam = results.filter((row) => row.label === "Spam").length;
  const important = total - spam;
  const batchId = crypto.randomUUID();
  const now = Date.now();

  batchStore.set(batchId, {
    batchId,
    total,
    spam,
    important,
    results,
    createdAt: now,
    updatedAt: now
  });

  res.json({
    batchId,
    total,
    spam,
    important,
    results: results.slice(0, 20)
  });
});

app.get("/api/batch/:batchId", (req, res) => {
  pruneStores();
  const batch = batchStore.get(req.params.batchId);
  if (!batch) {
    res.status(404).json({ error: "Batch not found." });
    return;
  }
  res.json({
    batchId: batch.batchId,
    total: batch.total,
    spam: batch.spam,
    important: batch.important,
    results: batch.results.slice(0, 20)
  });
});

app.get("/api/batch/:batchId/download", (req, res) => {
  pruneStores();
  const batch = batchStore.get(req.params.batchId);
  if (!batch) {
    res.status(404).json({ error: "Batch not found." });
    return;
  }
  const csv = buildBatchCsv(batch.results);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="batch-${batch.batchId}.csv"`);
  res.send(csv);
});

app.post("/api/feedback", async (req, res) => {
  const predicted = normalizeLabel(req.body?.predicted);
  const actual = normalizeLabel(req.body?.actual);
  const sender = req.body?.sender || "";
  const subject = req.body?.subject || "";
  const body = req.body?.body || "";
  const timestamp = new Date().toISOString();

  if (!predicted || !actual) {
    res.status(400).json({ error: "Predicted and actual labels are required." });
    return;
  }

  feedbackStore.total += 1;
  feedbackStore.confusion[actual][predicted] += 1;

  const csvLine = formatCsvLine([sender, subject, body, predicted, actual, timestamp]);
  const shouldWriteLocal = FEEDBACK_STORE.includes("local");
  const shouldWriteHdfs = FEEDBACK_STORE.includes("hdfs");
  let localSaved = false;
  let hdfsSaved = false;

  if (shouldWriteLocal) {
    try {
      await appendFeedbackLocal(csvLine);
      localSaved = true;
    } catch (error) {
      console.warn("Failed to persist feedback locally:", error.message || error);
    }
  }

  if (shouldWriteHdfs) {
    enqueueFeedbackHdfs(csvLine);
    hdfsSaved = "queued";
  }

  res.json({
    total: feedbackStore.total,
    confusion: feedbackStore.confusion,
    classBalance: {
      important: feedbackStore.confusion.important.important + feedbackStore.confusion.important.spam,
      spam: feedbackStore.confusion.spam.important + feedbackStore.confusion.spam.spam
    },
    persisted: {
      local: localSaved,
      hdfs: hdfsSaved
    }
  });
});

app.get("/api/feedback/summary", (_req, res) => {
  res.json({
    total: feedbackStore.total,
    confusion: feedbackStore.confusion,
    classBalance: {
      important: feedbackStore.confusion.important.important + feedbackStore.confusion.important.spam,
      spam: feedbackStore.confusion.spam.important + feedbackStore.confusion.spam.spam
    }
  });
});

app.get("/api/feedback/recent", async (req, res) => {
  const requested = Number(req.query?.limit) || 20;
  const limit = Math.min(Math.max(requested, 1), 200);
  const records = await readFeedbackRecent(limit);
  res.json({ records });
});

app.listen(port, () => {
  console.log(`Classifier server running on http://localhost:${port}`);
});
