/**
 * PedestrianSystem.js — GitCity
 * Realistic pedestrians with walking animation + 5 tree types
 *
 * Usage in CitySimulation.jsx:
 *   import { createPedestrianSystem } from "./PedestrianSystem";
 *   const pedSystem = createPedestrianSystem(scene, THREE, districts, cols, ox, oz, BW, BD, ROAD);
 *   // in animate loop:
 *   pedSystem.update(dt, now);
 *   // cleanup:
 *   pedSystem.dispose();
 */

// ── Tree types ────────────────────────────────────────────────────────────────
// type: 'oak' | 'pine' | 'palm' | 'cherry' | 'dead'

function createOak(scene, THREE, x, z, scale = 1) {
    const group = new THREE.Group();
    const trunkH = (3.5 + Math.random() * 1.5) * scale;
    const trunkR = 0.22 * scale;

    // Trunk — slightly tapered
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(trunkR * 0.7, trunkR, trunkH, 7),
        new THREE.MeshLambertMaterial({ color: 0x5a3010 })
    );
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    group.add(trunk);

    // 3 layered canopy spheres for fullness
    const canopyColor = new THREE.Color(
        0.08 + Math.random() * 0.05,
        0.38 + Math.random() * 0.12,
        0.08 + Math.random() * 0.05
    );
    const canopyMat = new THREE.MeshLambertMaterial({ color: canopyColor });

    const canopySizes = [
        { r: (1.1 + Math.random() * 0.4) * scale, ox: 0, oy: 0, oz: 0 },
        { r: (0.8 + Math.random() * 0.3) * scale, ox: -0.6 * scale, oy: 0.4 * scale, oz: 0.2 * scale },
        { r: (0.7 + Math.random() * 0.3) * scale, ox: 0.5 * scale, oy: 0.3 * scale, oz: -0.3 * scale },
    ];
    canopySizes.forEach(({ r, ox, oy, oz }) => {
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 8), canopyMat);
        sphere.position.set(x + ox, trunkH + oy + r * 0.5, z + oz);
        sphere.castShadow = true;
        scene.add(sphere);
        group.add(sphere);
    });

    group.position.set(x, 0, z);
    scene.add(group);
    return group;
}

function createPine(scene, THREE, x, z, scale = 1) {
    const group = new THREE.Group();
    const trunkH = (2.5 + Math.random() * 1.0) * scale;

    // Trunk
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12 * scale, 0.2 * scale, trunkH, 6),
        new THREE.MeshLambertMaterial({ color: 0x6b3a1f })
    );
    trunk.position.set(x, trunkH / 2, z);
    trunk.castShadow = true;
    scene.add(trunk);
    group.add(trunk);

    // 4 stacked cones — classic pine silhouette
    const coneColor = new THREE.MeshLambertMaterial({
        color: new THREE.Color(0.05, 0.28 + Math.random() * 0.08, 0.05)
    });
    const coneLayers = [
        { r: 1.4 * scale, h: 2.2 * scale, y: trunkH + 0.2 },
        { r: 1.1 * scale, h: 1.8 * scale, y: trunkH + 1.6 },
        { r: 0.75 * scale, h: 1.5 * scale, y: trunkH + 2.8 },
        { r: 0.4 * scale, h: 1.2 * scale, y: trunkH + 3.8 },
    ];
    coneLayers.forEach(({ r, h, y }) => {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), coneColor);
        cone.position.set(x, y, z);
        cone.castShadow = true;
        scene.add(cone);
        group.add(cone);
    });

    group.position.set(0, 0, 0);
    scene.add(group);
    return group;
}

function createPalm(scene, THREE, x, z, scale = 1) {
    const group = new THREE.Group();
    const trunkH = (6 + Math.random() * 3) * scale;

    // Curved trunk — stacked cylinders with slight lean
    const segments = 6;
    let curX = x, curZ = z, leanX = (Math.random() - 0.5) * 0.15, leanZ = (Math.random() - 0.5) * 0.15;
    for (let i = 0; i < segments; i++) {
        const t = i / segments;
        const seg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12 * scale * (1 - t * 0.3), 0.16 * scale * (1 - t * 0.2), trunkH / segments, 7),
            new THREE.MeshLambertMaterial({ color: 0x8b6914 })
        );
        seg.position.set(curX, (i + 0.5) * (trunkH / segments), curZ);
        seg.rotation.z = leanX * t;
        seg.rotation.x = leanZ * t;
        seg.castShadow = true;
        scene.add(seg);
        group.add(seg);
        curX += leanX * (trunkH / segments) * 0.3;
        curZ += leanZ * (trunkH / segments) * 0.3;
    }

    // Fronds — 8 drooping leaves
    const frondMat = new THREE.MeshLambertMaterial({ color: 0x1a6a1a, side: THREE.DoubleSide });
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const frond = new THREE.Mesh(
            new THREE.ConeGeometry(0.18 * scale, (2.2 + Math.random() * 0.8) * scale, 4),
            frondMat
        );
        frond.position.set(
            curX + Math.cos(angle) * 1.2 * scale,
            trunkH - 0.4 * scale,
            curZ + Math.sin(angle) * 1.2 * scale
        );
        frond.rotation.z = Math.PI * 0.35 + (Math.random() - 0.5) * 0.2;
        frond.rotation.y = angle;
        scene.add(frond);
        group.add(frond);
    }

    group.position.set(0, 0, 0);
    scene.add(group);
    return group;
}

function createCherry(scene, THREE, x, z, scale = 1) {
    const group = new THREE.Group();
    const trunkH = (3 + Math.random() * 1.2) * scale;

    // Dark trunk
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14 * scale, 0.2 * scale, trunkH, 7),
        new THREE.MeshLambertMaterial({ color: 0x3d1a0a })
    );
    trunk.position.set(x, trunkH / 2, z);
    trunk.castShadow = true;
    scene.add(trunk);
    group.add(trunk);

    // Pink blossom canopy — multiple fluffy spheres
    const blossomColors = [0xffb7c5, 0xffaabb, 0xff99aa, 0xffc8d0];
    const blossomMat = new THREE.MeshLambertMaterial({
        color: blossomColors[Math.floor(Math.random() * blossomColors.length)],
        transparent: true,
        opacity: 0.92,
    });

    const blossomClusters = [
        { r: 1.0 * scale, ox: 0, oy: 0.2 },
        { r: 0.7 * scale, ox: -0.7 * scale, oy: 0.1 },
        { r: 0.7 * scale, ox: 0.6 * scale, oy: 0.15 },
        { r: 0.6 * scale, ox: 0.2 * scale, oy: 0.6 * scale },
        { r: 0.5 * scale, ox: -0.3 * scale, oy: 0.7 * scale },
    ];
    blossomClusters.forEach(({ r, ox, oy }) => {
        const blossom = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 8), blossomMat);
        blossom.position.set(x + ox, trunkH + oy + r * 0.5, z);
        blossom.castShadow = true;
        scene.add(blossom);
        group.add(blossom);
    });

    // Falling petal particles
    const petalCount = 30;
    const petalGeo = new THREE.BufferGeometry();
    const petalPos = new Float32Array(petalCount * 3);
    for (let i = 0; i < petalCount; i++) {
        petalPos[i * 3] = x + (Math.random() - 0.5) * 4 * scale;
        petalPos[i * 3 + 1] = Math.random() * (trunkH + 3 * scale);
        petalPos[i * 3 + 2] = z + (Math.random() - 0.5) * 4 * scale;
    }
    petalGeo.setAttribute("position", new THREE.BufferAttribute(petalPos, 3));
    const petalMesh = new THREE.Points(petalGeo, new THREE.PointsMaterial({
        color: 0xffccdd, size: 0.3, transparent: true, opacity: 0.7,
    }));
    scene.add(petalMesh);
    group.add(petalMesh);
    group.userData.petals = { mesh: petalMesh, pos: petalPos, count: petalCount, x, z, scale };

    group.position.set(0, 0, 0);
    scene.add(group);
    return group;
}

function createDeadTree(scene, THREE, x, z, scale = 1) {
    const group = new THREE.Group();
    const trunkH = (4 + Math.random() * 2) * scale;
    const deadMat = new THREE.MeshLambertMaterial({ color: 0x3a3028 });

    // Main trunk
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1 * scale, 0.25 * scale, trunkH, 6),
        deadMat
    );
    trunk.position.set(x, trunkH / 2, z);
    trunk.rotation.z = (Math.random() - 0.5) * 0.1; // slight lean
    scene.add(trunk);
    group.add(trunk);

    // Bare branches — random directions
    const branchCount = 5 + Math.floor(Math.random() * 4);
    for (let b = 0; b < branchCount; b++) {
        const bH = (0.8 + Math.random() * 1.5) * scale;
        const angle = Math.random() * Math.PI * 2;
        const tilt = 0.3 + Math.random() * 0.5;
        const startY = trunkH * (0.5 + Math.random() * 0.4);

        const branch = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04 * scale, 0.08 * scale, bH, 5),
            deadMat
        );
        branch.position.set(
            x + Math.cos(angle) * bH * 0.3,
            startY + bH * 0.4,
            z + Math.sin(angle) * bH * 0.3
        );
        branch.rotation.z = tilt * Math.cos(angle);
        branch.rotation.x = tilt * Math.sin(angle);
        scene.add(branch);
        group.add(branch);

        // Sub-branches
        for (let sb = 0; sb < 2; sb++) {
            const sbH = bH * 0.5;
            const sbA = angle + (Math.random() - 0.5) * 1.2;
            const sub = new THREE.Mesh(
                new THREE.CylinderGeometry(0.02 * scale, 0.04 * scale, sbH, 4),
                deadMat
            );
            sub.position.set(
                x + Math.cos(sbA) * (bH * 0.5 + sbH * 0.3),
                startY + bH * 0.7 + sbH * 0.3,
                z + Math.sin(sbA) * (bH * 0.5 + sbH * 0.3)
            );
            sub.rotation.z = (tilt + 0.2) * Math.cos(sbA);
            sub.rotation.x = (tilt + 0.2) * Math.sin(sbA);
            scene.add(sub);
            group.add(sub);
        }
    }

    group.position.set(0, 0, 0);
    scene.add(group);
    return group;
}

// ── Tree factory ──────────────────────────────────────────────────────────────
export function addTree(scene, THREE, x, z, type = null, scale = 1) {
    const types = ["oak", "pine", "palm", "cherry", "dead"];
    const t = type || types[Math.floor(Math.random() * types.length)];
    switch (t) {
        case "pine": return createPine(scene, THREE, x, z, scale);
        case "palm": return createPalm(scene, THREE, x, z, scale);
        case "cherry": return createCherry(scene, THREE, x, z, scale);
        case "dead": return createDeadTree(scene, THREE, x, z, scale);
        default: return createOak(scene, THREE, x, z, scale);
    }
}

// ── PEDESTRIAN SYSTEM ─────────────────────────────────────────────────────────
export function createPedestrianSystem(scene, THREE, districts, cols, ox, oz, BW, BD, ROAD) {

    const peds = [];

    // Skin tone variety
    const skinTones = [0xffe0bd, 0xffcd94, 0xd4a574, 0xc68642, 0x8d5524, 0xffdbac];
    // Clothing colors
    const topColors = [0x3355aa, 0xaa3333, 0x33aa55, 0xddaa22, 0x8833aa, 0xdd6622, 0x228899, 0xcc4488];
    const botColors = [0x222244, 0x334422, 0x443322, 0x224433, 0x111111, 0x334455, 0x442233];
    const shoeColors = [0x111111, 0x332211, 0x111133, 0x222222, 0xdddddd];

    function makePedestrian(startX, startZ, minZ, maxZ, dir) {
        const group = new THREE.Group();

        const skin = skinTones[Math.floor(Math.random() * skinTones.length)];
        const top = topColors[Math.floor(Math.random() * topColors.length)];
        const bot = botColors[Math.floor(Math.random() * botColors.length)];
        const shoe = shoeColors[Math.floor(Math.random() * shoeColors.length)];
        const isFem = Math.random() > 0.5;
        const height = 0.85 + Math.random() * 0.25; // height variation

        const skinMat = new THREE.MeshLambertMaterial({ color: skin });
        const topMat = new THREE.MeshLambertMaterial({ color: top });
        const botMat = new THREE.MeshLambertMaterial({ color: bot });
        const shoeMat = new THREE.MeshLambertMaterial({ color: shoe });
        const hairColors = [0x1a0a00, 0x3d1c02, 0xf5c518, 0xff6b35, 0x888888, 0x222222];
        const hairMat = new THREE.MeshLambertMaterial({ color: hairColors[Math.floor(Math.random() * hairColors.length)] });

        const s = height; // scale factor

        // ── BODY PARTS ──
        // Shoes (bottom)
        const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.14 * s, 0.08 * s, 0.22 * s), shoeMat);
        shoeL.position.set(-0.1 * s, 0.04 * s, 0); group.add(shoeL);
        const shoeR = shoeL.clone(); shoeR.position.set(0.1 * s, 0.04 * s, 0); group.add(shoeR);

        // Legs
        const legGeo = new THREE.BoxGeometry(0.13 * s, 0.42 * s, 0.13 * s);
        const legL = new THREE.Mesh(legGeo, botMat);
        legL.position.set(-0.1 * s, 0.3 * s, 0); group.add(legL);
        const legR = new THREE.Mesh(legGeo, botMat);
        legR.position.set(0.1 * s, 0.3 * s, 0); group.add(legR);

        // Hips
        const hips = new THREE.Mesh(
            new THREE.BoxGeometry(0.32 * s, 0.16 * s, 0.2 * s),
            botMat
        );
        hips.position.set(0, 0.56 * s, 0); group.add(hips);

        // Torso
        const torsoW = isFem ? 0.28 * s : 0.32 * s;
        const torso = new THREE.Mesh(
            new THREE.BoxGeometry(torsoW, 0.38 * s, 0.2 * s),
            topMat
        );
        torso.position.set(0, 0.83 * s, 0); group.add(torso);

        // Arms
        const armGeo = new THREE.BoxGeometry(0.1 * s, 0.36 * s, 0.1 * s);
        const armL = new THREE.Mesh(armGeo, topMat);
        armL.position.set(-0.22 * s, 0.78 * s, 0); group.add(armL);
        const armR = new THREE.Mesh(armGeo, topMat);
        armR.position.set(0.22 * s, 0.78 * s, 0); group.add(armR);

        // Hands
        const handGeo = new THREE.BoxGeometry(0.09 * s, 0.09 * s, 0.09 * s);
        const handL = new THREE.Mesh(handGeo, skinMat);
        handL.position.set(-0.22 * s, 0.58 * s, 0); group.add(handL);
        const handR = handL.clone();
        handR.position.set(0.22 * s, 0.58 * s, 0); group.add(handR);

        // Neck
        const neck = new THREE.Mesh(
            new THREE.CylinderGeometry(0.07 * s, 0.08 * s, 0.1 * s, 6),
            skinMat
        );
        neck.position.set(0, 1.07 * s, 0); group.add(neck);

        // Head
        const head = new THREE.Mesh(
            new THREE.BoxGeometry(0.24 * s, 0.26 * s, 0.24 * s),
            skinMat
        );
        head.position.set(0, 1.26 * s, 0); group.add(head);

        // Eyes
        const eyeMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        const eyeGeo = new THREE.BoxGeometry(0.04 * s, 0.04 * s, 0.02 * s);
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(-0.07 * s, 1.28 * s, 0.12 * s); group.add(eyeL);
        const eyeR = eyeL.clone();
        eyeR.position.set(0.07 * s, 1.28 * s, 0.12 * s); group.add(eyeR);

        // Hair
        const hairGeo = isFem
            ? new THREE.BoxGeometry(0.27 * s, 0.12 * s, 0.27 * s)
            : new THREE.BoxGeometry(0.25 * s, 0.08 * s, 0.25 * s);
        const hair = new THREE.Mesh(hairGeo, hairMat);
        hair.position.set(0, 1.41 * s, 0); group.add(hair);

        // Long hair for female
        if (isFem) {
            const longHair = new THREE.Mesh(
                new THREE.BoxGeometry(0.24 * s, 0.28 * s, 0.08 * s),
                hairMat
            );
            longHair.position.set(0, 1.2 * s, -0.1 * s); group.add(longHair);
        }

        // Accessories — random hat
        if (Math.random() > 0.7) {
            const hatColors = [0x222222, 0x8b0000, 0x003366, 0x2d4a1e];
            const hatMat = new THREE.MeshLambertMaterial({ color: hatColors[Math.floor(Math.random() * hatColors.length)] });
            if (Math.random() > 0.5) {
                // Baseball cap
                const cap = new THREE.Mesh(new THREE.BoxGeometry(0.27 * s, 0.1 * s, 0.27 * s), hatMat);
                cap.position.set(0, 1.44 * s, 0); group.add(cap);
                const brim = new THREE.Mesh(new THREE.BoxGeometry(0.28 * s, 0.04 * s, 0.14 * s), hatMat);
                brim.position.set(0, 1.4 * s, 0.16 * s); group.add(brim);
            } else {
                // Beanie
                const beanie = new THREE.Mesh(new THREE.SphereGeometry(0.14 * s, 8, 6), hatMat);
                beanie.position.set(0, 1.46 * s, 0); group.add(beanie);
            }
        }

        group.position.set(startX, 0, startZ);
        group.rotation.y = dir > 0 ? 0 : Math.PI;
        group.castShadow = true;
        scene.add(group);

        peds.push({
            group, legL, legR, armL, armR,
            minZ, maxZ, dir,
            speed: 1.2 + Math.random() * 0.8,
            phase: Math.random() * Math.PI * 2,
            height: s,
        });

        return group;
    }

    // Place pedestrians along sidewalks next to roads
    districts.forEach((dist, di) => {
        if (di % 2 !== 0) return; // every other district for performance
        const col = di % cols;
        const row = Math.floor(di / cols);
        const bx0 = ox + col * (BW + ROAD) + ROAD;
        const bz0 = oz + row * (BD + ROAD) + ROAD;

        // Left sidewalk
        makePedestrian(
            bx0 - ROAD * 0.35,
            bz0 + Math.random() * BD,
            bz0, bz0 + BD,
            Math.random() > 0.5 ? 1 : -1
        );

        // Right sidewalk
        makePedestrian(
            bx0 + BW + ROAD * 0.35,
            bz0 + Math.random() * BD,
            bz0, bz0 + BD,
            Math.random() > 0.5 ? 1 : -1
        );

        // Occasional extra pedestrian
        if (Math.random() > 0.5) {
            makePedestrian(
                bx0 + Math.random() * BW,
                bz0 - ROAD * 0.35,
                bx0, bx0 + BW, // horizontal patrol
                Math.random() > 0.5 ? 1 : -1
            );
        }
    });

    // ── Trees alongside roads ──────────────────────────────────────────────────
    // Called from outside — addTree is exported separately
    // This system only handles pedestrian animation

    // ── Update ─────────────────────────────────────────────────────────────────
    const treeGroups = [];

    function update(dt) {
        peds.forEach(ped => {
            ped.phase += dt * 3.8 * ped.speed;
            ped.group.position.z += ped.dir * ped.speed * dt;

            // Bounce (subtle bob while walking)
            ped.group.position.y = Math.abs(Math.sin(ped.phase)) * 0.04 * ped.height;

            // Turn around at sidewalk ends
            if (ped.group.position.z > ped.maxZ) {
                ped.dir = -1;
                ped.group.rotation.y = Math.PI;
            }
            if (ped.group.position.z < ped.minZ) {
                ped.dir = 1;
                ped.group.rotation.y = 0;
            }

            // Leg swing — alternating
            ped.legL.rotation.x = Math.sin(ped.phase) * 0.55;
            ped.legR.rotation.x = -Math.sin(ped.phase) * 0.55;

            // Arm swing — opposite to legs
            ped.armL.rotation.x = -Math.sin(ped.phase) * 0.42;
            ped.armR.rotation.x = Math.sin(ped.phase) * 0.42;
        });
    }

    function dispose() {
        peds.forEach(ped => {
            ped.group.children.forEach(c => {
                if (c.geometry) c.geometry.dispose();
                if (c.material) c.material.dispose();
            });
            scene.remove(ped.group);
        });
        peds.length = 0;

        treeGroups.forEach(g => {
            g.children.forEach(c => {
                if (c.geometry) c.geometry.dispose();
                if (c.material) c.material.dispose();
            });
            scene.remove(g);
        });
        treeGroups.length = 0;
    }

    return { update, dispose, count: peds.length };
}