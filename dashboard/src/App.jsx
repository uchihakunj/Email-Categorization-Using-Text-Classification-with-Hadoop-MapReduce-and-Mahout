import { useEffect, useRef, useState } from "react";

const kpis = [
    {
        label: "Accuracy",
        value: "99.79%",
        delta: "+0.12%",
        tone: "accent"
    },
    {
        label: "Spam Precision",
        value: "99.53%",
        delta: "+0.31%",
        tone: "lime"
    },
    {
        label: "Spam Recall",
        value: "99.29%",
        delta: "+0.18%",
        tone: "amber"
    },
    {
        label: "Spam F1",
        value: "99.41%",
        delta: "+0.24%",
        tone: "coral"
    }
];

const runs = [
    { id: "RUN-104", date: "2026-04-08", model: "NB + TFIDF", status: "Healthy" },
    { id: "RUN-103", date: "2026-04-06", model: "NB + TFIDF", status: "Healthy" },
    { id: "RUN-102", date: "2026-04-03", model: "NB + TFIDF", status: "Review" }
];

const sidebarItems = [
    "Overview",
    "Datasets",
    "Pipelines",
    "Models",
    "Batch Upload",
    "Alerts",
    "Exports"
];

const sectionMap = {
    Overview: "overview",
    Pipelines: "pipelines",
    Models: "models",
    Datasets: "datasets",
    "Batch Upload": "batch-upload",
    Alerts: "alerts",
    Exports: "exports"
};

const demoPresets = {
    spam: {
        sender: "security@verify-now.xyz",
        subject: "Urgent: Account verification required",
        body: "Your account was suspended. Click here to verify now: http://verify-now.xyz/login"
    },
    important: {
        sender: "delivery@acme-corp.com",
        subject: "Quarterly project update",
        body: "Sharing the latest project milestones and action items. Please review before Friday."
    },
    finance: {
        sender: "finance@northwind.io",
        subject: "Invoice 9842 available",
        body: "The April invoice is ready. Please confirm the PO number so we can close the month."
    }
};

function App() {
    const [sender, setSender] = useState(demoPresets.spam.sender);
    const [subject, setSubject] = useState(demoPresets.spam.subject);
    const [body, setBody] = useState(demoPresets.spam.body);
    const [analysis, setAnalysis] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState("");
    const pollRef = useRef(0);
    const fileInputRef = useRef(null);
    const [activeNav, setActiveNav] = useState("Overview");
    const [theme, setTheme] = useState("light");
    const [batchFile, setBatchFile] = useState(null);
    const [batchNote, setBatchNote] = useState("No file selected.");
    const [batchId, setBatchId] = useState(null);
    const [batchSummary, setBatchSummary] = useState(null);
    const [batchRows, setBatchRows] = useState([]);
    const [batchIsUploading, setBatchIsUploading] = useState(false);
    const [pipelineData, setPipelineData] = useState(null);
    const [pipelineError, setPipelineError] = useState("");
    const [pipelineLoading, setPipelineLoading] = useState(false);
    const [pipelineView, setPipelineView] = useState("pipeline");
    const [feedbackSummary, setFeedbackSummary] = useState(null);
    const [feedbackStatus, setFeedbackStatus] = useState("");
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [feedbackRecent, setFeedbackRecent] = useState([]);
    const [feedbackRecentLoading, setFeedbackRecentLoading] = useState(false);
    const [feedbackRecentError, setFeedbackRecentError] = useState("");

    useEffect(() => {
        document.body.dataset.theme = theme;
    }, [theme]);

    useEffect(() => {
        if (activeNav !== "Pipelines" && activeNav !== "Overview") {
            return;
        }
        if (feedbackLoading) {
            return;
        }

        const fetchFeedback = async () => {
            setFeedbackLoading(true);
            try {
                const response = await fetch("/api/feedback/summary");
                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(payload.error || "Feedback metrics unavailable.");
                }
                setFeedbackSummary(payload);
            } catch {
                setFeedbackSummary(null);
            } finally {
                setFeedbackLoading(false);
            }
        };

        fetchFeedback();
    }, [activeNav, feedbackLoading]);

    useEffect(() => {
        if (activeNav !== "Datasets" && activeNav !== "Overview") {
            return;
        }
        if (feedbackRecentLoading) {
            return;
        }

        const fetchRecent = async () => {
            setFeedbackRecentLoading(true);
            setFeedbackRecentError("");
            try {
                const response = await fetch("/api/feedback/recent?limit=20");
                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(payload.error || "Feedback history unavailable.");
                }
                setFeedbackRecent(payload.records || []);
            } catch (err) {
                setFeedbackRecentError(err.message || "Feedback history unavailable.");
                setFeedbackRecent([]);
            } finally {
                setFeedbackRecentLoading(false);
            }
        };

        fetchRecent();
    }, [activeNav]);

    useEffect(() => {
        if (activeNav !== "Pipelines" && activeNav !== "Overview") {
            return;
        }
        if (pipelineLoading || pipelineData) {
            return;
        }

        const fetchPipeline = async () => {
            setPipelineLoading(true);
            setPipelineError("");
            try {
                const response = await fetch("/api/pipeline/latest");
                const payload = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(payload.error || "Pipeline metrics unavailable.");
                }
                setPipelineData(payload);
            } catch (err) {
                setPipelineError(err.message || "Pipeline metrics unavailable.");
            } finally {
                setPipelineLoading(false);
            }
        };

        fetchPipeline();
    }, [activeNav, pipelineData, pipelineLoading]);

    const scrollToSection = (key) => {
        const sectionId = sectionMap[key];
        if (!sectionId) {
            return;
        }
        const target = document.getElementById(sectionId);
        if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    const handleNavClick = (key) => {
        setActiveNav(key);
        scrollToSection(key);
    };

    const handleSearchRuns = () => {
        setActiveNav("Models");
        scrollToSection("Models");
    };

    const handleGenerateReport = () => {
        window.open("/api/reports/latest", "_blank", "noopener,noreferrer");
    };

    const toggleTheme = () => {
        setTheme((current) => (current === "light" ? "dark" : "light"));
    };

    const handleOpenArtifacts = () => {
        setActiveNav("Exports");
        scrollToSection("Exports");
    };

    const handleExportLabelIndex = () => {
        window.open("/api/artifacts/labelindex", "_blank", "noopener,noreferrer");
    };

    const handleBatchFileChange = (event) => {
        const file = event.target.files?.[0] || null;
        setBatchFile(file);
        setBatchId(null);
        setBatchSummary(null);
        setBatchRows([]);
        setBatchNote(file ? `Selected: ${file.name}` : "No file selected.");
    };

    const handleBatchUpload = async () => {
        if (!batchFile) {
            setBatchNote("Please choose a file before uploading.");
            return;
        }
        setBatchIsUploading(true);
        setBatchNote("Uploading batch...");
        setBatchSummary(null);
        setBatchRows([]);

        try {
            const formData = new FormData();
            formData.append("file", batchFile);
            const response = await fetch("/api/batch", {
                method: "POST",
                body: formData
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload.error || "Batch upload failed.");
            }

            setBatchId(payload.batchId || null);
            setBatchSummary({
                total: payload.total ?? 0,
                spam: payload.spam ?? 0,
                important: payload.important ?? 0
            });
            setBatchRows(payload.results || []);
            setBatchNote(`Processed ${payload.total ?? 0} rows.`);
        } catch (err) {
            setBatchNote(err.message || "Batch upload failed.");
        } finally {
            setBatchIsUploading(false);
        }
    };

    const handleDownloadBatchResults = () => {
        if (!batchId) {
            setBatchNote("Upload a batch before downloading results.");
            return;
        }
        window.open(`/api/batch/${batchId}/download`, "_blank", "noopener,noreferrer");
    };

    const handleDownloadDemo = () => {
        window.open("/api/batch-demo", "_blank", "noopener,noreferrer");
    };

    const submitFeedback = async (actualLabel) => {
        if (!analysis?.label) {
            return;
        }
        setFeedbackStatus("Submitting feedback...");
        try {
            const response = await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    predicted: analysis.label,
                    actual: actualLabel,
                    sender,
                    subject,
                    body
                })
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload.error || "Failed to save feedback.");
            }
            setFeedbackSummary(payload);
            setPipelineView("live");
            setFeedbackStatus("Feedback saved.");
            if (activeNav === "Datasets" || activeNav === "Overview") {
                try {
                    const refresh = await fetch("/api/feedback/recent?limit=20");
                    const refreshPayload = await refresh.json().catch(() => ({}));
                    if (refresh.ok) {
                        setFeedbackRecent(refreshPayload.records || []);
                    }
                } catch {
                    // Ignore refresh errors after saving feedback.
                }
            }
        } catch (err) {
            setFeedbackStatus(err.message || "Failed to save feedback.");
        }
    };

    const formatTimestamp = (value) => {
        if (!value) {
            return "--";
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }
        return date.toLocaleString();
    };

    const openBatchPicker = () => {
        fileInputRef.current?.click();
    };

    const applyPreset = (key) => {
        const preset = demoPresets[key];
        if (!preset) {
            return;
        }
        setSender(preset.sender);
        setSubject(preset.subject);
        setBody(preset.body);
        setAnalysis(null);
        setError("");
    };

    const pollJob = async (jobId, pollToken, attempt = 0) => {
        if (pollRef.current !== pollToken) {
            return;
        }

        const maxAttempts = 80;
        const delayMs = 1500;

        if (attempt >= maxAttempts) {
            setError("Still processing. Please try again in a moment.");
            setIsAnalyzing(false);
            return;
        }

        try {
            const response = await fetch(`/api/classify/${jobId}`);
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload.error || "Classification failed.");
            }

            if (payload.status === "done" || payload.label) {
                setAnalysis(payload);
                setIsAnalyzing(false);
                return;
            }

            setTimeout(() => pollJob(jobId, pollToken, attempt + 1), delayMs);
        } catch (err) {
            setError(err.message || "Classification failed.");
            setIsAnalyzing(false);
        }
    };

    const handleAnalyze = async () => {
        if (!sender.trim() && !subject.trim() && !body.trim()) {
            setError("Add a sender, subject, or body before analyzing.");
            return;
        }

        const pollToken = pollRef.current + 1;
        pollRef.current = pollToken;
        setIsAnalyzing(true);
        setError("");
        setAnalysis(null);

        let shouldStop = true;

        try {
            const response = await fetch("/api/classify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sender, subject, body })
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload.error || "Classification failed.");
            }

            if (payload.status === "queued" && payload.jobId) {
                if (payload.preview) {
                    setAnalysis(payload.preview);
                }
                shouldStop = false;
                pollJob(payload.jobId, pollToken);
                return;
            }

            setAnalysis(payload);
        } catch (err) {
            setError(err.message || "Classification failed.");
        } finally {
            if (shouldStop && pollRef.current === pollToken) {
                setIsAnalyzing(false);
            }
        }
    };

    const confidencePct = analysis ? Math.round(analysis.confidence * 100) : 0;
    const categoryLabel = analysis ? analysis.label : "--";
    const riskLabel = analysis ? analysis.risk : "--";
    const riskTone = analysis ? analysis.risk.toLowerCase() : "neutral";
    const showAll = activeNav === "Overview";
    const isActive = (key) => showAll || activeNav === key;
    const hasInsights = showAll || activeNav === "Alerts" || activeNav === "Exports";
    const hasLiveFeedback = (feedbackSummary?.total ?? 0) > 0;
    const useLive = pipelineView === "live" && hasLiveFeedback;
    const pipelineStats = useLive ? feedbackSummary : pipelineData;
    const pipelineTotal = pipelineStats?.total ?? null;
    const pipelineImportant = pipelineStats?.classBalance?.important ?? null;
    const pipelineSpam = pipelineStats?.classBalance?.spam ?? null;
    const pipelineImportantPct =
        pipelineTotal && pipelineImportant !== null
            ? Math.round((pipelineImportant / pipelineTotal) * 100)
            : 0;
    const pipelineSpamPct =
        pipelineTotal && pipelineSpam !== null ? Math.round((pipelineSpam / pipelineTotal) * 100) : 0;
    const confusion = pipelineStats?.confusion;

    return (
        <div className={`app${hasInsights ? "" : " no-insights"}`}>
            <aside className="sidebar">
                <div className="brand">
                    <div className="brand-mark">EC</div>
                    <div>
                        <p className="brand-title">Email Core</p>
                        <p className="brand-subtitle">Classification Ops</p>
                    </div>
                </div>

                <nav className="nav">
                    {sidebarItems.map((item) => (
                        <button
                            key={item}
                            type="button"
                            className={item === activeNav ? "nav-item active" : "nav-item"}
                            onClick={() => handleNavClick(item)}
                        >
                            {item}
                        </button>
                    ))}
                </nav>

                <div className="sidebar-card">
                    <p className="card-label">Batch Upload</p>
                    <p className="panel-note">Upload bulk emails for scoring.</p>
                    <button className="secondary" type="button" onClick={() => handleNavClick("Batch Upload")}>
                        Open Batch Upload
                    </button>
                </div>

                <div className="sidebar-card">
                    <p className="card-label">Pipeline Status</p>
                    <div className="status">
                        <span className="status-dot" />
                        <div>
                            <p className="status-title">Stemmed NB Run</p>
                            <p className="status-subtitle">HDFS synced 2 min ago</p>
                        </div>
                    </div>
                    <button className="secondary" type="button" onClick={handleOpenArtifacts}>
                        Open Artifacts
                    </button>
                </div>
            </aside>

            <main className="main">
                <header className="topbar" id="overview">
                    <div>
                        <p className="eyebrow">SpamAssassin / Stemmed</p>
                        <h1>Email Categorization Control Room</h1>
                        <p className="subtitle">
                            Live quality signals from MapReduce preprocessing and Mahout Naive Bayes output.
                        </p>
                    </div>
                    <div className="top-actions">
                        <button className="search" type="button" onClick={handleSearchRuns}>
                            Search runs
                        </button>
                        <button className="theme-toggle" type="button" onClick={toggleTheme}>
                            {theme === "light" ? "Dark mode" : "Light mode"}
                        </button>
                        <button className="primary" type="button" onClick={handleGenerateReport}>
                            Generate Report
                        </button>
                    </div>
                </header>

                {isActive("Overview") ? (
                    <section className="kpi-grid">
                        {kpis.map((kpi, index) => (
                            <div
                                key={kpi.label}
                                className={`kpi-card ${kpi.tone}`}
                                style={{ "--delay": `${index * 80}ms` }}
                            >
                                <div className="kpi-header">
                                    <span>{kpi.label}</span>
                                    <span className="delta">{kpi.delta}</span>
                                </div>
                                <div className="kpi-value">{kpi.value}</div>
                                <div className="sparkline" />
                            </div>
                        ))}
                    </section>
                ) : null}

                {isActive("Datasets") ? (
                    <>
                        <section className="analysis-layout" id="datasets">
                            <div className="panel analyze-panel">
                                <div className="panel-header analyze-header">
                                    <div>
                                        <h2>Analyze an email</h2>
                                        <p className="panel-note">
                                            Add a sender, subject, and body. Use a demo to fill instantly.
                                        </p>
                                    </div>
                                    <div className="demo-buttons">
                                        <button className="demo-button" type="button" onClick={() => applyPreset("spam")}>
                                            Spam demo
                                        </button>
                                        <button
                                            className="demo-button"
                                            type="button"
                                            onClick={() => applyPreset("important")}
                                        >
                                            Important demo
                                        </button>
                                        <button className="demo-button" type="button" onClick={() => applyPreset("finance")}>
                                            Finance demo
                                        </button>
                                    </div>
                                </div>

                                <div className="field-grid">
                                    <div className="field">
                                        <label className="field-label" htmlFor="sender-input">
                                            Sender
                                        </label>
                                        <input
                                            id="sender-input"
                                            className="input"
                                            value={sender}
                                            onChange={(event) => setSender(event.target.value)}
                                            placeholder="security@company.com"
                                        />
                                    </div>
                                    <div className="field">
                                        <label className="field-label" htmlFor="subject-input">
                                            Subject
                                        </label>
                                        <input
                                            id="subject-input"
                                            className="input"
                                            value={subject}
                                            onChange={(event) => setSubject(event.target.value)}
                                            placeholder="Subject line"
                                        />
                                    </div>
                                </div>

                                <div className="field">
                                    <label className="field-label" htmlFor="body-input">
                                        Body
                                    </label>
                                    <textarea
                                        id="body-input"
                                        className="input textarea"
                                        rows={6}
                                        value={body}
                                        onChange={(event) => setBody(event.target.value)}
                                    />
                                </div>

                                <div className="analyze-actions">
                                    <button
                                        className="primary"
                                        type="button"
                                        onClick={handleAnalyze}
                                        disabled={isAnalyzing}
                                    >
                                        {isAnalyzing ? "Analyzing..." : "Analyze Email"}
                                    </button>
                                    <span className="helper-text">
                                        Results include model confidence and risk flags.
                                    </span>
                                </div>
                                {error ? <p className="error-text">{error}</p> : null}
                            </div>

                            <div className="panel prediction-panel">
                                <div className="panel-header">
                                    <h2>Prediction result</h2>
                                    <span className="pill">Confidence {analysis ? `${confidencePct}%` : "--"}</span>
                                </div>
                                <p className="panel-note">Category, risk signals, and actions you can take.</p>
                                <div className="prediction-grid">
                                    <div className="metric-card">
                                        <p className="metric-title">Category</p>
                                        <span className={`badge ${categoryLabel.toLowerCase()}`}>
                                            {categoryLabel}
                                        </span>
                                    </div>
                                    <div className="metric-card">
                                        <p className="metric-title">Risk</p>
                                        <span className={`risk-pill ${riskTone}`}>{riskLabel}</span>
                                        <span className="metric-value">{analysis ? analysis.riskScore : "--"} / 100</span>
                                    </div>
                                    <div className="metric-card">
                                        <p className="metric-title">Confidence</p>
                                        <div className="confidence-bar">
                                            <span style={{ width: `${confidencePct}%` }} />
                                        </div>
                                        <span className="metric-value">
                                            {analysis ? analysis.confidence.toFixed(4) : "--"}
                                        </span>
                                    </div>
                                </div>
                                <div className="signal-list">
                                    <span>Signals:</span>
                                    <span>{analysis ? analysis.signals.join(", ") : "Awaiting model output."}</span>
                                </div>
                                {analysis ? (
                                    <div className="feedback-actions">
                                        <span className="panel-note">Mark actual label:</span>
                                        <div className="batch-buttons">
                                            <button
                                                className="secondary"
                                                type="button"
                                                onClick={() => submitFeedback("Important")}
                                            >
                                                Important
                                            </button>
                                            <button
                                                className="secondary"
                                                type="button"
                                                onClick={() => submitFeedback("Spam")}
                                            >
                                                Spam
                                            </button>
                                        </div>
                                        {feedbackStatus ? <span className="panel-note">{feedbackStatus}</span> : null}
                                    </div>
                                ) : null}
                            </div>
                        </section>
                        <section className="panel feedback-panel" id="feedback-log">
                            <div className="panel-header">
                                <h2>Recent Feedback Labels</h2>
                                <span className="pill">
                                    {feedbackRecent.length ? `${feedbackRecent.length} entries` : "No data"}
                                </span>
                            </div>
                            <p className="panel-note">
                                Latest labels saved to data/feedback/feedback_labels.csv.
                            </p>
                            {feedbackRecentLoading ? (
                                <p className="panel-note">Loading feedback history...</p>
                            ) : feedbackRecentError ? (
                                <p className="error-text">{feedbackRecentError}</p>
                            ) : feedbackRecent.length ? (
                                <div className="feedback-table">
                                    <div className="feedback-row header">
                                        <span>Timestamp</span>
                                        <span>Sender</span>
                                        <span>Subject</span>
                                        <span>Predicted</span>
                                        <span>Actual</span>
                                    </div>
                                    {feedbackRecent.map((row, index) => (
                                        <div key={`${row.timestamp}-${index}`} className="feedback-row">
                                            <span>{formatTimestamp(row.timestamp)}</span>
                                            <span>{row.sender || "--"}</span>
                                            <span>{row.subject || "--"}</span>
                                            <span className="badge small">
                                                {row.predicted ? row.predicted : "--"}
                                            </span>
                                            <span className="badge small">
                                                {row.actual ? row.actual : "--"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="panel-note">No feedback saved yet.</p>
                            )}
                        </section>
                    </>
                ) : null}

                {isActive("Batch Upload") ? (
                    <section className="panel batch-panel" id="batch-upload">
                        <div className="panel-header">
                            <h2>Batch Upload</h2>
                            <span className="pill">Queued</span>
                        </div>
                        <p className="panel-note">
                            Upload a CSV or folder export to run classification in bulk. Results will appear in Exports.
                        </p>
                        <div className="format-card">
                            <p className="panel-note">CSV format (required columns)</p>
                            <code className="format-code">sender,subject,body</code>
                            <p className="panel-note">Example row</p>
                            <code className="format-code">
                                security@verify-now.xyz,Account verification required,"Click to verify your account"
                            </code>
                        </div>
                        <div className="batch-actions">
                            <input
                                className="file-input"
                                type="file"
                                accept=".csv,.txt"
                                onChange={handleBatchFileChange}
                                ref={fileInputRef}
                            />
                            <div className="batch-buttons">
                                <button className="secondary" type="button" onClick={openBatchPicker}>
                                    Choose file
                                </button>
                                <button
                                    className="primary"
                                    type="button"
                                    onClick={handleBatchUpload}
                                    disabled={batchIsUploading}
                                >
                                    {batchIsUploading ? "Uploading..." : "Upload batch"}
                                </button>
                                <button className="secondary" type="button" onClick={handleDownloadDemo}>
                                    Download demo CSV
                                </button>
                                <button className="secondary" type="button" onClick={handleDownloadBatchResults}>
                                    Download results CSV
                                </button>
                            </div>
                            <p className="panel-note">{batchNote}</p>
                        </div>
                        {batchSummary ? (
                            <div className="batch-summary">
                                <div className="summary-item">
                                    <span>Total</span>
                                    <strong>{batchSummary.total}</strong>
                                </div>
                                <div className="summary-item">
                                    <span>Spam</span>
                                    <strong>{batchSummary.spam}</strong>
                                </div>
                                <div className="summary-item">
                                    <span>Important</span>
                                    <strong>{batchSummary.important}</strong>
                                </div>
                            </div>
                        ) : null}
                        {batchRows.length ? (
                            <div className="batch-table">
                                <div className="batch-row header">
                                    <span>Sender</span>
                                    <span>Subject</span>
                                    <span>Label</span>
                                    <span>Risk</span>
                                </div>
                                {batchRows.map((row) => (
                                    <div key={`${row.id}-${row.sender}`} className="batch-row">
                                        <span>{row.sender}</span>
                                        <span>{row.subject}</span>
                                        <span className="badge small">{row.label}</span>
                                        <span className={`risk-pill ${row.risk?.toLowerCase()}`}>{row.risk}</span>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </section>
                ) : null}

                {isActive("Pipelines") ? (
                    <section className="grid-two" id="pipelines">
                        {hasLiveFeedback ? (
                            <div className="pipeline-toggle">
                                <button
                                    className={pipelineView === "pipeline" ? "toggle-button active" : "toggle-button"}
                                    type="button"
                                    onClick={() => setPipelineView("pipeline")}
                                >
                                    Pipeline metrics
                                </button>
                                <button
                                    className={pipelineView === "live" ? "toggle-button active" : "toggle-button"}
                                    type="button"
                                    onClick={() => setPipelineView("live")}
                                >
                                    Live feedback
                                </button>
                            </div>
                        ) : null}
                        <div className="panel pipeline-visual-panel">
                            <div className="panel-header">
                                <h2>Pipeline Map</h2>
                                <span className="pill">Hadoop + Mahout</span>
                            </div>
                            <p className="panel-note">
                                Real flow from raw email to model artifacts and live scoring.
                            </p>
                            <div className="pipeline-visual">
                                <div className="pipeline-lane">
                                    <div className="lane-header">
                                        <span className="lane-title">Training lane</span>
                                        <span className="lane-subtitle">Batch MapReduce + Mahout</span>
                                    </div>
                                    <div className="pipeline-track">
                                        <div className="pipeline-step train">
                                            <span className="step-title">Raw email corpus</span>
                                            <span className="step-note">SpamAssassin + internal mail</span>
                                            <div className="step-tags">
                                                <span className="pipeline-tag">raw</span>
                                            </div>
                                        </div>
                                        <div className="pipeline-step train">
                                            <span className="step-title">HDFS ingest</span>
                                            <span className="step-note">/email_project/raw</span>
                                            <div className="step-tags">
                                                <span className="pipeline-tag">hdfs</span>
                                            </div>
                                        </div>
                                        <div className="pipeline-step train">
                                            <span className="step-title">MapReduce preprocess</span>
                                            <span className="step-note">clean, tokenize, stem</span>
                                            <div className="step-tags">
                                                <span className="pipeline-tag">mapreduce</span>
                                            </div>
                                        </div>
                                        <div className="pipeline-step train">
                                            <span className="step-title">Seq2Sparse + TF-IDF</span>
                                            <span className="step-note">Mahout vectorization</span>
                                            <div className="step-tags">
                                                <span className="pipeline-tag">tfidf</span>
                                                <span className="pipeline-tag">mahout</span>
                                            </div>
                                        </div>
                                        <div className="pipeline-step train">
                                            <span className="step-title">Naive Bayes train + test</span>
                                            <span className="step-note">nb output + metrics</span>
                                            <div className="step-tags">
                                                <span className="pipeline-tag">nb</span>
                                            </div>
                                        </div>
                                        <div className="pipeline-step train">
                                            <span className="step-title">Artifacts + report</span>
                                            <span className="step-note">model + labelindex</span>
                                            <div className="step-tags">
                                                <span className="pipeline-tag">artifacts</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="pipeline-lane">
                                    <div className="lane-header">
                                        <span className="lane-title">Inference lane</span>
                                        <span className="lane-subtitle">API scoring + feedback</span>
                                    </div>
                                    <div className="pipeline-track">
                                        <div className="pipeline-step infer">
                                            <span className="step-title">Artifacts cache</span>
                                            <span className="step-note">artifacts/model_sa</span>
                                            <div className="step-tags">
                                                <span className="pipeline-tag">cache</span>
                                            </div>
                                        </div>
                                        <div className="pipeline-step infer">
                                            <span className="step-title">API scoring</span>
                                            <span className="step-note">classify + batch CSV</span>
                                            <div className="step-tags">
                                                <span className="pipeline-tag">api</span>
                                                <span className="pipeline-tag">fast mode</span>
                                            </div>
                                        </div>
                                        <div className="pipeline-step infer">
                                            <span className="step-title">Dashboard insights</span>
                                            <span className="step-note">risk, confidence, exports</span>
                                            <div className="step-tags">
                                                <span className="pipeline-tag">ui</span>
                                            </div>
                                        </div>
                                        <div className="pipeline-step infer">
                                            <span className="step-title">Feedback loop</span>
                                            <span className="step-note">live confusion matrix</span>
                                            <div className="step-tags">
                                                <span className="pipeline-tag">feedback</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="panel">
                            <div className="panel-header">
                                <h2>Confusion Matrix</h2>
                                <span className="pill">
                                    {pipelineTotal ? `${pipelineTotal} total` : "Latest run"}
                                </span>
                            </div>
                            <div className="matrix">
                                <div className="matrix-cell label">Actual / Pred</div>
                                <div className="matrix-cell label">Important</div>
                                <div className="matrix-cell label">Spam</div>
                                <div className="matrix-cell label">Important</div>
                                <div className="matrix-cell">
                                    {confusion?.important?.important ?? "--"}
                                </div>
                                <div className="matrix-cell warning">
                                    {confusion?.important?.spam ?? "--"}
                                </div>
                                <div className="matrix-cell label">Spam</div>
                                <div className="matrix-cell warning">
                                    {confusion?.spam?.important ?? "--"}
                                </div>
                                <div className="matrix-cell">
                                    {confusion?.spam?.spam ?? "--"}
                                </div>
                            </div>
                            <p className="panel-note">
                                {pipelineLoading
                                    ? "Loading latest pipeline metrics..."
                                    : pipelineError ||
                                    (useLive
                                        ? "Live feedback (session only)."
                                        : "Loaded from latest pipeline metrics report.")}
                            </p>
                        </div>

                        <div className="panel">
                            <div className="panel-header">
                                <h2>Class Balance</h2>
                                <span className="pill">
                                    {pipelineTotal ? `${pipelineTotal} total` : "Latest run"}
                                </span>
                            </div>
                            <div className="progress-row">
                                <div>
                                    <p className="progress-label">Important</p>
                                    <p className="progress-value">
                                        {pipelineImportant !== null ? `${pipelineImportant} docs` : "--"}
                                    </p>
                                </div>
                                <div className="progress-bar">
                                    <span style={{ width: `${pipelineImportantPct}%` }} />
                                </div>
                            </div>
                            <div className="progress-row">
                                <div>
                                    <p className="progress-label">Spam</p>
                                    <p className="progress-value">
                                        {pipelineSpam !== null ? `${pipelineSpam} docs` : "--"}
                                    </p>
                                </div>
                                <div className="progress-bar alt">
                                    <span style={{ width: `${pipelineSpamPct}%` }} />
                                </div>
                            </div>
                            <p className="panel-note">
                                {pipelineLoading
                                    ? "Fetching class balance..."
                                    : pipelineError ||
                                    (useLive ? "Based on live feedback." : "Based on latest pipeline report.")}
                            </p>
                        </div>
                    </section>
                ) : null}

                {isActive("Models") ? (
                    <section className="panel table-panel" id="models">
                        <div className="panel-header">
                            <h2>Recent Runs</h2>
                            <span className="pill">3 entries</span>
                        </div>
                        <div className="table">
                            <div className="table-row header">
                                <span>Run</span>
                                <span>Date</span>
                                <span>Model</span>
                                <span>Status</span>
                            </div>
                            {runs.map((run) => (
                                <div key={run.id} className="table-row">
                                    <span>{run.id}</span>
                                    <span>{run.date}</span>
                                    <span>{run.model}</span>
                                    <span className={run.status === "Healthy" ? "status-pill good" : "status-pill warn"}>
                                        {run.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null}

            </main>

            <aside className="insights">
                {isActive("Alerts") ? (
                    <div className="panel" id="alerts">
                        <div className="panel-header">
                            <h2>Insights</h2>
                            <span className="pill">Auto</span>
                        </div>
                        <div className="insight-card">
                            <p className="insight-title">Stemmer Impact</p>
                            <p className="insight-body">Tokens reduced by 14%. Model variance tightened.</p>
                        </div>
                        <div className="insight-card">
                            <p className="insight-title">Alert Surface</p>
                            <p className="insight-body">False positives below 0.3%. Maintain current threshold.</p>
                        </div>
                    </div>
                ) : null}

                {isActive("Exports") ? (
                    <div className="panel" id="exports">
                        <div className="panel-header">
                            <h2>Artifacts</h2>
                        </div>
                        <div className="artifact">
                            <div>
                                <p className="artifact-title">Stem Metrics</p>
                                <p className="artifact-subtitle">sa_stem_metrics_2026-04-08.txt</p>
                            </div>
                            <button className="secondary" type="button" onClick={handleGenerateReport}>
                                View
                            </button>
                        </div>
                        <div className="artifact">
                            <div>
                                <p className="artifact-title">NB Output</p>
                                <p className="artifact-subtitle">nb-output_sa/part-m-00000</p>
                            </div>
                            <button className="secondary" type="button" onClick={handleExportLabelIndex}>
                                Export
                            </button>
                        </div>
                    </div>
                ) : null}
            </aside>
        </div>
    );
}

export default App;
