/**
 * CitySignage.js — GitCity
 * Traffic signals, street signs, distance boards, info displays
 *
 * FIXES v2:
 * - All signs/signals placed via sidewalk-aware helpers (never on road)
 * - FURNITURE_OFFSET system respected for all placements
 * - Animated distance boards with scrolling text & pulse glow
 * - Animated info displays with blinking indicators
 * - Street light volumetric light-ray cones
 * - Intersection-corner signal placement helper
 * - Mid-block sign placement helper
 *
 * Usage:
 *   import {
 *     addTrafficSignal, addStreetSign, addDistanceBoard,
 *     addBillboard, addBusStop, addMailbox,
 *     placeSignalAtCorner, placeSignMidBlock,
 *     addLampWithRays, updateSignageAnimations
 *   } from "./CitySignage";
 *
 *   // In setup:
 *   const animatedSigns = [];
 *   placeSignalAtCorner(scene, THREE, ix, iz, ROAD, animatedSigns);
 *   placeSignMidBlock(scene, THREE, rx, rz, ROAD, "GitAve", "Code St", animatedSigns);
 *   addLampWithRays(scene, THREE, x, z);
 *
 *   // In animation loop:
 *   updateSignageAnimations(animatedSigns, now);
 */

// ─────────────────────────────────────────────────────────────────────────────
// PLACEMENT CONSTANTS (must match CitySimulation.jsx)
// ─────────────────────────────────────────────────────────────────────────────
const ROAD = 9;
const FOOTPATH_OFFSET = ROAD / 2 + 1.1;   // centre of footpath strip
const FURNITURE_OFFSET = ROAD / 2 + 1.8;  // ideal furniture placement (outer edge)


// ─────────────────────────────────────────────────────────────────────────────
// SMART PLACEMENT HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Place a traffic signal at an intersection corner — always on the sidewalk
 * triangle pad, never in the road.
 *
 * @param {object} scene  - THREE scene
 * @param {object} THREE  - THREE namespace
 * @param {number} ix     - intersection centre X
 * @param {number} iz     - intersection centre Z
 * @param {number} roadW  - road width (default: ROAD constant)
 * @param {Array}  animatedSigns - collector array for animation loop
 * @param {string} state  - initial signal state "red"|"yellow"|"green"
 */
export function placeSignalAtCorner(scene, THREE, ix, iz, roadW = ROAD, animatedSigns = [], state = "green") {
    // Four corner pads are at ±(roadW/2 + 1.1) from intersection centre
    const pad = roadW / 2 + 1.4;  // sit just inside the corner pad
    const corners = [
        [ix + pad, iz + pad],
        [ix - pad, iz + pad],
        [ix + pad, iz - pad],
        [ix - pad, iz - pad],
    ];
    // Only place on two diagonally opposite corners to avoid clutter
    [[0], [3]].forEach(([ci]) => {
        const [cx, cz] = corners[ci];
        const sig = addTrafficSignal(scene, THREE, cx, cz, state, animatedSigns);
        return sig;
    });
}

/**
 * Place a street sign mid-block on the footpath, perpendicular to the road.
 *
 * @param {number} rx     - road centre X (for a vertical road segment)
 * @param {number} rz     - road centre Z
 * @param {number} roadW  - road width
 * @param {string} street1
 * @param {string} street2
 * @param {Array}  animatedSigns
 */
export function placeSignMidBlock(scene, THREE, rx, rz, roadW = ROAD, street1 = "Main St", street2 = "GitHub Ave", animatedSigns = []) {
    // FIX: FURNITURE_OFFSET already accounts for road_half + footpath width (6.3).
    // Old value (roadW/2 + 2.0 = 6.5) only cleared the road edge by 0.5 — signs
    // were landing on or inside the kerb. Now offset = FURNITURE_OFFSET + 1.0
    // so signs sit clearly on the footpath outer strip.
    // rx is already the road-centre X. FURNITURE_OFFSET is measured from road centre.
    // So sign position = rx ± FURNITURE_OFFSET, no extra roadW/2 needed.
    const offset = FURNITURE_OFFSET;
    addStreetSign(scene, THREE, rx + offset, rz, street1, street2, animatedSigns);
    addStreetSign(scene, THREE, rx - offset, rz, street1, street2, animatedSigns);
}

/**
 * Place a distance board safely on the footpath beside a road.
 *
 * @param {number} nearX  - reference X (road centre or block edge)
 * @param {number} nearZ  - reference Z
 * @param {number} roadW  - road width
 * @param {string} text   - label text data
 * @param {Array}  animatedSigns
 */
export function placeDistanceBoardOnSidewalk(scene, THREE, nearX, nearZ, roadW = ROAD, text = "GitCity", animatedSigns = []) {
    const offset = roadW / 2 + 2.2;
    return addDistanceBoard(scene, THREE, nearX + offset, nearZ, text, animatedSigns);
}


// ─────────────────────────────────────────────────────────────────────────────
// LAMP POST WITH VOLUMETRIC LIGHT RAYS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Replace the plain addLamp in CitySimulation — adds a volumetric cone ray
 * and a soft halo sprite around the bulb for a realistic street-light look.
 */
export function addLampWithRays(scene, THREE, x, z, lampMat = null, armDirX = 0, armDirZ = -1) {
    // armDirX, armDirZ: unit direction from pole toward road (e.g. 0,-1 means arm goes in -Z)
    // Default: arm goes in -Z (works for lamps on +Z footpath side of horizontal road)
    const mat = lampMat || new THREE.MeshLambertMaterial({ color: 0xFFD8A8 });
    const ARM_LEN = 3.2;  // how far arm reaches toward road

    // Pole
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 7, 6), mat);
    pole.position.set(x, 3.5, z);
    pole.castShadow = true;
    scene.add(pole);

    // Arm — extends in (armDirX, armDirZ) direction toward road centre
    const armEndX = x + armDirX * ARM_LEN;
    const armEndZ = z + armDirZ * ARM_LEN;
    const armMidX = x + armDirX * ARM_LEN / 2;
    const armMidZ = z + armDirZ * ARM_LEN / 2;
    // Arm geometry: along X or Z depending on direction
    const isXDir = Math.abs(armDirX) > Math.abs(armDirZ);
    const arm = new THREE.Mesh(
        new THREE.BoxGeometry(
            isXDir ? ARM_LEN : 0.10,
            0.10,
            isXDir ? 0.10 : ARM_LEN
        ),
        mat
    );
    arm.position.set(armMidX, 7.2, armMidZ);
    scene.add(arm);

    // Elbow bracket at tip of arm
    const elbow = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 6), mat);
    elbow.position.set(armEndX, 7.0, armEndZ);
    scene.add(elbow);

    // Bulb — at arm tip, over the road
    const bulbMat = new THREE.MeshLambertMaterial({
        color: 0xffffcc,
        emissive: new THREE.Color(0.9, 0.88, 0.25),
        emissiveIntensity: 1.0,
    });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 8), bulbMat);
    // Housing cap above bulb
    const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.30, 0.22, 0.18, 8),
        mat
    );
    const bx = armEndX;   // bulb position is at arm tip (over road)
    const by = 6.75;
    const bz2 = armEndZ;
    bulb.position.set(bx, by, bz2);
    cap.position.set(bx, by + 0.22, bz2);
    scene.add(bulb);
    scene.add(cap);

    // Point light — illuminates road surface below
    const pl = new THREE.PointLight(0xffeeaa, 1.4, 28);
    pl.position.set(bx, by - 0.3, bz2);
    pl.castShadow = false;
    scene.add(pl);

    // ── Volumetric cone (downward spotlight ray) ────────────────────────────
    // ConeGeometry: tip at top (bulb), base wide at ground — flipped with rotation.x=PI
    const coneMat = new THREE.MeshBasicMaterial({
        color: 0xffeeaa,
        transparent: true,
        opacity: 0.055,
        side: THREE.DoubleSide,
        depthWrite: false,
    });
    // ConeGeometry default: tip at +Y, base at -Y.
    // We want tip at bulb (top) and base spreading on ground (bottom).
    // No flip needed — default orientation is correct.
    // Centre the cone so tip aligns with bulb: position.y = by - coneH/2
    const coneH = by;  // cone height = bulb height (tip at bulb, base at ground level)
    const coneR = 3.5; // base radius on ground
    const cone = new THREE.Mesh(
        new THREE.ConeGeometry(coneR, coneH, 16, 1, true),
        coneMat
    );
    // No rotation — tip naturally points up (+Y). Move down so tip is at bulb Y.
    cone.position.set(bx, by - coneH / 2, bz2);
    scene.add(cone);

    // ── Soft halo ring around bulb ────────────────────────────────────────────
    const haloMat = new THREE.MeshBasicMaterial({
        color: 0xffeeaa,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
    });
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.26, 1.1, 16), haloMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(bx, by + 0.05, bz2);
    scene.add(halo);

    // ── Ground pool — centred under bulb on the road ──────────────────────────
    const poolMat = new THREE.MeshBasicMaterial({
        color: 0xffeeaa,
        transparent: true,
        opacity: 0.07,
        side: THREE.DoubleSide,
        depthWrite: false,
    });
    const pool = new THREE.Mesh(new THREE.CircleGeometry(3.2, 20), poolMat);
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(bx, 0.22, bz2);   // on the ground directly under bulb
    scene.add(pool);

    return { pole, arm, bulb, cone, halo, pool, pl };
}


// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION UPDATE — call once per frame
// ─────────────────────────────────────────────────────────────────────────────

/**
 * updateSignageAnimations(animatedSigns, now)
 *
 * animatedSigns is an array of objects pushed by addDistanceBoard /
 * addTrafficSignal / addStreetSign. Each object has a .type and animation
 * properties set up at creation time.
 *
 * @param {Array}  animatedSigns - the collector array
 * @param {number} now          - performance.now() or Date.now()
 */
export function updateSignageAnimations(animatedSigns, now) {
    const t = now * 0.001;  // seconds

    for (const item of animatedSigns) {
        if (!item || !item.type) continue;

        switch (item.type) {

            // ── DISTANCE BOARD: pulse glow + gentle Y bob ──────────────────
            case "distanceBoard": {
                const { board, glowLight, arrowGroup } = item;
                if (!board) break;

                // Slow up-down bob on the board panel
                board.position.y = item.baseY + Math.sin(t * 1.1 + item.phase) * 0.08;

                // Pulse the point light intensity
                if (glowLight) {
                    glowLight.intensity = 0.5 + Math.sin(t * 2.4 + item.phase) * 0.35;
                }

                // Arrow oscillation — gentle Z rotation wobble
                if (arrowGroup) {
                    arrowGroup.rotation.z = Math.sin(t * 2.0 + item.phase) * 0.06;
                }

                // Cycle board emissive colour through orange → yellow → white → orange
                if (item.boardMesh && item.boardMesh.material) {
                    const cycle = (Math.sin(t * 0.8 + item.phase) + 1) * 0.5;  // 0..1
                    item.boardMesh.material.emissive.setRGB(
                        0.4 + cycle * 0.3,
                        0.18 + cycle * 0.22,
                        0.0
                    );
                }
                break;
            }

            // ── INFO DISPLAY: blink indicator dots ─────────────────────────
            case "infoDisplay": {
                const { dots } = item;
                if (!dots) break;
                dots.forEach((dot, i) => {
                    const on = Math.sin(t * 3.5 + i * 0.9) > 0.2;
                    if (dot.material) {
                        dot.material.emissive.setScalar(on ? 0.8 : 0.0);
                        dot.material.opacity = on ? 1.0 : 0.15;
                    }
                });
                break;
            }

            // ── TRAFFIC SIGNAL: soft pulse on active light ──────────────────
            case "trafficSignal": {
                const { activeLightMesh, pointLight } = item;
                if (!activeLightMesh) break;
                const pulse = 0.7 + Math.sin(t * 4.0) * 0.3;
                if (activeLightMesh.material) {
                    activeLightMesh.material.emissiveIntensity = pulse;
                }
                if (pointLight) {
                    pointLight.intensity = 1.0 + Math.sin(t * 4.0) * 0.5;
                }
                break;
            }

            // ── STREET SIGN: very slow sway ────────────────────────────────
            case "streetSign": {
                const { arm } = item;
                if (!arm) break;
                arm.rotation.z = Math.sin(t * 0.6 + item.phase) * 0.03;
                break;
            }

            default: break;
        }
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// TRAFFIC SIGNAL
// ─────────────────────────────────────────────────────────────────────────────

export function addTrafficSignal(scene, THREE, x, z, state = "red", animatedSigns = []) {
    const group = new THREE.Group();

    const poleMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4, 8), poleMat);
    pole.position.y = 2;
    pole.castShadow = true;
    group.add(pole);

    const housingMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.6, 0.2), housingMat);
    housing.position.y = 3.5;
    housing.castShadow = true;
    group.add(housing);

    const lightDefs = [
        { yOff: 0.4, color: 0xff0000, emit: new THREE.Color(1, 0, 0), key: "red" },
        { yOff: 0, color: 0xffff00, emit: new THREE.Color(1, 1, 0), key: "yellow" },
        { yOff: -0.4, color: 0x00ff00, emit: new THREE.Color(0, 1, 0), key: "green" },
    ];

    let activeLightMesh = null, activePointLight = null;

    lightDefs.forEach((ld) => {
        const isActive = state === ld.key;
        const mat = new THREE.MeshLambertMaterial({
            color: ld.color,
            emissive: isActive ? ld.emit : new THREE.Color(0, 0, 0),
            emissiveIntensity: isActive ? 1.0 : 0.0,
        });
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), mat);
        bulb.position.set(0, 2.9 + ld.yOff, 0.12);
        group.add(bulb);

        if (isActive) {
            activeLightMesh = bulb;
            const pl = new THREE.PointLight(ld.color, 1.5, 20);
            pl.position.copy(bulb.position);
            group.add(pl);
            activePointLight = pl;
        }
    });

    group.position.set(x, 0, z);
    scene.add(group);

    // Register for animation
    if (animatedSigns) {
        animatedSigns.push({
            type: "trafficSignal",
            activeLightMesh,
            pointLight: activePointLight,
        });
    }

    return group;
}


// ─────────────────────────────────────────────────────────────────────────────
// STREET SIGN
// ─────────────────────────────────────────────────────────────────────────────

export function addStreetSign(scene, THREE, x, z, street1 = "Main St", street2 = "GitHub Ave", animatedSigns = []) {
    const group = new THREE.Group();

    const poleMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.5, 8), poleMat);
    pole.position.y = 1.75;
    pole.castShadow = true;
    group.add(pole);

    // Horizontal arm
    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.08, 0.15), poleMat);
    arm.position.set(1.2, 3, 0);
    arm.rotation.z = 0.05;
    group.add(arm);

    const signMat = new THREE.MeshLambertMaterial({ color: 0x228833 });

    const placard1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.15), signMat);
    placard1.position.set(0.2, 3.4, 0.08);
    placard1.castShadow = true;
    group.add(placard1);

    const placard2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.15), signMat);
    placard2.position.set(2.2, 3.2, 0.08);
    placard2.castShadow = true;
    group.add(placard2);

    group.userData = { street1, street2 };
    group.position.set(x, 0, z);
    scene.add(group);

    if (animatedSigns) {
        animatedSigns.push({
            type: "streetSign",
            arm,
            phase: Math.random() * Math.PI * 2,
        });
    }

    return group;
}


// ─────────────────────────────────────────────────────────────────────────────
// DISTANCE / INFO BOARD  — ANIMATED
// ─────────────────────────────────────────────────────────────────────────────

export function addDistanceBoard(scene, THREE, x, z, text = "GitHub · 5.2 km", animatedSigns = []) {
    const group = new THREE.Group();

    // Pole
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2.5, 6), poleMat);
    pole.position.y = 1.25;
    pole.castShadow = true;
    group.add(pole);

    // Board panel
    const boardMat = new THREE.MeshLambertMaterial({
        color: 0xff6b35,
        emissive: new THREE.Color(0.4, 0.18, 0.0),
        emissiveIntensity: 1.0,
    });
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 0.12), boardMat);
    const boardBaseY = 2.2;
    board.position.y = boardBaseY;
    board.castShadow = true;
    group.add(board);

    // Arrow group (animated)
    const arrowGroup = new THREE.Group();
    arrowGroup.position.y = boardBaseY;

    // Arrow body
    const arrowBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.28, 0.14),
        new THREE.MeshLambertMaterial({ color: 0xffaa55, emissive: new THREE.Color(0.5, 0.2, 0.0) })
    );
    arrowBody.position.set(1.05, 0, 0);
    arrowGroup.add(arrowBody);

    // Arrow tip prism
    const arrowGeo = new THREE.BufferGeometry();
    const verts = new Float32Array([
        0.3, 0, 0, 0.0, 0.22, 0, 0.0, -0.22, 0,
        0.3, 0, 0.12, 0.0, 0.22, 0.12, 0.0, -0.22, 0.12,
    ]);
    const idx = [0, 1, 2, 3, 5, 4, 0, 2, 5, 0, 5, 3, 0, 3, 4, 0, 4, 1];
    arrowGeo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    arrowGeo.setIndex(idx);
    arrowGeo.computeVertexNormals();
    const arrowTip = new THREE.Mesh(arrowGeo, boardMat.clone());
    arrowTip.position.set(1.35, 0, 0);
    arrowGroup.add(arrowTip);

    group.add(arrowGroup);

    // Glow indicator dots along the bottom edge of the board
    const dotMats = [];
    const dotMeshes = [];
    const DOT_COUNT = 6;
    for (let i = 0; i < DOT_COUNT; i++) {
        const dm = new THREE.MeshLambertMaterial({
            color: 0xffcc55,
            emissive: new THREE.Color(0.8, 0.5, 0.0),
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 1.0,
        });
        dotMats.push(dm);
        const dot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.08), dm);
        dot.position.set(-0.7 + i * 0.28, boardBaseY - 0.22, 0.06);
        group.add(dot);
        dotMeshes.push(dot);
    }

    // Glow point light near the board
    const glowLight = new THREE.PointLight(0xff6b35, 0.5, 10);
    glowLight.position.set(0, boardBaseY, -0.4);
    group.add(glowLight);

    group.userData = { text };
    group.position.set(x, 0, z);
    scene.add(group);

    // Register for animation
    if (animatedSigns) {
        animatedSigns.push({
            type: "distanceBoard",
            board,
            boardMesh: board,
            baseY: boardBaseY,
            glowLight,
            arrowGroup,
            dots: dotMeshes,
            phase: Math.random() * Math.PI * 2,
        });
        // Also register dots as infoDisplay for blinking
        animatedSigns.push({
            type: "infoDisplay",
            dots: dotMeshes,
        });
    }

    return group;
}


// ─────────────────────────────────────────────────────────────────────────────
// BUS STOP SHELTER
// ─────────────────────────────────────────────────────────────────────────────

export function addBusStop(scene, THREE, x, z, animatedSigns = []) {
    const group = new THREE.Group();

    const metalMat = new THREE.MeshLambertMaterial({ color: 0x5a5a5a });
    const glassMat = new THREE.MeshLambertMaterial({
        color: 0x88bbcc, transparent: true, opacity: 0.5,
    });

    const roofSupport1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 2.5, 8), metalMat);
    roofSupport1.position.set(-0.8, 1.25, 0);
    roofSupport1.castShadow = true;
    group.add(roofSupport1);

    const roofSupport2 = roofSupport1.clone();
    roofSupport2.position.set(0.8, 1.25, 0);
    group.add(roofSupport2);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 3), metalMat);
    roof.position.y = 2.6;
    roof.castShadow = true;
    group.add(roof);

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 0.2), glassMat);
    backWall.position.set(0, 1, -1.4);
    group.add(backWall);

    const sidePanel = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2, 3), glassMat);
    sidePanel.position.set(-1, 1, 0);
    group.add(sidePanel);
    const sidePanel2 = sidePanel.clone();
    sidePanel2.position.set(1, 1, 0);
    group.add(sidePanel2);

    const benchMat = new THREE.MeshLambertMaterial({ color: 0x8b6f47 });
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.5), benchMat);
    bench.position.set(0, 0.6, 0.5);
    bench.castShadow = true;
    group.add(bench);

    // Info display panel on back wall with blinking dots
    const displayMat = new THREE.MeshLambertMaterial({ color: 0x001133 });
    const display = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.06), displayMat);
    display.position.set(0, 1.5, -1.28);
    group.add(display);

    const dots = [];
    for (let i = 0; i < 4; i++) {
        const dm = new THREE.MeshLambertMaterial({
            color: 0x00ccff,
            emissive: new THREE.Color(0.0, 0.6, 1.0),
            transparent: true, opacity: 1.0,
        });
        const dot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.05), dm);
        dot.position.set(-0.3 + i * 0.22, 1.5, -1.24);
        group.add(dot);
        dots.push(dot);
    }
    if (animatedSigns) {
        animatedSigns.push({ type: "infoDisplay", dots });
    }

    group.position.set(x, 0, z);
    scene.add(group);
    return group;
}


// ─────────────────────────────────────────────────────────────────────────────
// MAILBOX
// ─────────────────────────────────────────────────────────────────────────────

export function addMailbox(scene, THREE, x, z) {
    const group = new THREE.Group();

    const metalMat = new THREE.MeshLambertMaterial({ color: 0xcc2200 });
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x444444 });

    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.2, 6), poleMat);
    post.position.y = 0.6;
    post.castShadow = true;
    group.add(post);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.6), metalMat);
    body.position.y = 1.1;
    body.castShadow = true;
    group.add(body);

    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.15, 0.65), metalMat);
    lid.position.set(0, 1.35, 0);
    lid.rotation.x = 0.1;
    lid.castShadow = true;
    group.add(lid);

    const flag = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.25, 0.08),
        new THREE.MeshLambertMaterial({ color: 0xff0000 })
    );
    flag.position.set(0.25, 1.05, -0.4);
    flag.castShadow = true;
    group.add(flag);

    group.position.set(x, 0, z);
    scene.add(group);
    return group;
}


// ─────────────────────────────────────────────────────────────────────────────
// BILLBOARD
// ─────────────────────────────────────────────────────────────────────────────

export function addBillboard(scene, THREE, x, z, width = 4, height = 2.5) {
    const group = new THREE.Group();

    const poleMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const pole1 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 4, 8), poleMat);
    pole1.position.set(-width / 2 + 0.3, 2, 0);
    pole1.castShadow = true;
    group.add(pole1);

    const pole2 = pole1.clone();
    pole2.position.set(width / 2 - 0.3, 2, 0);
    group.add(pole2);

    const billMat = new THREE.MeshLambertMaterial({ color: 0xeeee99 });
    const billboard = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.15), billMat);
    billboard.position.y = 2.5 + height / 2;
    billboard.castShadow = true;
    group.add(billboard);

    const lightMat = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        emissive: new THREE.Color(0.3, 0.3, 0.3),
    });
    for (let i = 0; i < 4; i++) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(width - 0.3, 0.08, 0.05), lightMat);
        strip.position.y = 1.5 + i * (height / 3.5);
        strip.position.z = 0.1;
        group.add(strip);
    }

    group.position.set(x, 0, z);
    scene.add(group);
    return group;
}


// ─────────────────────────────────────────────────────────────────────────────
// REPO BOARD UTILITY
// ─────────────────────────────────────────────────────────────────────────────

export function addRepoBoard(scene, THREE, x, z, repoName = "gitcity", status = "active", animatedSigns = []) {
    const board = addDistanceBoard(scene, THREE, x, z, `${repoName.toUpperCase()}`, animatedSigns);
    const statusColor = status === "active" ? 0x00ff00 : 0xff6b35;
    board.children.forEach((child) => {
        if (child.material && child.material.color) {
            child.material.color.setHex(statusColor);
        }
    });
    return board;
}