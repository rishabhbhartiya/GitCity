/**
 * PedestrianSystem.js — GitCity v4 (fixed + enhanced)
 * FIX: Pedestrian speed reduced from 1.8–3.2 to 0.8–1.4
 * NEW: Crosswalk zones at intersections
 * NEW: Pedestrians wait at crosswalks for traffic lights
 * NEW: Crowd avoidance (pedestrians don't overlap)
 * NEW: Speed variation based on crowd density
 * NEW: Wind-animated trees — branches + fronds sway
 * NEW: Typed pedestrians — man, woman, child, elder, runner, tourist
 * Pedestrians walk ONLY on footpath strips alongside roads.
 */

// ── Global tree animation registry ───────────────────────────────────────────
// addTree pushes swayable node descriptors here; call updateTrees(elapsed) each frame.
export const _treeAnimNodes = []; // { mesh, axis, base, amp, freq, phase }

export function updateTrees(elapsed) {
    for (const n of _treeAnimNodes) {
        n.mesh.rotation[n.axis] = n.base + Math.sin(elapsed * n.freq + n.phase) * n.amp;
    }
}

// ── Tree builder ──────────────────────────────────────────────────────────────
// Returns the root Group. All wind-swayable nodes are pushed into _treeAnimNodes
// so updateTrees(elapsed) can animate them every frame without extra bookkeeping.
export function addTree(scene, THREE, x, z, type = "oak", scale = 1) {
    const g = new THREE.Group();
    const phase = Math.random() * Math.PI * 2; // unique wind phase per tree

    // Helper: register a mesh for wind animation
    function sway(mesh, axis, baseVal, amp, freq) {
        mesh.rotation[axis] = baseVal;
        _treeAnimNodes.push({ mesh, axis, base: baseVal, amp, freq, phase: phase + Math.random() * 0.5 });
    }

    const barkMat = new THREE.MeshLambertMaterial({ color: 0x6b4423 });
    const palmBark = new THREE.MeshLambertMaterial({ color: 0x8b6914 });

    switch (type) {

        // ────────────────────────────────────────────────────────────────────
        case "palm": {
            // Segmented trunk with ring notches — each upper segment sways more
            const SEG = 7;
            const trunkH = 6.5 * scale;
            const segH = trunkH / SEG;
            // Stack segments as nested pivot groups so upper sway compounds naturally
            let parent = g;
            const trunkPivots = [];
            for (let s = 0; s < SEG; s++) {
                const pivot = new THREE.Group();
                pivot.position.y = s === 0 ? 0 : segH; // each pivot sits at top of previous seg
                const bot = Math.max((0.23 - s * 0.025) * scale, 0.07 * scale);
                const top = Math.max((0.21 - s * 0.025) * scale, 0.06 * scale);
                const seg = new THREE.Mesh(
                    new THREE.CylinderGeometry(top, bot, segH, 9),
                    palmBark
                );
                seg.position.y = segH * 0.5;
                seg.castShadow = true;
                pivot.add(seg);
                // Ring knot between segments
                if (s > 0) {
                    const ring = new THREE.Mesh(
                        new THREE.TorusGeometry(bot * 1.15, 0.045 * scale, 5, 12),
                        new THREE.MeshLambertMaterial({ color: 0x5a3a10 })
                    );
                    ring.rotation.x = Math.PI / 2;
                    pivot.add(ring);
                }
                parent.add(pivot);
                trunkPivots.push(pivot);
                // Upper segments sway more than lower ones
                if (s >= 2) {
                    const bendAmp = 0.008 * (s - 1);
                    sway(pivot, 'x', 0, bendAmp, 0.7 + s * 0.05);
                    sway(pivot, 'z', (s > 3 ? 0.03 : 0), bendAmp * 0.6, 0.55 + s * 0.04);
                }
                parent = pivot;
            }

            // Crown pivot (child of topmost trunk segment)
            const crownPivot = new THREE.Group();
            crownPivot.position.y = segH;
            parent.add(crownPivot);
            sway(crownPivot, 'x', 0, 0.05, 0.9);
            sway(crownPivot, 'z', 0, 0.04, 0.75);

            // Crown base sphere
            const crownBase = new THREE.Mesh(
                new THREE.SphereGeometry(0.3 * scale, 8, 6),
                new THREE.MeshLambertMaterial({ color: 0x4a7c2f })
            );
            crownPivot.add(crownBase);

            // Fronds — each in its own pivot so it droops AND sways independently
            const frondMat = new THREE.MeshLambertMaterial({ color: 0x3c9030, side: THREE.DoubleSide });
            const frondDarkMat = new THREE.MeshLambertMaterial({ color: 0x2d6b20, side: THREE.DoubleSide });
            const FRONDS = 10;
            for (let i = 0; i < FRONDS; i++) {
                const angle = (i / FRONDS) * Math.PI * 2;
                const droop = 0.42 + Math.random() * 0.18;

                // Frond pivot: rotation.y = outward angle, rotation.z = droop
                const fp = new THREE.Group();
                fp.rotation.y = angle;
                fp.rotation.z = droop;
                crownPivot.add(fp);
                // Each frond sways on its own z axis
                sway(fp, 'z', droop, 0.04 + Math.random() * 0.03, 1.1 + Math.random() * 0.4);

                // Spine
                const spine = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.025 * scale, 0.05 * scale, 3.4 * scale, 5),
                    new THREE.MeshLambertMaterial({ color: 0x4a7c2f })
                );
                spine.rotation.z = Math.PI / 2;
                spine.position.x = 1.7 * scale;
                fp.add(spine);

                // Leaflet pairs along spine
                for (let l = 0; l < 8; l++) {
                    const frac = (l + 1) / 9;
                    const lx = frac * 3.2 * scale;
                    const lw = (0.38 - frac * 0.12) * scale;
                    const ll = (0.95 - frac * 0.3) * scale;
                    const mat = l % 2 === 0 ? frondMat : frondDarkMat;
                    [-1, 1].forEach(side => {
                        const leaf = new THREE.Mesh(
                            new THREE.BoxGeometry(ll, 0.04 * scale, lw),
                            mat
                        );
                        leaf.position.set(lx, 0, side * lw * 0.65);
                        leaf.rotation.x = side * 0.28;
                        // Tip leaves flutter more
                        if (frac > 0.6) sway(leaf, 'x', leaf.rotation.x, 0.06, 2.2 + Math.random());
                        leaf.castShadow = true;
                        fp.add(leaf);
                    });
                }
            }

            // Coconuts
            const coconutMat = new THREE.MeshLambertMaterial({ color: 0x5c3a1e });
            for (let k = 0; k < 4; k++) {
                const a = (k / 4) * Math.PI * 2;
                const nut = new THREE.Mesh(new THREE.SphereGeometry(0.17 * scale, 7, 5), coconutMat);
                nut.position.set(Math.sin(a) * 0.32 * scale, -0.22 * scale, Math.cos(a) * 0.32 * scale);
                crownPivot.add(nut);
            }
            break;
        }

        // ────────────────────────────────────────────────────────────────────
        case "pine": {
            // Trunk
            const pineTrunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.15 * scale, 0.3 * scale, 3.0 * scale, 9),
                barkMat
            );
            pineTrunk.position.y = 1.5 * scale;
            pineTrunk.castShadow = true;
            g.add(pineTrunk);

            // Whole-tree gentle sway pivot
            const treePivot = new THREE.Group();
            g.add(treePivot);
            sway(treePivot, 'x', 0, 0.018, 0.55);
            sway(treePivot, 'z', 0, 0.014, 0.42);

            // 4 tiered cones — each in its own pivot for independent rustle
            const tiers = [
                { y: 2.2, r: 2.1, h: 3.0, color: 0x1a5c2a },
                { y: 3.8, r: 1.6, h: 2.5, color: 0x1e6830 },
                { y: 5.1, r: 1.1, h: 2.1, color: 0x236e34 },
                { y: 6.1, r: 0.65, h: 1.8, color: 0x28763a },
            ];
            tiers.forEach(({ y, r, h, color }, ti) => {
                const tierPivot = new THREE.Group();
                tierPivot.position.y = y * scale;
                treePivot.add(tierPivot);
                // Upper tiers swing more
                sway(tierPivot, 'x', 0, 0.01 + ti * 0.008, 0.8 + ti * 0.12);
                sway(tierPivot, 'z', 0, 0.008 + ti * 0.006, 0.65 + ti * 0.1);

                const cone = new THREE.Mesh(
                    new THREE.ConeGeometry(r * scale, h * scale, 9),
                    new THREE.MeshLambertMaterial({ color })
                );
                cone.castShadow = true;
                tierPivot.add(cone);
            });

            // Snow tip
            const snowPivot = new THREE.Group();
            snowPivot.position.y = 7.2 * scale;
            treePivot.add(snowPivot);
            sway(snowPivot, 'z', 0, 0.04, 1.4);
            snowPivot.add(new THREE.Mesh(
                new THREE.ConeGeometry(0.28 * scale, 0.55 * scale, 7),
                new THREE.MeshLambertMaterial({ color: 0xeef4ff })
            ));
            break;
        }

        // ────────────────────────────────────────────────────────────────────
        case "cherry": {
            // Trunk
            const cherryTrunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.16 * scale, 0.23 * scale, 2.8 * scale, 8),
                barkMat
            );
            cherryTrunk.position.y = 1.4 * scale;
            cherryTrunk.castShadow = true;
            g.add(cherryTrunk);

            // Two branch pivots sprouting from trunk top
            const branchDefs = [
                { px: -0.42, py: 2.8, pz: 0.2, rz: -0.48 },
                { px: 0.42, py: 2.8, pz: -0.2, rz: 0.48 },
            ];
            branchDefs.forEach(({ px, py, pz, rz }) => {
                const bp = new THREE.Group();
                bp.position.set(px * scale, py * scale, pz * scale);
                bp.rotation.z = rz;
                g.add(bp);
                sway(bp, 'z', rz, 0.025, 0.9 + Math.random() * 0.3);

                bp.add(new THREE.Mesh(
                    new THREE.CylinderGeometry(0.06 * scale, 0.12 * scale, 1.7 * scale, 6),
                    barkMat
                ));

                // Blossom clusters on each branch
                [
                    { ox: 0, oy: 1.0, oz: 0, sx: 1.5, sy: 1.1, sz: 1.4, color: 0xffb7c5 },
                    { ox: 0.7, oy: 0.6, oz: 0.4, sx: 1.1, sy: 0.9, sz: 1.0, color: 0xffa0b8 },
                    { ox: -0.5, oy: 0.8, oz: -0.3, sx: 1.0, sy: 0.8, sz: 0.9, color: 0xffd0de },
                ].forEach(({ ox, oy, oz, sx, sy, sz, color }) => {
                    const cp = new THREE.Group();
                    cp.position.set(ox * scale, oy * scale, oz * scale);
                    bp.add(cp);
                    sway(cp, 'x', 0, 0.03, 1.3 + Math.random() * 0.5);
                    sway(cp, 'z', 0, 0.025, 1.1 + Math.random() * 0.4);
                    const cloud = new THREE.Mesh(
                        new THREE.SphereGeometry(scale, 8, 6),
                        new THREE.MeshLambertMaterial({ color })
                    );
                    cloud.scale.set(sx, sy, sz);
                    cloud.castShadow = true;
                    cp.add(cloud);
                });
            });

            // Central canopy
            const canopyPivot = new THREE.Group();
            canopyPivot.position.y = 4.8 * scale;
            g.add(canopyPivot);
            sway(canopyPivot, 'x', 0, 0.03, 0.8);
            sway(canopyPivot, 'z', 0, 0.025, 0.65);
            [
                { ox: 0, oy: 0, oz: 0, sx: 1.8, sy: 1.2, sz: 1.6, color: 0xffb7c5 },
                { ox: 0.8, oy: 0.5, oz: 0.3, sx: 1.2, sy: 1.0, sz: 1.1, color: 0xffc8d5 },
            ].forEach(({ ox, oy, oz, sx, sy, sz, color }) => {
                const m = new THREE.Mesh(new THREE.SphereGeometry(scale, 8, 6),
                    new THREE.MeshLambertMaterial({ color }));
                m.scale.set(sx, sy, sz);
                m.position.set(ox * scale, oy * scale, oz * scale);
                m.castShadow = true;
                canopyPivot.add(m);
            });
            break;
        }

        // ────────────────────────────────────────────────────────────────────
        case "dead": {
            // Three-tone bark: near-black base, mid charcoal, pale ashen highlights
            const deadDarkMat = new THREE.MeshLambertMaterial({ color: 0x2a1f18 });
            const deadMidMat = new THREE.MeshLambertMaterial({ color: 0x4a3728 });
            const deadLightMat = new THREE.MeshLambertMaterial({ color: 0x7a6655 });

            // ── Claw-like root flares at ground ──────────────────────────
            for (let ri = 0; ri < 5; ri++) {
                const ra = (ri / 5) * Math.PI * 2 + 0.3;
                const rLen = (0.8 + Math.random() * 0.55) * scale;
                const root = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.035 * scale, 0.20 * scale, rLen, 5),
                    deadDarkMat
                );
                root.position.set(Math.sin(ra) * 0.32 * scale, rLen * 0.28, Math.cos(ra) * 0.32 * scale);
                root.rotation.z = Math.sin(ra) * 0.75;
                root.rotation.x = Math.cos(ra) * 0.55;
                g.add(root);
            }

            // ── Trunk: 4 stacked segments forming a windswept S-curve ────
            const trunkPivot = new THREE.Group();
            g.add(trunkPivot);
            // Whole tree: slow ominous creak
            sway(trunkPivot, 'z', -0.12, 0.014, 0.25);
            sway(trunkPivot, 'x', 0.05, 0.009, 0.19);

            // [botR, topR, height, offsetX, offsetZ, mat]
            const segs = [
                [0.30, 0.23, 2.1, 0.00, 0.06, deadDarkMat],
                [0.23, 0.17, 1.9, 0.10, -0.15, deadMidMat],
                [0.17, 0.11, 1.6, -0.07, 0.20, deadMidMat],
                [0.11, 0.05, 1.3, 0.12, -0.10, deadLightMat],
            ];
            let segBaseY = 0;
            segs.forEach(([rb, rt, sh, ox, oz, mat]) => {
                const seg = new THREE.Mesh(
                    new THREE.CylinderGeometry(rt * scale, rb * scale, sh * scale, 9),
                    mat
                );
                seg.position.set(ox * scale, (segBaseY + sh * 0.5) * scale, oz * scale);
                seg.rotation.z = oz * 0.32;
                seg.rotation.x = -ox * 0.28;
                seg.castShadow = true;
                trunkPivot.add(seg);
                segBaseY += sh * 0.88;
            });

            // Jagged shattered crown — 3 splinter stubs
            const crownY = segBaseY * scale;
            [
                { rx: 0.00, rz: 0.00, len: 0.80 },
                { rx: 0.10, rz: 0.40, len: 0.50 },
                { rx: -0.08, rz: -0.32, len: 0.42 },
            ].forEach(({ rx, rz, len }) => {
                const splinter = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.025 * scale, 0.09 * scale, len * scale, 5),
                    deadLightMat
                );
                splinter.position.set(rz * 0.15 * scale, crownY + len * 0.5 * scale, rx * 0.15 * scale);
                splinter.rotation.z = rz;
                splinter.rotation.x = rx;
                trunkPivot.add(splinter);
            });

            // ── Bark ridge strips — raised texture lines on trunk ────────
            for (let ri = 0; ri < 7; ri++) {
                const ra = (ri / 7) * Math.PI * 2;
                const rh = (1.2 + Math.random() * 2.8) * scale;
                const ry = (0.8 + Math.random() * 3.2) * scale;
                const rdg = new THREE.Mesh(
                    new THREE.BoxGeometry(0.038 * scale, rh, 0.038 * scale),
                    deadLightMat
                );
                rdg.position.set(Math.sin(ra) * 0.28 * scale, ry, Math.cos(ra) * 0.28 * scale);
                rdg.rotation.y = ra;
                rdg.rotation.z = (Math.random() - 0.5) * 0.35;
                trunkPivot.add(rdg);
            }

            // ── Branches: 8 arms, wildly asymmetric, windswept to +X ────
            // Each has 2–3 forking twigs + micro-twigs at tips.
            [
                // [baseY, rotZ, rotX, rotY, length, mat]
                [2.0, 0.80, 0.15, 0.30, 2.8, deadMidMat],  // low sweeping left
                [2.3, -0.75, 0.10, -0.25, 2.3, deadMidMat],  // low sweeping right
                [3.2, 1.05, -0.08, 0.50, 2.1, deadMidMat],  // mid dramatic reach
                [3.5, -0.60, 0.25, -0.40, 1.7, deadMidMat],  // mid counter
                [4.4, 1.20, 0.05, 0.15, 2.2, deadLightMat],  // high hero branch
                [4.7, -0.95, -0.18, 0.35, 1.4, deadLightMat],  // high counter
                [2.8, 0.45, 0.65, -0.30, 1.5, deadMidMat],  // forward thrust
                [3.9, -0.25, 0.70, 0.45, 1.2, deadLightMat],  // backward reach
            ].forEach(([by, rz, rx, ry, bl, bMat]) => {
                const bp = new THREE.Group();
                bp.position.set(0, by * scale, 0);
                bp.rotation.set(rx, ry, rz);
                trunkPivot.add(bp);

                // Creak: higher branches swing harder
                const amp = 0.016 + (by / 5.5) * 0.030;
                const freq = 0.75 + Math.random() * 0.80;
                sway(bp, 'z', rz, amp, freq);
                sway(bp, 'x', rx, amp * 0.55, freq * 1.15);

                // Branch cylinder
                const bMesh = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.022 * scale, 0.075 * scale, bl * scale, 6),
                    bMat
                );
                bMesh.position.y = bl * 0.5 * scale;
                bp.add(bMesh);

                // 2–3 forking twigs at tip
                const twigCount = bl > 2.0 ? 3 : 2;
                for (let t = 0; t < twigCount; t++) {
                    const ta = (t / twigCount) * Math.PI * 1.4 - 0.5;
                    const tl = (0.30 + Math.random() * 0.38) * scale;
                    const tp = new THREE.Group();
                    tp.position.y = bl * scale;
                    bp.add(tp);
                    sway(tp, 'z', ta * 0.55, 0.032 + Math.random() * 0.022, 1.5 + Math.random() * 0.8);

                    const twig = new THREE.Mesh(
                        new THREE.CylinderGeometry(0.009 * scale, 0.024 * scale, tl, 4),
                        deadLightMat
                    );
                    twig.position.y = tl * 0.5;
                    twig.rotation.z = ta * 0.55 + (Math.random() - 0.5) * 0.6;
                    twig.rotation.x = (Math.random() - 0.5) * 0.65;
                    tp.add(twig);

                    // Micro-twig for spindly silhouette drama
                    if (tl > 0.38 * scale) {
                        const mt = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.004 * scale, 0.010 * scale, tl * 0.6, 4),
                            deadLightMat
                        );
                        mt.position.set(
                            (Math.random() - 0.5) * 0.1 * scale,
                            tl * 0.85,
                            (Math.random() - 0.5) * 0.1 * scale
                        );
                        mt.rotation.z = (Math.random() - 0.5) * 0.9;
                        mt.rotation.x = (Math.random() - 0.5) * 0.7;
                        tp.add(mt);
                    }
                }
            });

            break;
        }

        // ── OAK (default) ───────────────────────────────────────────────────
        default: {
            // Trunk
            const oakTrunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.23 * scale, 0.34 * scale, 3.2 * scale, 10),
                barkMat
            );
            oakTrunk.position.y = 1.6 * scale;
            oakTrunk.castShadow = true;
            g.add(oakTrunk);

            // Root flares
            for (let r = 0; r < 4; r++) {
                const ra = (r / 4) * Math.PI * 2;
                const flare = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.07 * scale, 0.3 * scale, 0.75 * scale, 5), barkMat);
                flare.position.set(Math.sin(ra) * 0.3 * scale, 0.28 * scale, Math.cos(ra) * 0.3 * scale);
                flare.rotation.z = Math.sin(ra) * 0.5;
                flare.rotation.x = Math.cos(ra) * 0.5;
                g.add(flare);
            }

            // Whole-canopy sway pivot
            const canopyRoot = new THREE.Group();
            canopyRoot.position.y = 3.0 * scale;
            g.add(canopyRoot);
            sway(canopyRoot, 'x', 0, 0.022, 0.55);
            sway(canopyRoot, 'z', 0, 0.018, 0.43);

            // 3 main branch pivots
            [
                { px: -0.5, py: 0.3, pz: 0.2, rz: -0.5 },
                { px: 0.5, py: 0.5, pz: -0.2, rz: 0.5 },
                { px: 0.0, py: 0.8, pz: 0.5, rz: 0.1 },
            ].forEach(({ px, py, pz, rz }, bi) => {
                const bp = new THREE.Group();
                bp.position.set(px * scale, py * scale, pz * scale);
                bp.rotation.z = rz;
                canopyRoot.add(bp);
                sway(bp, 'z', rz, 0.02 + bi * 0.008, 0.85 + bi * 0.15);

                bp.add(new THREE.Mesh(
                    new THREE.CylinderGeometry(0.08 * scale, 0.14 * scale, 2.0 * scale, 7), barkMat));
            });

            // 7 leaf cluster pivots — different frequencies = independent rustling
            const clusterDefs = [
                { ox: 0.0, oy: 2.3, oz: 0.0, s: 2.0, color: 0x2d6e2d, freq: 1.1 },
                { ox: 1.3, oy: 2.7, oz: 0.5, s: 1.5, color: 0x236023, freq: 1.4 },
                { ox: -1.2, oy: 2.5, oz: -0.4, s: 1.4, color: 0x347a34, freq: 1.7 },
                { ox: 0.5, oy: 3.5, oz: 0.3, s: 1.3, color: 0x2a6a2a, freq: 0.9 },
                { ox: -0.6, oy: 1.8, oz: 0.7, s: 1.2, color: 0x3d8c3d, freq: 1.6 },
                { ox: 0.3, oy: 2.0, oz: -0.9, s: 1.1, color: 0x265c26, freq: 1.2 },
                { ox: -0.2, oy: 3.1, oz: 0.5, s: 1.0, color: 0x2f7a2f, freq: 2.0 },
            ];
            clusterDefs.forEach(({ ox, oy, oz, s, color, freq }) => {
                const cp = new THREE.Group();
                cp.position.set(ox * scale, oy * scale, oz * scale);
                canopyRoot.add(cp);
                sway(cp, 'x', 0, 0.035, freq);
                sway(cp, 'z', 0, 0.028, freq * 0.8);
                const cluster = new THREE.Mesh(
                    new THREE.SphereGeometry(s * scale, 8, 7),
                    new THREE.MeshLambertMaterial({ color })
                );
                cluster.castShadow = true;
                cp.add(cluster);
            });
            break;
        }
    }

    g.position.set(x, 0, z);
    scene.add(g);
    return g;
}

// ── Pedestrian type definitions ───────────────────────────────────────────────
// Each type has distinct proportions, colours, accessories, walk style.
const PED_TYPES = ['man', 'woman', 'child', 'elder', 'runner', 'tourist'];

const SKIN_TONES = [0xf5c5a3, 0xe8a882, 0xc68642, 0x8d5524, 0xfad5b0, 0xd4956a];
const MAN_TOPS = [0x2255aa, 0x333333, 0x8b0000, 0x2d5a1b, 0x555599, 0x884422];
const WOMAN_TOPS = [0xff6699, 0xee44aa, 0x9944cc, 0xff9944, 0x44aacc, 0xffcc44];
const CHILD_TOPS = [0xffaa00, 0x44ddff, 0xff4444, 0x88ff44, 0xff88cc, 0xffff44];
const PANTS = [0x222244, 0x443322, 0x224422, 0x333355, 0x1a1a2e, 0x4a3520];
const SKIRT_COLS = [0xffaacc, 0xcc88ff, 0xff8844, 0x44ccaa, 0xffee88, 0xaa44ff];
const RUNNER_COLS = [0xff4400, 0x00ccff, 0x44ff44, 0xff00aa, 0xffcc00, 0x00ffcc];
const ELDER_COLS = [0x9999aa, 0xaaaacc, 0x887766, 0xccbbaa, 0x778899, 0xaa9988];
const TOURIST_COLS = [0xffff44, 0xff8800, 0x44ffff, 0xff44aa, 0x88ff00, 0x00aaff];

// ── Build a typed pedestrian mesh ────────────────────────────────────────────
// Returns { mesh, limbRefs } where limbRefs has left/right arm + leg groups for walk anim.
function buildPedestrian(THREE, _unused1, _unused2, typeOverride) {
    const type = typeOverride || PED_TYPES[Math.floor(Math.random() * PED_TYPES.length)];
    const skin = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)];
    const g = new THREE.Group();

    const mat = c => new THREE.MeshLambertMaterial({ color: c });
    const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
    const cyl = (rt, rb, h, s = 7) => new THREE.CylinderGeometry(rt, rb, h, s);
    const sph = (r, ws = 8, hs = 7) => new THREE.SphereGeometry(r, ws, hs);

    // ── shared limb containers (animated in update) ───────────────────────
    const leftArmPivot = new THREE.Group();
    const rightArmPivot = new THREE.Group();
    const leftLegPivot = new THREE.Group();
    const rightLegPivot = new THREE.Group();

    // ──────────────────────────────────────────────────────────────────────
    if (type === 'man') {
        const top = MAN_TOPS[Math.floor(Math.random() * MAN_TOPS.length)];
        const pants = PANTS[Math.floor(Math.random() * PANTS.length)];
        const H = 1.0; // total height multiplier

        // Shoes
        [-0.1, 0.1].forEach(lx => {
            const shoe = new THREE.Mesh(box(0.16, 0.08, 0.22), mat(0x222222));
            shoe.position.set(lx, 0.04, 0.02);
            g.add(shoe);
        });
        // Legs
        [-0.1, 0.1].forEach((lx, i) => {
            const pivot = i === 0 ? leftLegPivot : rightLegPivot;
            pivot.position.set(lx, 0.65 * H, 0);
            const leg = new THREE.Mesh(box(0.15, 0.58 * H, 0.16), mat(pants));
            leg.position.y = -0.29 * H;
            pivot.add(leg);
            g.add(pivot);
        });
        // Torso
        const torso = new THREE.Mesh(box(0.40, 0.55 * H, 0.22), mat(top));
        torso.position.y = 1.00 * H;
        torso.castShadow = true;
        g.add(torso);
        // Belt
        const belt = new THREE.Mesh(box(0.42, 0.07, 0.24), mat(0x1a1a1a));
        belt.position.y = 0.76 * H;
        g.add(belt);
        // Arms
        [-0.26, 0.26].forEach((lx, i) => {
            const pivot = i === 0 ? leftArmPivot : rightArmPivot;
            pivot.position.set(lx, 1.18 * H, 0);
            const arm = new THREE.Mesh(box(0.13, 0.44 * H, 0.13), mat(top));
            arm.position.y = -0.22 * H;
            pivot.add(arm);
            // Hand
            const hand = new THREE.Mesh(sph(0.07), mat(skin));
            hand.position.y = -0.46 * H;
            pivot.add(hand);
            g.add(pivot);
        });
        const neck = new THREE.Mesh(cyl(0.07, 0.07, 0.14), mat(skin));
        neck.position.set(0, 1.29 * H, 0);
        g.add(neck);
        // Head
        const head = new THREE.Mesh(sph(0.20), mat(skin));
        head.position.y = 1.56 * H;
        head.castShadow = true;
        g.add(head);
        // Hair
        const hair = new THREE.Mesh(sph(0.205), mat(
            [0x1a0f00, 0x3b1f00, 0x111111, 0x8b4513, 0xd4a017][Math.floor(Math.random() * 5)]
        ));
        hair.position.set(0, 1.62 * H, -0.02);
        hair.scale.set(1, 0.7, 1);
        g.add(hair);
        // Eyes
        [-0.07, 0.07].forEach(ex => {
            const eye = new THREE.Mesh(sph(0.03), mat(0x111111));
            eye.position.set(ex, 1.58 * H, 0.18);
            g.add(eye);
        });

    } else if (type === 'woman') {
        const top = WOMAN_TOPS[Math.floor(Math.random() * WOMAN_TOPS.length)];
        const skirt = SKIRT_COLS[Math.floor(Math.random() * SKIRT_COLS.length)];
        const H = 0.98;

        // Heels / shoes
        [-0.09, 0.09].forEach(lx => {
            const shoe = new THREE.Mesh(box(0.13, 0.09, 0.18), mat(0x8b0000));
            shoe.position.set(lx, 0.045, 0.01);
            g.add(shoe);
        });
        // Legs (visible below skirt)
        [-0.09, 0.09].forEach((lx, i) => {
            const pivot = i === 0 ? leftLegPivot : rightLegPivot;
            pivot.position.set(lx, 0.50 * H, 0);
            const leg = new THREE.Mesh(box(0.12, 0.38 * H, 0.13), mat(skin));
            leg.position.y = -0.19 * H;
            pivot.add(leg);
            g.add(pivot);
        });
        // Skirt (flared — wider bottom)
        const skirtMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.32, 0.40, 0.45 * H, 10), mat(skirt));
        skirtMesh.position.y = 0.72 * H;
        g.add(skirtMesh);
        // Torso / blouse
        const torso = new THREE.Mesh(box(0.36, 0.44 * H, 0.20), mat(top));
        torso.position.y = 1.10 * H;
        torso.castShadow = true;
        g.add(torso);
        // Arms
        [-0.24, 0.24].forEach((lx, i) => {
            const pivot = i === 0 ? leftArmPivot : rightArmPivot;
            pivot.position.set(lx, 1.26 * H, 0);
            const arm = new THREE.Mesh(box(0.11, 0.40 * H, 0.11), mat(top));
            arm.position.y = -0.20 * H;
            pivot.add(arm);
            const hand = new THREE.Mesh(sph(0.065), mat(skin));
            hand.position.y = -0.42 * H;
            pivot.add(hand);
            g.add(pivot);
        });
        // Neck
        const neck = new THREE.Mesh(cyl(0.065, 0.065, 0.12), mat(skin));
        neck.position.set(0, 1.35 * H, 0);
        g.add(neck);
        // Head
        const head = new THREE.Mesh(sph(0.19), mat(skin));
        head.position.y = 1.60 * H;
        head.castShadow = true;
        g.add(head);
        // Long hair
        const hairColor = [0x1a0f00, 0xffd700, 0x8b0000, 0x3b1f00][Math.floor(Math.random() * 4)];
        const hair = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.14, 0.42, 9), mat(hairColor));
        hair.position.set(0, 1.45 * H, -0.03);
        g.add(hair);
        // Bun / top hair
        const bun = new THREE.Mesh(sph(0.14), mat(hairColor));
        bun.position.set(0, 1.73 * H, 0);
        bun.scale.set(1.1, 0.75, 1.1);
        g.add(bun);
        // Eyes
        [-0.065, 0.065].forEach(ex => {
            const eye = new THREE.Mesh(sph(0.028), mat(0x1a0a0a));
            eye.position.set(ex, 1.62 * H, 0.17);
            g.add(eye);
        });

    } else if (type === 'child') {
        const top = CHILD_TOPS[Math.floor(Math.random() * CHILD_TOPS.length)];
        const pants = PANTS[Math.floor(Math.random() * PANTS.length)];
        const H = 0.65; // shorter

        // Shoes
        [-0.08, 0.08].forEach(lx => {
            const shoe = new THREE.Mesh(box(0.12, 0.07, 0.16), mat(0xff4444));
            shoe.position.set(lx, 0.035, 0.01);
            g.add(shoe);
        });
        // Stubby legs
        [-0.08, 0.08].forEach((lx, i) => {
            const pivot = i === 0 ? leftLegPivot : rightLegPivot;
            pivot.position.set(lx, 0.46 * H, 0);
            const leg = new THREE.Mesh(box(0.14, 0.44 * H, 0.15), mat(pants));
            leg.position.y = -0.22 * H;
            pivot.add(leg);
            g.add(pivot);
        });
        // Torso — bigger head-to-body ratio
        const torso = new THREE.Mesh(box(0.34, 0.42 * H, 0.20), mat(top));
        torso.position.y = 0.90 * H;
        torso.castShadow = true;
        g.add(torso);
        // Arms — chubby
        [-0.22, 0.22].forEach((lx, i) => {
            const pivot = i === 0 ? leftArmPivot : rightArmPivot;
            pivot.position.set(lx, 1.05 * H, 0);
            const arm = new THREE.Mesh(box(0.14, 0.35 * H, 0.14), mat(top));
            arm.position.y = -0.175 * H;
            pivot.add(arm);
            const hand = new THREE.Mesh(sph(0.075), mat(skin));
            hand.position.y = -0.38 * H;
            pivot.add(hand);
            g.add(pivot);
        });
        // Big head
        const head = new THREE.Mesh(sph(0.24), mat(skin));
        head.position.y = 1.45 * H;
        head.castShadow = true;
        g.add(head);
        // Hair
        const hairCol = [0xffcc00, 0x8b4513, 0x111111][Math.floor(Math.random() * 3)];
        const hair = new THREE.Mesh(sph(0.245), mat(hairCol));
        hair.position.set(0, 1.50 * H, -0.02);
        hair.scale.set(1, 0.65, 1);
        g.add(hair);
        // Eyes — bigger, rounder
        [-0.09, 0.09].forEach(ex => {
            const eye = new THREE.Mesh(sph(0.04), mat(0x1a1a1a));
            eye.position.set(ex, 1.47 * H, 0.21);
            g.add(eye);
        });
        // Backpack
        const bp = new THREE.Mesh(box(0.22, 0.30, 0.14), mat(0xee4422));
        bp.position.set(0, 0.90 * H, -0.16);
        g.add(bp);

    } else if (type === 'elder') {
        const top = ELDER_COLS[Math.floor(Math.random() * ELDER_COLS.length)];
        const pants = PANTS[Math.floor(Math.random() * PANTS.length)];
        const H = 0.88; // slightly shorter, hunched

        [-0.09, 0.09].forEach(lx => {
            const shoe = new THREE.Mesh(box(0.15, 0.08, 0.20), mat(0x333333));
            shoe.position.set(lx, 0.04, 0.01);
            g.add(shoe);
        });
        [-0.09, 0.09].forEach((lx, i) => {
            const pivot = i === 0 ? leftLegPivot : rightLegPivot;
            pivot.position.set(lx, 0.60 * H, 0);
            const leg = new THREE.Mesh(box(0.14, 0.52 * H, 0.15), mat(pants));
            leg.position.y = -0.26 * H;
            pivot.add(leg);
            g.add(pivot);
        });
        const torso = new THREE.Mesh(box(0.38, 0.50 * H, 0.22), mat(top));
        torso.position.set(0, 0.96 * H, 0);
        torso.rotation.x = 0.18; // hunch forward
        torso.castShadow = true;
        g.add(torso);
        [-0.25, 0.25].forEach((lx, i) => {
            const pivot = i === 0 ? leftArmPivot : rightArmPivot;
            pivot.position.set(lx, 1.14 * H, 0);
            pivot.rotation.z = lx > 0 ? 0.3 : -0.3; // arms slightly forward
            const arm = new THREE.Mesh(box(0.13, 0.42 * H, 0.13), mat(top));
            arm.position.y = -0.21 * H;
            pivot.add(arm);
            const hand = new THREE.Mesh(sph(0.07), mat(skin));
            hand.position.y = -0.44 * H;
            pivot.add(hand);
            g.add(pivot);
        });
        // Walking cane (right hand)
        const cane = new THREE.Mesh(cyl(0.025, 0.025, 0.85 * H, 5), mat(0x8b6914));
        cane.position.set(0.26, 0.62 * H, 0.1);
        g.add(cane);
        const caneTop = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.025, 5, 10), mat(0x8b6914));
        caneTop.rotation.y = Math.PI / 2;
        caneTop.position.set(0.26, 1.04 * H, 0.1);
        g.add(caneTop);

        const neck = new THREE.Mesh(cyl(0.065, 0.065, 0.11), mat(skin));
        neck.position.set(0, 1.23 * H, 0);
        g.add(neck);
        const head = new THREE.Mesh(sph(0.18), mat(skin));
        head.position.set(0, 1.50 * H, 0.04); // slightly forward
        head.castShadow = true;
        g.add(head);
        // White/grey hair
        const hair = new THREE.Mesh(sph(0.185), mat(0xdddddd));
        hair.position.set(0, 1.55 * H, 0.02);
        hair.scale.set(1, 0.6, 1);
        g.add(hair);
        [-0.065, 0.065].forEach(ex => {
            const eye = new THREE.Mesh(sph(0.028), mat(0x1a1a1a));
            eye.position.set(ex, 1.51 * H, 0.16);
            g.add(eye);
        });

    } else if (type === 'runner') {
        const top = RUNNER_COLS[Math.floor(Math.random() * RUNNER_COLS.length)];
        const H = 1.05;

        // Sneakers
        [-0.10, 0.10].forEach(lx => {
            const shoe = new THREE.Mesh(box(0.15, 0.08, 0.26), mat(0xffffff));
            shoe.position.set(lx, 0.04, 0.04);
            g.add(shoe);
            // Stripe
            const stripe = new THREE.Mesh(box(0.16, 0.04, 0.27), mat(top));
            stripe.position.set(lx, 0.065, 0.04);
            g.add(stripe);
        });
        // Athletic legs — leggings
        [-0.10, 0.10].forEach((lx, i) => {
            const pivot = i === 0 ? leftLegPivot : rightLegPivot;
            pivot.position.set(lx, 0.68 * H, 0);
            const leg = new THREE.Mesh(box(0.14, 0.56 * H, 0.15), mat(0x111122));
            leg.position.y = -0.28 * H;
            pivot.add(leg);
            g.add(pivot);
        });
        // Slim athletic torso
        const torso = new THREE.Mesh(box(0.36, 0.52 * H, 0.20), mat(top));
        torso.position.y = 1.04 * H;
        torso.castShadow = true;
        g.add(torso);
        // Arms more forward-swung
        [-0.24, 0.24].forEach((lx, i) => {
            const pivot = i === 0 ? leftArmPivot : rightArmPivot;
            pivot.position.set(lx, 1.22 * H, 0);
            const arm = new THREE.Mesh(box(0.11, 0.40 * H, 0.11), mat(top));
            arm.position.y = -0.20 * H;
            pivot.add(arm);
            const hand = new THREE.Mesh(sph(0.065, 6, 5), mat(skin));
            hand.position.y = -0.43 * H;
            pivot.add(hand);
            g.add(pivot);
        });
        const neck = new THREE.Mesh(cyl(0.07, 0.07, 0.13), mat(skin));
        neck.position.set(0, 1.32 * H, 0);
        g.add(neck);
        const head = new THREE.Mesh(sph(0.19), mat(skin));
        head.position.y = 1.57 * H;
        head.castShadow = true;
        g.add(head);
        // Headband
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.195, 0.035, 6, 16), mat(top));
        band.rotation.x = Math.PI / 2;
        band.position.set(0, 1.60 * H, 0);
        g.add(band);
        // Hair
        const hair = new THREE.Mesh(sph(0.19), mat(0x1a0f00));
        hair.position.set(0, 1.63 * H, -0.02);
        hair.scale.set(1, 0.6, 1);
        g.add(hair);
        [-0.07, 0.07].forEach(ex => {
            const eye = new THREE.Mesh(sph(0.03), mat(0x111111));
            eye.position.set(ex, 1.585 * H, 0.175);
            g.add(eye);
        });

    } else { // tourist
        const top = TOURIST_COLS[Math.floor(Math.random() * TOURIST_COLS.length)];
        const pants = [0xcccccc, 0xdeb887, 0xaaddff, 0xffddaa][Math.floor(Math.random() * 4)];
        const H = 1.0;

        [-0.10, 0.10].forEach(lx => {
            const shoe = new THREE.Mesh(box(0.16, 0.08, 0.22), mat(0xddbb88));
            shoe.position.set(lx, 0.04, 0.01);
            g.add(shoe);
        });
        [-0.10, 0.10].forEach((lx, i) => {
            const pivot = i === 0 ? leftLegPivot : rightLegPivot;
            pivot.position.set(lx, 0.65 * H, 0);
            const leg = new THREE.Mesh(box(0.15, 0.56 * H, 0.16), mat(pants));
            leg.position.y = -0.28 * H;
            pivot.add(leg);
            g.add(pivot);
        });
        // Hawaiian / loud shirt — wider torso
        const torso = new THREE.Mesh(box(0.44, 0.54 * H, 0.24), mat(top));
        torso.position.y = 1.0 * H;
        torso.castShadow = true;
        g.add(torso);
        [-0.28, 0.28].forEach((lx, i) => {
            const pivot = i === 0 ? leftArmPivot : rightArmPivot;
            pivot.position.set(lx, 1.20 * H, 0);
            const arm = new THREE.Mesh(box(0.14, 0.44 * H, 0.14), mat(top));
            arm.position.y = -0.22 * H;
            pivot.add(arm);
            const hand = new THREE.Mesh(sph(0.072), mat(skin));
            hand.position.y = -0.46 * H;
            pivot.add(hand);
            g.add(pivot);
        });
        const neck = new THREE.Mesh(cyl(0.07, 0.07, 0.13), mat(skin));
        neck.position.set(0, 1.31 * H, 0);
        g.add(neck);
        const head = new THREE.Mesh(sph(0.20), mat(skin));
        head.position.y = 1.57 * H;
        head.castShadow = true;
        g.add(head);
        // Sun hat
        const brim = new THREE.Mesh(
            new THREE.CylinderGeometry(0.36, 0.38, 0.06, 12), mat(0xf5deb3));
        brim.position.set(0, 1.71 * H, 0);
        g.add(brim);
        const crown = new THREE.Mesh(
            new THREE.CylinderGeometry(0.195, 0.22, 0.24, 10), mat(0xf5deb3));
        crown.position.set(0, 1.80 * H, 0);
        g.add(crown);
        // Camera hanging around neck
        const cam = new THREE.Mesh(box(0.14, 0.10, 0.07), mat(0x222222));
        cam.position.set(0.08, 0.88 * H, 0.13);
        g.add(cam);
        // Hair
        const hair = new THREE.Mesh(sph(0.20), mat(0xc8a050));
        hair.position.set(0, 1.63 * H, -0.02);
        hair.scale.set(1, 0.6, 1);
        g.add(hair);
        [-0.07, 0.07].forEach(ex => {
            const eye = new THREE.Mesh(sph(0.03), mat(0x111111));
            eye.position.set(ex, 1.58 * H, 0.18);
            g.add(eye);
        });
    }

    return { mesh: g, leftArmPivot, rightArmPivot, leftLegPivot, rightLegPivot, type };
}

// ── Main system ───────────────────────────────────────────────────────────────
export function createPedestrianSystem(
    scene, THREE,
    districts, cols, ox, oz, BW, BD, ROAD,
    footpathPoints = [],
    roadSegs = []
) {
    const peds = [];
    const COUNT = Math.min(40, districts.length * 2 + 8);

    // ── Build crosswalk zones at all grid intersections ───────────────────────
    // A crosswalk zone is a small rectangular region at each road intersection.
    // Pedestrians approaching such a zone pause until the light is green.
    const rows = Math.ceil(districts.length / cols);
    const crosswalkZones = [];
    for (let r = 0; r <= rows; r++) {
        for (let c = 0; c <= cols; c++) {
            const cx = ox + c * (BW + ROAD) + ROAD / 2;
            const cz = oz + r * (BD + ROAD) + ROAD / 2;
            // Each zone covers the intersection footprint (ROAD × ROAD)
            crosswalkZones.push({ cx, cz, halfW: ROAD / 2, halfD: ROAD / 2 });
        }
    }

    // ── Simple shared traffic-light state ─────────────────────────────────────
    // All intersections share one cycle for simplicity.
    // green=true  → pedestrians may cross; green=false → must wait.
    // Cycle: 6 s green, 4 s red (wall-clock elapsed time).
    const LIGHT_CYCLE = 10.0; // total seconds per full cycle
    const LIGHT_GREEN = 6.0;  // first N seconds are green

    // Returns true if pedestrians currently have a green light.
    function isPedGreen(elapsed) {
        return (elapsed % LIGHT_CYCLE) < LIGHT_GREEN;
    }

    // ── Crowd avoidance constants ─────────────────────────────────────────────
    const AVOIDANCE_RADIUS = 0.9;   // distance at which pedestrians repel
    const AVOIDANCE_STRENGTH = 0.08;  // how strongly they push away each frame
    const DENSITY_RADIUS = 5.0;   // radius to count neighbours for density
    const MAX_NEIGHBOURS = 6;     // clamp density count

    const wpPairs = buildWaypointPairs(footpathPoints, ox, oz, cols, BW, BD, ROAD, districts.length);

    for (let i = 0; i < COUNT; i++) {
        const pedData = buildPedestrian(THREE, null, null,
            PED_TYPES[i % PED_TYPES.length]);
        const { mesh, leftArmPivot, rightArmPivot, leftLegPivot, rightLegPivot, type } = pedData;

        const pair = wpPairs[i % wpPairs.length];

        // Runners move faster, children and elders slower
        const typeSpeedMod = type === 'runner' ? 1.6
            : type === 'child' ? 0.7
                : type === 'elder' ? 0.55
                    : 1.0;
        const baseSpd = (0.8 + Math.random() * 0.6) * typeSpeedMod;

        const startT = Math.random();
        mesh.position.set(
            pair.ax + (pair.bx - pair.ax) * startT,
            0,
            pair.az + (pair.bz - pair.az) * startT
        );

        scene.add(mesh);
        peds.push({
            mesh, pair, baseSpd,
            spd: baseSpd,
            t: startT,
            dir: Math.random() > 0.5 ? 1 : -1,
            bobPhase: Math.random() * Math.PI * 2,
            waiting: false,
            type,
            leftArmPivot, rightArmPivot, leftLegPivot, rightLegPivot,
        });
    }

    let elapsed = 0;

    function update(dt) {
        elapsed += dt;
        const greenNow = isPedGreen(elapsed);

        for (let i = 0; i < peds.length; i++) {
            const p = peds[i];
            const segLen = Math.sqrt(
                (p.pair.bx - p.pair.ax) ** 2 + (p.pair.bz - p.pair.az) ** 2
            );
            if (segLen < 0.1) continue;

            // ── 1. Density-based speed modulation ────────────────────────────
            // Count neighbours within DENSITY_RADIUS and slow down accordingly.
            let neighbours = 0;
            const px = p.mesh.position.x;
            const pz = p.mesh.position.z;
            for (let j = 0; j < peds.length; j++) {
                if (i === j) continue;
                const q = peds[j];
                const dx = q.mesh.position.x - px;
                const dz = q.mesh.position.z - pz;
                if (dx * dx + dz * dz < DENSITY_RADIUS * DENSITY_RADIUS) {
                    neighbours++;
                }
            }
            neighbours = Math.min(neighbours, MAX_NEIGHBOURS);
            // Speed falls linearly to 40 % of base at max density.
            const densityFactor = 1.0 - 0.6 * (neighbours / MAX_NEIGHBOURS);
            p.spd = p.baseSpd * densityFactor;

            // ── 2. Crosswalk / traffic-light waiting ─────────────────────────
            // Predict the pedestrian's next position along the path.
            const tNext = p.t + p.dir * p.spd * dt / segLen;
            const nx = p.pair.ax + (p.pair.bx - p.pair.ax) * tNext;
            const nz = p.pair.az + (p.pair.bz - p.pair.az) * tNext;

            // Check if the next step would enter a crosswalk intersection zone.
            let inCrosswalk = false;
            for (const zone of crosswalkZones) {
                if (
                    Math.abs(nx - zone.cx) < zone.halfW &&
                    Math.abs(nz - zone.cz) < zone.halfD
                ) {
                    inCrosswalk = true;
                    break;
                }
            }

            // If heading into a crosswalk zone and light is red → wait.
            if (inCrosswalk && !greenNow) {
                p.waiting = true;
            } else {
                p.waiting = false;
            }

            if (p.waiting) {
                // Idle bob in place; do not advance t.
                p.mesh.position.y = Math.abs(Math.sin(elapsed * 1.5 + p.bobPhase)) * 0.02;
                continue;
            }

            // ── 3. Advance along waypoint segment ────────────────────────────
            p.t += p.dir * p.spd * dt / segLen;

            if (p.t >= 1) { p.t = 1; p.dir = -1; }
            if (p.t <= 0) { p.t = 0; p.dir = 1; }

            const cx = p.pair.ax + (p.pair.bx - p.pair.ax) * p.t;
            const cz = p.pair.az + (p.pair.bz - p.pair.az) * p.t;

            // ── 4. Crowd avoidance push ───────────────────────────────────────
            // Accumulate repulsion from nearby pedestrians and nudge position.
            let repX = 0, repZ = 0;
            for (let j = 0; j < peds.length; j++) {
                if (i === j) continue;
                const q = peds[j];
                const dx = cx - q.mesh.position.x;
                const dz = cz - q.mesh.position.z;
                const dist2 = dx * dx + dz * dz;
                if (dist2 > 0 && dist2 < AVOIDANCE_RADIUS * AVOIDANCE_RADIUS) {
                    const dist = Math.sqrt(dist2);
                    const force = (AVOIDANCE_RADIUS - dist) / AVOIDANCE_RADIUS * AVOIDANCE_STRENGTH;
                    repX += (dx / dist) * force;
                    repZ += (dz / dist) * force;
                }
            }

            // Apply repulsion, clamped so pedestrians don't fly off path.
            const MAX_REP = 0.4;
            repX = Math.max(-MAX_REP, Math.min(MAX_REP, repX));
            repZ = Math.max(-MAX_REP, Math.min(MAX_REP, repZ));

            p.mesh.position.x = cx + repX;
            p.mesh.position.z = cz + repZ;
            p.mesh.position.y = Math.abs(Math.sin(elapsed * p.spd * 3 + p.bobPhase)) * 0.05;

            // ── 5. Limb swing animation ───────────────────────────────────────
            // Swing frequency scales with speed; runners have bigger swing arc.
            const swingFreq = p.spd * (p.type === 'runner' ? 5.5 : 4.0);
            const swingAmp = p.type === 'runner' ? 0.55
                : p.type === 'elder' ? 0.20
                    : p.type === 'child' ? 0.45
                        : 0.35;
            const swingT = elapsed * swingFreq + p.bobPhase;
            if (p.leftArmPivot) p.leftArmPivot.rotation.x = Math.sin(swingT) * swingAmp;
            if (p.rightArmPivot) p.rightArmPivot.rotation.x = -Math.sin(swingT) * swingAmp;
            if (p.leftLegPivot) p.leftLegPivot.rotation.x = -Math.sin(swingT) * swingAmp * 0.7;
            if (p.rightLegPivot) p.rightLegPivot.rotation.x = Math.sin(swingT) * swingAmp * 0.7;

            // Face direction of travel (repulsion offset doesn't affect facing).
            const ddx = p.pair.bx - p.pair.ax, ddz = p.pair.bz - p.pair.az;
            const angle = Math.atan2(ddx, ddz) + (p.dir > 0 ? 0 : Math.PI);
            p.mesh.rotation.y = angle;
        }
    }

    function dispose() {
        for (const p of peds) {
            scene.remove(p.mesh);
            p.mesh.traverse(c => {
                if (c.geometry) c.geometry.dispose();
                if (c.material) c.material.dispose();
            });
        }
        peds.length = 0;
    }

    return { update, dispose };
}

// ── Generate footpath waypoint pairs ─────────────────────────────────────────
function buildWaypointPairs(footpathPoints, ox, oz, cols, BW, BD, ROAD, districtCount) {
    const pairs = [];

    if (footpathPoints && footpathPoints.length >= 2) {
        const sorted = [...footpathPoints].sort((a, b) => a.x - b.x || a.z - b.z);
        for (let i = 0; i + 1 < sorted.length; i += 2) {
            const a = sorted[i], b = sorted[i + 1];
            const d = Math.sqrt((b.x - a.x) ** 2 + (b.z - a.z) ** 2);
            if (d > 4 && d < 80) {
                pairs.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z });
            }
        }
    }

    const rows = Math.ceil(districtCount / cols);
    const halfPathOffset = ROAD / 2 + 1.8;  // FIX: match FURNITURE_OFFSET from simulation

    for (let r = 0; r <= rows; r++) {
        const rz = oz + r * (BD + ROAD) + ROAD / 2;
        const x1 = ox + ROAD;
        const x2 = ox + cols * (BW + ROAD);
        const segLen = x2 - x1;
        if (segLen < 8) continue;
        const segCount = Math.max(1, Math.floor(segLen / 18));
        for (let s = 0; s < segCount; s++) {
            const sx1 = x1 + (s / segCount) * segLen;
            const sx2 = x1 + ((s + 1) / segCount) * segLen;
            pairs.push({ ax: sx1, az: rz - halfPathOffset, bx: sx2, bz: rz - halfPathOffset });
            pairs.push({ ax: sx1, az: rz + halfPathOffset, bx: sx2, bz: rz + halfPathOffset });
        }
    }

    for (let c = 0; c <= cols; c++) {
        const rx = ox + c * (BW + ROAD) + ROAD / 2;
        const z1 = oz + ROAD;
        const z2 = oz + rows * (BD + ROAD);
        const segLen = z2 - z1;
        if (segLen < 8) continue;
        const segCount = Math.max(1, Math.floor(segLen / 18));
        for (let s = 0; s < segCount; s++) {
            const sz1 = z1 + (s / segCount) * segLen;
            const sz2 = z1 + ((s + 1) / segCount) * segLen;
            pairs.push({ ax: rx - halfPathOffset, az: sz1, bx: rx - halfPathOffset, bz: sz2 });
            pairs.push({ ax: rx + halfPathOffset, az: sz1, bx: rx + halfPathOffset, bz: sz2 });
        }
    }

    if (pairs.length === 0) {
        pairs.push({ ax: -10, az: 5, bx: 10, bz: 5 });
    }

    return pairs;
}