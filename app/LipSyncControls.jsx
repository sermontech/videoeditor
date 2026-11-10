import { useEffect, useRef, useState } from "react";
import { Lipsync } from "wawa-lipsync";
import {
  applyMouth,
  mouthWeights,
  supportedMouths,
  resumeAnalyzer,
  disposeAnalyzer,
} from "./lip-sync.mjs";

export default function LipSyncControls({
  engine,
  revision,
  playing,
  recording,
}) {
  const session = useRef(null),
    epoch = useRef(0);
  const [filename, setFilename] = useState(""),
    [active, setActive] = useState(false),
    [error, setError] = useState("");
  const manager = engine.current?.vrm?.expressionManager;
  const available = supportedMouths(manager);
  function stop() {
    epoch.current++;
    const s = session.current;
    if (s) {
      s.audio.pause();
      s.audio.currentTime = 0;
      applyMouth(s.manager, {});
    }
    setActive(false);
  }
  function clear() {
    epoch.current++;
    const s = session.current;
    session.current = null;
    if (s) {
      s.audio.pause();
      s.audio.removeAttribute("src");
      s.audio.load();
      URL.revokeObjectURL(s.url);
      disposeAnalyzer(s.analyzer);
      applyMouth(s.manager, {});
    }
    if (engine.current) engine.current.lipSyncTick = null;
  }
  useEffect(() => {
    clear();
    setFilename("");
    setActive(false);
    setError("");
    return clear;
  }, [revision]);
  useEffect(() => {
    if (!playing || recording) stop();
  }, [playing, recording]);
  function select(file) {
    if (!file) return;
    if (
      file.size > 30 * 1024 * 1024 ||
      !/\.(wav|mp3|m4a|ogg|webm)$/i.test(file.name)
    ) {
      setError("Choose WAV, MP3, M4A, OGG or WebM audio up to 30 MB.");
      return;
    }
    clear();
    setActive(false);
    setError("");
    const url = URL.createObjectURL(file),
      audio = new Audio(url);
    const s = { audio, url, manager, analyzer: null };
    session.current = s;
    setFilename(file.name);
    audio.onended = () => {
      if (session.current === s) stop();
    };
    audio.onerror = () => {
      if (session.current === s) {
        stop();
        setError(
          "This audio cannot be decoded by your browser. Try WAV or MP3.",
        );
      }
    };
    engine.current.lipSyncTick = () => {
      if (session.current !== s || !s.analyzer) return;
      if (s.audio.paused || s.audio.ended) {
        applyMouth(s.manager, {});
        return;
      }
      s.analyzer.processAudio();
      applyMouth(
        s.manager,
        mouthWeights(s.analyzer.viseme, s.analyzer.features?.volume || 0),
      );
    };
  }
  async function play() {
    const s = session.current,
      token = epoch.current;
    if (!s) return;
    try {
      setError("");
      if (!s.analyzer) {
        s.analyzer = new Lipsync();
        s.analyzer.connectAudio(s.audio);
      }
      await resumeAnalyzer(s.analyzer);
      if (token !== epoch.current) return;
      await s.audio.play();
      if (token === epoch.current) setActive(true);
      else s.audio.pause();
    } catch (e) {
      if (token === epoch.current) {
        stop();
        setError("Could not start audio: " + e.message);
      }
    }
  }
  return (
    <section aria-label="Local lip-sync preview">
      <h3>Local lip-sync preview</h3>
      <p>
        Approximate audio-driven mouth shapes for VRM avatars. Audio stays in
        this browser; no microphone access or upload.
      </p>
      <p>
        {available.length
          ? `Available mouth expressions: ${available.join(", ")}`
          : "Import a VRM with mouth expressions (aa, ee, ih, oh or ou) to enable lip-sync."}
      </p>
      <label className="field">
        Lip-sync audio
        <input
          type="file"
          accept=".wav,.mp3,.m4a,.ogg,.webm"
          disabled={!available.length || recording}
          onChange={(e) => {
            select(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      {filename && <p>{filename}</p>}
      <button
        type="button"
        onClick={play}
        disabled={!filename || active || !playing || recording}
      >
        Play lip-sync audio
      </button>
      <button type="button" onClick={stop} disabled={!filename || recording}>
        Stop lip-sync audio
      </button>
      <p role="status">
        {active ? "Lip-sync audio playing" : "Lip-sync audio stopped"}
      </p>
      {error && <p role="alert">{error}</p>}
      <p>
        Preview only. WebM export remains silent and stops this audio; audio is
        not saved in scene files. No automatic rig retargeting or speech
        generation.
      </p>
    </section>
  );
}
