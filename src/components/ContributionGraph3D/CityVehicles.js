/**
 * CityVehicles.js — GitCity v1
 * Detailed vehicle builders for the city simulation.
 * Vehicle types: sedan, suv, sportscar, bus, schoolbus, ambulance, taxi, police, truck
 *
 * Usage:
 *   import { buildVehicle, VEHICLE_TYPES } from "./CityVehicles";
 *   const car = buildVehicle(scene, THREE, "ambulance", accentColor);
 */

// ── SHARED HELPERS ────────────────────────────────────────────────────────────

function addBox(parent, THREE, w, h, d, mat, px, py, pz, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(px, py, pz);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    parent.add(m);
    return m;
}

function addCyl(parent, THREE, rTop, rBot, h, segs, mat, px, py, pz, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segs), mat);
    m.position.set(px, py, pz);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    parent.add(m);
    return m;
}

function addWheel(group, THREE, x, z, darkMat, chromeMat) {
    const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.36, 0.22, 16),
        darkMat
    );
    tire.rotation.z = Math.PI / 2;
    tire.position.set(x, 0.28, z);
    tire.castShadow = true;
    group.add(tire);

    // Rim with spokes feel
    const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.24, 8),
        chromeMat
    );
    rim.rotation.z = Math.PI / 2;
    rim.position.set(x > 0 ? x + 0.12 : x - 0.12, 0.28, z);
    group.add(rim);

    // Hub cap
    const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.26, 6),
        chromeMat
    );
    hub.rotation.z = Math.PI / 2;
    hub.position.set(x > 0 ? x + 0.13 : x - 0.13, 0.28, z);
    group.add(hub);
}

function addHeadlights(group, THREE, zPos, color = 0xfffff0, emitColor = null) {
    const mat = new THREE.MeshLambertMaterial({
        color,
        emissive: new THREE.Color(emitColor || color).multiplyScalar(0.9),
    });
    [-0.55, 0.55].forEach(x => {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.06), mat);
        hl.position.set(x, 0.62, zPos);
        group.add(hl);
    });
}

function addTaillights(group, THREE, zPos) {
    const mat = new THREE.MeshLambertMaterial({
        color: 0xff1100,
        emissive: new THREE.Color(0.7, 0.05, 0),
    });
    [-0.62, 0.62].forEach(x => {
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.05), mat);
        tl.position.set(x, 0.62, zPos);
        group.add(tl);
    });
}

// ── SEDAN ─────────────────────────────────────────────────────────────────────
export function buildSedan(scene, THREE, color) {
    const group = new THREE.Group();
    const body = new THREE.MeshLambertMaterial({ color });
    const dark = new THREE.MeshLambertMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0, 0, 0), 0.45) });
    const glass = new THREE.MeshLambertMaterial({ color: 0x334466, transparent: true, opacity: 0.72 });
    const chr = new THREE.MeshLambertMaterial({ color: 0x999aaa });
    const blk = new THREE.MeshLambertMaterial({ color: 0x111111 });

    // Body
    addBox(group, THREE, 2.1, 0.52, 4.2, body, 0, 0.52, 0);
    // Cabin (raised section)
    addBox(group, THREE, 1.78, 0.48, 2.15, body, 0, 0.97, -0.08);
    // Roof
    addBox(group, THREE, 1.72, 0.09, 2.0, dark, 0, 1.22, -0.08);
    // Hood slope
    addBox(group, THREE, 1.96, 0.18, 1.0, body, 0, 0.72, -1.65, 0.22, 0, 0);
    // Boot slope
    addBox(group, THREE, 1.94, 0.16, 0.7, body, 0, 0.72, 1.72, -0.18, 0, 0);
    // Front bumper
    addBox(group, THREE, 2.08, 0.22, 0.17, dark, 0, 0.30, -2.13);
    // Rear bumper
    addBox(group, THREE, 2.08, 0.22, 0.17, dark, 0, 0.30, 2.13);
    // Skirts
    [-1.07, 1.07].forEach(x => addBox(group, THREE, 0.07, 0.1, 3.8, dark, x, 0.17, 0));

    // Windscreen
    addBox(group, THREE, 1.68, 0.46, 0.07, glass, 0, 0.98, -1.22, -0.28, 0, 0);
    // Rear screen
    addBox(group, THREE, 1.66, 0.38, 0.07, glass, 0, 0.97, 1.0, 0.28, 0, 0);
    // Side windows
    [-0.9, 0.9].forEach(x => addBox(group, THREE, 0.06, 0.35, 1.78, glass, x, 0.97, -0.08));

    // Wheels
    [[1.1, -1.4], [-1.1, -1.4], [1.1, 1.3], [-1.1, 1.3]].forEach(([x, z]) =>
        addWheel(group, THREE, x, z, blk, chr)
    );

    // Lights
    addHeadlights(group, THREE, -2.14);
    addTaillights(group, THREE, 2.14);

    // Headlight spot
    const spot = new THREE.SpotLight(0xffffff, 2.2, 42, Math.PI / 7, 0.7);
    spot.position.set(0, 0.78, -2.1);
    spot.target.position.set(0, 0, -22);
    group.add(spot);
    group.add(spot.target);

    // Licence plate
    addBox(group, THREE, 1.1, 0.26, 0.05, new THREE.MeshLambertMaterial({ color: 0xf5f5f0 }), 0, 0.36, -2.16);

    scene.add(group);
    return group;
}

// ── SUV ───────────────────────────────────────────────────────────────────────
export function buildSUV(scene, THREE, color) {
    const group = new THREE.Group();
    const body = new THREE.MeshLambertMaterial({ color });
    const dark = new THREE.MeshLambertMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0, 0, 0), 0.4) });
    const glass = new THREE.MeshLambertMaterial({ color: 0x223355, transparent: true, opacity: 0.7 });
    const chr = new THREE.MeshLambertMaterial({ color: 0x888899 });
    const blk = new THREE.MeshLambertMaterial({ color: 0x111111 });

    // Tall blocky body
    addBox(group, THREE, 2.3, 0.62, 4.6, body, 0, 0.55, 0);
    // Cabin — same width, nearly full length
    addBox(group, THREE, 2.22, 0.68, 2.9, body, 0, 1.11, 0.12);
    // Roof rack detail
    addBox(group, THREE, 2.0, 0.06, 2.6, dark, 0, 1.49, 0.12);
    // Roof rack bars
    [-0.7, 0, 0.7].forEach(z =>
        addBox(group, THREE, 2.0, 0.06, 0.06, chr, 0, 1.54, z)
    );
    // Front bumper guard
    addBox(group, THREE, 2.3, 0.28, 0.22, dark, 0, 0.35, -2.35);
    addBox(group, THREE, 2.3, 0.12, 0.18, chr, 0, 0.55, -2.35);
    // Rear bumper
    addBox(group, THREE, 2.3, 0.28, 0.2, dark, 0, 0.35, 2.35);
    // Side cladding
    [-1.16, 1.16].forEach(x => {
        addBox(group, THREE, 0.07, 0.22, 4.5, dark, x, 0.3, 0);
        addBox(group, THREE, 0.06, 0.1, 4.5, chr, x, 0.5, 0);
    });

    // Windscreen
    addBox(group, THREE, 2.1, 0.6, 0.07, glass, 0, 1.1, -1.52, -0.22, 0, 0);
    // Rear screen
    addBox(group, THREE, 2.1, 0.6, 0.07, glass, 0, 1.1, 1.52, 0.22, 0, 0);
    // Side windows
    [-1.12, 1.12].forEach(x => addBox(group, THREE, 0.06, 0.5, 2.7, glass, x, 1.12, 0.12));

    // Big SUV wheels
    [[1.18, -1.55], [-1.18, -1.55], [1.18, 1.45], [-1.18, 1.45]].forEach(([x, z]) =>
        addWheel(group, THREE, x, z, blk, chr)
    );

    addHeadlights(group, THREE, -2.4);
    addTaillights(group, THREE, 2.4);

    scene.add(group);
    return group;
}

// ── SPORTS CAR ────────────────────────────────────────────────────────────────
export function buildSportsCar(scene, THREE, color) {
    const group = new THREE.Group();
    const body = new THREE.MeshLambertMaterial({ color });
    const dark = new THREE.MeshLambertMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0, 0, 0), 0.5) });
    const glass = new THREE.MeshLambertMaterial({ color: 0x445577, transparent: true, opacity: 0.65 });
    const chr = new THREE.MeshLambertMaterial({ color: 0xaaaacc });
    const blk = new THREE.MeshLambertMaterial({ color: 0x111111 });

    // Very low, wide body
    addBox(group, THREE, 2.2, 0.38, 4.4, body, 0, 0.38, 0);
    // Low-slung cabin
    addBox(group, THREE, 1.82, 0.38, 1.75, body, 0, 0.7, -0.15);
    // Flat roof
    addBox(group, THREE, 1.76, 0.07, 1.6, dark, 0, 0.9, -0.15);
    // Long hood
    addBox(group, THREE, 2.1, 0.12, 1.5, body, 0, 0.5, -1.7, 0.1, 0, 0);
    // Air intake vents
    [-0.6, 0.6].forEach(x => addBox(group, THREE, 0.28, 0.07, 0.4, blk, x, 0.42, -1.9));
    // Rear diffuser
    addBox(group, THREE, 2.18, 0.14, 0.3, dark, 0, 0.24, 2.2);
    // Rear spoiler
    addBox(group, THREE, 1.9, 0.1, 0.36, dark, 0, 0.64, 2.1);
    addCyl(group, THREE, 0.05, 0.05, 0.32, 6, chr, -0.85, 0.54, 2.1, 0, 0, Math.PI / 2);
    addCyl(group, THREE, 0.05, 0.05, 0.32, 6, chr, 0.85, 0.54, 2.1, 0, 0, Math.PI / 2);
    // Side skirts
    [-1.12, 1.12].forEach(x => addBox(group, THREE, 0.06, 0.09, 4.3, dark, x, 0.13, 0));
    // Exhaust pipes
    [-0.45, 0.45].forEach(x => addCyl(group, THREE, 0.07, 0.07, 0.18, 8, chr, x, 0.24, 2.24, Math.PI / 2, 0, 0));

    // Windscreen (very slanted)
    addBox(group, THREE, 1.78, 0.42, 0.07, glass, 0, 0.78, -1.1, -0.48, 0, 0);
    // Side windows (small)
    [-0.92, 0.92].forEach(x => addBox(group, THREE, 0.05, 0.3, 1.6, glass, x, 0.72, -0.2));

    // Low-profile wheels
    [[1.12, -1.45], [-1.12, -1.45], [1.12, 1.35], [-1.12, 1.35]].forEach(([x, z]) =>
        addWheel(group, THREE, x, z, blk, chr)
    );

    addHeadlights(group, THREE, -2.22);
    addTaillights(group, THREE, 2.22);

    scene.add(group);
    return group;
}

// ── BUS ───────────────────────────────────────────────────────────────────────
export function buildBus(scene, THREE, color) {
    const group = new THREE.Group();
    const body = new THREE.MeshLambertMaterial({ color });
    const dark = new THREE.MeshLambertMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0, 0, 0), 0.35) });
    const glass = new THREE.MeshLambertMaterial({ color: 0x334455, transparent: true, opacity: 0.65 });
    const chr = new THREE.MeshLambertMaterial({ color: 0x888899 });
    const blk = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const white = new THREE.MeshLambertMaterial({ color: 0xeeeeee });

    // Main chassis — long and tall
    addBox(group, THREE, 2.6, 1.55, 8.8, body, 0, 1.05, 0);
    // Roof — slight curve simulation with a flat dark strip
    addBox(group, THREE, 2.55, 0.1, 8.7, dark, 0, 1.85, 0);
    // Front face
    addBox(group, THREE, 2.6, 1.55, 0.12, dark, 0, 1.05, -4.46);
    // Rear face
    addBox(group, THREE, 2.6, 1.55, 0.12, dark, 0, 1.05, 4.46);
    // Front bumper
    addBox(group, THREE, 2.62, 0.26, 0.22, chr, 0, 0.28, -4.52);
    // Rear bumper
    addBox(group, THREE, 2.62, 0.26, 0.22, chr, 0, 0.28, 4.52);
    // Side stripe (white band along body)
    addBox(group, THREE, 2.62, 0.22, 8.7, white, 0, 1.52, 0);
    // Wheel arches
    [[1.32, -3.1], [-1.32, -3.1], [1.32, 2.8], [-1.32, 2.8]].forEach(([x, z]) =>
        addBox(group, THREE, 0.12, 0.52, 1.1, dark, x, 0.42, z)
    );

    // Windows — many along both sides
    const winY = 1.28;
    for (let i = 0; i < 5; i++) {
        const wz = -3.0 + i * 1.35;
        [-1.31, 1.31].forEach(x => {
            const win = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.55, 0.96), glass);
            win.position.set(x, winY, wz);
            group.add(win);
        });
    }
    // Front windscreen
    addBox(group, THREE, 2.3, 0.8, 0.07, glass, 0, 1.38, -4.48, -0.1, 0, 0);
    // Rear window
    addBox(group, THREE, 2.3, 0.6, 0.07, glass, 0, 1.38, 4.48, 0.1, 0, 0);

    // Door (right side)
    addBox(group, THREE, 0.07, 1.1, 1.0, dark, -1.31, 0.82, -1.6);
    addBox(group, THREE, 0.05, 0.06, 0.8, chr, -1.34, 1.35, -1.6); // door handle

    // Destination display box above windscreen
    addBox(group, THREE, 2.2, 0.28, 0.09, blk, 0, 1.75, -4.47);
    const destMat = new THREE.MeshLambertMaterial({ color: 0xff8800, emissive: new THREE.Color(0.4, 0.18, 0) });
    addBox(group, THREE, 2.0, 0.18, 0.06, destMat, 0, 1.75, -4.5);

    // Headlights — twin rectangular
    [[0.7, -4.52], [-0.7, -4.52]].forEach(([x, z]) => {
        const hl = new THREE.Mesh(
            new THREE.BoxGeometry(0.55, 0.22, 0.06),
            new THREE.MeshLambertMaterial({ color: 0xfffff0, emissive: new THREE.Color(0.9, 0.9, 0.7) })
        );
        hl.position.set(x, 0.62, z);
        group.add(hl);
    });
    // Tail lights
    [[0.8, 4.52], [-0.8, 4.52]].forEach(([x, z]) => {
        const tl = new THREE.Mesh(
            new THREE.BoxGeometry(0.55, 0.3, 0.06),
            new THREE.MeshLambertMaterial({ color: 0xff1100, emissive: new THREE.Color(0.6, 0.05, 0) })
        );
        tl.position.set(x, 0.62, z);
        group.add(tl);
    });

    // Six wheels
    [[1.32, -3.1], [-1.32, -3.1], [1.32, -1.6], [-1.32, -1.6], [1.32, 2.8], [-1.32, 2.8]].forEach(([x, z]) =>
        addWheel(group, THREE, x, z, blk, chr)
    );

    // Mirror arms
    [-1.35, 1.35].forEach(x => {
        addBox(group, THREE, 0.35, 0.04, 0.04, chr, x + (x > 0 ? 0.16 : -0.16), 1.7, -3.8, 0, 0, Math.PI / 2);
        addBox(group, THREE, 0.22, 0.26, 0.07, dark, x + (x > 0 ? 0.34 : -0.34), 1.62, -3.8);
    });

    scene.add(group);
    return group;
}

// ── SCHOOL BUS ────────────────────────────────────────────────────────────────
export function buildSchoolBus(scene, THREE) {
    const group = new THREE.Group();
    const yellow = new THREE.MeshLambertMaterial({ color: 0xffd700 });
    const dark = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const black = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const glass = new THREE.MeshLambertMaterial({ color: 0x334455, transparent: true, opacity: 0.65 });
    const chr = new THREE.MeshLambertMaterial({ color: 0x888899 });
    const red = new THREE.MeshLambertMaterial({ color: 0xcc0000 });

    // Body
    addBox(group, THREE, 2.55, 1.5, 8.2, yellow, 0, 1.02, 0);
    // Roof
    addBox(group, THREE, 2.5, 0.09, 8.1, dark, 0, 1.8, 0);
    // Black safety stripes
    [0.55, 1.0].forEach(y =>
        addBox(group, THREE, 2.57, 0.14, 8.2, dark, 0, y, 0)
    );
    // Front hood (school buses have distinctive snout)
    addBox(group, THREE, 2.55, 0.8, 1.2, yellow, 0, 0.8, -4.7);
    addBox(group, THREE, 2.55, 1.5, 0.12, dark, 0, 1.02, -4.44);
    // Rear flat face
    addBox(group, THREE, 2.55, 1.5, 0.12, dark, 0, 1.02, 4.44);
    // Bumpers
    addBox(group, THREE, 2.57, 0.28, 0.22, chr, 0, 0.28, -5.35);
    addBox(group, THREE, 2.57, 0.28, 0.22, chr, 0, 0.28, 4.5);

    // Windows
    for (let i = 0; i < 5; i++) {
        const wz = -2.8 + i * 1.3;
        [-1.28, 1.28].forEach(x => {
            const win = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.9), glass);
            win.position.set(x, 1.28, wz);
            group.add(win);
        });
    }
    addBox(group, THREE, 2.2, 0.62, 0.07, glass, 0, 1.3, -4.42, -0.08, 0, 0);
    addBox(group, THREE, 2.2, 0.55, 0.07, glass, 0, 1.3, 4.42, 0.08, 0, 0);

    // SCHOOL BUS text area (black strip front)
    addBox(group, THREE, 2.3, 0.28, 0.08, black, 0, 1.7, -5.36);
    const textMat = new THREE.MeshLambertMaterial({ color: 0xff4400, emissive: new THREE.Color(0.3, 0.1, 0) });
    addBox(group, THREE, 2.0, 0.18, 0.06, textMat, 0, 1.7, -5.38);

    // Stop sign arm (right side, retracted)
    addBox(group, THREE, 0.06, 0.55, 0.55, red, 1.3, 1.2, -1.0);

    // Headlights
    [[0.6, -5.38], [-0.6, -5.38]].forEach(([x, z]) => {
        const hl = new THREE.Mesh(
            new THREE.BoxGeometry(0.52, 0.2, 0.06),
            new THREE.MeshLambertMaterial({ color: 0xfffff0, emissive: new THREE.Color(0.85, 0.85, 0.6) })
        );
        hl.position.set(x, 0.58, z);
        group.add(hl);
    });
    addTaillights(group, THREE, 4.5);

    // Warning lights on roof
    [-0.5, 0.5].forEach(x => {
        const warnMat = new THREE.MeshLambertMaterial({ color: 0xff2200, emissive: new THREE.Color(0.5, 0, 0) });
        addBox(group, THREE, 0.22, 0.18, 0.22, warnMat, x, 1.92, -4.2);
    });

    // Wheels (6)
    [[1.3, -3.0], [-1.3, -3.0], [1.3, -1.4], [-1.3, -1.4], [1.3, 2.8], [-1.3, 2.8]].forEach(([x, z]) =>
        addWheel(group, THREE, x, z, black, chr)
    );

    scene.add(group);
    return group;
}

// ── AMBULANCE ─────────────────────────────────────────────────────────────────
export function buildAmbulance(scene, THREE) {
    const group = new THREE.Group();
    const white = new THREE.MeshLambertMaterial({ color: 0xf0f0f0 });
    const dark = new THREE.MeshLambertMaterial({ color: 0x1a1a2a });
    const glass = new THREE.MeshLambertMaterial({ color: 0x334455, transparent: true, opacity: 0.65 });
    const chr = new THREE.MeshLambertMaterial({ color: 0x888899 });
    const blk = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const lime = new THREE.MeshLambertMaterial({ color: 0xaadd00 });

    // Body — boxy van shape
    addBox(group, THREE, 2.45, 1.68, 5.8, white, 0, 1.08, 0);
    addBox(group, THREE, 2.4, 0.08, 5.7, dark, 0, 1.95, 0);
    // Front cab
    addBox(group, THREE, 2.45, 1.68, 0.12, dark, 0, 1.08, -2.97);
    // Rear doors
    addBox(group, THREE, 2.45, 1.68, 0.12, white, 0, 1.08, 2.97);
    addBox(group, THREE, 0.05, 1.2, 0.14, dark, 0, 1.0, 2.98); // door seam
    // Bumpers
    addBox(group, THREE, 2.47, 0.3, 0.2, dark, 0, 0.3, -3.02);
    addBox(group, THREE, 2.47, 0.3, 0.2, dark, 0, 0.3, 3.02);

    // Green reflective stripe (hi-vis)
    addBox(group, THREE, 2.47, 0.22, 5.82, lime, 0, 1.28, 0);

    // Red stripe
    const redMat = new THREE.MeshLambertMaterial({ color: 0xcc0000 });
    addBox(group, THREE, 2.47, 0.12, 5.82, redMat, 0, 0.88, 0);

    // Cross symbol on rear
    const crossMat = new THREE.MeshLambertMaterial({ color: 0xdd0000, emissive: new THREE.Color(0.3, 0, 0) });
    addBox(group, THREE, 0.55, 0.14, 0.06, crossMat, 0, 1.1, 3.0);
    addBox(group, THREE, 0.14, 0.55, 0.06, crossMat, 0, 1.1, 3.0);

    // Windows
    addBox(group, THREE, 2.1, 0.6, 0.07, glass, 0, 1.35, -2.95, -0.12, 0, 0);
    [-1.23, 1.23].forEach(x => addBox(group, THREE, 0.06, 0.5, 1.5, glass, x, 1.38, -0.8));
    addBox(group, THREE, 2.1, 0.5, 0.07, glass, 0, 1.35, 2.95, 0.1, 0, 0);

    // ── LIGHTBAR on roof ─────────────────────────────────────────────────────
    const lbBase = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.1, 0.65), chr);
    lbBase.position.set(0, 2.02, -1.0);
    group.add(lbBase);
    // Red + Blue alternating light pods
    const podColors = [0xff0000, 0x0044ff, 0xff0000, 0x0044ff, 0xff0000, 0x0044ff];
    podColors.forEach((col, i) => {
        const podMat = new THREE.MeshLambertMaterial({
            color: col,
            emissive: new THREE.Color(col).multiplyScalar(0.7),
        });
        const pod = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.5), podMat);
        pod.position.set(-0.7 + i * 0.28, 2.11, -1.0);
        group.add(pod);

        // Store pod ref for animation
        group.userData.lightPods = group.userData.lightPods || [];
        group.userData.lightPods.push({ mesh: pod, baseColor: col, index: i });
    });

    // Actual point lights (red + blue) that flash
    const redLight = new THREE.PointLight(0xff0000, 0, 22);
    const blueLight = new THREE.PointLight(0x0044ff, 0, 22);
    redLight.position.set(-0.55, 2.2, -1.0);
    blueLight.position.set(0.55, 2.2, -1.0);
    group.add(redLight);
    group.add(blueLight);
    group.userData.redLight = redLight;
    group.userData.blueLight = blueLight;
    group.userData.flashTimer = 0;
    group.userData.isAmbulance = true;

    // Side vents
    [-1.23, 1.23].forEach(x =>
        addBox(group, THREE, 0.06, 0.18, 1.1, dark, x, 0.52, 0.8)
    );

    // Headlights
    addHeadlights(group, THREE, -3.02);
    addTaillights(group, THREE, 3.02);

    // Wheels
    [[1.25, -1.85], [-1.25, -1.85], [1.25, 1.75], [-1.25, 1.75]].forEach(([x, z]) =>
        addWheel(group, THREE, x, z, blk, chr)
    );

    scene.add(group);
    return group;
}

// ── TAXI ──────────────────────────────────────────────────────────────────────
export function buildTaxi(scene, THREE) {
    const group = new THREE.Group();
    const yellow = new THREE.MeshLambertMaterial({ color: 0xffc107 });
    const dark = new THREE.MeshLambertMaterial({ color: 0x111122 });
    const glass = new THREE.MeshLambertMaterial({ color: 0x334466, transparent: true, opacity: 0.7 });
    const chr = new THREE.MeshLambertMaterial({ color: 0x999aaa });
    const blk = new THREE.MeshLambertMaterial({ color: 0x111111 });

    // Sedan base
    addBox(group, THREE, 2.08, 0.5, 4.15, yellow, 0, 0.5, 0);
    addBox(group, THREE, 1.75, 0.46, 2.1, yellow, 0, 0.94, -0.1);
    addBox(group, THREE, 1.7, 0.08, 1.95, dark, 0, 1.2, -0.1);
    addBox(group, THREE, 1.92, 0.16, 0.95, yellow, 0, 0.7, -1.6, 0.2, 0, 0);
    addBox(group, THREE, 2.05, 0.2, 0.16, dark, 0, 0.29, -2.1);
    addBox(group, THREE, 2.05, 0.2, 0.16, dark, 0, 0.29, 2.1);

    // Black checker stripe along middle
    const checkMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    addBox(group, THREE, 2.1, 0.18, 4.17, checkMat, 0, 0.66, 0);
    // Yellow stripe on top of checker
    addBox(group, THREE, 0.5, 0.2, 4.17, yellow, 0, 0.66, 0);

    // Taxi sign on roof
    const signBase = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.22, 0.32), dark);
    signBase.position.set(0, 1.3, -0.1);
    group.add(signBase);
    const signMat = new THREE.MeshLambertMaterial({ color: 0xffee44, emissive: new THREE.Color(0.5, 0.45, 0) });
    addBox(group, THREE, 0.6, 0.15, 0.1, signMat, 0, 1.3, -0.1);

    // Windows
    addBox(group, THREE, 1.65, 0.44, 0.06, glass, 0, 0.96, -1.2, -0.27, 0, 0);
    addBox(group, THREE, 1.63, 0.36, 0.06, glass, 0, 0.95, 0.96, 0.27, 0, 0);
    [-0.88, 0.88].forEach(x => addBox(group, THREE, 0.05, 0.34, 1.74, glass, x, 0.95, -0.1));

    addHeadlights(group, THREE, -2.12);
    addTaillights(group, THREE, 2.12);

    [[1.08, -1.4], [-1.08, -1.4], [1.08, 1.3], [-1.08, 1.3]].forEach(([x, z]) =>
        addWheel(group, THREE, x, z, blk, chr)
    );

    scene.add(group);
    return group;
}

// ── POLICE CAR ────────────────────────────────────────────────────────────────
export function buildPoliceCar(scene, THREE) {
    const group = new THREE.Group();
    const white = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
    const dark = new THREE.MeshLambertMaterial({ color: new THREE.Color(0xeeeeee).lerp(new THREE.Color(0, 0, 0), 0.5) });
    const glass = new THREE.MeshLambertMaterial({ color: 0x334466, transparent: true, opacity: 0.7 });
    const chr = new THREE.MeshLambertMaterial({ color: 0x999aaa });
    const blk = new THREE.MeshLambertMaterial({ color: 0x111111 });

    // Sedan shape
    addBox(group, THREE, 2.12, 0.52, 4.25, white, 0, 0.52, 0);
    addBox(group, THREE, 1.8, 0.48, 2.15, white, 0, 0.98, -0.08);
    addBox(group, THREE, 1.74, 0.09, 2.0, dark, 0, 1.23, -0.08);
    addBox(group, THREE, 1.96, 0.18, 1.0, white, 0, 0.72, -1.66, 0.22, 0, 0);
    addBox(group, THREE, 2.1, 0.22, 0.17, dark, 0, 0.3, -2.15);
    addBox(group, THREE, 2.1, 0.22, 0.17, dark, 0, 0.3, 2.15);

    // Black & white police graphic
    const policeDark = new THREE.MeshLambertMaterial({ color: 0x111111 });
    addBox(group, THREE, 2.14, 0.4, 2.2, policeDark, 0, 0.42, 0.5); // rear dark
    addBox(group, THREE, 2.14, 0.4, 1.8, white, 0, 0.42, -1.0);    // front white

    // "POLICE" door badge
    const badgeMat = new THREE.MeshLambertMaterial({ color: 0x2244cc, emissive: new THREE.Color(0.05, 0.1, 0.3) });
    [-1.07, 1.07].forEach(x => addBox(group, THREE, 0.05, 0.22, 0.7, badgeMat, x, 0.65, -0.1));

    // ── LIGHTBAR ──────────────────────────────────────────────────────────────
    const lbBase = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 0.55), chr);
    lbBase.position.set(0, 1.35, -0.1);
    group.add(lbBase);
    const redPod = new THREE.MeshLambertMaterial({ color: 0xff0000, emissive: new THREE.Color(0.7, 0, 0) });
    const bluePod = new THREE.MeshLambertMaterial({ color: 0x0044ff, emissive: new THREE.Color(0, 0.1, 0.8) });
    [-0.65, -0.22, 0.22, 0.65].forEach((x, i) => {
        const pod = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.44), i % 2 === 0 ? redPod : bluePod);
        pod.position.set(x, 1.44, -0.1);
        group.add(pod);
        group.userData.lightPods = group.userData.lightPods || [];
        group.userData.lightPods.push({ mesh: pod, index: i });
    });

    const redLight = new THREE.PointLight(0xff0000, 0, 20);
    const blueLight = new THREE.PointLight(0x0044ff, 0, 20);
    redLight.position.set(-0.55, 1.5, -0.1);
    blueLight.position.set(0.55, 1.5, -0.1);
    group.add(redLight);
    group.add(blueLight);
    group.userData.redLight = redLight;
    group.userData.blueLight = blueLight;
    group.userData.flashTimer = 0;
    group.userData.isPolice = true;

    // Windows
    addBox(group, THREE, 1.7, 0.46, 0.07, glass, 0, 0.99, -1.23, -0.28, 0, 0);
    addBox(group, THREE, 1.68, 0.38, 0.07, glass, 0, 0.98, 0.98, 0.28, 0, 0);
    [-0.9, 0.9].forEach(x => addBox(group, THREE, 0.06, 0.35, 1.78, glass, x, 0.98, -0.08));

    addHeadlights(group, THREE, -2.16);
    addTaillights(group, THREE, 2.16);

    [[1.1, -1.43], [-1.1, -1.43], [1.1, 1.32], [-1.1, 1.32]].forEach(([x, z]) =>
        addWheel(group, THREE, x, z, blk, chr)
    );

    // Push bar on front
    addBox(group, THREE, 2.1, 0.28, 0.12, chr, 0, 0.42, -2.2);
    addCyl(group, THREE, 0.04, 0.04, 1.0, 6, chr, 0, 0.42, -2.2, 0, 0, Math.PI / 2);

    scene.add(group);
    return group;
}

// ── TRUCK / DELIVERY VAN ──────────────────────────────────────────────────────
export function buildTruck(scene, THREE, color) {
    const group = new THREE.Group();
    const body = new THREE.MeshLambertMaterial({ color });
    const dark = new THREE.MeshLambertMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0, 0, 0), 0.4) });
    const glass = new THREE.MeshLambertMaterial({ color: 0x334455, transparent: true, opacity: 0.65 });
    const chr = new THREE.MeshLambertMaterial({ color: 0x888899 });
    const blk = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const white = new THREE.MeshLambertMaterial({ color: 0xdddddd });

    // Cab
    addBox(group, THREE, 2.5, 1.6, 2.2, dark, 0, 1.0, -3.0);
    addBox(group, THREE, 2.5, 1.6, 0.1, dark, 0, 1.0, -4.0);
    // Cab roof
    addBox(group, THREE, 2.4, 0.12, 2.0, dark, 0, 1.88, -3.0);
    // Cab windscreen
    addBox(group, THREE, 2.2, 0.75, 0.07, glass, 0, 1.42, -4.0, -0.1, 0, 0);
    [-1.26, 1.26].forEach(x => addBox(group, THREE, 0.06, 0.55, 1.8, glass, x, 1.42, -3.0));

    // Cargo box
    addBox(group, THREE, 2.5, 1.85, 5.4, body, 0, 1.22, 0.4);
    addBox(group, THREE, 2.45, 0.08, 5.35, dark, 0, 2.18, 0.4);
    // Cargo door lines
    addBox(group, THREE, 0.05, 1.7, 5.4, dark, 0, 1.22, 0.4);
    // Rear cargo door
    addBox(group, THREE, 2.5, 1.85, 0.1, dark, 0, 1.22, 3.15);
    addBox(group, THREE, 2.3, 1.6, 0.07, white, 0, 1.22, 3.17); // door panel
    // Company logo area
    const logoMat = new THREE.MeshLambertMaterial({ color: 0xcc4400, emissive: new THREE.Color(0.2, 0.05, 0) });
    addBox(group, THREE, 1.8, 0.5, 0.06, logoMat, 0, 1.55, 3.18);

    // Bumpers
    addBox(group, THREE, 2.52, 0.3, 0.2, chr, 0, 0.28, -4.1);
    addBox(group, THREE, 2.52, 0.3, 0.2, chr, 0, 0.28, 3.2);
    // Step bar under cab
    addBox(group, THREE, 2.3, 0.12, 0.3, chr, 0, 0.45, -3.7);

    // Headlights
    addHeadlights(group, THREE, -4.08);
    addTaillights(group, THREE, 3.22);

    // 6 wheels (dual rear)
    [[1.28, -2.8], [-1.28, -2.8], [1.45, 1.6], [-1.45, 1.6], [1.18, 1.6], [-1.18, 1.6], [1.28, 2.6], [-1.28, 2.6]].forEach(([x, z]) =>
        addWheel(group, THREE, x, z, blk, chr)
    );

    // Mirror arms
    [-1.28, 1.28].forEach(x => {
        addBox(group, THREE, 0.4, 0.04, 0.04, chr, x + (x > 0 ? 0.18 : -0.18), 1.8, -3.7, 0, 0, Math.PI / 2);
        addBox(group, THREE, 0.24, 0.32, 0.08, dark, x + (x > 0 ? 0.38 : -0.38), 1.65, -3.7);
    });

    scene.add(group);
    return group;
}

// ── VEHICLE TYPE REGISTRY ─────────────────────────────────────────────────────
export const VEHICLE_TYPES = ["sedan", "suv", "sportscar", "bus", "schoolbus", "ambulance", "taxi", "police", "truck"];

const VEHICLE_COLORS = {
    sedan: [0x2244aa, 0x228844, 0x884422, 0x663399, 0x1a1a2e, 0xaa2222, 0x446688],
    suv: [0x222222, 0x3a3a5c, 0x4a3020, 0x1a3a1a, 0x5c3a1a, 0x8b0000],
    sportscar: [0xcc0000, 0xff6600, 0x0066cc, 0x111111, 0x00aa66],
    bus: [0x2255aa, 0x224422, 0x333333, 0x882222],
    schoolbus: null, // fixed yellow
    ambulance: null, // fixed white
    taxi: null, // fixed yellow
    police: null, // fixed white/black
    truck: [0xcc4400, 0x334455, 0x2a4a2a, 0x4a3a2a],
};

/**
 * Build a vehicle of the given type and return the THREE.Group.
 * @param {THREE.Scene} scene
 * @param {THREE} THREE
 * @param {string} type  — one of VEHICLE_TYPES
 * @param {number|null} colorOverride — hex color for colorable types
 */
export function buildVehicle(scene, THREE, type, colorOverride = null) {
    const palette = VEHICLE_COLORS[type];
    const color = colorOverride
        ?? (palette ? palette[Math.floor(Math.random() * palette.length)] : 0xffffff);

    switch (type) {
        case "sedan": return buildSedan(scene, THREE, color);
        case "suv": return buildSUV(scene, THREE, color);
        case "sportscar": return buildSportsCar(scene, THREE, color);
        case "bus": return buildBus(scene, THREE, color);
        case "schoolbus": return buildSchoolBus(scene, THREE);
        case "ambulance": return buildAmbulance(scene, THREE);
        case "taxi": return buildTaxi(scene, THREE);
        case "police": return buildPoliceCar(scene, THREE);
        case "truck": return buildTruck(scene, THREE, color);
        default: return buildSedan(scene, THREE, color);
    }
}

/**
 * Call once per animation frame to flash emergency lights on ambulances/police.
 * @param {THREE.Group} vehicle
 * @param {number} dt — delta time in seconds
 * @param {number} now — performance.now()
 */
export function updateVehicleLights(vehicle, dt, now) {
    if (!vehicle.userData.redLight) return;

    vehicle.userData.flashTimer = (vehicle.userData.flashTimer || 0) + dt;
    const t = vehicle.userData.flashTimer;
    const fast = Math.sin(t * 8) > 0; // ~4 Hz flash

    vehicle.userData.redLight.intensity = fast ? 3.5 : 0;
    vehicle.userData.blueLight.intensity = fast ? 0 : 3.5;

    // Alternate pod brightness
    if (vehicle.userData.lightPods) {
        vehicle.userData.lightPods.forEach(({ mesh, index }) => {
            const on = (index % 2 === 0) === fast;
            mesh.material.emissiveIntensity = on ? 1 : 0.08;
        });
    }
}