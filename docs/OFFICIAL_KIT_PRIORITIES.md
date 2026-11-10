# Official football kit programme — priority gates

These are core product goals. Concept-material editing, the demo robot and VRM
lip-sync previews do not satisfy these goals. No official licensed assets or
supplier agreements have been provided to this implementation.

## 1. Rights and official catalogue (first dependency)

Implemented: 3D studio → **Official kit catalogue · rights intake**. A local,
session-only register captures team, competition, season, variant, supplier,
rights holder, source, evidence reference, territories, uses and declared dates.
JSON export/import preserves metadata; export before leaving the studio. Imports
are bounded to 2 MB/200 records. Records cannot assert approved/licensed status.
Missing documentation and expired/not-yet-started declarations are flagged.
No source URLs are fetched, no assets are ingested, and no agreement is uploaded.
The register is not saved in scene JSON or Supabase.

All records remain unverified even when every field is filled. This is an intake
workflow, not a legal verification system or server-side authorization service.
The app cannot grant rights or establish supplier authority. Concept kits remain
separate and must not be marketed as official kits.

Required before asset distribution:
- Obtain rights-holder/authorized-provider agreements and verify chain of title.
- Confirm logo, sponsor, manufacturer and garment reproduction permissions,
  including animation, modification, commercial video, user exports, territory,
  term and sublicensing restrictions. Separate input-asset rights from output rights.
- Authorized human reviewer records evidence, decision and scope in a restricted
  backend with audit history. No client-editable approval flags.
- Bind approved asset hashes/versions to specific agreements and scopes.
- Enforce permissions on asset delivery AND export; handle expiry, revocation,
  cache invalidation and existing projects. Establish rights renewal processes.
- Define the coverage denominator (competitions, teams, seasons and variants).
  Report missing coverage; never claim “every official kit” without an inventory.

Supplier intake deliverables: agreement reference and authorized contact; precise
coverage list; permitted-use matrix; garment meshes/textures and asset licenses;
rig/body compatibility; image/geometry accuracy references; update cadence.
Do not commit confidential contracts, credentials or licensed binary assets.

## 2. Accurate automatic dressing

Not implemented. Start with a declared VRM humanoid compatibility profile, known
units/rest pose, required bones and bounded body proportions. VRM metadata alone
does not guarantee garment fit. Require separate garment topology, skin weights,
UVs, material assets, collision proxies and adaptation rules. A renderer's mesh
material replacement is not dressing.

Before release: a rights-cleared body/garment test matrix, measurement of body
penetration over representative poses, texture distortion checks, attachment
checks and explicit rejection of unsupported characters. Set quantitative
thresholds using this fixture set before claiming accuracy. Universal character
coverage is an aspiration, not a release guarantee.

## 3. Fabric physics and grounded feet

Not implemented. Evaluate a solver and foot IK/contact pipeline against the
supported rig standard. Measure penetration, planted-foot sliding, contact height,
solver stability and frame time during walk, turn, crouch and celebration clips.
Test different frame rates and recording paths. Define deterministic export or
simulation baking requirements. Cloth and contact require dedicated engineering;
procedural bounce and static model grounding are not substitutes.

## 4. Local photorealistic consistent video

Not implemented or benchmarked. Target machine: Windows, Intel Iris Xe, 31.7 GB
RAM; no assumed CUDA or paid compute. Choose models only after reviewing code,
weights and intended-use licenses. Do not download arbitrary models implicitly.

Benchmark record must include model/version/hash, license, runtime/backend,
precision, resolution, frames, duration, seed, prompt, identity references, cold
load, warm inference time, peak RAM/shared GPU use and failures. Compare multiple
clips for face/body/kit consistency and temporal artifacts with human review.
Agree a practical-speed target before judging success. If the hardware cannot
meet quality and latency together, report failure rather than relabeling a 2D
animation or stylized renderer as photorealistic AI video. External GPU compute
requires an explicit change to the local-only product constraint.

## Validation of this increment

39 unit tests pass. Browser suite (mock authentication, real software WebGL)
exercises adding unverified intake, JSON download and rejection of forged verified
status. Production build passes, with the existing large lazy-3D-bundle warning.
This validates intake behavior, not licensing, kit accuracy, dressing or AI quality.
