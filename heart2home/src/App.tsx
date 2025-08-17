import React, { useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/heart2home/', // This is critical for GitHub Pages subdirectory
})

// ---- Utility: Apple Health parsing (export.xml) --------------------------
function parseAppleHealthXML(xmlText) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    allowBooleanAttributes: true,
  });
  const json = parser.parse(xmlText);
  // Apple export structure: <HealthData><Record .../></HealthData>
  const records = json?.HealthData?.Record || [];
  const workouts = json?.HealthData?.Workout || [];
  return { records: Array.isArray(records) ? records : [records].filter(Boolean), workouts: Array.isArray(workouts) ? workouts : [workouts].filter(Boolean) };
}

function withinLastNDays(isoString, days) {
  if (!isoString) return false;
  const d = new Date(isoString);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

function summarizeLast7Days(data) {
  const last7 = 7;
  const metrics = {
    heartRate: [], // bpm
    restingHeartRate: [], // bpm
    stepCount: [], // steps
    vo2max: [], // ml/kg/min
    bloodPressureSystolic: [],
    bloodPressureDiastolic: [],
  };

  const typeMap = {
    "HKQuantityTypeIdentifierHeartRate": "heartRate",
    "HKQuantityTypeIdentifierRestingHeartRate": "restingHeartRate",
    "HKQuantityTypeIdentifierStepCount": "stepCount",
    "HKQuantityTypeIdentifierVO2Max": "vo2max",
    "HKQuantityTypeIdentifierBloodPressureSystolic": "bloodPressureSystolic",
    "HKQuantityTypeIdentifierBloodPressureDiastolic": "bloodPressureDiastolic",
  };

  for (const r of data.records) {
    const type = r?.["@_type"];
    const valueStr = r?.["@_value"]; // numeric strings
    const start = r?.["@_startDate"];
    if (!type || !withinLastNDays(start, last7)) continue;
    const key = typeMap[type];
    if (key && valueStr != null) {
      const v = Number(valueStr);
      if (!Number.isNaN(v)) metrics[key].push(v);
    }
  }

  // Workouts (duration + type)
  const workouts = [];
  for (const w of data.workouts) {
    const start = w?.["@_startDate"]; 
    if (!withinLastNDays(start, last7)) continue;
    workouts.push({
      activity: w?.["@_workoutActivityType"],
      durationMin: Number(w?.["@_duration"]) || null,
      durationUnit: w?.["@_durationUnit"] || "min",
      totalEnergyBurned: Number(w?.["@_totalEnergyBurned"]) || null,
      totalEnergyBurnedUnit: w?.["@_totalEnergyBurnedUnit"] || null,
      start,
      end: w?.["@_endDate"],
    });
  }

  function basicStats(arr) {
    if (!arr.length) return { count: 0 };
    const count = arr.length;
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    const mean = arr.reduce((a, b) => a + b, 0) / count;
    const sorted = [...arr].sort((a, b) => a - b);
    const median = sorted[Math.floor(count / 2)];
    return { count, min, max, mean: Number(mean.toFixed(2)), median };
  }

  const summary = {
    windowDays: last7,
    heartRate: basicStats(metrics.heartRate),
    restingHeartRate: basicStats(metrics.restingHeartRate),
    stepCount: basicStats(metrics.stepCount),
    vo2max: basicStats(metrics.vo2max),
    bloodPressure: {
      systolic: basicStats(metrics.bloodPressureSystolic),
      diastolic: basicStats(metrics.bloodPressureDiastolic),
    },
    workouts,
  };
  return summary;
}

// ---- Prompt template for SEA-LION ---------------------------------------
function buildSeaLionPrompt(summary) {
  // Enforce strict JSON for easy rendering/checklist generation
  return `You are a careful, evidence-informed cardiology and lifestyle coach. You are NOT a doctor and your output is general information only; include clear safety guidance.\n\nYou are given a 7-day summary of Apple Health data. Analyze heart disease risk and produce structured JSON following EXACTLY this schema (no prose outside JSON):\n\n{\n  "risk_assessment": {\n    "overall_risk": "low|moderate|high",\n    "reasoning": "string",\n    "red_flags": ["string"],\n    "encourage_points": ["string"]\n  },\n  "conclusion": "string",\n  "improvements": ["string"],\n  "meal_plan": {\n    "guidelines": ["string"],\n    "days": [\n      {"day": "Day 1", "breakfast": "string", "lunch": "string", "dinner": "string", "snacks": "string"},\n      {"day": "Day 2", "breakfast": "string", "lunch": "string", "dinner": "string", "snacks": "string"},\n      {"day": "Day 3", "breakfast": "string", "lunch": "string", "dinner": "string", "snacks": "string"},\n      {"day": "Day 4", "breakfast": "string", "lunch": "string", "dinner": "string", "snacks": "string"},\n      {"day": "Day 5", "breakfast": "string", "lunch": "string", "dinner": "string", "snacks": "string"},\n      {"day": "Day 6", "breakfast": "string", "lunch": "string", "dinner": "string", "snacks": "string"},\n      {"day": "Day 7", "breakfast": "string", "lunch": "string", "dinner": "string", "snacks": "string"}\n    ]\n  },\n  "exercise_plan": {\n    "weekly_minutes_target": 150,\n    "mix": ["string"],\n    "sessions": [\n      {"day": "Day 1", "type": "string", "duration_min": 30, "intensity": "easy|moderate|vigorous"},\n      {"day": "Day 2", "type": "string", "duration_min": 30, "intensity": "easy|moderate|vigorous"},\n      {"day": "Day 3", "type": "string", "duration_min": 30, "intensity": "easy|moderate|vigorous"},\n      {"day": "Day 4", "type": "string", "duration_min": 30, "intensity": "easy|moderate|vigorous"},\n      {"day": "Day 5", "type": "string", "duration_min": 30, "intensity": "easy|moderate|vigorous"},\n      {"day": "Day 6", "type": "string", "duration_min": 30, "intensity": "easy|moderate|vigorous"},\n      {"day": "Day 7", "type": "string", "duration_min": 30, "intensity": "easy|moderate|vigorous"}\n    ]\n  },\n  "follow_ups": ["string"],\n  "whats_going_great": ["string"],\n  "checklist": [\n    {"item": "string", "why": "string", "done": false}\n  ],\n  "disclaimer": "string"\n}\n\nIMPORTANT:\n- Base advice on the metrics provided.\n- If anything suggests urgent care (e.g., chest pain, syncope, very high BP), put it in red_flags and say to seek medical attention.\n- Keep cultural/food suggestions broadly accessible.\n\nHere is the 7-day summary JSON to analyze:\n\n${JSON.stringify(summary, null, 2)}`;
}

// ---- UI helpers ----------------------------------------------------------
function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow p-4 sm:p-6 mb-4">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      <div className="prose max-w-none text-sm">{children}</div>
    </div>
  );
}

function JSONBlock({ obj }) {
  return (
    <pre className="text-xs overflow-x-auto bg-slate-50 p-3 rounded-xl border border-slate-200">{JSON.stringify(obj, null, 2)}</pre>
  );
}

// ---- Main App ------------------------------------------------------------
export default function App() {
  const [apiKey, setApiKey] = useState(localStorage.getItem("sea_lion_api_key") || "");
  const [model, setModel] = useState("aisingapore/Llama-SEA-LION-v3-70B-IT");
  const [fileInfo, setFileInfo] = useState(null);
  const [summary, setSummary] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]); // for Q&A turns
  const [error, setError] = useState("");

  useEffect(() => {
    localStorage.setItem("sea_lion_api_key", apiKey || "");
  }, [apiKey]);

  async function handleFile(e) {
    setError("");
    const f = e.target.files?.[0];
    if (!f) return;
    setFileInfo({ name: f.name, size: f.size });

    try {
      if (f.name.toLowerCase().endsWith(".zip")) {
        const zip = await JSZip.loadAsync(f);
        const exportXmlFile = Object.values(zip.files).find((z) => z.name.endsWith("export.xml"));
        if (!exportXmlFile) throw new Error("export.xml not found in zip");
        const xmlText = await exportXmlFile.async("text");
        const parsed = parseAppleHealthXML(xmlText);
        const s = summarizeLast7Days(parsed);
        setSummary(s);
      } else if (f.name.toLowerCase().endsWith(".xml")) {
        const xmlText = await f.text();
        const parsed = parseAppleHealthXML(xmlText);
        const s = summarizeLast7Days(parsed);
        setSummary(s);
      } else {
        throw new Error("Please provide export.zip or export.xml");
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to parse Apple Health export");
    }
  }

  async function callSeaLion(userContent) {
    if (!apiKey) throw new Error("Missing SEA-LION API key");
    const body = {
      max_completion_tokens: 1000,
      messages: userContent,
      model,
      temperature: 0.2,
    };

    const res = await fetch("https://api.sea-lion.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        accept: "text/plain",
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`SEA-LION error ${res.status}: ${t}`);
    }
    const text = await res.text();
    return text;
  }

  async function analyze() {
    if (!summary) return;
    setLoading(true);
    setError("");
    try {
      const prompt = buildSeaLionPrompt(summary);
      const history = [
        { role: "user", content: prompt },
      ];
      const out = await callSeaLion(history);
      let parsed = null;
      try {
        parsed = JSON.parse(out);
      } catch (e) {
        // Try to extract JSON if model wrapped it with prose (shouldn't per prompt)
        const m = out.match(/\{[\s\S]*\}/);
        if (m) parsed = JSON.parse(m[0]);
      }
      if (!parsed) throw new Error("Model did not return valid JSON.");
      setAnalysis(parsed);
      setMessages([{ role: "user", content: prompt }, { role: "assistant", content: JSON.stringify(parsed) }]);
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const randomizeSummary = () => {
  const last7 = Array.from({ length: 7 }, () => Math.floor(Math.random() * 100));
  const workouts = Array.from({ length: 3 }, () => ({
    type: ["Run", "Bike", "Swim"][Math.floor(Math.random() * 3)],
    duration: Math.floor(Math.random() * 120),
  }));

  const summary = {
    windowDays: last7,
    heartRate: 140,
    restingHeartRate: 95,
    stepCount: 500,
    vo2max: 18,
    bloodPressure: {
      systolic: 160,
      diastolic: 100,
    },
    workouts,
  };

  setSummary(summary)
}

  async function askFollowUp(q) {
    setLoading(true);
    setError("");
    try {
      const context = `User question: ${q}\n\nGiven prior result (JSON):\n${JSON.stringify(analysis)}`;
      const followPrompt = `Answer the user question using the prior analysis. If you revise any plan, return JSON with only the changed fields using the SAME schema keys. If it's purely Q&A, return a short, clear paragraph. Include a brief reminder that this is not medical advice.`;
      const convo = [
        ...messages,
        { role: "user", content: context },
        { role: "user", content: followPrompt },
      ];
      const out = await callSeaLion(convo);
      // setMessages([...convo, { role: "assistant", content: out }]);
      setMessages(out);
      return out;
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleChecklist(idx) {
    if (!analysis?.checklist) return;
    const updated = { ...analysis, checklist: analysis.checklist.map((c, i) => i === idx ? { ...c, done: !c.done } : c) };
    setAnalysis(updated);
  }

  const [followQ, setFollowQ] = useState("");
  const [followA, setFollowA] = useState("");

  const hasSummary = Boolean(summary);
  const hasAnalysis = Boolean(analysis);

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-orange-50 text-slate-800 p-3 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <header className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Heart2Home (MPV)</h1>
          <p className="text-sm text-slate-600">Client‑side Apple Health parsing → 7‑day summary → SEA‑LION analysis → actionable checklist. Not medical advice.</p>
        </header>

        {/* <Section title="1) Configure">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">SEA‑LION API Key</span>
              <input
                type="password"
                className="border rounded-xl p-2"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Model</span>
              <input
                type="text"
                className="border rounded-xl p-2"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
            </label>
          </div>
          <p className="text-xs text-slate-500 mt-2">Your key is stored locally in your browser (localStorage). This app is client‑only except for SEA‑LION API calls.</p>
        </Section> */}

        <Section title="Load Apple Health Export (export.zip or export.xml)">
          <div className="flex items-center space-x-2 mb-2">
            <input type="file" accept=".zip,.xml" onChange={handleFile} className="mb-2" />
            <button
              type="button"
              onClick={randomizeSummary}
              className="mb-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Randomize Summary
            </button>
          </div>

          {fileInfo && (
            <div className="text-xs text-slate-600">Loaded: {fileInfo.name} ({Math.round(fileInfo.size/1024)} KB)</div>
          )}
          {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
          {hasSummary && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium">Preview 7‑day summary</summary>
              <JSONBlock obj={summary} />
            </details>
          )}
          <button
            disabled={!hasSummary || loading}
            onClick={analyze}
            className="mt-3 px-4 py-2 rounded-2xl bg-amber-500 text-white disabled:opacity-50"
          >
            {loading ? "Analyzing…" : "Analyze with SEA‑LION"}
          </button>
        </Section>

        {hasAnalysis && (
          <div className="min-h-screen bg-gradient-to-b from-rose-50 to-orange-50 text-slate-800 p-3 sm:p-6">
            <Section title="Risk Assessment">
              <JSONBlock obj={analysis.risk_assessment} />
            </Section>

            <Section title="Conclusion">
              <p>{analysis.conclusion}</p>
            </Section>

            <Section title="Improvements">
              <ul className="list-disc pl-5">
                {analysis.improvements?.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </Section>

            <Section title="Meal Plan (7 days)">
              <div className="mb-2">
                <ul className="list-disc pl-5 text-sm">
                  {analysis.meal_plan?.guidelines?.map((g, i) => <li key={i}>{g}</li>)}
                </ul>
              </div>
              <div className="grid gap-3">
                {analysis.meal_plan?.days?.map((d, i) => (
                  <div key={i} className="border rounded-xl p-3 bg-white">
                    <div className="font-medium mb-1">{d.day}</div>
                    <div className="text-sm">🥣 Breakfast: {d.breakfast}</div>
                    <div className="text-sm">🍱 Lunch: {d.lunch}</div>
                    <div className="text-sm">🍽️ Dinner: {d.dinner}</div>
                    <div className="text-sm">🍎 Snacks: {d.snacks}</div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Exercise Plan">
              <div className="text-sm mb-2">Target weekly minutes: {analysis.exercise_plan?.weekly_minutes_target}</div>
              <div className="text-sm mb-2">Mix: {analysis.exercise_plan?.mix?.join(", ")}</div>
              <div className="grid gap-3">
                {analysis.exercise_plan?.sessions?.map((s, i) => (
                  <div key={i} className="border rounded-xl p-3">
                    <div className="font-medium">{s.day}</div>
                    <div className="text-sm">Type: {s.type} · {s.duration_min} min · {s.intensity}</div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Follow‑ups">
              <ul className="list-disc pl-5">
                {analysis.follow_ups?.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </Section>

            <Section title="What’s Going Great">
              <ul className="list-disc pl-5">
                {analysis.whats_going_great?.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </Section>

            <Section title="Checklist (tick items)">
              {!analysis.checklist?.length && <div className="text-sm text-slate-600">No checklist items provided by the model.</div>}
              <div className="grid gap-2">
                {analysis.checklist?.map((c, i) => (
                  <label key={i} className="flex items-start gap-2 border rounded-xl p-2">
                    <input type="checkbox" checked={!!c.done} onChange={() => toggleChecklist(i)} />
                    <div>
                      <div className="text-sm font-medium">{c.item}</div>
                      <div className="text-xs text-slate-600">{c.why}</div>
                    </div>
                  </label>
                ))}
              </div>
            </Section>

            <Section title="Follow‑up Q&A">
              <div className="flex flex-col sm:flex-row gap-2">
                <input className="border rounded-xl p-2 flex-1" placeholder="Ask a question about your plan…" style={{ width: "80vw", height: "20vh"}} value={followQ} onChange={(e) => setFollowQ(e.target.value)} />
                <button className="px-4 py-2 rounded-2xl bg-sky-600 text-white disabled:opacity-50" disabled={!followQ || loading} onClick={async () => {
                  const a = await askFollowUp(followQ);
                  setFollowA(a || "");
                }}>Ask</button>
              </div>
              {followA && (
                <div className="mt-3">
                  <div className="text-xs text-slate-500 mb-1">Assistant</div>
                  <div className="text-sm whitespace-pre-wrap bg-white border rounded-xl p-3">{followA}</div>
                </div>
              )}
            </Section>

            <Section title="Disclaimer">
              <p className="text-sm">This app provides general information and is not a medical device. It does not diagnose or treat conditions. If you experience concerning symptoms (e.g., chest pain, fainting, shortness of breath, very high blood pressure), seek medical care immediately.</p>
            </Section>
          </div>
        )}

        {!hasAnalysis && (
          <Section title="Tips">
            <ul className="list-disc pl-5 text-sm">
              <li>Export Apple Health data from your iPhone → Health → your avatar → Export All Health Data (you’ll get export.zip).</li>
              <li>Drop the zip or export.xml here. We summarize the last 7 days on-device.</li>
              <li>Click “Analyze with SEA‑LION” to get a structured plan and checklist.</li>
            </ul>
          </Section>
        )}
      </div>
    </div>
  );
}
