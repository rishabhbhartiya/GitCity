/**
 * CityAssets.js — GitCity
 */

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const DEFAULT_ROAD_W = 9;
const FOOTPATH_OFFSET_FAC = 0.5 + 1.1 / DEFAULT_ROAD_W;   // ≈ road/2 + 1.1
const FURNITURE_OFFSET = DEFAULT_ROAD_W / 2 + 1.8;      // 6.3 from road centre


// ── BENCH ──────────────────────────────────────────────────────────────────────
export function addBench(scene, THREE, x, z) {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x8b6f47 });
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x5a5a5a });

    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.5), woodMat);
    seat.position.y = 0.45;
    seat.castShadow = true;
    group.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.12), woodMat);
    back.position.y = 0.85;
    back.position.z = -0.25;
    back.rotation.x = 0.15;
    back.castShadow = true;
    group.add(back);

    [[-1.1, -0.2], [-1.1, 0.2], [1.1, -0.2], [1.1, 0.2]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.45, 8), metalMat);
        leg.position.set(lx, 0.225, lz);
        leg.castShadow = true;
        group.add(leg);
    });

    group.position.set(x, 0, z);
    scene.add(group);
    return group;
}


// ── PICNIC TABLE ───────────────────────────────────────────────────────────────
export function addPicnicTable(scene, THREE, x, z) {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x9d7d5a });

    const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 1.2), woodMat);
    top.position.y = 0.55;
    top.castShadow = true;
    group.add(top);

    const support = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 0.3), woodMat);
    support.position.y = 0.275;
    support.castShadow = true;
    group.add(support);

    for (const side of [-0.8, 0.8]) {
        const bench = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.35), woodMat);
        bench.position.set(0, 0.35, side);
        bench.castShadow = true;
        group.add(bench);
    }

    group.position.set(x, 0, z);
    scene.add(group);
    return group;
}


// ── TRASH BIN ──────────────────────────────────────────────────────────────────
export function addTrashBin(scene, THREE, x, z) {
    const group = new THREE.Group();
    const binMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x888888 });

    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.8, 12), binMat);
    bin.position.y = 0.4;
    bin.castShadow = true;
    group.add(bin);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.06, 8, 12), metalMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.82;
    group.add(rim);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8), metalMat);
    pole.position.y = 0.2;
    group.add(pole);

    group.position.set(x, 0, z);
    scene.add(group);
    return group;
}


// ── GARDEN / FLOWER BOX ────────────────────────────────────────────────────────
export function addGarden(scene, THREE, x, z, size = 1) {
    const group = new THREE.Group();
    const boxMat = new THREE.MeshLambertMaterial({ color: 0x7a5c3d });

    const box = new THREE.Mesh(
        new THREE.BoxGeometry(1.2 * size, 0.4 * size, 1.2 * size),
        boxMat
    );
    box.position.y = 0.2 * size;
    box.castShadow = true;
    group.add(box);

    const soil = new THREE.Mesh(
        new THREE.BoxGeometry(1.15 * size, 0.38 * size, 1.15 * size),
        new THREE.MeshLambertMaterial({ color: 0x4a3c2a })
    );
    soil.position.y = 0.25 * size;
    group.add(soil);

    const flowerColors = [0xff6b9d, 0xffb347, 0x87ceeb, 0xffff99, 0xb19cd9];
    for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        const rad = 0.35 * size;
        // Place flowers in LOCAL space so they move with the group
        const flower = new THREE.Mesh(
            new THREE.SphereGeometry(0.15 * size, 8, 8),
            new THREE.MeshLambertMaterial({ color: flowerColors[i % flowerColors.length] })
        );
        flower.position.set(
            Math.cos(ang) * rad,
            0.5 * size,
            Math.sin(ang) * rad
        );
        flower.castShadow = true;
        group.add(flower);
    }

    group.position.set(x, 0, z);
    scene.add(group);
    return group;
}


// ── PLAYGROUND ────────────────────────────────────────────────────────────────
export function addPlayground(scene, THREE, x, z) {
    const group = new THREE.Group();
    const metalMat = new THREE.MeshLambertMaterial({ color: 0xcc3333 });

    // Swing frame legs
    [-0.8, 0.8].forEach((xOff) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2, 8), metalMat);
        leg.position.set(xOff, 1, 0);
        leg.castShadow = true;
        group.add(leg);
    });

    // Top beam
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8), metalMat);
    beam.rotation.z = Math.PI / 2;
    beam.position.y = 2;
    group.add(beam);

    // Swings
    for (const sx of [-0.4, 0.4]) {
        const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), metalMat);
        chain.position.set(sx, 1.4, 0);
        group.add(chain);

        const seat = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.08, 0.3),
            new THREE.MeshLambertMaterial({ color: 0xffcc33 })
        );
        seat.position.set(sx, 0.3, 0);
        seat.castShadow = true;
        group.add(seat);
    }

    // Slide base
    const slideBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 2), metalMat);
    slideBase.position.set(2, 0.3, 0);
    slideBase.castShadow = true;
    group.add(slideBase);

    const slideSurface = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.05, 1.8),
        new THREE.MeshLambertMaterial({ color: 0x00cc66 })
    );
    slideSurface.position.set(2, 1.2, 0);
    slideSurface.rotation.x = -0.35;
    slideSurface.castShadow = true;
    group.add(slideSurface);

    group.position.set(x, 0, z);
    scene.add(group);
    return group;
}


// ── STREET VENDOR / KIOSK ──────────────────────────────────────────────────────
export function addKiosk(scene, THREE, x, z) {
    const group = new THREE.Group();
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x8b7355 });
    const wallMat = new THREE.MeshLambertMaterial({ color: 0xffe6cc });

    const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.15, 1.5), baseMat);
    base.castShadow = true;
    group.add(base);

    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 0.6), wallMat);
        wall.position.set(Math.cos(angle) * 0.7, 0.6, Math.sin(angle) * 0.7);
        wall.rotation.y = angle;
        wall.castShadow = true;
        group.add(wall);
    }

    const roof = new THREE.Mesh(
        new THREE.ConeGeometry(1.1, 0.6, 16),
        new THREE.MeshLambertMaterial({ color: 0xff6b35 })
    );
    roof.position.y = 1.35;
    roof.castShadow = true;
    group.add(roof);

    group.position.set(x, 0, z);
    scene.add(group);
    return group;
}


// ── UTILITY: Place furniture along a road segment ─────────────────────────────
/**
 * placeFurnitureAlongRoad
 *
 * Distributes benches, trash bins, gardens, and kiosks along both sides of a
 * road segment. Every candidate position is tested with `isOnFootpathFn`
 * before placing — so no asset can land on the carriageway.
 *
 * @param {object}   scene
 * @param {object}   THREE
 * @param {number}   x1, z1         road segment start
 * @param {number}   x2, z2         road segment end
 * @param {number}   [roadW=9]      road width
 * @param {Function} [isOnFootpathFn]  optional validator (x,z)→bool
 * @param {number}   [spacing=14]   units between furniture placements
 */
export function placeFurnitureAlongRoad(
    scene, THREE,
    x1, z1, x2, z2,
    roadW = DEFAULT_ROAD_W,
    isOnFootpathFn = null,
    spacing = 14
) {
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.sqrt(dx * dx + dz * dz);
    if (len < 0.5) return;
    const nx = -dz / len, nz = dx / len;

    // FURNITURE_OFFSET from road centre — always outside the carriageway
    const offset = roadW / 2 + 1.8;

    const assetFns = [
        (x, z) => addBench(scene, THREE, x, z),
        (x, z) => addTrashBin(scene, THREE, x, z),
        (x, z) => addGarden(scene, THREE, x, z, 0.8),
        (x, z) => addKiosk(scene, THREE, x, z),
    ];

    const steps = Math.max(1, Math.floor(len / spacing));
    let assetIdx = 0;

    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const bx = x1 + dx * t, bz = z1 + dz * t;

        for (const side of [-1, 1]) {
            const fx = bx + nx * offset * side;
            const fz = bz + nz * offset * side;

            // Skip if validator says the point is on the road / inside a block
            if (isOnFootpathFn && !isOnFootpathFn(fx, fz)) continue;

            // Stagger asset types so both sides don't always get the same thing
            const fn = assetFns[assetIdx % assetFns.length];
            fn(fx, fz);
            assetIdx++;
        }
    }
}


// ── UTILITY: Decorate a plaza / square ────────────────────────────────────────
/**
 * decoratePlaza
 *
 * Scatters benches, trash bins, gardens and kiosks in a circular area.
 * Validates every candidate with `isOnFootpathFn` when supplied so no
 * asset can accidentally land on the road carriageway.
 *
 * @param {object}   scene
 * @param {object}   THREE
 * @param {number}   centerX, centerZ
 * @param {number}   radius           max distance from centre
 * @param {number}   [density=0.15]   probability of placing at each grid cell
 * @param {Function} [isOnFootpathFn] optional validator (x,z)→bool
 */
export function decoratePlaza(
    scene, THREE,
    centerX, centerZ,
    radius,
    density = 0.15,
    isOnFootpathFn = null
) {
    const assetTypes = [
        (x, z) => addBench(scene, THREE, x, z),
        (x, z) => addTrashBin(scene, THREE, x, z),
        (x, z) => addGarden(scene, THREE, x, z, 0.8),
        (x, z) => addKiosk(scene, THREE, x, z),
    ];

    const gridSize = 3;
    let assetIdx = 0;

    for (let gx = -gridSize; gx <= gridSize; gx++) {
        for (let gz = -gridSize; gz <= gridSize; gz++) {
            if (Math.random() > density) continue;

            const px = centerX + gx * 2.5;
            const pz = centerZ + gz * 2.5;
            const dist = Math.sqrt((px - centerX) ** 2 + (pz - centerZ) ** 2);
            if (dist > radius) continue;

            // Validator guard — skip if inside road carriageway or building
            if (isOnFootpathFn && !isOnFootpathFn(px, pz)) continue;

            const fn = assetTypes[assetIdx % assetTypes.length];
            fn(px, pz);
            assetIdx++;
        }
    }
}