/**
 * CityAssets.js — GitCity
 * Decorative city assets: benches, lamp posts, shops, gardens, playgrounds
 *
 * Usage:
 *   import { addBench, addGarden, addPlayground, addShop } from "./CityAssets";
 *   addBench(scene, THREE, x, z);
 *   addGarden(scene, THREE, x, z);
 */

// ── BENCH ──────────────────────────────────────────────────────────────────────
export function addBench(scene, THREE, x, z) {
    const group = new THREE.Group();

    const woodMat = new THREE.MeshLambertMaterial({ color: 0x8b6f47 });
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x5a5a5a });

    // Seat — long wood plank
    const seat = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.1, 0.5),
        woodMat
    );
    seat.position.y = 0.45;
    seat.castShadow = true;
    group.add(seat);

    // Backrest
    const back = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.6, 0.12),
        woodMat
    );
    back.position.y = 0.85;
    back.position.z = -0.25;
    back.rotation.x = 0.15;
    back.castShadow = true;
    group.add(back);

    // Legs — 4 metal cylinders
    [[-1.1, -0.2], [-1.1, 0.2], [1.1, -0.2], [1.1, 0.2]].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 0.45, 8),
            metalMat
        );
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

    // Top surface
    const top = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.08, 1.2),
        woodMat
    );
    top.position.y = 0.55;
    top.castShadow = true;
    group.add(top);

    // Center support
    const support = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.55, 0.3),
        woodMat
    );
    support.position.y = 0.275;
    support.castShadow = true;
    group.add(support);

    // Benches on sides
    for (let side of [-0.8, 0.8]) {
        const bench = new THREE.Mesh(
            new THREE.BoxGeometry(1.8, 0.08, 0.35),
            woodMat
        );
        bench.position.y = 0.35;
        bench.position.z = side;
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

    // Cylindrical bin body
    const bin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.32, 0.8, 12),
        binMat
    );
    bin.position.y = 0.4;
    bin.castShadow = true;
    group.add(bin);

    // Metal rim at top
    const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.32, 0.06, 8, 12),
        metalMat
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.82;
    group.add(rim);

    // Metal post/pole
    const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8),
        metalMat
    );
    pole.position.y = 0.2;
    group.add(pole);

    group.position.set(x, 0, z);
    scene.add(group);
    return group;
}

// ── GARDEN / FLOWER BOX ────────────────────────────────────────────────────────
export function addGarden(scene, THREE, x, z, size = 1) {
    const group = new THREE.Group();

    // Wooden planter box
    const boxMat = new THREE.MeshLambertMaterial({ color: 0x7a5c3d });
    const box = new THREE.Mesh(
        new THREE.BoxGeometry(1.2 * size, 0.4 * size, 1.2 * size),
        boxMat
    );
    box.position.y = 0.2 * size;
    box.castShadow = true;
    group.add(box);

    // Soil — darker brown
    const soil = new THREE.Mesh(
        new THREE.BoxGeometry(1.15 * size, 0.38 * size, 1.15 * size),
        new THREE.MeshLambertMaterial({ color: 0x4a3c2a })
    );
    soil.position.y = 0.25 * size;
    group.add(soil);

    // Flowers — random colored spheres
    const flowerColors = [0xff6b9d, 0xffb347, 0x87ceeb, 0xffff99, 0xb19cd9];
    const flowerCount = 8;
    for (let i = 0; i < flowerCount; i++) {
        const ang = (i / flowerCount) * Math.PI * 2;
        const rad = 0.35 * size;
        const fx = x + Math.cos(ang) * rad;
        const fz = z + Math.sin(ang) * rad;

        const flower = new THREE.Mesh(
            new THREE.SphereGeometry(0.15 * size, 8, 8),
            new THREE.MeshLambertMaterial({
                color: flowerColors[i % flowerColors.length],
            })
        );
        flower.position.set(fx, 0.5 * size, fz);
        flower.castShadow = true;
        scene.add(flower);
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

    // Swing frame
    const frameLeg = (xOff) => {
        const leg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 2, 8),
            metalMat
        );
        leg.position.set(xOff, 1, 0);
        leg.castShadow = true;
        group.add(leg);
    };
    frameLeg(-0.8);
    frameLeg(0.8);

    // Top beam
    const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8),
        metalMat
    );
    beam.rotation.z = Math.PI / 2;
    beam.position.y = 2;
    group.add(beam);

    // Swings (2)
    for (let sx of [-0.4, 0.4]) {
        // Chains
        const chain = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6),
            metalMat
        );
        chain.position.set(sx, 1.4, 0);
        group.add(chain);

        // Seat
        const seat = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.08, 0.3),
            new THREE.MeshLambertMaterial({ color: 0xffcc33 })
        );
        seat.position.set(sx, 0.3, 0);
        seat.castShadow = true;
        group.add(seat);
    }

    // Slide
    const slideBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.1, 2),
        metalMat
    );
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

    // Base platform
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x8b7355 });
    const base = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.15, 1.5),
        baseMat
    );
    base.castShadow = true;
    group.add(base);

    // Walls
    const wallMat = new THREE.MeshLambertMaterial({ color: 0xffe6cc });
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const wx = Math.cos(angle) * 0.7;
        const wz = Math.sin(angle) * 0.7;

        const wall = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 1.2, 0.6),
            wallMat
        );
        wall.position.set(wx, 0.6, wz);
        wall.rotation.y = angle;
        wall.castShadow = true;
        group.add(wall);
    }

    // Roof — cone
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

// ── UTILITY: Add random assets to a plaza/square ──────────────────────────────
export function decoratePlaza(scene, THREE, centerX, centerZ, radius, density = 0.15) {
    const assetTypes = [
        (x, z) => addBench(scene, THREE, x, z),
        (x, z) => addTrashBin(scene, THREE, x, z),
        (x, z) => addGarden(scene, THREE, x, z, 0.8),
        (x, z) => addKiosk(scene, THREE, x, z),
    ];

    const gridSize = 3;
    for (let gx = -gridSize; gx <= gridSize; gx++) {
        for (let gz = -gridSize; gz <= gridSize; gz++) {
            if (Math.random() > density) continue;
            const px = centerX + gx * 2.5;
            const pz = centerZ + gz * 2.5;
            const dist = Math.sqrt((px - centerX) ** 2 + (pz - centerZ) ** 2);
            if (dist > radius) continue;

            const asset = assetTypes[Math.floor(Math.random() * assetTypes.length)];
            asset(px, pz);
        }
    }
}