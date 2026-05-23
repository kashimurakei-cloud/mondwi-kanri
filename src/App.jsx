import { useState, useMemo, useRef, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyAROXL2S0Pez5wYSQ32NoRKcOYhbFiaYEQ",
  authDomain: "mondai-kanri.firebaseapp.com",
  projectId: "mondai-kanri",
  storageBucket: "mondai-kanri.firebasestorage.app",
  messagingSenderId: "262083892055",
  appId: "1:262083892055:web:c59467211559dbe4096412"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const DOC_ID = "shared";

async function saveProblems(problems) {
  try {
    console.log("Saving to Firestore...");
    await setDoc(doc(db, "mondai", DOC_ID), { problems: JSON.stringify(problems) });
    console.log("Saved successfully!");
  } catch(e) {
    console.error("Save error:", e.message);
  }
}
async function loadProblems() {
  const snap = await getDoc(doc(db, "mondai", DOC_ID));
  if (!snap.exists()) return [];
  const data = snap.data();
  return JSON.parse(data.problems || "[]");
}

const SUBJECTS = ["算数", "国語", "理科", "社会", "英語"];
const SOURCES = ["市販の問題集", "塾のテスト", "塾のプリント", "過去問"];
const STATUSES = [
  { key: "未復習", label: "未復習", color: "#ef4444", bg: "#fef2f2" },
  { key: "復習中", label: "復習中", color: "#f59e0b", bg: "#fffbeb" },
  { key: "完了",   label: "完了",   color: "#22c55e", bg: "#f0fdf4" },
];
const MODES = [
  { key: "problem", label: "📝 問題",   desc: "計算・読解など" },
  { key: "kanji",   label: "🖊️ 漢字",   desc: "漢字の読み書き" },
  { key: "english", label: "🔤 英単語", desc: "英単語・意味" },
];
const IMPORTANCE = [
  { key: 1, label: "★",   desc: "普通",   color: "#94a3b8" },
  { key: 2, label: "★★",  desc: "重要",   color: "#f59e0b" },
  { key: 3, label: "★★★", desc: "最重要", color: "#ef4444" },
];
const initialProblemForm = {
  mode: "problem", subject: "", source: "", sourceName: "",
  memo: "", transcription: "", status: "未復習", answerPhoto: null,
  importance: 1, reviewCount: 0,
  date: new Date().toISOString().slice(0, 10), photo: null,
};
const initialKanjiForm = {
  mode: "kanji", subject: "国語", source: "", sourceName: "",
  wordQuestion: "", wordAnswer: "", memo: "", status: "未復習",
  importance: 1, reviewCount: 0,
  date: new Date().toISOString().slice(0, 10),
};
const initialEnglishForm = {
  mode: "english", subject: "英語", source: "", sourceName: "",
  wordQuestion: "", wordAnswer: "", memo: "", status: "未復習",
  importance: 1, reviewCount: 0,
  date: new Date().toISOString().slice(0, 10),
};
const B = { border: "none", cursor: "pointer", fontFamily: "inherit", transition: "all .12s" };

function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const original = ev.target.result;
      try {
        const img = new Image();
        img.onerror = () => resolve(original);
        img.onload = () => {
          try {
            const MAX = 800;
            const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
            const w = Math.round(img.width * ratio);
            const h = Math.round(img.height * ratio);
            const canvas = document.createElement("canvas");
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (!ctx) { resolve(original); return; }
            ctx.drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL("image/jpeg", 0.5) || original);
          } catch { resolve(original); }
        };
        img.src = original;
      } catch { resolve(original); }
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

function StatusBadge({ status, onClick, small }) {
  const s = STATUSES.find(x => x.key === status) || STATUSES[0];
  return (
    <button onClick={onClick} style={{
      background: s.bg, color: s.color, border: "1.5px solid " + s.color,
      borderRadius: 999, padding: small ? "2px 10px" : "4px 14px",
      fontSize: small ? 11 : 12, fontWeight: 700,
      cursor: onClick ? "pointer" : "default", fontFamily: "inherit", whiteSpace: "nowrap",
    }}>{s.label}</button>
  );
}

function FlashPanel({ problem, onClose, onNext, onCycleStatus, onIncrementReview }) {
  const [phase, setPhase] = useState(0);
  const isWord = problem.mode === "kanji" || problem.mode === "english";
  const imp = IMPORTANCE.find(i => i.key === (problem.importance || 1));
  const st = STATUSES.find(s => s.key === problem.status) || STATUSES[0];
  
  return (
    <div style={{
      width: "100%", height: "100%", borderRadius: 20, overflow: "hidden",
      background: "#ffffff", color: "#1a1a1a",
      display: "flex", flexDirection: "column", transition: "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ background: "rgba(255,255,255,0.15)", color: "#fff", borderRadius: 6, padding: "3px 10px", fontSize: 13, fontWeight: 700 }}>{problem.subject}</span>
          <span style={{ color: imp.color, fontWeight: 700 }}>{imp.label}</span>
          <button onClick={() => onCycleStatus(problem.id)}
            style={{ background: st.bg, color: st.color, border: "none", cursor: "pointer", borderRadius: 999, padding: "2px 10px", fontSize: 11, fontWeight: 700, fontFamily: "inherit" }}>
            {st.label}
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => onIncrementReview(problem.id)}
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", cursor: "pointer", borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>
            {"📖 " + (problem.reviewCount || 0) + "回"}
          </button>
          <button onClick={onClose}
            style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", cursor: "pointer", borderRadius: 999, padding: "5px 14px", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}>✕</button>
        </div>
      </div>
      <div style={{ textAlign: "center", padding: "12px 0 0", fontSize: 12, color: "rgba(255,255,255,0.45)", letterSpacing: 3 }}>
        {phase === 0 ? "── 問 題 ──" : "── 答 え ──"}
      </div>
      <div onClick={() => setPhase(ph => { if (ph === 0) return 1; onNext ? onNext() : onClose(); return 0; })}
        style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40, cursor: "pointer", textAlign: "center" }}>
        {phase === 0 ? (
          isWord ? (
            <div style={{ color: "#1a1a1a", fontSize: 40, fontWeight: 800, lineHeight: 1.5 }}>
              {problem.wordQuestion || "（読みを登録してください）"}
            </div>
          ) : problem.photo ? (
            <img src={problem.photo} alt="問題" style={{ maxWidth: "100%", maxHeight: "55vh", borderRadius: 12, objectFit: "contain" }} />
          ) : (
            <div style={{ color: "#1a5c2a", fontSize: 22, fontWeight: 700, lineHeight: 1.8 }}>
              {problem.transcription || problem.memo || "（問題文が登録されていません）"}
            </div>
          )
        ) : (
          isWord ? (
            <div style={{ color: "#1a5c2a", fontSize: 52, fontWeight: 900 }}>{problem.wordAnswer}</div>
          ) : problem.answerPhoto ? (
            <img src={problem.answerPhoto} alt="答え" style={{ maxWidth: "100%", maxHeight: "55vh", borderRadius: 12, objectFit: "contain" }} />
          ) : (
            <div style={{ color: "#1a5c2a", fontSize: 22, fontWeight: 700, lineHeight: 1.8 }}>
              {problem.memo || "（答えが登録されていません）"}
            </div>
          )
        )}
      </div>
      <div style={{ textAlign: "center", padding: "0 20px 24px", fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
        {phase === 0 ? "タップして答えを見る" : "タップして問題に戻る"}
      </div>
    </div>
  );
}

function FlashCard({ problem, onClose, onNext, onReviewCountUp }) {
  const [phase, setPhase] = useState(0);
  
  const isWord = problem.mode === "kanji" || problem.mode === "english";
  const imp = IMPORTANCE.find(i => i.key === (problem.importance || 1));
  return (
    <div onClick={() => { if (phase === 0) { setPhase(1); } else { onNext ? onNext() : onClose(); } }} style={{
      position: "fixed", inset: 0, zIndex: 2000,
      background: "#ffffff", color: "#1a1a1a",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 24, cursor: "pointer", transition: "none",
    }}>
      <button onClick={e => { e.stopPropagation(); onClose(); }}
        style={{ ...B, position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.15)", color: "#fff", borderRadius: 999, padding: "6px 14px", fontSize: 13, fontWeight: 700 }}>✕ 閉じる</button>
      <button onClick={e => { e.stopPropagation(); onReviewCountUp(problem.id); }}
        style={{ ...B, position: "absolute", top: 20, left: 20, background: "rgba(255,255,255,0.15)", color: "#fff", borderRadius: 999, padding: "6px 12px", fontSize: 12, fontWeight: 700 }}>
        {"📖 " + (problem.reviewCount || 0) + "回"}
      </button>
      <div style={{ display: "flex", gap: 8, marginBottom: 24, alignItems: "center" }}>
        <span style={{ background: "rgba(255,255,255,0.15)", color: "#fff", borderRadius: 6, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{problem.subject}</span>
        <span style={{ color: imp.color, fontWeight: 700, fontSize: 13 }}>{imp.label}</span>
        <StatusBadge status={problem.status} small />
      </div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 16, letterSpacing: 2 }}>
        {phase === 0 ? "── 問 題 ──" : "── 答 え ──"}
      </div>
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        {phase === 0 ? (
          isWord ? (
            <div style={{ color: "#1a1a1a", fontSize: 28, fontWeight: 800, lineHeight: 1.5 }}>
              {problem.wordQuestion || "（読みを登録してください）"}
            </div>
          ) : problem.photo ? (
            <img src={problem.photo} alt="問題" style={{ maxWidth: "100%", maxHeight: "50vh", borderRadius: 12, objectFit: "contain" }} />
          ) : (
            <div style={{ color: "#1a5c2a", fontSize: 18, fontWeight: 700, lineHeight: 1.7 }}>
              {problem.transcription || problem.memo || "（問題文が登録されていません）"}
            </div>
          )
        ) : (
          isWord ? (
            <div style={{ color: "#1a5c2a", fontSize: 36, fontWeight: 900 }}>{problem.wordAnswer}</div>
          ) : problem.answerPhoto ? (
            <img src={problem.answerPhoto} alt="答え" style={{ maxWidth: "100%", maxHeight: "55vh", borderRadius: 12, objectFit: "contain" }} />
          ) : (
            <div style={{ color: "#1a5c2a", fontSize: 18, fontWeight: 700, lineHeight: 1.7 }}>
              {problem.memo || "（答えが登録されていません）"}
            </div>
          )
        )}
      </div>
      <div style={{ position: "absolute", bottom: 32, color: "rgba(255,255,255,0.35)", fontSize: 12 }}>
        {phase === 0 ? "タップして答えを見る" : "もう一度タップで閉じる"}
      </div>
    </div>
  );
}

function SubjectRow({ form, setForm }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6 }}>科目 *</label>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {SUBJECTS.map(s => (
          <button key={s} onClick={() => setForm(f => ({ ...f, subject: s }))}
            style={{ ...B, padding: "6px 14px", borderRadius: 999, fontSize: 13, border: "1.5px solid",
              background: form.subject === s ? "#1e3a5f" : "#fff",
              color: form.subject === s ? "#fff" : "#475569",
              borderColor: form.subject === s ? "#1e3a5f" : "#e2e8f0",
              fontWeight: form.subject === s ? 700 : 400 }}>{s}</button>
        ))}
      </div>
    </div>
  );
}

function SubjectSourceRow({ form, setForm }) {
  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6 }}>科目 *</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SUBJECTS.map(s => (
            <button key={s} onClick={() => setForm(f => ({ ...f, subject: s }))}
              style={{ ...B, padding: "6px 14px", borderRadius: 999, fontSize: 13, border: "1.5px solid",
                background: form.subject === s ? "#1e3a5f" : "#fff",
                color: form.subject === s ? "#fff" : "#475569",
                borderColor: form.subject === s ? "#1e3a5f" : "#e2e8f0",
                fontWeight: form.subject === s ? 700 : 400 }}>{s}</button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6 }}>出どころ *</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SOURCES.map(s => (
            <button key={s} onClick={() => setForm(f => ({ ...f, source: s }))}
              style={{ ...B, padding: "6px 14px", borderRadius: 999, fontSize: 13, border: "1.5px solid",
                background: form.source === s ? "#2d6a9f" : "#fff",
                color: form.source === s ? "#fff" : "#475569",
                borderColor: form.source === s ? "#2d6a9f" : "#e2e8f0",
                fontWeight: form.source === s ? 700 : 400 }}>{s}</button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6 }}>
          {form.source === "過去問" ? "学校名・年度" : "問題集名・テスト名など"}
        </label>
        <input value={form.sourceName} onChange={e => setForm(f => ({ ...f, sourceName: e.target.value }))}
          placeholder={form.source === "過去問" ? "例: 開成中 2024年" : "例: 予習シリーズ 算数4年上"}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e2e8f0",
            fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", outline: "none", background: "#fff" }} />
      </div>
    </div>
  );
}

function WordForm({ form, setForm, isEnglish }) {
  const [aiState, setAiState] = useState("idle");
  const handleAiConvert = async () => {
    if (!form.wordAnswer) return;
    setAiState("loading");
    try {
      const prompt = isEnglish
        ? form.wordAnswer + "の日本語の意味を短く。意味のみ出力。"
        : "次をひらがなに変換してください。変換結果のみ出力。" + form.wordAnswer;
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 200, messages: [{ role: "user", content: prompt }] })
      });
      const data = await res.json();
      setForm(f => ({ ...f, wordQuestion: (data.content && data.content[0] ? data.content[0].text : "").trim() }));
      setAiState("done");
    } catch { setAiState("error"); }
  };
  const ac = isEnglish ? "#1e40af" : "#166534";
  const bc = isEnglish ? "#bfdbfe" : "#bbf7d0";
  const bg = isEnglish ? "#eff6ff" : "#f0fdf4";
  const lc = isEnglish ? "#93c5fd" : "#4ade80";
  return (
    <div style={{ background: bg, border: "1.5px solid " + bc, borderRadius: 14, padding: 14, marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: ac, marginBottom: 14 }}>
        {isEnglish ? "🔤 英単語登録" : "🖊️ 漢字登録"}
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
          {"答え（" + (isEnglish ? "英単語" : "漢字") + "）"}
        </label>
        <input value={form.wordAnswer} onChange={e => setForm(f => ({ ...f, wordAnswer: e.target.value }))}
          placeholder={isEnglish ? "例: registration" : "例: 漢字"}
          style={{ width: "100%", padding: "12px", borderRadius: 10, border: "1.5px solid #e2e8f0",
            fontSize: 16, fontFamily: "inherit", boxSizing: "border-box", background: "#fff", fontWeight: 700 }} />
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 4 }}>
          {"問題文（" + (isEnglish ? "日本語の意味" : "ひらがな") + "）"}
        </label>
        <input value={form.wordQuestion} onChange={e => setForm(f => ({ ...f, wordQuestion: e.target.value }))}
          placeholder={isEnglish ? "例: とうろく" : "例: かんじ"}
          style={{ width: "100%", padding: "12px", borderRadius: 10, border: "1.5px solid " + bc,
            fontSize: 15, fontFamily: "inherit", boxSizing: "border-box", background: "#fff", color: ac }} />
        <div style={{ fontSize: 11, color: lc, marginTop: 3 }}>💡 キーボードで直接入力できます</div>
      </div>
      <div style={{ borderTop: "1px solid " + bc, paddingTop: 10 }}>
        <button onClick={handleAiConvert} disabled={aiState === "loading" || !form.wordAnswer}
          style={{ ...B, padding: "7px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700,
            background: (aiState === "loading" || !form.wordAnswer) ? "#e2e8f0" : (isEnglish ? "#dbeafe" : "#dcfce7"),
            color: (aiState === "loading" || !form.wordAnswer) ? "#94a3b8" : ac,
            border: "1px solid " + bc }}>
          {aiState === "loading" ? "⏳ 変換中…" : (isEnglish ? "🤖 AI で意味を入力" : "🤖 AI でひらがなに変換")}
        </button>
        {aiState === "error" && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 6 }}>⚠️ 手入力してください。</div>}
        {aiState === "done" && <div style={{ fontSize: 11, color: "#16a34a", marginTop: 6 }}>✅ 変換しました。</div>}
      </div>
    </div>
  );
}

function AddForm({ editId, formMode, setFormMode, problemForm, setProblemForm, wordForm, setWordForm, onSave, onCancel }) {
  const [aiLoading, setAiLoading] = useState(false);
  const fileRef = useRef();
  const answerFileRef = useRef();
  const form = formMode === "problem" ? problemForm : wordForm;
  const setForm = formMode === "problem" ? setProblemForm : setWordForm;

  const handlePhoto = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const compressed = await compressImage(file);
    if (compressed) setProblemForm(f => ({ ...f, photo: compressed, transcription: "" }));
  };
  const handleAnswerPhoto = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const compressed = await compressImage(file);
    if (compressed) setProblemForm(f => ({ ...f, answerPhoto: compressed }));
  };
  const handleAiTranscribe = async () => {
    if (!problemForm.photo) return;
    setAiLoading(true);
    try {
      const imgData = problemForm.photo.split(",")[1];
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          messages: [{ role: "user", content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imgData } },
            { type: "text", text: "中学受験の問題写真です。問題文のみ清書してください。余計な説明不要。" }
          ]}]
        })
      });
      const data = await res.json();
      setProblemForm(f => ({ ...f, transcription: data.content && data.content[0] ? data.content[0].text : "" }));
    } catch { alert("AI読み取りできませんでした。"); }
    finally { setAiLoading(false); }
  };

  return (
    <div style={{ padding: 16 }}>
      {!editId && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {MODES.map(m => (
            <button key={m.key} onClick={() => setFormMode(m.key)}
              style={{ ...B, flex: 1, padding: "10px 4px", borderRadius: 12, fontSize: 12, fontWeight: 700, border: "2px solid",
                background: formMode === m.key ? "#1e3a5f" : "#fff",
                color: formMode === m.key ? "#fff" : "#475569",
                borderColor: formMode === m.key ? "#1e3a5f" : "#e2e8f0" }}>
              <div>{m.label}</div>
              <div style={{ fontSize: 10, fontWeight: 400, opacity: 0.7, marginTop: 2 }}>{m.desc}</div>
            </button>
          ))}
        </div>
      )}
      {formMode === "problem" && (
        <div>
          <div style={{ marginBottom: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6 }}>📷 問題の写真</label>
            <div onClick={() => fileRef.current.click()}
              style={{ border: "2px dashed #cbd5e1", borderRadius: 14, padding: problemForm.photo ? 8 : 20,
                textAlign: "center", cursor: "pointer", marginBottom: 6, background: problemForm.photo ? "transparent" : "#f8fafc" }}>
              {problemForm.photo
                ? <img src={problemForm.photo} alt="問題" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, objectFit: "contain" }} />
                : <div><div style={{ fontSize: 32 }}>📷</div><div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>問題の写真を追加（任意）</div></div>}
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
            </div>
            {problemForm.photo && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <button onClick={handleAiTranscribe} disabled={aiLoading}
                    style={{ ...B, padding: "7px 12px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                      background: aiLoading ? "#e2e8f0" : "#ede9fe", color: aiLoading ? "#94a3b8" : "#6d28d9",
                      border: "1px solid #ddd6fe" }}>
                    {aiLoading ? "⏳ 読取中…" : "🤖 AIで問題文を清書"}
                  </button>
                  <button onClick={() => setProblemForm(f => ({ ...f, photo: null, transcription: "" }))}
                    style={{ ...B, fontSize: 12, color: "#ef4444", background: "none" }}>× 削除</button>
                </div>
                {problemForm.transcription && (
                  <div style={{ marginTop: 10, background: "#faf5ff", border: "1.5px solid #e9d5ff", borderRadius: 10, padding: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", marginBottom: 6 }}>🤖 AI清書結果（編集できます）</div>
                    <textarea value={problemForm.transcription} onChange={e => setProblemForm(f => ({ ...f, transcription: e.target.value }))}
                      rows={4} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e9d5ff",
                        fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", resize: "vertical", background: "#fff" }} />
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6 }}>✏️ 答えの写真</label>
            <div onClick={() => answerFileRef.current.click()}
              style={{ border: "2px dashed #bfdbfe", borderRadius: 14, padding: problemForm.answerPhoto ? 8 : 20,
                textAlign: "center", cursor: "pointer", background: problemForm.answerPhoto ? "transparent" : "#eff6ff" }}>
              {problemForm.answerPhoto
                ? <img src={problemForm.answerPhoto} alt="答え" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 8, objectFit: "contain" }} />
                : <div><div style={{ fontSize: 32 }}>✏️</div><div style={{ fontSize: 13, color: "#3b82f6", marginTop: 4 }}>答えの写真を追加（任意）</div></div>}
              <input ref={answerFileRef} type="file" accept="image/*" onChange={handleAnswerPhoto} style={{ display: "none" }} />
            </div>
            {problemForm.answerPhoto && (
              <button onClick={() => setProblemForm(f => ({ ...f, answerPhoto: null }))}
                style={{ ...B, fontSize: 12, color: "#ef4444", background: "none", marginTop: 4 }}>× 答えの写真を削除</button>
            )}
          </div>
        </div>
      )}
      {formMode === "kanji" && <WordForm form={form} setForm={setForm} isEnglish={false} />}
      {formMode === "english" && <WordForm form={form} setForm={setForm} isEnglish={true} />}
      {formMode === "problem" ? <SubjectSourceRow form={form} setForm={setForm} /> : <SubjectRow form={form} setForm={setForm} />}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6 }}>間違えた日</label>
        <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6 }}>復習ステータス</label>
        <div style={{ display: "flex", gap: 8 }}>
          {STATUSES.map(s => (
            <button key={s.key} onClick={() => setForm(f => ({ ...f, status: s.key }))}
              style={{ ...B, flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 12, border: "2px solid " + s.color,
                background: form.status === s.key ? s.color : "#fff",
                color: form.status === s.key ? "#fff" : s.color, fontWeight: 700 }}>{s.label}</button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6 }}>重要度</label>
        <div style={{ display: "flex", gap: 8 }}>
          {IMPORTANCE.map(imp => (
            <button key={imp.key} onClick={() => setForm(f => ({ ...f, importance: imp.key }))}
              style={{ ...B, flex: 1, padding: "8px 4px", borderRadius: 10, fontSize: 13, border: "2px solid " + imp.color,
                background: form.importance === imp.key ? imp.color : "#fff",
                color: form.importance === imp.key ? "#fff" : imp.color, fontWeight: 700,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span>{imp.label}</span>
              <span style={{ fontSize: 9, fontWeight: 400, opacity: 0.85 }}>{imp.desc}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6 }}>メモ</label>
        <textarea value={form.memo} onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
          placeholder="ポイントや解き方など" rows={3}
          style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid #e2e8f0",
            fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" }} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {onCancel && (
          <button onClick={onCancel}
            style={{ ...B, flex: 1, padding: "13px 0", borderRadius: 12, border: "1.5px solid #e2e8f0",
              background: "#f8fafc", color: "#475569", fontSize: 14, fontWeight: 700 }}>キャンセル</button>
        )}
        <button onClick={onSave}
          style={{ ...B, flex: 2, padding: "14px 0", borderRadius: 12,
            background: "linear-gradient(135deg, #1e3a5f, #2d6a9f)", color: "#fff", fontSize: 15, fontWeight: 800,
            boxShadow: "0 4px 12px rgba(30,58,95,0.3)" }}>
          {editId !== null ? "更新する" : "登録する"}
        </button>
      </div>
    </div>
  );
}

function ProblemList({ filtered, storageReady, filterSubject, setFilterSubject, filterStatus, setFilterStatus, filterMode, setFilterMode, sortKey, setSortKey, onCardTap, onEdit, onDelete, onCycleStatus, onIncrementReview, selectedId }) {
  return (
    <div style={{ padding: 14 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 12, marginBottom: 14, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", marginBottom: 8 }}>フィルター／ソート</div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 7 }}>
          {[["全て","全て"],["problem","📝"],["kanji","🖊️"],["english","🔤"]].map(([k,l]) => (
            <button key={k} onClick={() => setFilterMode(k)}
              style={{ ...B, padding: "4px 10px", borderRadius: 999, fontSize: 11, border: "1px solid",
                background: filterMode===k?"#334155":"#f1f5f9", color: filterMode===k?"#fff":"#475569",
                borderColor: filterMode===k?"#334155":"#e2e8f0", fontWeight: filterMode===k?700:400 }}>{l}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 7 }}>
          {["全て",...SUBJECTS].map(s => (
            <button key={s} onClick={() => setFilterSubject(s)}
              style={{ ...B, padding: "4px 10px", borderRadius: 999, fontSize: 11, border: "1px solid",
                background: filterSubject===s?"#1e3a5f":"#f1f5f9", color: filterSubject===s?"#fff":"#475569",
                borderColor: filterSubject===s?"#1e3a5f":"#e2e8f0", fontWeight: filterSubject===s?700:400 }}>{s}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 7 }}>
          {["全て","完了以外",...STATUSES.map(s=>s.key)].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              style={{ ...B, padding: "4px 10px", borderRadius: 999, fontSize: 11, border: "1px solid",
                background: filterStatus===s?"#2d6a9f":"#f1f5f9", color: filterStatus===s?"#fff":"#475569",
                borderColor: filterStatus===s?"#2d6a9f":"#e2e8f0", fontWeight: filterStatus===s?700:400 }}>{s}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>並替:</span>
          {[["date","日付"],["importance","重要度"],["status","状態"],["random","🔀ランダム"]].map(([k,l]) => (
            <button key={k} onClick={() => setSortKey(k)}
              style={{ ...B, padding: "4px 10px", borderRadius: 999, fontSize: 11, border: "1px solid",
                background: sortKey===k?"#475569":"#f1f5f9", color: sortKey===k?"#fff":"#475569",
                borderColor: sortKey===k?"#475569":"#e2e8f0", fontWeight: sortKey===k?700:400 }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10 }}>{filtered.length}件　💡 タップで問題確認</div>
      {!storageReady && <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>⏳ 読み込み中…</div>}
      {storageReady && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
          <div style={{ fontSize: 14 }}>まだ問題が登録されていません</div>
        </div>
      )}
      {storageReady && filtered.map(p => {
        const isWord = p.mode === "kanji" || p.mode === "english";
        const statusColor = STATUSES.find(s => s.key === p.status)?.color || "#e2e8f0";
        const imp = IMPORTANCE.find(i => i.key === (p.importance || 1));
        const modeIcon = p.mode === "kanji" ? "🖊️" : p.mode === "english" ? "🔤" : "📝";
        return (
          <div key={p.id} style={{ background: "#fff", borderRadius: 14, marginBottom: 10,
            boxShadow: selectedId === p.id ? "0 0 0 2.5px #2d6a9f" : "0 1px 6px rgba(0,0,0,0.06)",
            borderLeft: "4px solid " + statusColor, overflow: "hidden" }}>
            <div onClick={() => onCardTap(p)} style={{ padding: 14, cursor: "pointer" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                {(p.photo || p.answerPhoto) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {p.photo && <div>
                      <div style={{ fontSize: 9, color: "#94a3b8", marginBottom: 2, textAlign: "center" }}>問題</div>
                      <img src={p.photo} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: "2px solid #e2e8f0" }} alt="" />
                    </div>}
                    {p.answerPhoto && <div>
                      <div style={{ fontSize: 9, color: "#3b82f6", marginBottom: 2, textAlign: "center" }}>答え</div>
                      <img src={p.answerPhoto} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: "2px solid #bfdbfe" }} alt="" />
                    </div>}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                    <span style={{ background: isWord ? "#f0fdf4" : "#f1f5f9",
                      color: isWord ? "#166534" : "#1e3a5f", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                      {modeIcon} {p.subject}
                    </span>
                    {p.source && <span style={{ fontSize: 11, color: "#94a3b8" }}>{p.source}{p.sourceName ? "・" + p.sourceName : ""}</span>}
                  </div>
                  {isWord && (
                    <div style={{ background: "#f0fdf4", borderRadius: 10, padding: "8px 12px", marginBottom: 6 }}>
                      <div style={{ fontSize: 14, color: "#166534", fontWeight: 700 }}>{p.wordQuestion || "—"}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>答えはタップして確認</div>
                    </div>
                  )}
                  {!isWord && (p.transcription || p.memo) && (
                    <div style={{ fontSize: 13, color: "#334155", marginBottom: 6, lineHeight: 1.5,
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {p.transcription || p.memo}
                    </div>
                  )}
                  {!isWord && !p.transcription && !p.memo && !p.photo && (
                    <div style={{ fontSize: 12, color: "#cbd5e1", marginBottom: 6 }}>タップして問題を確認</div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <StatusBadge status={p.status} onClick={e => { e.stopPropagation(); onCycleStatus(p.id); }} small />
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: imp.color, fontWeight: 700 }}>{imp.label}</span>
                      <span style={{ fontSize: 11, color: "#cbd5e1" }}>{p.date}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ borderTop: "1px solid #f1f5f9", padding: "8px 14px",
              display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fafafa" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>復習</span>
                <div style={{ display: "flex", gap: 3 }}>
                  {[1,2,3,4,5].map(n => (
                    <div key={n} style={{ width: 14, height: 14, borderRadius: "50%",
                      background: n <= (p.reviewCount || 0) ? "#2d6a9f" : "#e2e8f0" }} />
                  ))}
                </div>
                <button onClick={e => { e.stopPropagation(); onIncrementReview(p.id); }}
                  style={{ ...B, fontSize: 11, color: "#2d6a9f", background: "#eff6ff", borderRadius: 6, padding: "2px 8px", fontWeight: 700 }}>
                  {(p.reviewCount || 0) >= 5 ? "リセット" : "+1"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={e => { e.stopPropagation(); onEdit(p); }}
                  style={{ ...B, padding: "4px 12px", borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#475569", fontWeight: 600 }}>編集</button>
                <button onClick={e => { e.stopPropagation(); onDelete(p.id); }}
                  style={{ ...B, padding: "4px 12px", borderRadius: 8, fontSize: 12, border: "1px solid #fecaca", background: "#fef2f2", color: "#ef4444", fontWeight: 600 }}>削除</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const [problems, setProblems] = useState([]);
  const [storageReady, setStorageReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [formMode, setFormMode] = useState("problem");
  const [problemForm, setProblemForm] = useState(initialProblemForm);
  const [kanjiForm, setKanjiForm] = useState(initialKanjiForm);
  const [englishForm, setEnglishForm] = useState(initialEnglishForm);
  const [view, setView] = useState("list");
  const [filterSubject, setFilterSubject] = useState("全て");
  const [filterStatus, setFilterStatus] = useState("完了以外");
  const [filterMode, setFilterMode] = useState("全て");
  const [sortKey, setSortKey] = useState("random");
  const [editId, setEditId] = useState(null);
  const [flashCard, setFlashCard] = useState(null);
  const [toast, setToast] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const h = () => setIsTablet(window.innerWidth >= 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  useEffect(() => {
    loadProblems().then(ps => { setProblems(ps); setStorageReady(true); }).catch(() => setStorageReady(true));
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    setSaveStatus("saving");
    const t = setTimeout(async () => {
      try { await saveProblems(problems); setSaveStatus("saved"); setTimeout(() => setSaveStatus(""), 2000); }
      catch { setSaveStatus("error"); }
    }, 800);
    return () => clearTimeout(t);
  }, [problems, storageReady]);

  const wordForm = formMode === "kanji" ? kanjiForm : englishForm;
  const setWordForm = formMode === "kanji" ? setKanjiForm : setEnglishForm;

  const handleSave = () => {
    const form = formMode === "problem" ? problemForm : wordForm;
    if (!form.subject) return alert("科目を選んでください");
    if (formMode === "problem" && !form.source) return alert("出どころを選んでください");
    if ((formMode === "kanji" || formMode === "english") && !form.wordAnswer) return alert("答えを入力してください");
    const entry = { ...form, id: editId !== null ? editId : Date.now() };
    if (editId !== null) { setProblems(ps => ps.map(p => p.id === editId ? entry : p)); setEditId(null); }
    else { setProblems(ps => [...ps, entry]); setSelectedId(entry.id); }
    setProblemForm(initialProblemForm); setKanjiForm(initialKanjiForm); setEnglishForm(initialEnglishForm);
    setView("add");
  };
  const handleEdit = (p) => {
    const m = p.mode || "problem"; setFormMode(m);
    if (m === "kanji") setKanjiForm({ ...initialKanjiForm, ...p });
    else if (m === "english") setEnglishForm({ ...initialEnglishForm, ...p });
    else setProblemForm({ ...initialProblemForm, ...p });
    setEditId(p.id); setView("add");
  };
  const handleDelete = (id) => {
    if (!window.confirm("削除しますか？")) return;
    setProblems(ps => ps.filter(p => p.id !== id));
    if (selectedId === id) setSelectedId(null);
  };
  const cycleStatus = (id) => {
    setProblems(ps => ps.map(p => {
      if (p.id !== id) return p;
      const idx = STATUSES.findIndex(s => s.key === p.status);
      return { ...p, status: STATUSES[(idx + 1) % STATUSES.length].key };
    }));
  };
  const incrementReview = (id) => {
    setProblems(ps => ps.map(p => p.id !== id ? p : { ...p, reviewCount: (p.reviewCount||0)>=5?0:(p.reviewCount||0)+1 }));
    setFlashCard(fc => fc && fc.id===id ? { ...fc, reviewCount: (fc.reviewCount||0)>=5?0:(fc.reviewCount||0)+1 } : fc);
  };
  const filtered = useMemo(() => {
    let list = [...problems];
    if (filterSubject !== "全て") list = list.filter(p => p.subject === filterSubject);
    if (filterStatus === "完了以外") list = list.filter(p => p.status !== "完了");
    else if (filterStatus !== "全て") list = list.filter(p => p.status === filterStatus);
    if (filterMode !== "全て") list = list.filter(p => (p.mode||"problem") === filterMode);
    if (sortKey === "date") list.sort((a,b) => b.date.localeCompare(a.date));
    if (sortKey === "importance") list.sort((a,b) => (b.importance||1)-(a.importance||1));
    if (sortKey === "status") list.sort((a,b) => STATUSES.findIndex(s=>s.key===a.status)-STATUSES.findIndex(s=>s.key===b.status));
    if (sortKey === 'random') list.sort(() => Math.random() - 0.5);
    return list;
  }, [problems, filterSubject, filterStatus, filterMode, sortKey]);

  const counts = useMemo(() => {
    const c = {};
    STATUSES.forEach(s => { c[s.key] = problems.filter(p => p.status === s.key).length; });
    return c;
  }, [problems]);

  const cancelEdit = () => {
    setView("list"); setEditId(null);
    setProblemForm(initialProblemForm); setKanjiForm(initialKanjiForm); setEnglishForm(initialEnglishForm);
  };
  const resetForms = () => {
    setProblemForm(initialProblemForm); setKanjiForm(initialKanjiForm); setEnglishForm(initialEnglishForm);
  };
  const selectedProblem = problems.find(p => p.id === selectedId);

  const header = (
    <div style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2d6a9f 100%)", padding: "16px 20px", color: "#fff", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, opacity: 0.65, letterSpacing: 2 }}>中学受験</div>
          <div style={{ fontSize: isTablet ? 20 : 22, fontWeight: 800 }}>まちがい問題ノート</div>
        </div>
        <div style={{ fontSize: 11, opacity: 0.8, textAlign: "right" }}>
          {!storageReady && "⏳ 読込中"}
          {storageReady && saveStatus === "saving" && "💾 保存中"}
          {storageReady && saveStatus === "saved" && "✅ 保存済み"}
          {storageReady && saveStatus === "error" && "⚠️ 保存失敗"}
          {storageReady && saveStatus === "" && "☁️ 同期済み"}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {STATUSES.map(s => (
          <div key={s.key} style={{ background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: "6px 12px", textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{counts[s.key]}</div>
            <div style={{ fontSize: 10, opacity: 0.85 }}>{s.label}</div>
          </div>
        ))}
        <div style={{ background: "rgba(255,255,255,0.15)", borderRadius: 10, padding: "6px 12px", textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{problems.length}</div>
          <div style={{ fontSize: 10, opacity: 0.85 }}>合計</div>
        </div>
      </div>
    </div>
  );

  const tabs = (
    <div style={{ display: "flex", background: "#fff", borderBottom: "2px solid #e2e8f0", flexShrink: 0 }}>
      {[["list","📋 一覧"],["add", editId!==null?"✏️ 編集":"➕ 追加"]].map(([k,label]) => (
        <button key={k} onClick={() => { setView(k); if (k==="list"&&editId!==null) cancelEdit(); }}
          style={{ ...B, flex:1, padding:"12px 0", background:"transparent", fontWeight:700, fontSize:13,
            color:view===k?"#1e3a5f":"#94a3b8",
            borderBottom:view===k?"3px solid #1e3a5f":"3px solid transparent" }}>{label}</button>
      ))}
    </div>
  );

  const listProps = {
    filtered, storageReady,
    filterSubject, setFilterSubject, filterStatus, setFilterStatus, filterMode, setFilterMode,
    sortKey, setSortKey, onEdit: handleEdit, onDelete: handleDelete,
    onCycleStatus: cycleStatus, onIncrementReview: incrementReview,
  };
  const addFormProps = {
    editId, formMode, setFormMode,
    problemForm, setProblemForm, wordForm, setWordForm,
    onSave: handleSave, onCancel: cancelEdit,
  };

  if (isTablet) {
    return (
      <div style={{ fontFamily:"'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif", height:"100vh", display:"flex", flexDirection:"column", background:"#f0f4f8", overflow:"hidden" }}>
        {header}
        <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
          <div style={{ width:360, flexShrink:0, display:"flex", flexDirection:"column", background:"#f8fafc", borderRight:"1px solid #e2e8f0", overflow:"hidden" }}>
            {tabs}
            <div style={{ flex:1, overflowY:"auto" }}>
              {view==="list" && <ProblemList {...listProps} onCardTap={p => setSelectedId(p.id)} selectedId={selectedId} />}
              {view==="add" && <AddForm {...addFormProps} />}
            </div>
            {view==="list" && (
              <button onClick={() => { setView("add"); setEditId(null); resetForms(); }}
                style={{ ...B, margin:16, padding:"12px 0", borderRadius:12,
                  background:"linear-gradient(135deg, #1e3a5f, #2d6a9f)", color:"#fff", fontSize:15, fontWeight:800,
                  boxShadow:"0 3px 10px rgba(30,58,95,0.3)" }}>＋ 問題を追加</button>
            )}
          </div>
          <div style={{ flex:1, padding:20, overflow:"hidden" }}>
            {selectedProblem ? (
              <FlashPanel problem={selectedProblem} onClose={() => setSelectedId(null)} onNext={() => { const idx = filtered.findIndex(p => p.id === selectedId); const next = filtered[idx + 1]; if (next) setSelectedId(next.id); else setSelectedId(null); }} onCycleStatus={cycleStatus} onIncrementReview={incrementReview} />
            ) : (
              <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", background:"#fff", borderRadius:20, boxShadow:"0 1px 6px rgba(0,0,0,0.06)" }}>
                <div style={{ textAlign:"center", color:"#94a3b8" }}>
                  <div style={{ fontSize:56, marginBottom:16 }}>👈</div>
                  <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>問題を選んでください</div>
                  <div style={{ fontSize:13 }}>左の一覧からタップすると<br />ここに問題が表示されます</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily:"'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif", minHeight:"100vh", background:"#f8fafc" }}>
      {flashCard && <FlashCard key={flashCard.id} problem={flashCard} onClose={() => setFlashCard(null)} onNext={() => { const idx = filtered.findIndex(p => p.id === flashCard.id); const next = filtered[idx + 1]; if (next) setFlashCard(next); else setFlashCard(null); }} onReviewCountUp={incrementReview} />}
      {header}
      {tabs}
      {view==="add" && <div style={{ maxWidth:480, margin:"0 auto" }}><AddForm {...addFormProps} /></div>}
      {view==="list" && (
        <div style={{ maxWidth:480, margin:"0 auto" }}>
          <ProblemList {...listProps} onCardTap={p => setFlashCard(problems.find(pr => pr.id===p.id))} selectedId={null} />
        </div>
      )}
      {view==="list" && (
        <button onClick={() => { setView("add"); setEditId(null); resetForms(); }}
          style={{ ...B, position:"fixed", bottom:24, right:24, width:56, height:56, borderRadius:"50%",
            background:"linear-gradient(135deg, #1e3a5f, #2d6a9f)", color:"#fff", fontSize:28,
            boxShadow:"0 4px 16px rgba(30,58,95,0.4)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}>＋</button>
      )}
    </div>
  );
}
