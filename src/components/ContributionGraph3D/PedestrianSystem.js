/**
 * PedestrianSystem.js — GitCity v4 (fixed)
 * FIX: Pedestrian speed reduced from 1.8–3.2 to 0.8–1.4
 * Pedestrians walk ONLY on footpath strips alongside roads.
 */

// ── Tree builder ──────────────────────────────────────────────────────────────
export function addTree(scene, THREE, x, z, type = "oak", scale = 1) {
    const g = new THREE.Group();

    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5c3d1e });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.24 * scale, 2.2 * scale, 7), trunkMat);
    trunk.position.y = 1.1 * scale;
    trunk.castShadow = true;
    g.add(trunk);

    switch (type) {
        case "pine": {
            const pineMat = new THREE.MeshLambertMaterial({ color: 0x1a5c2a });
            [0, 1, 2].forEach((i) => {
                const cone = new THREE.Mesh(
                    new THREE.ConeGeometry((1.4 - i * 0.3) * scale, (2.2 - i * 0.3) * scale, 8),
                    pineMat
                );
                cone.position.y = (2.8 + i * 1.5) * scale;
                cone.castShadow = true;
                g.add(cone);
            });
            break;
        }
        case "palm": {
            const palmTrunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.12 * scale, 0.18 * scale, 5 * scale, 7),
                trunkMat
            );
            palmTrunk.position.y = 2.5 * scale;
            g.add(palmTrunk);
            const leafMat = new THREE.MeshLambertMaterial({ color: 0x2d8a3e });
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const leaf = new THREE.Mesh(
                    new THREE.BoxGeometry(0.2 * scale, 0.08 * scale, 2.5 * scale),
                    leafMat
                );
                leaf.position.set(Math.sin(angle) * 1.2 * scale, 5.2 * scale, Math.cos(angle) * 1.2 * scale);
                leaf.rotation.y = angle;
                leaf.rotation.z = 0.4;
                g.add(leaf);
            }
            break;
        }
        case "cherry": {
            const cherryMat = new THREE.MeshLambertMaterial({ color: 0xffb7c5 });
            const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.6 * scale, 8, 6), cherryMat);
            sphere.position.y = 4 * scale;
            sphere.castShadow = true;
            g.add(sphere);
            break;
        }
        case "dead": {
            const deadMat = new THREE.MeshLambertMaterial({ color: 0x4a3728 });
            const deadTrunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.14 * scale, 0.2 * scale, 4 * scale, 6),
                deadMat
            );
            deadTrunk.position.y = 2 * scale;
            g.add(deadTrunk);
            [[0.6, 3.5, 0.3, 1.5, 0.6], [-0.6, 3.2, -0.2, 1.2, -0.4]].forEach(([bx, by, bz, bl, ba]) => {
                const branch = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.06 * scale, 0.1 * scale, bl * scale, 5),
                    deadMat
                );
                branch.position.set(bx * scale, by * scale, bz * scale);
                branch.rotation.z = ba;
                g.add(branch);
            });
            break;
        }
        default: { // oak
            const oakMat = new THREE.MeshLambertMaterial({ color: 0x2d6e2d });
            const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.8 * scale, 8, 6), oakMat);
            sphere.position.y = 4.2 * scale;
            sphere.castShadow = true;
            g.add(sphere);
            const sphere2 = new THREE.Mesh(
                new THREE.SphereGeometry(1.2 * scale, 7, 5),
                new THREE.MeshLambertMaterial({ color: 0x236023 })
            );
            sphere2.position.set(0.8 * scale, 5.2 * scale, 0.4 * scale);
            g.add(sphere2);
            break;
        }
    }

    g.position.set(x, 0, z);
    scene.add(g);
    return g;
}

// ── Pedestrian colours ────────────────────────────────────────────────────────
const COAT_COLORS = [0xff6644, 0x4488ff, 0xffcc22, 0x88ff88, 0xff88cc, 0xaaaaff, 0xffffff, 0xffaa44];
const PANTS_COLORS = [0x222244, 0x443322, 0x224422, 0x333355, 0x554433];

// ── Build a single pedestrian mesh ───────────────────────────────────────────
function buildPedestrian(THREE, coatColor, pantsColor) {
    const g = new THREE.Group();

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.7, 0.22),
        new THREE.MeshLambertMaterial({ color: coatColor })
    );
    body.position.y = 0.95;
    body.castShadow = true;
    g.add(body);

    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 7, 6),
        new THREE.MeshLambertMaterial({ color: 0xf5c5a3 })
    );
    head.position.y = 1.52;
    head.castShadow = true;
    g.add(head);

    const legMat = new THREE.MeshLambertMaterial({ color: pantsColor });
    [-0.1, 0.1].forEach((lx) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.55, 0.16), legMat);
        leg.position.set(lx, 0.35, 0);
        leg.castShadow = true;
        g.add(leg);
    });

    return g;
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

    const wpPairs = buildWaypointPairs(footpathPoints, ox, oz, cols, BW, BD, ROAD, districts.length);

    for (let i = 0; i < COUNT; i++) {
        const coatColor = COAT_COLORS[i % COAT_COLORS.length];
        const pantsColor = PANTS_COLORS[i % PANTS_COLORS.length];
        const mesh = buildPedestrian(THREE, coatColor, pantsColor);

        const pair = wpPairs[i % wpPairs.length];

        // FIX: speed reduced from (1.8 + random * 1.4) to (0.8 + random * 0.6)
        const spd = 0.8 + Math.random() * 0.6;

        const startT = Math.random();
        mesh.position.set(
            pair.ax + (pair.bx - pair.ax) * startT,
            0,
            pair.az + (pair.bz - pair.az) * startT
        );

        scene.add(mesh);
        peds.push({ mesh, pair, spd, t: startT, dir: Math.random() > 0.5 ? 1 : -1, bobPhase: Math.random() * Math.PI * 2 });
    }

    let elapsed = 0;

    function update(dt) {
        elapsed += dt;
        for (const p of peds) {
            const segLen = Math.sqrt(
                (p.pair.bx - p.pair.ax) ** 2 + (p.pair.bz - p.pair.az) ** 2
            );
            if (segLen < 0.1) continue;

            p.t += p.dir * p.spd * dt / segLen;

            if (p.t >= 1) { p.t = 1; p.dir = -1; }
            if (p.t <= 0) { p.t = 0; p.dir = 1; }

            const nx = p.pair.ax + (p.pair.bx - p.pair.ax) * p.t;
            const nz = p.pair.az + (p.pair.bz - p.pair.az) * p.t;

            p.mesh.position.x = nx;
            p.mesh.position.z = nz;
            p.mesh.position.y = Math.abs(Math.sin(elapsed * p.spd * 3 + p.bobPhase)) * 0.05;

            const dx = p.pair.bx - p.pair.ax, dz = p.pair.bz - p.pair.az;
            const angle = Math.atan2(dx, dz) + (p.dir > 0 ? 0 : Math.PI);
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