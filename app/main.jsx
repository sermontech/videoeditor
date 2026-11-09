import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Search,
  LayoutGrid,
  Clapperboard,
  FolderOpen,
  Palette,
  Sparkles,
  Settings2,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Play,
  Upload,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Film,
  FileText,
  Music,
  Image as ImageIcon,
  X,
  Loader2,
  Trash2,
  Save,
  ArrowLeft,
  Monitor,
  Smartphone,
  Square,
  Volume2,
  ExternalLink,
  HelpCircle,
  RefreshCw,
  MessageSquare,
  SlidersHorizontal,
  PanelLeftClose,
} from "lucide-react";
import "./styles.css";
import AuthGate from "./AuthGate";
import { cloudMode, apiBase, authHeaders } from "./session";
const request = async (url, options = {}) => {
  const r = await fetch(apiBase + "/api" + url, {
    ...options,
    headers: {
      ...(await authHeaders()),
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
    },
    body:
      options.body instanceof FormData
        ? options.body
        : options.body
          ? JSON.stringify(options.body)
          : undefined,
  });
  let d;
  try {
    d = await r.json();
  } catch {
    throw Error("The server did not respond. Please try again.");
  }
  if (!r.ok) throw Error(d.error || "Request failed");
  return d;
};
const cx = (...a) => a.filter(Boolean).join(" ");
const fmt = (s) =>
  `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const ago = (s) =>
  new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric" });
function App() {
  const [data, setData] = useState(null),
    [view, setView] = useState("home"),
    [search, setSearch] = useState(""),
    [tab, setTab] = useState("all"),
    [modal, setModal] = useState(null),
    [toast, setToast] = useState(null),
    [busy, setBusy] = useState(false),
    [project, setProject] = useState(null),
    [sceneIndex, setSceneIndex] = useState(0),
    [dirty, setDirty] = useState(false),
    [brand, setBrand] = useState(null),
    [error, setError] = useState(""),
    [menu, setMenu] = useState(null);
  const uploadRef = useRef();
  const refresh = async () => {
    const d = await request("/state");
    setData(d);
    return d;
  };
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (
      !data?.generations.some((g) => ["queued", "rendering"].includes(g.status))
    )
      return;
    const t = setInterval(() => refresh().catch(() => {}), 1500);
    return () => clearInterval(t);
  }, [
    data?.generations.some((g) => ["queued", "rendering"].includes(g.status)),
  ]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const fn = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [dirty]);
  useEffect(() => {
    if (!cloudMode) return;
    const timer = setInterval(() => refresh().catch(() => {}), 300000);
    return () => clearInterval(timer);
  }, []);
  const act = async (fn) => {
    setBusy(true);
    try {
      return await fn();
    } catch (e) {
      setToast({ error: true, text: e.message });
    } finally {
      setBusy(false);
    }
  };
  const navigate = (v) => {
    if (dirty && !window.confirm("Leave without saving your changes?")) return;
    setDirty(false);
    setView(v);
    setSearch("");
    if (v === "brand") setBrand({ ...data.brand });
  };
  const open = (p) => {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    setProject(structuredClone(p));
    setSceneIndex(0);
    setDirty(false);
    setView("studio");
  };
  const patch = (p) => {
    setProject((v) => ({ ...v, ...p, factsConfirmed: false }));
    setDirty(true);
  };
  const patchScene = (p) =>
    patch({
      scenes: project.scenes.map((s, i) =>
        i === sceneIndex ? { ...s, ...p } : s,
      ),
    });
  const moveScene = (delta) => {
    const index = sceneIndex + delta;
    if (index < 0 || index >= project.scenes.length) return;
    const scenes = [...project.scenes];
    [scenes[sceneIndex], scenes[index]] = [scenes[index], scenes[sceneIndex]];
    patch({ scenes });
    setSceneIndex(index);
  };
  const saveProject = async () => {
    const p = await request("/projects/" + project.id, {
      method: "PUT",
      body: {
        ...project,
        sources: project.sources.map((s) => s.trim()).filter(Boolean),
      },
    });
    setProject(p);
    setDirty(false);
    await refresh();
    return p;
  };
  const upload = (files) =>
    act(async () => {
      for (const file of files) {
        const f = new FormData();
        f.append("file", file);
        await request("/assets", { method: "POST", body: f });
      }
      await refresh();
      setToast({ text: "Files added to your media library." });
    });
  const completed =
    data?.generations.filter((g) => g.status === "complete") || [];
  const selectedGeneration = data?.generations.find(
    (g) => g.projectId === project?.id,
  );
  const reviewed = (g) => data.feedback.some((f) => f.generationId === g.id);
  if (!data)
    return (
      <div className="boot">
        <div className="logo-mark">
          <Clapperboard />
        </div>
        <h2>Opening your studio</h2>
        {error ? (
          <>
            <p>{error}</p>
            <button className="btn primary" onClick={() => location.reload()}>
              Try again
            </button>
          </>
        ) : (
          <Loader2 className="spin" />
        )}
      </div>
    );
  const scene = project?.scenes[sceneIndex];
  const filtered = data.projects.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) &&
      (tab === "all" ||
        (tab === "exported"
          ? completed.some((g) => g.projectId === p.id)
          : !completed.some((g) => g.projectId === p.id))),
  );
  return (
    <div className="shell">
      <aside className="sidebar">
        <button
          aria-label="Clear Take home"
          className="brand-logo"
          onClick={() => navigate("home")}
        >
          <span className="logo-mark">
            <Clapperboard size={21} />
          </span>
          clear take<span className="brand-dot">.</span>
        </button>
        <button
          className="workspace"
          onClick={() => setModal({ type: "workspace" })}
        >
          <span className="avatar">Y</span>
          <span>
            Your workspace<small>Personal studio</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {[
            ["home", LayoutGrid, "Overview"],
            ["projects", Clapperboard, "Projects"],
            ["library", FolderOpen, "Media library"],
            ["brand", Palette, "Brand kit"],
            ["learning", Sparkles, "Improvement lab"],
          ].map(([id, Icon, label]) => (
            <button
              key={id}
              aria-label={label}
              className={cx("nav-item", view === id && "active")}
              onClick={() => navigate(id)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {id === "projects" && <em>{data.projects.length}</em>}
              {id === "learning" && <i />}
            </button>
          ))}
        </nav>
        <div className="sidebar-line" />
        <div className="nav-label">RECENT PROJECTS</div>
        <div className="recent-nav">
          {data.projects.slice(0, 3).map((p) => (
            <button key={p.id} onClick={() => open(p)}>
              <span className={"dot " + p.theme} />
              <span>{p.title}</span>
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="learning-mini">
            <span className="tiny-star">
              <Sparkles size={18} />
            </span>
            <strong>A better take, every time.</strong>
            <p>Your feedback shapes what comes next.</p>
            <button onClick={() => navigate("learning")}>
              See how it works <ArrowUpRight size={14} />
            </button>
          </div>
          <button
            className="nav-item"
            onClick={() => setModal({ type: "help" })}
          >
            <HelpCircle size={18} />
            Help & getting started
            <ArrowUpRight size={14} />
          </button>
          <div className="profile">
            <span className="profile-avatar">Y</span>
            <div>
              Your studio
              <small>
                {cloudMode ? "Authenticated workspace" : "Local workspace"}
              </small>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={13} />
            <span>
              {
                {
                  home: "Overview",
                  projects: "Projects",
                  library: "Media library",
                  brand: "Brand kit",
                  learning: "Improvement lab",
                  studio: "Editor",
                }[view]
              }
            </span>
            {view === "studio" && (
              <>
                <ChevronRight size={13} />
                <span>{project.title}</span>
              </>
            )}
          </div>
          <div className="topbar-right">
            <span className="local-status">
              <i />
              {cloudMode
                ? "Private cloud workspace"
                : "All yours. Stored locally."}
            </span>
            <button
              className="icon-btn"
              aria-label="Help"
              onClick={() => setModal({ type: "help" })}
            >
              <HelpCircle size={18} />
            </button>
            <span className="profile-avatar small">Y</span>
          </div>
        </header>
        <main className={cx("main", view === "studio" && "studio-main")}>
          {(view === "home" || view === "projects") && (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span />
                    YOUR CREATIVE SPACE
                  </div>
                  <h1>
                    {view === "home"
                      ? "Good stories start here."
                      : "Make room for your next idea."}
                  </h1>
                  <p>
                    {view === "home"
                      ? "A little inspiration. Your point of view. Something worth watching."
                      : "All your drafts, ideas and finished takes. In one place."}
                  </p>
                </div>
                <button
                  className="btn primary"
                  onClick={() => setModal({ type: "new" })}
                >
                  <Plus size={18} /> New project
                </button>
              </section>
              {view === "home" && (
                <>
                  <section className="hero-panel">
                    <div className="hero-copy">
                      <div className="pill">
                        <Sparkles size={13} /> BUILT AROUND YOUR VOICE
                      </div>
                      <h2>
                        From a spark.
                        <br />
                        To your next <em>great take.</em>
                      </h2>
                      <p>
                        Turn your script into a video that feels like you.
                        <br />
                        Create, refine and make the next one even better.
                      </p>
                      <button
                        className="btn light"
                        onClick={() => setModal({ type: "new" })}
                      >
                        Let's make something <ArrowUpRight size={16} />
                      </button>
                      <span className="hero-note">
                        Your story. Your style. Your studio.
                      </span>
                    </div>
                    <div className="hero-art" aria-hidden="true">
                      <div className="orbit orbit-one" />
                      <div className="orbit orbit-two" />
                      <div className="art-spark s-one">✦</div>
                      <div className="art-spark s-two">✧</div>
                      <div className="mini-float float-left">
                        <CheckCircle2 size={14} /> Made to be you
                      </div>
                      <div className="art-card back">
                        <div className="card-grid" />
                        <div className="graphic-circle" />
                      </div>
                      <div className="art-card front">
                        <div className="art-card-top">
                          <span>CLEAR TAKE</span>
                          <span>01 / 03</span>
                        </div>
                        <div className="art-type">
                          A new
                          <br />
                          point
                          <br />
                          of <i>view.</i>
                        </div>
                        <div className="art-bottom">
                          <span />
                          <Play size={14} fill="currentColor" />
                        </div>
                      </div>
                      <div className="mini-float float-right">
                        <span className="wave-bars">▂▆▃█▅▂▆</span> Your next
                        story
                      </div>
                    </div>
                  </section>
                  <section className="quick-actions">
                    {[
                      [
                        FileText,
                        "Start with a script",
                        "Give your words a little motion.",
                        "script",
                      ],
                      [
                        Upload,
                        "Bring your footage",
                        "Your clips. A fresh perspective.",
                        "upload",
                      ],
                      [
                        Palette,
                        "Make it your own",
                        "Set the look. Keep it consistent.",
                        "brand",
                      ],
                    ].map(([Icon, t, d, id]) => (
                      <button
                        key={id}
                        className="quick-card"
                        onClick={() =>
                          id === "brand"
                            ? navigate("brand")
                            : id === "upload"
                              ? uploadRef.current.click()
                              : setModal({ type: "new" })
                        }
                      >
                        <span className={"quick-icon " + id}>
                          <Icon size={20} />
                        </span>
                        <span>
                          <strong>{t}</strong>
                          <small>{d}</small>
                        </span>
                        <ArrowUpRight size={17} />
                      </button>
                    ))}
                  </section>
                </>
              )}
              <section className="project-section">
                <div className="section-title">
                  <h2>
                    {view === "home"
                      ? "On your creative desk"
                      : "Your projects"}{" "}
                    <span>{data.projects.length}</span>
                  </h2>
                  {view === "home" ? (
                    <button
                      className="text-btn"
                      onClick={() => navigate("projects")}
                    >
                      View all projects <ArrowRight size={15} />
                    </button>
                  ) : (
                    <label className="search">
                      <Search size={16} />
                      <input
                        placeholder="Search projects…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                  )}
                </div>
                <div className="project-toolbar">
                  <div className="tabs">
                    {[
                      ["all", "All projects"],
                      ["drafts", "Drafts"],
                      ["exported", "Exported"],
                    ].map(([id, t]) => (
                      <button
                        className={tab === id ? "selected" : ""}
                        onClick={() => setTab(id)}
                        key={id}
                      >
                        {t}
                        {id === "all" && <span>{data.projects.length}</span>}
                      </button>
                    ))}
                  </div>
                  <span className="sort-label">
                    <Clock size={13} /> Most recently created
                  </span>
                </div>
                <div className="project-grid">
                  {filtered.slice(0, view === "home" ? 3 : 100).map((p, i) => (
                    <article className="project-card" key={p.id}>
                      <button
                        className={"project-thumb " + p.theme}
                        onClick={() => open(p)}
                        aria-label={"Open " + p.title}
                      >
                        <div className="thumb-grid" />
                        <span className="thumb-brand">CLEAR TAKE / STUDIO</span>
                        <span className="thumb-issue">0{i + 1}</span>
                        <div className="thumb-title">{p.title}</div>
                        <div className="thumb-art">
                          <div />
                          <div />
                        </div>
                        <span className="thumb-format">
                          <Smartphone size={12} />{" "}
                          {p.format === "portrait"
                            ? "9:16"
                            : p.format === "square"
                              ? "1:1"
                              : "16:9"}
                        </span>
                        <span className="thumb-duration">
                          {fmt(p.scenes.reduce((a, s) => a + s.duration, 0))}
                        </span>
                        <span className="thumb-open">
                          <ArrowUpRight />
                        </span>
                      </button>
                      <div className="project-meta">
                        <div>
                          <button
                            className="project-name"
                            onClick={() => open(p)}
                          >
                            {p.title}
                          </button>
                          <p>
                            <span
                              className={cx(
                                "status-dot",
                                completed.some((g) => g.projectId === p.id) &&
                                  "done",
                              )}
                            />
                            {completed.some((g) => g.projectId === p.id)
                              ? "Exported"
                              : "Draft"}
                            <span>·</span>
                            {p.scenes.length} scenes<span>·</span>
                            {ago(p.updatedAt)}
                          </p>
                        </div>
                        <div className="menu-wrap">
                          <button
                            className="icon-btn"
                            aria-label={"Options for " + p.title}
                            onClick={() => setMenu(menu === p.id ? null : p.id)}
                          >
                            <MoreHorizontal size={19} />
                          </button>
                          {menu === p.id && (
                            <div className="dropdown">
                              <button
                                onClick={() => {
                                  open(p);
                                  setMenu(null);
                                }}
                              >
                                Open editor
                              </button>
                              <button
                                className="danger"
                                onClick={() => {
                                  setModal({ type: "delete", project: p });
                                  setMenu(null);
                                }}
                              >
                                Delete project
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                  {filtered.length === 0 && (
                    <div className="empty">
                      <Clapperboard />
                      <h3>A blank canvas, in the best way.</h3>
                      <p>
                        {search
                          ? "No projects match your search."
                          : "Start a project and give your idea a place to grow."}
                      </p>
                      <button
                        className="btn primary"
                        onClick={() => setModal({ type: "new" })}
                      >
                        <Plus size={16} />
                        Create a project
                      </button>
                    </div>
                  )}
                </div>
              </section>
              {view === "home" && (
                <section className="improvement-banner">
                  <span className="improvement-icon">
                    <Sparkles size={23} />
                  </span>
                  <div>
                    <h3>Your next take gets a little better.</h3>
                    <p>
                      Every generation gets a quality check. Every review helps
                      shape your defaults.
                    </p>
                  </div>
                  <button
                    className="text-btn"
                    onClick={() => navigate("learning")}
                  >
                    Explore the improvement lab <ArrowRight size={16} />
                  </button>
                </section>
              )}
            </>
          )}
          {view === "studio" && project && (
            <>
              <div className="studio-heading">
                <button
                  className="icon-btn"
                  aria-label="Back to projects"
                  onClick={() => navigate("projects")}
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <input
                    className="title-input"
                    maxLength={100}
                    value={project.title}
                    onChange={(e) => patch({ title: e.target.value })}
                  />
                  <small>
                    {dirty ? "Unsaved changes" : "Draft saved"} ·{" "}
                    {project.scenes.length} scenes ·{" "}
                    {fmt(project.scenes.reduce((a, s) => a + s.duration, 0))}
                  </small>
                </div>
                <div className="studio-actions">
                  <button
                    className="btn secondary"
                    disabled={busy}
                    onClick={() =>
                      act(async () => {
                        await saveProject();
                        setToast({ text: "Project saved." });
                      })
                    }
                  >
                    <Save size={15} />
                    Save
                  </button>
                  <button
                    className="btn primary"
                    disabled={
                      busy ||
                      ["queued", "rendering"].includes(
                        selectedGeneration?.status,
                      )
                    }
                    onClick={() =>
                      act(async () => {
                        await saveProject();
                        setModal({ type: "render" });
                      })
                    }
                  >
                    {["queued", "rendering"].includes(
                      selectedGeneration?.status,
                    ) ? (
                      <Loader2 className="spin" size={16} />
                    ) : (
                      <Sparkles size={16} />
                    )}
                    Generate video
                  </button>
                </div>
              </div>
              <div className="editor-grid">
                <aside className="scene-list">
                  <div className="panel-label">
                    STORYBOARD <span>{project.scenes.length} SCENES</span>
                  </div>
                  {project.scenes.map((s, i) => (
                    <button
                      key={s.id}
                      className={cx(
                        "scene-item",
                        sceneIndex === i && "selected",
                      )}
                      onClick={() => setSceneIndex(i)}
                    >
                      <div className="scene-number">
                        {String(i + 1).padStart(2, "0")}
                      </div>
                      <div>
                        <strong>{s.title}</strong>
                        <p>{s.body}</p>
                        <small>
                          {s.duration}s {s.assetId ? "· Media attached" : ""}
                        </small>
                      </div>
                    </button>
                  ))}
                  <button
                    className="add-scene"
                    disabled={project.scenes.length >= 12}
                    onClick={() => {
                      patch({
                        scenes: [
                          ...project.scenes,
                          {
                            id: crypto.randomUUID(),
                            title: "NEXT CHAPTER",
                            body: "Your next point goes here.",
                            duration: 5,
                            assetId: null,
                          },
                        ],
                      });
                      setSceneIndex(project.scenes.length);
                    }}
                  >
                    <Plus size={16} />
                    Add scene
                  </button>
                </aside>
                <section className="preview-panel">
                  <div className="panel-label">
                    LIVE STORYBOARD{" "}
                    <span>
                      {project.format === "portrait"
                        ? "1080 × 1920"
                        : project.format === "square"
                          ? "1080 × 1080"
                          : "1920 × 1080"}
                    </span>
                  </div>
                  <div className="preview-stage">
                    <Preview
                      scene={scene}
                      project={project}
                      data={data}
                      index={sceneIndex}
                    />
                  </div>
                  <div className="preview-controls">
                    <button
                      className="icon-btn"
                      aria-label="Previous scene"
                      disabled={!sceneIndex}
                      onClick={() => setSceneIndex(sceneIndex - 1)}
                    >
                      <ArrowLeft size={17} />
                    </button>
                    <span>
                      Scene {sceneIndex + 1} of {project.scenes.length}
                    </span>
                    <button
                      className="icon-btn"
                      aria-label="Next scene"
                      disabled={sceneIndex === project.scenes.length - 1}
                      onClick={() => setSceneIndex(sceneIndex + 1)}
                    >
                      <ArrowRight size={17} />
                    </button>
                    <span className="preview-hint">
                      Layout preview · export may fit text
                    </span>
                  </div>
                </section>
                <aside className="inspector">
                  <div className="panel-label">
                    SCENE SETTINGS <SlidersHorizontal size={15} />
                  </div>
                  <div className="scene-order">
                    <button
                      className="text-btn"
                      disabled={sceneIndex === 0}
                      onClick={() => moveScene(-1)}
                    >
                      <ArrowLeft size={13} />
                      Move earlier
                    </button>
                    <button
                      className="text-btn"
                      disabled={sceneIndex === project.scenes.length - 1}
                      onClick={() => moveScene(1)}
                    >
                      Move later
                      <ArrowRight size={13} />
                    </button>
                  </div>
                  <label className="field">
                    Chapter label
                    <input
                      maxLength={60}
                      value={scene.title}
                      onChange={(e) => patchScene({ title: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    On-screen story
                    <textarea
                      rows={6}
                      maxLength={350}
                      value={scene.body}
                      onChange={(e) => patchScene({ body: e.target.value })}
                    />
                    <span className="field-foot">
                      {scene.body.length}/350 characters
                    </span>
                  </label>
                  <label className="field">
                    Duration{" "}
                    <span className="input-unit">
                      <input
                        type="number"
                        min="3"
                        max="20"
                        value={scene.duration}
                        onChange={(e) =>
                          patchScene({ duration: Number(e.target.value) })
                        }
                      />
                      <span>seconds</span>
                    </span>
                  </label>
                  <label className="field">
                    Background media
                    <select
                      value={scene.assetId || ""}
                      onChange={(e) =>
                        patchScene({ assetId: e.target.value || null })
                      }
                    >
                      <option value="">Brand colour / original graphic</option>
                      {data.assets
                        .filter((a) => a.kind !== "audio")
                        .map((a) => (
                          <option value={a.id} key={a.id}>
                            {a.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <div className="character-controls">
                    <h3>2D character animation</h3>
                    <p>
                      Reuse an uploaded image. Transparent PNGs work best. No AI
                      body animation or lip-sync.
                    </p>
                    <label className="field">
                      Character image
                      <select
                        value={scene.characterId || ""}
                        onChange={(e) =>
                          patchScene({ characterId: e.target.value || null })
                        }
                      >
                        <option value="">No character</option>
                        {data.assets
                          .filter((a) => a.kind === "image")
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    {scene.characterId && (
                      <>
                        <label className="field">
                          Placement
                          <select
                            value={scene.characterPosition || "center"}
                            onChange={(e) =>
                              patchScene({ characterPosition: e.target.value })
                            }
                          >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                          </select>
                        </label>
                        <label className="field">
                          Motion
                          <select
                            value={scene.characterMotion || "still"}
                            onChange={(e) =>
                              patchScene({ characterMotion: e.target.value })
                            }
                          >
                            <option value="still">Still</option>
                            <option value="float">Gentle float (2D)</option>
                          </select>
                        </label>
                        <button
                          className="text-btn"
                          onClick={() =>
                            patch({
                              scenes: project.scenes.map((s) => ({
                                ...s,
                                characterId: scene.characterId,
                                characterPosition:
                                  scene.characterPosition || "center",
                                characterMotion:
                                  scene.characterMotion || "still",
                              })),
                            })
                          }
                        >
                          Use this character in all scenes
                        </button>
                      </>
                    )}
                    <small>
                      Only upload characters and likenesses you have permission
                      to use. Preview is approximate; review the exported video.
                    </small>
                  </div>
                  <button
                    className="text-btn"
                    onClick={() => uploadRef.current.click()}
                  >
                    <Upload size={14} />
                    Upload media
                  </button>
                  <div className="divider" />
                  <label className="field">
                    Video format
                    <select
                      value={project.format}
                      onChange={(e) => patch({ format: e.target.value })}
                    >
                      <option value="portrait">Portrait · 9:16</option>
                      <option value="landscape">Landscape · 16:9</option>
                      <option value="square">Square · 1:1</option>
                    </select>
                  </label>
                  <label className="field">
                    Voiceover or music
                    <select
                      value={project.audioId || ""}
                      onChange={(e) =>
                        patch({ audioId: e.target.value || null })
                      }
                    >
                      <option value="">Silent video</option>
                      {data.assets
                        .filter((a) => a.kind === "audio")
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                    </select>
                    <small>
                      Upload your audio. AI voice services are not connected.
                    </small>
                  </label>
                  <button
                    className="text-btn danger"
                    disabled={project.scenes.length === 1}
                    onClick={() => {
                      patch({
                        scenes: project.scenes.filter(
                          (s, i) => i !== sceneIndex,
                        ),
                      });
                      setSceneIndex(Math.max(0, sceneIndex - 1));
                    }}
                  >
                    <Trash2 size={14} />
                    Remove scene
                  </button>
                </aside>
              </div>
              <div className="studio-bottom">
                <section className="sources-panel">
                  <h3>
                    <FileText size={17} />
                    The facts behind your story
                  </h3>
                  <p>
                    Add your source links and review every claim. This app does
                    not automatically verify facts.
                  </p>
                  <textarea
                    aria-label="Source URLs, one per line"
                    placeholder="https://…  (one source URL per line)"
                    value={project.sources.join("\n")}
                    onChange={(e) =>
                      patch({ sources: e.target.value.split("\n") })
                    }
                  />
                  <button
                    className="text-btn"
                    onClick={() =>
                      patch({
                        sources: project.sources
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                  >
                    Clean up empty lines
                  </button>
                </section>
                <section className="generation-panel">
                  <h3>
                    <Sparkles size={17} />
                    Latest generation
                  </h3>
                  {selectedGeneration ? (
                    <Generation
                      g={selectedGeneration}
                      reviewed={reviewed(selectedGeneration)}
                      onReview={() =>
                        setModal({
                          type: "feedback",
                          generation: selectedGeneration,
                        })
                      }
                    />
                  ) : (
                    <div className="generation-empty">
                      <p>Your first take is waiting.</p>
                      <small>
                        Generate to run quality checks and create a downloadable
                        MP4.
                      </small>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
          {view === "library" && (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span />
                    THE BUILDING BLOCKS
                  </div>
                  <h1>A home for your footage.</h1>
                  <p>
                    Original clips, reference images and audio. Ready for your
                    next story.
                  </p>
                </div>
                <div className="library-actions">
                  <button
                    className="btn secondary"
                    disabled={busy}
                    onClick={() =>
                      act(async () => {
                        const r = await request("/assets/import-workspace", {
                          method: "POST",
                        });
                        await refresh();
                        setToast({
                          text: `${r.count} files imported from your References and Raw footages folders.`,
                        });
                      })
                    }
                  >
                    <FolderOpen size={16} />
                    Import workspace
                  </button>
                  <button
                    className="btn primary"
                    disabled={busy}
                    onClick={() => uploadRef.current.click()}
                  >
                    <Upload size={17} />
                    {busy ? "Uploading…" : "Upload files"}
                  </button>
                </div>
              </section>
              <div
                className="upload-zone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  upload([...e.dataTransfer.files]);
                }}
              >
                <span className="quick-icon upload">
                  <Upload />
                </span>
                <h3>Drop a little inspiration here.</h3>
                <p>Images, video or audio · up to 100 MB per file</p>
                <button
                  className="text-btn"
                  onClick={() => uploadRef.current.click()}
                >
                  or browse your files <ArrowUpRight size={14} />
                </button>
              </div>
              <div className="section-title">
                <h2>
                  Your media <span>{data.assets.length}</span>
                </h2>
                <span className="sort-label">Stored in this workspace</span>
              </div>
              <div className="asset-grid">
                {data.assets.map((a) => (
                  <button
                    key={a.id}
                    className="asset-card"
                    onClick={() => setModal({ type: "asset", asset: a })}
                  >
                    <div className="asset-preview">
                      {a.kind === "image" ? (
                        <img src={a.url} alt={a.name} />
                      ) : a.kind === "video" ? (
                        <>
                          <video src={a.url} preload="metadata" />
                          <Play className="asset-play" />
                        </>
                      ) : (
                        <Music size={42} />
                      )}
                    </div>
                    <strong>{a.name}</strong>
                    <small>
                      {a.origin ? "Reference / workspace" : a.kind} ·{" "}
                      {(a.size / 1024 / 1024).toFixed(1)} MB
                    </small>
                  </button>
                ))}
              </div>
            </>
          )}
          {view === "brand" && brand && (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span />
                    CONSISTENTLY YOU
                  </div>
                  <h1>A style with your signature.</h1>
                  <p>
                    Set the defaults for your next generation. Existing exports
                    stay unchanged.
                  </p>
                </div>
                <button
                  className="btn primary"
                  disabled={busy}
                  onClick={() =>
                    act(async () => {
                      await request("/brand", { method: "PUT", body: brand });
                      await refresh();
                      setToast({
                        text: "Brand kit saved. Your next render will use it.",
                      });
                    })
                  }
                >
                  <Save size={16} />
                  Save brand kit
                </button>
              </section>
              <div className="brand-layout">
                <section className="settings-card">
                  <h3>Your visual identity</h3>
                  <label className="field">
                    Brand name
                    <input
                      maxLength={40}
                      value={brand.name}
                      onChange={(e) =>
                        setBrand({ ...brand, name: e.target.value })
                      }
                    />
                  </label>
                  <div className="colour-fields">
                    {[
                      ["background", "Ink"],
                      ["foreground", "Paper"],
                      ["accent", "Accent"],
                    ].map(([key, label]) => (
                      <label key={key}>
                        <input
                          type="color"
                          value={brand[key]}
                          onChange={(e) =>
                            setBrand({ ...brand, [key]: e.target.value })
                          }
                        />
                        <strong>{label}</strong>
                        <small>{brand[key]}</small>
                      </label>
                    ))}
                  </div>
                  <div className="divider" />
                  <h3>Reading should feel effortless.</h3>
                  <label className="field">
                    Text size <span>{brand.fontSize}px</span>
                    <input
                      type="range"
                      min="40"
                      max="80"
                      step="2"
                      value={brand.fontSize}
                      onChange={(e) =>
                        setBrand({ ...brand, fontSize: +e.target.value })
                      }
                    />
                    <small>
                      Text automatically shrinks only when needed to fit.
                    </small>
                  </label>
                  <label className="field">
                    Draft reading pace <span>{brand.pace.toFixed(2)}×</span>
                    <input
                      type="range"
                      min=".7"
                      max="1.6"
                      step=".05"
                      value={brand.pace}
                      onChange={(e) =>
                        setBrand({ ...brand, pace: +e.target.value })
                      }
                    />
                    <small>
                      Higher values give new drafts more time per scene.
                    </small>
                  </label>
                  <div className="info-note">
                    <Sparkles size={16} />
                    Your feedback can adjust these defaults. You're always in
                    control.
                  </div>
                </section>
                <div className="brand-preview-wrap">
                  <Preview
                    scene={{
                      title: "YOUR POINT OF VIEW",
                      body: "The context changes the story.",
                      duration: 5,
                    }}
                    project={{ format: "portrait", scenes: [{}] }}
                    data={{ ...data, brand }}
                    index={0}
                  />
                  <small>A preview of your next chapter.</small>
                </div>
              </div>
            </>
          )}
          {view === "learning" && (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span />A LITTLE BETTER, EVERY TIME
                  </div>
                  <h1>Make. Learn. Make it yours.</h1>
                  <p>
                    A transparent feedback loop. Real checks, useful
                    adjustments, no black box.
                  </p>
                </div>
                <span className="pill lavender-pill">
                  <Sparkles size={14} />
                  Improvement lab
                </span>
              </section>
              <div className="stats-grid">
                {[
                  [Film, data.generations.length, "Generations"],
                  [CheckCircle2, completed.length, "Completed exports"],
                  [MessageSquare, data.feedback.length, "Reviews saved"],
                ].map(([I, n, l]) => (
                  <div className="stat-card" key={l}>
                    <I size={20} />
                    <strong>{n}</strong>
                    <span>{l}</span>
                  </div>
                ))}
              </div>
              <div className="learning-explainer">
                <div>
                  <span className="step-number">01</span>
                  <h3>Create with confidence</h3>
                  <p>
                    Reading time and text coverage are checked for every render.
                    Short scenes get more time automatically.
                  </p>
                </div>
                <div>
                  <span className="step-number">02</span>
                  <h3>Tell us what feels right</h3>
                  <p>
                    Review your export. Choose larger text, a slower pace or
                    keep the current direction.
                  </p>
                </div>
                <div>
                  <span className="step-number">03</span>
                  <h3>Carry the good forward</h3>
                  <p>
                    Feedback updates your saved defaults. It does not retrain a
                    model or rewrite the app.
                  </p>
                </div>
              </div>
              <div className="section-title">
                <h2>Generation journal</h2>
                <span className="sort-label">Your progress, made visible</span>
              </div>
              {data.generations.length === 0 ? (
                <div className="empty journal-empty">
                  <Sparkles />
                  <h3>Your first take starts the loop.</h3>
                  <p>
                    Create and generate a video. Its quality report will appear
                    here.
                  </p>
                  <button
                    className="btn primary"
                    onClick={() => setModal({ type: "new" })}
                  >
                    Create a project <ArrowRight size={15} />
                  </button>
                </div>
              ) : (
                <div className="journal">
                  {data.generations.map((g) => (
                    <section className="journal-card" key={g.id}>
                      <div className="section-title">
                        <h3>{g.title}</h3>
                        <span className="sort-label">
                          Version {g.version} · {ago(g.createdAt)}
                        </span>
                      </div>
                      <Generation
                        g={g}
                        reviewed={reviewed(g)}
                        onReview={() =>
                          setModal({ type: "feedback", generation: g })
                        }
                      />
                      {g.checks && (
                        <div className="checks">
                          {g.checks.map((c) => (
                            <span
                              key={c.label}
                              title={c.detail}
                              className={!c.passed ? "warn" : ""}
                            >
                              {c.passed ? (
                                <CheckCircle2 size={14} />
                              ) : (
                                <HelpCircle size={14} />
                              )}{" "}
                              {c.label}
                            </span>
                          ))}
                        </div>
                      )}
                      {g.changes.map((c, i) => (
                        <p className="change" key={i}>
                          <RefreshCw size={13} />
                          {c}
                        </p>
                      ))}
                    </section>
                  ))}
                </div>
              )}
              {data.feedback.length > 0 && (
                <>
                  <h3 className="subheading">What changed</h3>
                  {data.feedback.map((f) => (
                    <div className="feedback-row" key={f.id}>
                      <CheckCircle2 size={18} />
                      <div>
                        <strong>{f.change}</strong>
                        {f.note && <p>{f.note}</p>}
                      </div>
                      <span>{ago(f.createdAt)}</span>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
          <footer className="footer">
            <span>Made for your point of view.</span>
            <span>
              Clear Take Studio <span className="footer-dot">•</span>{" "}
              {cloudMode
                ? "Private cloud, creator-led"
                : "Local-first, creator-led"}
            </span>
          </footer>
        </main>
      </div>
      <input
        hidden
        type="file"
        multiple
        ref={uploadRef}
        accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,.webm,.mp3,.wav,.m4a"
        onChange={(e) => {
          upload([...e.target.files]);
          e.target.value = "";
        }}
      />
      {toast && (
        <div role="status" className={cx("toast", toast.error && "error")}>
          {toast.error ? <HelpCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.text}</span>
          <button
            className="icon-btn"
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {modal && (
        <div className="modal-backdrop" onClick={() => !busy && setModal(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Studio dialog"
            className={cx("modal", modal.type === "asset" && "media-modal")}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-btn"
              disabled={busy}
              aria-label="Close dialog"
              onClick={() => setModal(null)}
            >
              <X size={20} />
            </button>
            {modal.type === "new" && (
              <NewProject
                busy={busy}
                onCreate={(values) =>
                  act(async () => {
                    const p = await request("/projects", {
                      method: "POST",
                      body: values,
                    });
                    await refresh();
                    open(p);
                    setModal(null);
                    setToast({
                      text: "Your storyboard is ready. Make it yours.",
                    });
                  })
                }
              />
            )}
            {modal.type === "render" && (
              <>
                <div className="modal-symbol">
                  <Sparkles />
                </div>
                <h2>Ready for your next take?</h2>
                <p>
                  We'll check reading time, fit your text and render a real MP4.
                  This is template-based generation, not an AI fact-check.
                </p>
                <div className="render-summary">
                  <span>{project.scenes.length} scenes</span>
                  <span>
                    {fmt(project.scenes.reduce((a, s) => a + s.duration, 0))}{" "}
                    before checks
                  </span>
                  <span>
                    {project.audioId ? "Audio attached" : "Silent export"}
                  </span>
                </div>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={project.factsConfirmed}
                    onChange={(e) => {
                      setProject({
                        ...project,
                        factsConfirmed: e.target.checked,
                      });
                      setDirty(true);
                    }}
                  />
                  I've reviewed the script, checked factual claims and have
                  permission to use the media.
                </label>
                <button
                  className="btn primary full"
                  disabled={busy || !project.factsConfirmed}
                  onClick={() =>
                    act(async () => {
                      await saveProject();
                      await request("/projects/" + project.id + "/render", {
                        method: "POST",
                      });
                      await refresh();
                      setModal(null);
                      setToast({
                        text: "Your video is rendering. Progress is shown below the editor.",
                      });
                    })
                  }
                >
                  {busy ? (
                    <Loader2 className="spin" size={16} />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  Generate MP4
                </button>
              </>
            )}
            {modal.type === "feedback" && (
              <Feedback
                busy={busy}
                onSubmit={(values) =>
                  act(async () => {
                    await request(
                      "/generations/" + modal.generation.id + "/feedback",
                      { method: "POST", body: values },
                    );
                    await refresh();
                    setModal(null);
                    setToast({
                      text: "Feedback saved. Your next take starts from here.",
                    });
                  })
                }
              />
            )}
            {modal.type === "delete" && (
              <>
                <h2>Delete this project?</h2>
                <p>
                  “{modal.project.title}” will be removed. Your uploaded media
                  and previous exports stay in the workspace.
                </p>
                <div className="modal-actions">
                  <button
                    className="btn secondary"
                    onClick={() => setModal(null)}
                  >
                    Keep project
                  </button>
                  <button
                    className="btn danger-btn"
                    disabled={busy}
                    onClick={() =>
                      act(async () => {
                        await request("/projects/" + modal.project.id, {
                          method: "DELETE",
                        });
                        await refresh();
                        setModal(null);
                      })
                    }
                  >
                    Delete project
                  </button>
                </div>
              </>
            )}
            {modal.type === "asset" && (
              <>
                <h2>{modal.asset.name}</h2>
                {modal.asset.kind === "image" ? (
                  <img
                    className="media-player"
                    src={modal.asset.url}
                    alt={modal.asset.name}
                  />
                ) : modal.asset.kind === "video" ? (
                  <video
                    className="media-player"
                    controls
                    src={modal.asset.url}
                  />
                ) : (
                  <audio controls src={modal.asset.url} />
                )}
                <a
                  className="btn secondary"
                  href={modal.asset.downloadUrl || modal.asset.url}
                  download={modal.asset.name}
                >
                  <Download size={16} />
                  Download original
                </a>
              </>
            )}
            {modal.type === "workspace" && (
              <>
                <div className="modal-symbol">
                  <FolderOpen />
                </div>
                <h2>Your personal studio.</h2>
                <p>
                  {cloudMode
                    ? "This is your authenticated cloud workspace."
                    : "This is a single-user workspace."}{" "}
                  {cloudMode
                    ? "Projects and media are stored in Supabase, not automatically on your Windows computer."
                    : "Projects, feedback, uploads and exports are saved on this server—not automatically on your Windows computer."}
                </p>
                <div className="info-note">
                  {cloudMode
                    ? "Only invited accounts can use the studio. Owner-based policies protect private projects and media. Download important exports for your own backup."
                    : "No sign-in or team access controls are configured. Use a trusted environment; do not expose it publicly with private footage."}
                </div>
                <button
                  className="btn primary full"
                  onClick={() => setModal(null)}
                >
                  Back to creating
                </button>
              </>
            )}
            {modal.type === "help" && (
              <>
                <div className="modal-symbol">
                  <Clapperboard />
                </div>
                <h2>From idea to finished take.</h2>
                <div className="help-steps">
                  <p>
                    <b>1. Write your story.</b> Create a project with your own
                    script. The storyboard builder splits it into editable
                    scenes.
                  </p>
                  <p>
                    <b>2. Make it yours.</b> Set your brand colours, attach
                    images or video, and upload an optional voiceover or music
                    track.
                  </p>
                  <p>
                    <b>3. Review and generate.</b> Confirm your facts and
                    permissions, then export a real MP4.
                  </p>
                  <p>
                    <b>4. Improve the next one.</b> Review the result. Your
                    choices update reading pace or text size for future work.
                  </p>
                </div>
                <div className="info-note">
                  Online research and AI narration are not connected in this
                  version. Source links are for your review, not automatic
                  verification.
                </div>
                <button
                  className="btn primary full"
                  onClick={() => {
                    setModal({ type: "new" });
                  }}
                >
                  Start my first story <ArrowRight size={16} />
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
function Preview({ scene, project, data, index }) {
  const asset = data.assets.find((a) => a.id === scene.assetId);
  const character = data.assets.find((a) => a.id === scene.characterId);
  return (
    <div
      className={
        "video-canvas " + project.format + (character ? " has-character" : "")
      }
      style={{
        background: data.brand.background,
        color: data.brand.foreground,
        "--accent": data.brand.accent,
        "--copy-size": Math.round(data.brand.fontSize * 0.32) + "px",
      }}
    >
      {asset &&
        (asset.kind === "video" ? (
          <video
            className="canvas-media"
            src={asset.url}
            muted
            autoPlay
            loop
            playsInline
          />
        ) : (
          <img
            className="canvas-media"
            src={asset.url}
            alt="Scene background"
          />
        ))}
      {character && (
        <img
          alt="Character layer"
          src={character.url}
          className={
            "character-layer " +
            (scene.characterPosition || "center") +
            (scene.characterMotion === "float" ? " floating" : "")
          }
        />
      )}
      <div className="canvas-content">
        <div className="canvas-brand">{data.brand.name.toUpperCase()}</div>
        <div className="canvas-rule" />
        <span className="canvas-label">{scene.title}</span>
        <p className="canvas-body">{scene.body}</p>
        <div className="canvas-bottom">
          <span>
            {String(index + 1).padStart(2, "0")} /{" "}
            {String(project.scenes.length).padStart(2, "0")}
          </span>
          <div>
            <i
              style={{
                width: ((index + 1) / project.scenes.length) * 100 + "%",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
function Generation({ g, reviewed, onReview }) {
  return (
    <>
      {["queued", "rendering"].includes(g.status) ? (
        <div className="rendering">
          <div>
            <Loader2 size={18} className="spin" />
            <strong>
              {g.status === "queued"
                ? "Queued for the render worker…"
                : "Making your take…"}
            </strong>
            <span>{g.progress}%</span>
          </div>
          <div className="progress">
            <i style={{ width: g.progress + "%" }} />
          </div>
          <small>
            Render progress is saved. You can explore the studio while you wait.
          </small>
        </div>
      ) : g.status === "failed" ? (
        <div className="info-note error">
          <HelpCircle size={18} />
          {g.error}
        </div>
      ) : (
        <>
          <video
            className="export-preview"
            controls
            preload="metadata"
            src={g.url}
          />
          <div className="export-actions">
            <a
              href={g.downloadUrl || g.url}
              download={g.title + ".mp4"}
              className="btn primary"
            >
              <Download size={15} />
              Download MP4
            </a>
            <button
              className="btn secondary"
              disabled={reviewed}
              onClick={onReview}
            >
              {reviewed ? <Check size={15} /> : <MessageSquare size={15} />}{" "}
              {reviewed ? "Reviewed" : "Review this take"}
            </button>
            <small>
              {fmt(g.duration)} · {(g.size / 1024 / 1024).toFixed(1)} MB
            </small>
          </div>
        </>
      )}
    </>
  );
}
function NewProject({ busy, onCreate }) {
  const [title, setTitle] = useState(""),
    [script, setScript] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onCreate({ title, script });
      }}
    >
      <div className="modal-symbol">
        <Sparkles />
      </div>
      <div className="eyebrow">A NEW POINT OF VIEW</div>
      <h2>What's your next story?</h2>
      <p>Bring the words. We'll give them a storyboard you can shape.</p>
      <label className="field">
        Project name
        <input
          autoFocus
          required
          maxLength={100}
          placeholder="Give your story a name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label className="field">
        Your script
        <textarea
          required
          minLength={10}
          maxLength={3000}
          rows={7}
          placeholder="Start with a clear point. Add the context. Leave us with something to think about…"
          value={script}
          onChange={(e) => setScript(e.target.value)}
        />
        <span className="field-foot">
          Your words are kept. Scenes are split by rules, not written by AI.{" "}
          {script.length}/3000
        </span>
      </label>
      <button
        className="btn primary full"
        disabled={busy || !title.trim() || script.trim().length < 10}
      >
        {busy ? (
          <Loader2 size={16} className="spin" />
        ) : (
          <Clapperboard size={16} />
        )}
        Create storyboard <ArrowRight size={16} />
      </button>
    </form>
  );
}
function Feedback({ busy, onSubmit }) {
  const [kind, setKind] = useState("keep"),
    [note, setNote] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ kind, note });
      }}
    >
      <div className="modal-symbol">
        <Sparkles />
      </div>
      <h2>Let's make the next one better.</h2>
      <p>
        Choose one adjustment. It becomes a saved default, not a change to this
        finished video.
      </p>
      <div className="feedback-options">
        {[
          ["keep", "Keep this direction", "These defaults feel right."],
          [
            "slower",
            "Give it more breathing room",
            "Longer scene durations in new drafts.",
          ],
          [
            "larger",
            "Make the text easier to read",
            "Increase text size for future renders.",
          ],
        ].map(([k, t, d]) => (
          <label className={kind === k ? "checked" : ""} key={k}>
            <input
              type="radio"
              name="feedback"
              value={k}
              checked={kind === k}
              onChange={() => setKind(k)}
            />
            <span>
              <strong>{t}</strong>
              <small>{d}</small>
            </span>
          </label>
        ))}
      </div>
      <label className="field">
        A note for your creative journal{" "}
        <textarea
          maxLength={500}
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What worked? What would you do differently?"
        />
      </label>
      <button className="btn primary full" disabled={busy}>
        <Check size={16} />
        Save review
      </button>
    </form>
  );
}
createRoot(document.getElementById("root")).render(
  <AuthGate>
    <App />
  </AuthGate>,
);
