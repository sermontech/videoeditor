import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
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
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    host.current.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#172b2e");
    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
    camera.position.set(3, 2, 5);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);
    controls.enableDamping = true;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x354947, 2));
    const key = new THREE.DirectionalLight(0xffffff, 3);
    key.position.set(3, 5, 4);
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
    part(new THREE.BoxGeometry(0.7, 0.8, 0.4), 0xb8e3cc, 0, 1, 0);
    part(new THREE.BoxGeometry(0.6, 0.5, 0.5), 0xf6f2e9, 0, 1.7, 0);
    for (const x of [-0.17, 0.17])
      part(new THREE.SphereGeometry(0.065), 0x172b2e, x, 1.75, 0.26);
    for (const x of [-0.24, 0.24])
      part(new THREE.BoxGeometry(0.19, 0.55, 0.25), 0x759d90, x, 0.32, 0);
    const arm = part(
      new THREE.BoxGeometry(0.18, 0.7, 0.2),
      0xb8e3cc,
      0.5,
      1,
      0,
    );
    part(new THREE.BoxGeometry(0.18, 0.7, 0.2), 0xb8e3cc, -0.5, 1, 0);
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
    };
    engine.current = state;
    const observer = new ResizeObserver(() => {
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
        if (state.demo) state.arm.rotation.z = Math.sin(state.time * 2) * 0.35;
      }
      controls.update();
      renderer.render(scene, camera);
    }
    tick();
    return () => {
      serial.current++;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      state.mixer?.stopAllAction();
      dispose(scene);
      renderer.dispose();
      renderer.domElement.remove();
      engine.current = null;
    };
  }, []);
  async function load(file) {
    if (!file || !engine.current) return;
    const token = ++serial.current;
    setBusy(true);
    setError("");
    try {
      if (
        !file.name.toLowerCase().endsWith(".glb") ||
        file.size > 30 * 1024 * 1024
      )
        throw Error("Choose a self-contained .glb file up to 30 MB.");
      const buffer = await file.arrayBuffer();
      validateGlb(buffer);
      const manager = new THREE.LoadingManager();
      manager.setURLModifier((url) => {
        if (!url.startsWith("blob:"))
          throw Error("External model resources are blocked.");
        return url;
      });
      const gltf = await new GLTFLoader(manager).parseAsync(buffer, "");
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
      wrapper.scale.setScalar(2 / longest);
      const center = bounds.getCenter(new THREE.Vector3());
      gltf.scene.position.sub(
        new THREE.Vector3(center.x, bounds.min.y, center.z),
      );
      s.mixer?.stopAllAction();
      s.scene.remove(s.model);
      dispose(s.model);
      s.model = wrapper;
      s.scene.add(wrapper);
      s.demo = false;
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
    } catch (e) {
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
      if (!blob) return;
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "clear-take-3d-preview.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  }
  return (
    <section className="three-studio">
      <p className="eyebrow">LOCAL BROWSER WORKSPACE</p>
      <h1>3D character studio</h1>
      <p>
        Explore a real 3D model, play its embedded animations, and frame your
        shot. This is a preview workspace—not AI animation generation or video
        export.
      </p>
      <div className="three-layout">
        <div
          className="three-viewport"
          ref={host}
          aria-label="Interactive 3D model preview"
        />
        <aside className="three-controls">
          <h3>{name}</h3>
          <label className="field">
            Import GLB model
            <input
              aria-label="Import GLB model"
              type="file"
              accept=".glb"
              disabled={busy}
              onChange={(e) => {
                load(e.target.files[0]);
                e.target.value = "";
              }}
            />
          </label>
          <small>
            Embedded resources only, up to 30 MB. Files stay in this browser
            session and are not uploaded or saved. Use only models you have
            permission to use. VRM, FBX and MetaHuman are not supported yet.
          </small>
          <label className="field">
            Animation
            <select value={clip} onChange={(e) => selectClip(e.target.value)}>
              <option value="">
                {name === "Clear Take demo robot"
                  ? "Demo arm motion"
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
            Environment colour
            <input
              type="color"
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
          {busy && <p role="status">Loading model…</p>}
          {error && <p role="alert">{error}</p>}
        </aside>
      </div>
    </section>
  );
}
