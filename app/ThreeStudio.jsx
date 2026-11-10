import KitCatalogue from "./KitCatalogue.jsx";
import LipSyncControls from "./LipSyncControls.jsx";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { modelReport } from "./model-report.mjs";
import {
  demoMotions,
  cameraMoves,
  motionDefaults,
  poseAt,
  cameraAt,
} from "./motion-presets.mjs";
import KitControls from "./KitControls";
import { kitDefaults } from "./football-kits.mjs";
import { applyKit, clothingMeshes } from "./kit-materials";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  formats,
  validateScene,
  saveBlob,
  base64,
  unbase64,
} from "./three-scene.mjs";
import {
  footballPresets,
  footballDefaults,
  fitHeight,
} from "./football-presets.mjs";
import { buildFootball } from "./football-environment";
import { validateGlb } from "./model-validation";

function dispose(root) {
  root.traverse((o) => {
    o.geometry?.dispose();
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m) continue;
      for (const value of Object.values(m))
        if (value?.isTexture) value.dispose();
      m.dispose();
    }
  });
}
export default function ThreeStudio() {
  const host = useRef(),
    engine = useRef(),
    serial = useRef(0);
  const [error, setError] = useState(""),
    [name, setName] = useState("Clear Take demo robot");
  const [clips, setClips] = useState([]),
    [clip, setClip] = useState(""),
    [playing, setPlaying] = useState(true);
  const [busy, setBusy] = useState(false),
    [background, setBackground] = useState("#172b2e");
  const [format, setFormat] = useState("landscape"),
    [duration, setDuration] = useState(5);
  const [recording, setRecording] = useState(false),
    [notice, setNotice] = useState("");
  const capture = useRef(null);
  const [report, setReport] = useState(null);
  const [motion, setMotion] = useState({ ...motionDefaults });
  useEffect(() => {
    const s = engine.current;
    if (!s) return;
    s.motion = motion;
    s.time = 0;
    if (!s.cameraBase || s.motionCamera === "static")
      s.cameraBase = s.camera.position.toArray();
    s.cameraTarget = s.controls.target.toArray();
    s.motionCamera = motion.camera;
    if (motion.camera === "static" && s.cameraBase)
      s.camera.position.fromArray(s.cameraBase);
    s.controls.enabled = motion.camera === "static";
  }, [motion]);
  const [kit, setKit] = useState(() => structuredClone(kitDefaults));
  const [meshNames, setMeshNames] = useState([]),
    [modelRevision, setModelRevision] = useState(0);
  useEffect(() => {
    const s = engine.current;
    if (!s) return;
    try {
      s.kitCleanup?.();
      s.kitCleanup = applyKit(s.model, kit, s.demo);
    } catch (e) {
      setError(e.message);
    }
    return () => {
      s.kitCleanup?.();
      s.kitCleanup = null;
    };
  }, [kit, modelRevision]);
  const [football, setFootball] = useState(null),
    [category, setCategory] = useState("All"),
    [search, setSearch] = useState("");
  const patchFootball = (patch) => setFootball((v) => ({ ...v, ...patch }));
  const selectedPreset = footballPresets.find((p) => p.id === football?.preset);
  function applyCharacter(s, settings) {
    const o = settings || { x: 0, y: 0, z: 0, rotation: 0, scale: 1 };
    s.anchor = [o.x, o.y, o.z];
    s.model.position.set(o.x, o.y, o.z);
    s.model.rotation.y = (o.rotation * Math.PI) / 180;
    s.model.scale.setScalar((s.baseScale || 1) * o.scale);
    s.model.traverse((m) => {
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
  }
  useEffect(() => {
    const s = engine.current;
    if (!s) return;
    if (s.environment) {
      s.scene.remove(s.environment.root);
      dispose(s.environment.root);
      s.environment = null;
    }
    s.grid.visible = !football;
    if (football) {
      s.environment = buildFootball(football);
      s.scene.add(s.environment.root);
      s.scene.background.set(s.environment.preset.sky);
      s.key.intensity = 3 * football.light;
      s.fill.intensity = 1.2 * football.light;
      s.key.color.set(football.preset === "dusk" ? "#ffcb91" : "#ffffff");
      s.key.position.set(
        football.preset === "dark-studio" ? -3 : 3,
        5,
        football.preset === "dark-studio" ? -2 : 4,
      );
    } else {
      s.scene.background.set(background);
      s.key.intensity = 3;
      s.fill.intensity = 2;
      s.key.color.set("#ffffff");
      s.key.position.set(3, 5, 4);
    }
    applyCharacter(s, football);
  }, [football]);
  useEffect(() => {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true,
      });
    } catch {
      setError(
        "WebGL is unavailable. Enable browser hardware acceleration or try another browser.",
      );
      return;
    }
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    host.current.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#172b2e");
    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
    camera.position.set(3, 2, 5);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.enableDamping = true;
    const fill = new THREE.HemisphereLight(0xffffff, 0x354947, 2);
    scene.add(fill);
    const key = new THREE.DirectionalLight(0xffffff, 3);
    key.position.set(3, 5, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    key.shadow.bias = -0.001;
    scene.add(key);
    const grid = new THREE.GridHelper(10, 20, 0x72958a, 0x39564c);
    scene.add(grid);
    const model = new THREE.Group();
    const part = (geometry, color, x, y, z) => {
      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({ color, roughness: 0.45 }),
      );
      mesh.position.set(x, y, z);
      model.add(mesh);
      return mesh;
    };
    const torso = part(new THREE.BoxGeometry(0.7, 0.8, 0.4), 0xb8e3cc, 0, 1, 0);
    torso.userData = { kitPart: "jersey", kitLabels: true };
    torso.name = "Jersey";
    part(new THREE.BoxGeometry(0.6, 0.5, 0.5), 0xf6f2e9, 0, 1.7, 0);
    for (const x of [-0.17, 0.17])
      part(new THREE.SphereGeometry(0.065), 0x172b2e, x, 1.75, 0.26);
    const legs = [];
    for (const x of [-0.24, 0.24]) {
      const shorts = part(
        new THREE.BoxGeometry(0.19, 0.28, 0.25),
        0x759d90,
        x,
        0.455,
        0,
      );
      shorts.userData.kitPart = "shorts";
      const sock = part(
        new THREE.BoxGeometry(0.19, 0.27, 0.25),
        0x759d90,
        x,
        0.18,
        0,
      );
      sock.userData.kitPart = "socks";
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.6, 0);
      model.add(pivot);
      for (const mesh of [shorts, sock]) {
        pivot.add(mesh);
        mesh.position.x -= x;
        mesh.position.y -= 0.6;
      }
      legs.push(pivot);
    }
    const arm = part(
      new THREE.BoxGeometry(0.18, 0.7, 0.2),
      0xb8e3cc,
      0.5,
      1,
      0,
    );
    arm.userData.kitPart = "jersey";
    const otherArm = part(
      new THREE.BoxGeometry(0.18, 0.7, 0.2),
      0xb8e3cc,
      -0.5,
      1,
      0,
    );
    otherArm.userData.kitPart = "jersey";
    const shoulder = (mesh) => {
      const pivot = new THREE.Group();
      pivot.position.set(mesh.position.x, 1.35, 0);
      model.add(pivot);
      pivot.add(mesh);
      mesh.position.set(0, -0.35, 0);
      return pivot;
    };
    const rightShoulder = shoulder(arm),
      leftShoulder = shoulder(otherArm);
    scene.add(model);
    const state = {
      renderer,
      scene,
      camera,
      controls,
      model,
      mixer: null,
      clips: [],
      playing: true,
      time: 0,
      demo: true,
      arm,
      rightShoulder,
      leftShoulder,
      legs,
      anchor: [0, 0, 0],
      motion: { ...motionDefaults },
      cameraBase: null,
      cameraTarget: [0, 1, 0],
      motionCamera: "static",
      modelBuffer: null,
      key,
      fill,
      grid,
      environment: null,
      baseScale: 1,
    };
    engine.current = state;
    const observer = new ResizeObserver(() => {
      if (capture.current) return;
      const w = host.current?.clientWidth || 600;
      const h = host.current?.clientHeight || 480;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    observer.observe(host.current);
    const clock = new THREE.Clock();
    let frame;
    function tick() {
      frame = requestAnimationFrame(tick);
      const delta = Math.min(clock.getDelta(), 0.1);
      if (state.playing) {
        state.time += delta;
        state.mixer?.update(delta);
        state.lipSyncTick?.();

        if (state.demo) {
          const p = poseAt(state.motion.demo, state.time * state.motion.speed);
          state.leftShoulder.rotation.set(p.leftArm, 0, p.armSpread);
          state.rightShoulder.rotation.set(p.rightArm, 0, -p.armSpread);
          state.legs[0].rotation.x = p.leftLeg;
          state.legs[1].rotation.x = p.rightLeg;
          state.model.position.y = state.anchor[1] + p.bounce;
        }
      }
      state.vrm?.update(state.playing ? delta : 0);
      state.environment?.update(state.time);
      if (state.motion.camera !== "static" && state.cameraBase) {
        camera.position.fromArray(
          cameraAt(
            state.motion.camera,
            state.time * state.motion.speed,
            state.cameraBase,
            state.cameraTarget,
          ),
        );
        controls.target.fromArray(state.cameraTarget);
      }
      controls.update();
      renderer.render(scene, camera);
    }
    tick();
    return () => {
      capture.current?.cancel();
      serial.current++;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      state.mixer?.stopAllAction();
      state.kitCleanup?.();
      dispose(scene);
      renderer.dispose();
      renderer.domElement.remove();
      engine.current = null;
    };
  }, []);
  async function load(file, restoring = false) {
    if (!file || !engine.current) return;
    const token = ++serial.current;
    setBusy(true);
    setError("");
    try {
      if (!/\.(glb|vrm)$/i.test(file.name) || file.size > 30 * 1024 * 1024)
        throw Error("Choose a self-contained .glb or .vrm file up to 30 MB.");
      const buffer = await file.arrayBuffer();
      const metadata = validateGlb(buffer);
      if (
        file.name.toLowerCase().endsWith(".vrm") &&
        !metadata.extensions?.VRMC_vrm &&
        !metadata.extensions?.VRM
      )
        throw Error("This file has no VRM avatar metadata.");
      const manager = new THREE.LoadingManager();
      manager.setURLModifier((url) => {
        if (!url.startsWith("blob:"))
          throw Error("External model resources are blocked.");
        return url;
      });
      const loader = new GLTFLoader(manager);
      loader.register((parser) => new VRMLoaderPlugin(parser));
      const gltf = await loader.parseAsync(buffer, "");
      const vrm = gltf.userData.vrm;
      if (vrm) {
        VRMUtils.rotateVRM0(vrm);
        vrm.update(0);
      }
      if ((metadata.extensions?.VRMC_vrm || metadata.extensions?.VRM) && !vrm) {
        dispose(gltf.scene);
        throw Error("VRM avatar could not be initialized.");
      }
      if (token !== serial.current || !engine.current) {
        dispose(gltf.scene);
        return;
      }
      const s = engine.current;
      const bounds = new THREE.Box3().setFromObject(gltf.scene),
        size = bounds.getSize(new THREE.Vector3());
      const longest = Math.max(size.x, size.y, size.z);
      if (!Number.isFinite(longest) || longest <= 0) {
        dispose(gltf.scene);
        throw Error("Model has no visible geometry.");
      }
      const wrapper = new THREE.Group();
      wrapper.add(gltf.scene);
      const fittedScale = fitHeight(bounds);
      wrapper.scale.setScalar(fittedScale);
      const center = bounds.getCenter(new THREE.Vector3());
      gltf.scene.position.sub(
        new THREE.Vector3(center.x, bounds.min.y, center.z),
      );
      s.mixer?.stopAllAction();
      s.kitCleanup?.();
      s.kitCleanup = null;
      s.scene.remove(s.model);
      dispose(s.model);
      s.model = wrapper;
      s.baseScale = fittedScale;
      applyCharacter(s, football);
      s.scene.add(wrapper);
      s.demo = false;
      s.modelBuffer = buffer;
      s.vrm = vrm || null;
      setReport(modelReport(metadata, buffer.byteLength));
      s.mixer = new THREE.AnimationMixer(gltf.scene);
      s.clips = gltf.animations;
      setClips(
        gltf.animations.map((c, i) => ({
          id: String(i),
          name: c.name || `Animation ${i + 1}`,
        })),
      );
      setClip("");
      setName(file.name);
      setMeshNames(
        clothingMeshes(s.model).map(
          (m, i) => `${i + 1}: ${m.name || "Unnamed mesh"}`,
        ),
      );
      if (!restoring) setKit({ ...structuredClone(kitDefaults) });
      setModelRevision((r) => r + 1);
      return true;
    } catch (e) {
      if (restoring) throw e;
      if (token === serial.current)
        setError(e.message || "Could not load model. Try an uncompressed GLB.");
    } finally {
      if (token === serial.current) setBusy(false);
    }
  }
  function selectClip(value) {
    setClip(value);
    const s = engine.current;
    if (!s) return;
    s.mixer?.stopAllAction();
    if (value !== "") s.mixer.clipAction(s.clips[Number(value)]).reset().play();
  }
  function snapshot() {
    const s = engine.current;
    if (!s) return;
    s.renderer.render(s.scene, s.camera);
    s.renderer.domElement.toBlob((blob) => {
      if (blob) saveBlob(blob, "clear-take-3d-preview.png");
    });
  }
  function saveScene() {
    const s = engine.current;
    if (!s) return;
    try {
      const scene = validateScene({
        type: "clear-take-3d",
        version: 1,
        name,
        background,
        format,
        duration,
        playing,
        clip: clip === "" ? -1 : Number(clip),
        camera:
          motion.camera === "static"
            ? s.camera.position.toArray()
            : s.cameraBase || s.camera.position.toArray(),
        target: s.controls.target.toArray(),
        football,
        kit,
        motion,
        model: s.modelBuffer ? base64(s.modelBuffer) : null,
      });
      saveBlob(
        new Blob([JSON.stringify(scene)], { type: "application/json" }),
        "clear-take-scene.json",
      );
      setNotice(
        "Scene downloaded. Keep this file to reopen your model and settings.",
      );
    } catch (e) {
      setError(e.message);
    }
  }
  async function openScene(file) {
    if (!file || !engine.current) return;
    setError("");
    setBusy(true);
    try {
      if (file.size > 43 * 1024 * 1024)
        throw Error("Scene file exceeds 43 MB.");
      const scene = validateScene(JSON.parse(await file.text()));
      if (scene.model) {
        const buffer = unbase64(scene.model);
        const meta = validateGlb(buffer);
        if (scene.clip >= (meta.animations || []).length)
          throw Error("Scene animation does not exist in this model.");
        if (!(await load(new File([buffer], "restored.glb"), true))) return;
      } else if (!engine.current.demo)
        throw Error(
          "To restore a demo scene, leave 3D studio and reopen it first.",
        );
      const s = engine.current;
      if (!s) return;
      setName(scene.name);
      setBackground(scene.background);
      s.scene.background.set(scene.background);
      setFootball(scene.football || null);
      setKit(scene.kit || structuredClone(kitDefaults));
      setMotion(scene.motion || { ...motionDefaults });
      s.cameraBase = [...scene.camera];
      s.cameraTarget = [...scene.target];
      s.motionCamera = "restoring";
      setFormat(scene.format);
      setDuration(scene.duration);
      setPlaying(scene.playing);
      s.playing = scene.playing;
      s.camera.position.fromArray(scene.camera);
      s.controls.target.fromArray(scene.target);
      s.controls.update();
      selectClip(scene.clip < 0 ? "" : String(scene.clip));
      setNotice("Scene restored locally. No files were uploaded.");
    } catch (e) {
      setError(e.message || "Could not open scene.");
    } finally {
      setBusy(false);
    }
  }
  function recordVideo() {
    const s = engine.current;
    if (!s || capture.current) return;
    setError("");
    setNotice("");
    if (!window.MediaRecorder || !s.renderer.domElement.captureStream) {
      setError(
        "This browser cannot record the canvas. Try current Chrome or Edge.",
      );
      return;
    }
    const mime = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ].find((t) => MediaRecorder.isTypeSupported(t));
    if (!mime) {
      setError("WebM recording is unavailable in this browser.");
      return;
    }
    const oldSize = s.renderer.getSize(new THREE.Vector2()),
      oldRatio = s.renderer.getPixelRatio(),
      oldAspect = s.camera.aspect;
    const oldPlaying = s.playing,
      oldTime = s.time;
    let stream,
      recorder,
      timer,
      cancelled = false,
      done = false;
    const restore = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", visibility);
      stream?.getTracks().forEach((t) => t.stop());
      s.renderer.setPixelRatio(oldRatio);
      s.renderer.setSize(oldSize.x, oldSize.y);
      s.camera.aspect = oldAspect;
      s.camera.updateProjectionMatrix();
      s.controls.enabled = s.motion.camera === "static";
      s.playing = oldPlaying;
      s.time = oldTime;
      capture.current = null;
      if (engine.current === s) setRecording(false);
    };
    const cancel = () => {
      cancelled = true;
      if (recorder?.state !== "inactive") recorder?.stop();
      restore();
    };
    const visibility = () => {
      if (document.hidden) {
        cancel();
        setError(
          "Recording cancelled because the tab was hidden. Keep this tab visible during export.",
        );
      }
    };
    try {
      const [w, h] = formats[format];
      s.renderer.setPixelRatio(1);
      s.renderer.setSize(w, h, false);
      s.camera.aspect = w / h;
      s.camera.updateProjectionMatrix();
      s.controls.enabled = false;
      s.playing = true;
      s.time = 0;
      s.mixer?.setTime(0);
      s.renderer.render(s.scene, s.camera);
      stream = s.renderer.domElement.captureStream(30);
      recorder = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: 5000000,
      });
      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recorder.onerror = () => {
        cancelled = true;
        restore();
        if (engine.current === s)
          setError("Video recording failed. Try a smaller model.");
      };
      recorder.onstop = () => {
        restore();
        if (!cancelled && engine.current === s) {
          const blob = new Blob(chunks, { type: mime });
          if (blob.size) {
            saveBlob(blob, "clear-take-3d.webm");
            setNotice(
              "WebM exported. Review playback before sharing; timing depends on browser performance.",
            );
          } else setError("No video frames were recorded.");
        }
      };
      capture.current = { cancel };
      setRecording(true);
      document.addEventListener("visibilitychange", visibility);
      recorder.start(250);
      timer = setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
      }, duration * 1000);
    } catch (e) {
      cancelled = true;
      restore();
      setError(e.message || "Could not record video.");
    }
  }
  return (
    <section className="three-studio">
      <p className="eyebrow">LOCAL BROWSER WORKSPACE</p>
      <h1>3D character studio</h1>
      <p>
        Explore a real 3D model, play its embedded animations, and frame your
        shot. Save a portable scene or export a short silent WebM locally. This
        does not generate new body animation with AI.
      </p>
      <div className="three-layout">
        <div
          className={
            "three-viewport" + (football?.safeZones ? " show-safe-zones" : "")
          }
          ref={host}
          aria-label="Interactive 3D model preview"
        />
        <aside className="three-controls">
          <fieldset disabled={recording || busy} className="three-fieldset">
            <label className="field">
              Content mode
              <select
                aria-label="Content mode"
                value={football ? "football" : "general"}
                onChange={(e) => {
                  setFootball(
                    e.target.value === "football"
                      ? { ...footballDefaults }
                      : null,
                  );
                  if (engine.current) {
                    engine.current.camera.position.set(3, 2, 5);
                    engine.current.controls.target.set(0, 1, 0);
                    engine.current.cameraBase = [3, 2, 5];
                    engine.current.cameraTarget = [0, 1, 0];
                  }
                }}
              >
                <option value="general">General 3D</option>
                <option value="football">Football</option>
              </select>
            </label>
            {football && (
              <div className="football-presets">
                <h3>Football environments</h3>
                <p>
                  Original stylized 3D sets. Shadows and lighting are rendered
                  live; fitting uses model bounds, not foot detection. No
                  photorealism, reflections or automatic kit changes.
                </p>
                <label className="field">
                  Preset category
                  <select
                    aria-label="Preset category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {[
                      "All",
                      ...new Set(footballPresets.map((p) => p.category)),
                    ].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Search football presets
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tunnel, interview, training…"
                  />
                </label>
                <div
                  className="football-preset-list"
                  role="group"
                  aria-label="Football presets"
                >
                  {footballPresets
                    .filter(
                      (p) =>
                        (category === "All" || p.category === category) &&
                        `${p.name} ${p.workflow}`
                          .toLowerCase()
                          .includes(search.toLowerCase()),
                    )
                    .map((p) => (
                      <button
                        key={p.id}
                        aria-pressed={football.preset === p.id}
                        onClick={() => {
                          patchFootball({ preset: p.id });
                          if (p.id === "vertical") setFormat("portrait");
                        }}
                      >
                        <span
                          className="preset-swatch"
                          style={{ background: p.sky }}
                        />
                        <span>
                          {p.name}
                          <small>
                            {p.category} · {p.workflow}
                          </small>
                        </span>
                      </button>
                    ))}
                </div>
                <p>
                  <strong>{selectedPreset?.name}</strong>
                  <br />
                  {selectedPreset?.tip} Suggestions only; animations and audio
                  are not supplied.
                </p>
                {["primary", "secondary"].map((k) => (
                  <label className="field" key={k}>
                    {k === "primary"
                      ? "Primary team colour"
                      : "Secondary team colour"}
                    <input
                      type="color"
                      value={football[k]}
                      onChange={(e) => patchFootball({ [k]: e.target.value })}
                    />
                  </label>
                ))}
                <label className="field">
                  Lighting intensity
                  <input
                    type="range"
                    min="0.25"
                    max="2"
                    step="0.05"
                    value={football.light}
                    onChange={(e) =>
                      patchFootball({ light: Number(e.target.value) })
                    }
                  />
                </label>
                {["stadium", "neon"].includes(selectedPreset?.layout) && (
                  <label className="field">
                    Stylized crowd density
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={football.crowd}
                      disabled={football.preset === "empty"}
                      onChange={(e) =>
                        patchFootball({ crowd: Number(e.target.value) })
                      }
                    />
                  </label>
                )}
                <label>
                  <input
                    type="checkbox"
                    checked={football.animated}
                    onChange={(e) =>
                      patchFootball({ animated: e.target.checked })
                    }
                  />{" "}
                  Pulse accent lights where present
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={football.safeZones}
                    onChange={(e) =>
                      patchFootball({ safeZones: e.target.checked })
                    }
                  />{" "}
                  Show composition safe-zone guide (not exported)
                </label>
                <h4>Character fit adjustments</h4>
                {[
                  ["x", "Horizontal position", -3, 3, 0.1],
                  ["z", "Depth position", -3, 3, 0.1],
                  ["y", "Ground offset", -1, 2, 0.05],
                  ["rotation", "Rotation", -180, 180, 5],
                  ["scale", "Scale", 0.25, 2, 0.05],
                ].map(([k, label, min, max, step]) => (
                  <label className="field" key={k}>
                    {label} · {football[k]}
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={football[k]}
                      onChange={(e) =>
                        patchFootball({ [k]: Number(e.target.value) })
                      }
                    />
                  </label>
                ))}
                <button
                  onClick={() =>
                    patchFootball({ x: 0, y: 0, z: 0, rotation: 0, scale: 1 })
                  }
                >
                  Reset character fit
                </button>
              </div>
            )}
            <KitCatalogue />
            <KitControls
              kit={kit}
              onChange={setKit}
              meshes={meshNames}
              demo={engine.current?.demo !== false}
            />
            <h3>{name}</h3>
            <LipSyncControls
              engine={engine}
              revision={modelRevision}
              playing={playing}
              recording={recording}
            />
            {report && (
              <div
                className="football-presets"
                aria-label="Model inspection report"
              >
                <h3>Model inspection · {report.format}</h3>
                {report.title && <p>{report.title}</p>}
                <p>
                  {report.megabytes} MB · {report.meshes} meshes ·{" "}
                  {report.materials} materials ·{" "}
                  {report.vertices.toLocaleString()} vertices · {report.skins}{" "}
                  skins · {report.animations} clips · {report.morphTargets}{" "}
                  morph targets
                </p>
                <p>{report.permissions}</p>
                {report.warnings.map((w) => (
                  <p key={w}>{w}</p>
                ))}
                <button
                  onClick={() =>
                    saveBlob(
                      new Blob([JSON.stringify(report, null, 2)], {
                        type: "application/json",
                      }),
                      "model-report.json",
                    )
                  }
                >
                  Download model report
                </button>
              </div>
            )}
            <label className="field">
              Import GLB / VRM model
              <input
                aria-label="Import GLB / VRM model"
                type="file"
                accept=".glb,.vrm"
                disabled={busy}
                onChange={(e) => {
                  load(e.target.files[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <small>
              Embedded resources only, up to 30 MB. Files stay in this browser
              session unless you download a scene file; they are never uploaded
              here. Use only models you have permission to use. VRM avatars are
              supported; FBX and MetaHuman are not. Imported rigs still need
              their own clips; no automatic motion retargeting.
            </small>
            <div className="football-presets">
              <h3>Motion and camera</h3>
              {engine.current?.demo !== false ? (
                <label className="field">
                  Demo motion
                  <select
                    aria-label="Demo motion"
                    value={motion.demo}
                    onChange={(e) =>
                      setMotion({ ...motion, demo: e.target.value })
                    }
                  >
                    {Object.entries(demoMotions).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p>
                  Imported models use their own animation clips below. Demo
                  motions are not retargeted onto imported rigs.
                </p>
              )}
              <label className="field">
                Camera move
                <select
                  aria-label="Camera move"
                  value={motion.camera}
                  onChange={(e) =>
                    setMotion({ ...motion, camera: e.target.value })
                  }
                >
                  {Object.entries(cameraMoves).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Preset speed
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={motion.speed}
                  onChange={(e) =>
                    setMotion({ ...motion, speed: Number(e.target.value) })
                  }
                />
              </label>
              <small>
                Procedural stylized demo motions, not motion capture or ball
                physics. Camera moves start from your framed shot. Select Static
                / manual to reframe. Speed affects demo motion and camera only.
              </small>
            </div>
            <label className="field">
              Animation
              <select value={clip} onChange={(e) => selectClip(e.target.value)}>
                <option value="">
                  {name === "Clear Take demo robot"
                    ? "Use demo motion preset"
                    : "Rest pose"}
                </option>
                {clips.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => {
                setPlaying(!playing);
                if (engine.current) engine.current.playing = !playing;
              }}
            >
              {playing ? "Pause animation" : "Play animation"}
            </button>
            <label className="field">
              Environment colour (general mode)
              <input
                type="color"
                disabled={!!football}
                value={background}
                onChange={(e) => {
                  setBackground(e.target.value);
                  engine.current?.scene.background.set(e.target.value);
                }}
              />
            </label>
            <button
              onClick={() => {
                const s = engine.current;
                if (s) {
                  s.camera.position.set(3, 2, 5);
                  s.controls.target.set(0, 1, 0);
                  s.cameraBase = [3, 2, 5];
                  s.cameraTarget = [0, 1, 0];
                  s.controls.update();
                }
              }}
            >
              Reset camera
            </button>
            <button onClick={snapshot}>Download preview PNG</button>
            <p>
              Drag to orbit · scroll to zoom · right-drag to pan. Models without
              animation clips remain static.
            </p>
            <label className="field">
              Export format
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                <option value="landscape">16:9 · 1280 × 720</option>
                <option value="portrait">9:16 · 720 × 1280</option>
                <option value="square">1:1 · 720 × 720</option>
                <option value="social">4:5 · 720 × 900</option>
              </select>
            </label>
            <label className="field">
              Video duration
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              >
                {[5, 10, 15, 20, 30].map((n) => (
                  <option key={n} value={n}>
                    {n} seconds
                  </option>
                ))}
              </select>
            </label>
            <button onClick={saveScene}>Save scene file</button>
            <label className="field">
              Open scene file
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  openScene(e.target.files[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <button onClick={recordVideo}>Export WebM video</button>
            <details>
              <summary>MP4 and audio on your Windows computer</summary>
              <p>
                After downloading your WebM, update your local repository and
                run this from its folder in PowerShell:
              </p>
              <code>
                npm run convert:3d -- "$HOME/Downloads/clear-take-3d.webm"
                "$HOME/Downloads/clear-take-3d.mp4"
              </code>
              <p>
                Optionally append{" "}
                <code>--audio "C:/path/to/your-audio.mp3"</code>. Use audio you
                have rights to. This local converter creates a new MP4, limits
                video to 30 seconds, and pads/trims the audio. No upload or paid
                service. Requires the existing Python renderer setup. Choose a
                fresh output filename each time.
              </p>
            </details>
            <small>
              Records locally in real time at up to 30 fps. Keep this tab
              visible. No audio, MP4 conversion or cloud history yet. Export
              framing follows the selected aspect ratio.
            </small>
          </fieldset>
          {recording && (
            <>
              <p role="status">
                Recording {duration}-second video… Keep this tab open.
              </p>
              <button onClick={() => capture.current?.cancel()}>
                Cancel export
              </button>
            </>
          )}
          {notice && <p role="status">{notice}</p>}
          {busy && <p role="status">Loading model…</p>}
          {error && <p role="alert">{error}</p>}
        </aside>
      </div>
    </section>
  );
}
