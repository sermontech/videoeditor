import React from "react";
import { competitions, kitTypes } from "./football-kits.mjs";
export default function KitControls({ kit, onChange, meshes, demo }) {
  const patch = (p) => onChange({ ...kit, ...p });
  return (
    <div className="football-presets">
      <h3>Football kit designer</h3>
      <strong>Concept / stylized · not official or licensed</strong>
      <p>
        Design your own colours and patterns. Competition and team fields
        organize your concept; they do not load official or season-accurate
        kits. No crests, sponsors or manufacturer logos are included.
      </p>
      <label>
        <input
          type="checkbox"
          checked={kit.enabled}
          onChange={(e) => patch({ enabled: e.target.checked })}
        />{" "}
        Apply football kit
      </label>
      {kit.enabled && (
        <>
          <label className="field">
            Competition / league
            <input
              list="kit-competitions"
              value={kit.competition}
              maxLength={80}
              onChange={(e) => patch({ competition: e.target.value })}
            />
            <datalist id="kit-competitions">
              {competitions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
          <label className="field">
            Club or national team
            <input
              value={kit.team}
              maxLength={80}
              onChange={(e) => patch({ team: e.target.value })}
            />
          </label>
          <label className="field">
            Season / edition
            <input
              value={kit.season}
              maxLength={30}
              onChange={(e) => patch({ season: e.target.value })}
            />
          </label>
          <label className="field">
            Kit type
            <select
              aria-label="Kit type"
              value={kit.type}
              onChange={(e) => patch({ type: e.target.value })}
            >
              {kitTypes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Jersey pattern
            <select
              aria-label="Jersey pattern"
              value={kit.pattern}
              onChange={(e) => patch({ pattern: e.target.value })}
            >
              {["solid", "stripes", "hoops", "sash", "halves"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          {[
            ["jersey", "Jersey colour"],
            ["accent", "Pattern colour"],
            ["shorts", "Shorts colour"],
            ["socks", "Socks colour"],
            ["ink", "Name and number colour"],
          ].map(([key, label]) => (
            <label className="field" key={key}>
              {label}
              <input
                type="color"
                value={kit[key]}
                onChange={(e) => patch({ [key]: e.target.value })}
              />
            </label>
          ))}
          <label>
            <input
              type="checkbox"
              checked={kit.personalize}
              onChange={(e) => patch({ personalize: e.target.checked })}
            />{" "}
            Show name and number
          </label>
          <label className="field">
            Player name
            <input
              maxLength={20}
              value={kit.player}
              onChange={(e) => patch({ player: e.target.value })}
            />
          </label>
          <label className="field">
            Player number
            <input
              inputMode="numeric"
              maxLength={2}
              value={kit.number}
              onChange={(e) =>
                patch({ number: e.target.value.replace(/\D/g, "").slice(0, 2) })
              }
            />
          </label>
          {!demo && (
            <>
              <h4>Map existing clothing meshes</h4>
              <p>
                No clothing geometry is added. Select only existing garment
                meshes. UV layout determines pattern/text placement; a single
                combined body mesh cannot be dressed by region here.
              </p>
              {["jersey", "shorts", "socks"].map((part) => (
                <label className="field" key={part}>
                  {part} mesh
                  <select
                    aria-label={`${part} mesh`}
                    value={kit.mapping[part]}
                    onChange={(e) =>
                      patch({
                        mapping: {
                          ...kit.mapping,
                          [part]: Number(e.target.value),
                        },
                      })
                    }
                  >
                    <option value={-1}>Not assigned</option>
                    {meshes.map((m, i) => (
                      <option
                        key={i}
                        value={i}
                        disabled={Object.entries(kit.mapping).some(
                          ([p, id]) => p !== part && id === i,
                        )}
                      >
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </>
          )}
          <small>
            {demo
              ? "The demo has predefined jersey, shorts and sock sections."
              : "Imported textures may require UV editing for accurate lettering."}{" "}
            Kit settings remain unchanged when you switch backgrounds and are
            included in saved scene files and exports. No fabric simulation or
            automatic fitting is provided.
          </small>
        </>
      )}
    </div>
  );
}
