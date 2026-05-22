/**
 * CityVehicles.js
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

// ── SHARED MATERIAL CACHE — created once, reused across all vehicles ──────────
// Using a lazy singleton pattern keyed by THREE reference.
let _THREE_ref = null;
let _mats = null;
function getSharedMats(THREE) {
    if (_mats && _THREE_ref === THREE) return _mats;
    _THREE_ref = THREE;
    _mats = {
        tire: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.90, metalness: 0.04 }),
        rim: new THREE.MeshStandardMaterial({ color: 0xc0c2d0, roughness: 0.18, metalness: 0.88 }),
        hub: new THREE.MeshStandardMaterial({ color: 0xd8d8e8, roughness: 0.14, metalness: 0.92 }),
        hlLens: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color(1, 1, 0.85), emissiveIntensity: 1.1, roughness: 0.08, transparent: true, opacity: 0.92 }),
        hlHouse: new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.45, metalness: 0.55 }),
        drl: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color(0.9, 0.9, 0.8), emissiveIntensity: 0.75, roughness: 0.12 }),
        tlLens: new THREE.MeshStandardMaterial({ color: 0xff1100, emissive: new THREE.Color(0.85, 0.04, 0), emissiveIntensity: 1.0, roughness: 0.10, transparent: true, opacity: 0.90 }),
        tlHouse: new THREE.MeshStandardMaterial({ color: 0x1a0000, roughness: 0.50, metalness: 0.45 }),
        tlStrip: new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: new THREE.Color(0.7, 0.02, 0), emissiveIntensity: 0.85, roughness: 0.12 }),
        chr: new THREE.MeshStandardMaterial({ color: 0xb2bac8, roughness: 0.14, metalness: 0.90 }),
        blk: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.88, metalness: 0.05 }),
        glass: new THREE.MeshStandardMaterial({ color: 0x1e2d44, transparent: true, opacity: 0.66, roughness: 0.06, metalness: 0.12 }),
        plate: new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.60, metalness: 0.10 }),
        underbody: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95, metalness: 0.04 }),
    };
    return _mats;
}

// Shared low-poly geometries — created once
let _geoTire = null, _geoRim = null, _geoHub = null;
let _geoHlLens = null, _geoHlHouse = null, _geoDRL = null;
let _geoTlLens = null, _geoTlHouse = null, _geoTlStrip = null;
function getSharedGeos(THREE) {
    if (!_geoTire) {
        _geoTire = new THREE.CylinderGeometry(0.40, 0.40, 0.30, 16); // 16 segs — smooth enough
        _geoRim = new THREE.CylinderGeometry(0.32, 0.32, 0.07, 12);
        _geoHub = new THREE.CylinderGeometry(0.08, 0.08, 0.09, 8);
        _geoHlLens = new THREE.CylinderGeometry(0.14, 0.14, 0.06, 10);
        _geoHlHouse = new THREE.CylinderGeometry(0.18, 0.18, 0.07, 10);
        _geoDRL = new THREE.BoxGeometry(0.34, 0.045, 0.04);
        _geoTlLens = new THREE.CylinderGeometry(0.13, 0.13, 0.06, 10);
        _geoTlHouse = new THREE.CylinderGeometry(0.16, 0.16, 0.07, 10);
        _geoTlStrip = new THREE.BoxGeometry(0.30, 0.04, 0.04);
    }
    return true;
}

function addWheel(group, THREE, x, z) {
    getSharedGeos(THREE);
    const m = getSharedMats(THREE);
    const outX = x > 0 ? x + 0.12 : x - 0.12;

    // Tire
    const tire = new THREE.Mesh(_geoTire, m.tire);
    tire.rotation.z = Math.PI / 2;
    tire.position.set(x, 0.32, z);
    tire.castShadow = true;
    group.add(tire);

    // Alloy rim
    const rim = new THREE.Mesh(_geoRim, m.rim);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(outX, 0.32, z);
    group.add(rim);

    // Hub cap
    const hub = new THREE.Mesh(_geoHub, m.hub);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(outX, 0.32, z);
    group.add(hub);
}

function addHeadlights(group, THREE, zPos) {
    getSharedGeos(THREE);
    const m = getSharedMats(THREE);
    [-0.54, 0.54].forEach(x => {
        const housing = new THREE.Mesh(_geoHlHouse, m.hlHouse);
        housing.rotation.x = Math.PI / 2;
        housing.position.set(x, 0.64, zPos + 0.01);
        group.add(housing);

        const lens = new THREE.Mesh(_geoHlLens, m.hlLens);
        lens.rotation.x = Math.PI / 2;
        lens.position.set(x, 0.64, zPos);
        group.add(lens);

        const drl = new THREE.Mesh(_geoDRL, m.drl);
        drl.position.set(x, 0.49, zPos);
        group.add(drl);
    });
}

function addTaillights(group, THREE, zPos) {
    getSharedGeos(THREE);
    const m = getSharedMats(THREE);
    [-0.60, 0.60].forEach(x => {
        const housing = new THREE.Mesh(_geoTlHouse, m.tlHouse);
        housing.rotation.x = Math.PI / 2;
        housing.position.set(x, 0.64, zPos - 0.01);
        group.add(housing);

        const lens = new THREE.Mesh(_geoTlLens, m.tlLens);
        lens.rotation.x = Math.PI / 2;
        lens.position.set(x, 0.64, zPos);
        group.add(lens);

        const strip = new THREE.Mesh(_geoTlStrip, m.tlStrip);
        strip.position.set(x, 0.51, zPos);
        group.add(strip);
    });
}

// ── SEDAN ─────────────────────────────────────────────────────────────────────
export function buildSedan(scene, THREE, color) {
    const group = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color, roughness: 0.25, metalness: 0.72 });
    const dark = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0, 0, 0), 0.5), roughness: 0.35, metalness: 0.55 });
    const { chr, blk, glass, plate } = getSharedMats(THREE);

    // Main body — slightly wider, rounded-feel proportions
    addBox(group, THREE, 2.12, 0.55, 4.25, body, 0, 0.54, 0);
    // Cabin — wider greenhouse, taller for comfort feel
    addBox(group, THREE, 1.84, 0.52, 2.2, body, 0, 1.0, -0.06);
    // Roof (dark gloss contrast panel)
    addBox(group, THREE, 1.78, 0.08, 2.05, dark, 0, 1.27, -0.06);
    // Hood — smooth slope with slight wedge
    addBox(group, THREE, 2.0, 0.16, 1.05, body, 0, 0.74, -1.66, 0.20, 0, 0);
    // Secondary hood taper (double-slope for smoothness)
    addBox(group, THREE, 1.96, 0.10, 0.55, dark, 0, 0.66, -2.12, 0.32, 0, 0);
    // Boot slope
    addBox(group, THREE, 1.96, 0.15, 0.75, body, 0, 0.74, 1.73, -0.17, 0, 0);
    // Boot taper
    addBox(group, THREE, 1.92, 0.10, 0.4, dark, 0, 0.66, 2.10, -0.28, 0, 0);
    // Front bumper — integrated smooth look
    addBox(group, THREE, 2.1, 0.20, 0.20, dark, 0, 0.28, -2.14);
    addBox(group, THREE, 1.8, 0.07, 0.16, chr, 0, 0.19, -2.14); // chrome lower lip
    // Rear bumper
    addBox(group, THREE, 2.1, 0.20, 0.20, dark, 0, 0.28, 2.14);
    addBox(group, THREE, 1.8, 0.07, 0.16, chr, 0, 0.19, 2.14);
    // Side sills (rocker panels)
    [-1.08, 1.08].forEach(x => {
        addBox(group, THREE, 0.08, 0.09, 3.9, dark, x, 0.16, 0);
        addBox(group, THREE, 0.06, 0.04, 3.85, chr, x, 0.10, 0); // chrome trim strip
    });
    // Shoulder crease line (thin raised strip for modern sculpt feel)
    [-1.06, 1.06].forEach(x => addBox(group, THREE, 0.04, 0.04, 3.6, chr, x, 0.70, 0));
    // Hood vent accent
    addBox(group, THREE, 1.4, 0.03, 0.10, chr, 0, 0.77, -1.85);

    // Windscreen — more raked
    addBox(group, THREE, 1.74, 0.50, 0.07, glass, 0, 1.0, -1.22, -0.30, 0, 0);
    // Rear screen
    addBox(group, THREE, 1.72, 0.42, 0.07, glass, 0, 0.99, 1.02, 0.28, 0, 0);
    // Side windows
    [-0.93, 0.93].forEach(x => addBox(group, THREE, 0.06, 0.38, 1.82, glass, x, 1.0, -0.06));
    // Quarter window (rear triangular accent)
    [-0.93, 0.93].forEach(x => addBox(group, THREE, 0.06, 0.24, 0.40, glass, x, 0.96, 0.98));

    // Wheels
    [[1.12, -1.44], [-1.12, -1.44], [1.12, 1.34], [-1.12, 1.34]].forEach(([x, z]) =>
        addWheel(group, THREE, x, z, blk, chr)
    );

    // Lights
    addHeadlights(group, THREE, -2.16);
    addTaillights(group, THREE, 2.16);

    // Headlight spot
    const spot = new THREE.SpotLight(0xfff4e0, 2.8, 48, Math.PI / 7, 0.65);
    spot.position.set(0, 0.80, -2.12);
    spot.target.position.set(0, 0, -24);
    group.add(spot);
    group.add(spot.target);

    // Licence plate
    addBox(group, THREE, 1.1, 0.26, 0.05, plate, 0, 0.34, -2.18);

    // Door handles (chrome)
    [-0.92, 0.92].forEach(x => {
        addBox(group, THREE, 0.04, 0.045, 0.22, chr, x, 0.80, -0.35);
        addBox(group, THREE, 0.04, 0.045, 0.22, chr, x, 0.80, 0.55);
    });

    // Exhaust tips
    [-0.30, 0.30].forEach(x => addCyl(group, THREE, 0.055, 0.055, 0.08, 10, chr, x, 0.22, 2.17, Math.PI / 2, 0, 0));

    scene.add(group);
    return group;
}

// ── SUV ───────────────────────────────────────────────────────────────────────
export function buildSUV(scene, THREE, color) {
    const group = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.65 });
    const dark = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0, 0, 0), 0.45), roughness: 0.40, metalness: 0.50 });
    const { chr, blk, glass, underbody } = getSharedMats(THREE);

    // Tall, muscular body
    addBox(group, THREE, 2.32, 0.65, 4.65, body, 0, 0.57, 0);
    // Cabin — squared-off greenhouse, full width
    addBox(group, THREE, 2.26, 0.72, 2.96, body, 0, 1.14, 0.14);
    // Roof panel
    addBox(group, THREE, 2.18, 0.07, 2.78, dark, 0, 1.54, 0.14);
    // Roof rack (satin black)
    addBox(group, THREE, 2.04, 0.055, 2.55, blk, 0, 1.60, 0.14);
    // Roof rack cross bars
    [-0.75, 0, 0.72].forEach(z =>
        addBox(group, THREE, 2.0, 0.055, 0.07, chr, 0, 1.64, z + 0.14)
    );
    // Front fascia — dual-layer bumper
    addBox(group, THREE, 2.34, 0.32, 0.24, dark, 0, 0.33, -2.38);
    addBox(group, THREE, 2.32, 0.10, 0.20, chr, 0, 0.52, -2.38); // chrome skid guard
    // Lower skid plate
    addBox(group, THREE, 2.0, 0.14, 0.28, underbody, 0, 0.16, -2.36);
    // Rear bumper
    addBox(group, THREE, 2.34, 0.30, 0.22, dark, 0, 0.33, 2.38);
    addBox(group, THREE, 1.6, 0.09, 0.18, chr, 0, 0.18, 2.38);
    // Side cladding (body-colour lower, dark matte upper strip)
    [-1.18, 1.18].forEach(x => {
        addBox(group, THREE, 0.08, 0.26, 4.6, dark, x, 0.28, 0);  // cladding
        addBox(group, THREE, 0.06, 0.07, 4.6, chr, x, 0.48, 0);   // chrome strip
    });
    // Body crease (character line)
    [-1.16, 1.16].forEach(x => addBox(group, THREE, 0.04, 0.04, 4.0, chr, x, 0.82, 0));
    // Hood — slight raised centre power bulge
    addBox(group, THREE, 0.65, 0.055, 2.0, dark, 0, 0.92, -0.7); // centre power bulge
    // Front wheel arch flares
    [-1.18, 1.18].forEach(x => addBox(group, THREE, 0.12, 0.18, 1.15, dark, x, 0.48, -1.60));
    // Rear wheel arch flares
    [-1.18, 1.18].forEach(x => addBox(group, THREE, 0.12, 0.18, 1.15, dark, x, 0.48, 1.50));

    // Windscreen — slightly raked
    addBox(group, THREE, 2.16, 0.64, 0.07, glass, 0, 1.14, -1.54, -0.20, 0, 0);
    // Rear screen
    addBox(group, THREE, 2.16, 0.62, 0.07, glass, 0, 1.14, 1.54, 0.20, 0, 0);
    // Side windows
    [-1.14, 1.14].forEach(x => addBox(group, THREE, 0.06, 0.54, 2.74, glass, x, 1.16, 0.14));
    // Rear quarter windows
    [-1.14, 1.14].forEach(x => addBox(group, THREE, 0.06, 0.38, 0.55, glass, x, 1.1, 1.75));

    // Big SUV wheels (slightly larger)
    [[1.20, -1.58], [-1.20, -1.58], [1.20, 1.48], [-1.20, 1.48]].forEach(([x, z]) =>
        addWheel(group, THREE, x, z, blk, chr)
    );

    addHeadlights(group, THREE, -2.42);
    addTaillights(group, THREE, 2.42);

    // Rear exhaust pipes
    [-0.38, 0.38].forEach(x => addCyl(group, THREE, 0.065, 0.065, 0.10, 10, chr, x, 0.26, 2.42, Math.PI / 2, 0, 0));

    // Mirror housings
    [-1.18, 1.18].forEach(x => {
        addBox(group, THREE, 0.32, 0.04, 0.04, chr, x + (x > 0 ? 0.14 : -0.14), 1.42, -1.92, 0, 0, Math.PI / 2);
        addBox(group, THREE, 0.20, 0.26, 0.10, dark, x + (x > 0 ? 0.30 : -0.30), 1.30, -1.92);
    });

    scene.add(group);
    return group;
}

// ── SPORTS CAR ────────────────────────────────────────────────────────────────
export function buildSportsCar(scene, THREE, color) {
    const group = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color, roughness: 0.18, metalness: 0.80 });
    const dark = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0, 0, 0), 0.55), roughness: 0.30, metalness: 0.60 });
    const { chr, blk, glass } = getSharedMats(THREE);

    // Very low, wide body with double-layer for depth
    addBox(group, THREE, 2.22, 0.40, 4.45, body, 0, 0.38, 0);
    // Low-slung cabin with raked greenhouse
    addBox(group, THREE, 1.86, 0.40, 1.80, body, 0, 0.72, -0.12);
    // Fastback roof — dark contrast
    addBox(group, THREE, 1.80, 0.06, 1.65, dark, 0, 0.93, -0.12);
    // Long hood with power bulge
    addBox(group, THREE, 2.12, 0.13, 1.55, body, 0, 0.52, -1.72, 0.09, 0, 0);
    addBox(group, THREE, 0.58, 0.06, 1.40, dark, 0, 0.54, -1.68); // power bulge
    // Hood tip taper
    addBox(group, THREE, 2.08, 0.10, 0.40, dark, 0, 0.44, -2.18, 0.22, 0, 0);
    // Air intake vents (wider, more aggressive)
    [-0.62, 0.62].forEach(x => {
        addBox(group, THREE, 0.32, 0.09, 0.45, blk, x, 0.41, -1.92);
        addCyl(group, THREE, 0.055, 0.055, 0.30, 8, chr, x, 0.37, -1.94, Math.PI / 2, 0, 0); // vent grille bar
    });
    // Rear diffuser (aggressive angled)
    addBox(group, THREE, 2.20, 0.16, 0.35, dark, 0, 0.22, 2.22, 0.30, 0, 0);
    // Rear spoiler blade
    addBox(group, THREE, 1.94, 0.09, 0.42, dark, 0, 0.68, 2.12);
    // Spoiler end plates
    [-0.95, 0.95].forEach(x => addBox(group, THREE, 0.06, 0.18, 0.40, dark, x, 0.65, 2.12));
    // Spoiler mounts
    addCyl(group, THREE, 0.05, 0.05, 0.34, 6, chr, -0.86, 0.54, 2.12, 0, 0, Math.PI / 2);
    addCyl(group, THREE, 0.05, 0.05, 0.34, 6, chr, 0.86, 0.54, 2.12, 0, 0, Math.PI / 2);
    // Side skirts (flush, low)
    [-1.13, 1.13].forEach(x => {
        addBox(group, THREE, 0.07, 0.10, 4.35, dark, x, 0.12, 0);
        addBox(group, THREE, 0.05, 0.04, 4.3, chr, x, 0.07, 0); // chrome underline
    });
    // Exhaust pipes (quad)
    [-0.5, -0.22, 0.22, 0.5].forEach(x => addCyl(group, THREE, 0.058, 0.058, 0.12, 10, chr, x, 0.22, 2.26, Math.PI / 2, 0, 0));
    // Front splitter
    addBox(group, THREE, 2.18, 0.05, 0.28, blk, 0, 0.12, -2.18);

    // Windscreen (very slanted, raked)
    addBox(group, THREE, 1.82, 0.44, 0.07, glass, 0, 0.80, -1.08, -0.50, 0, 0);
    // Rear fastback screen
    addBox(group, THREE, 1.80, 0.36, 0.07, glass, 0, 0.76, 0.90, 0.40, 0, 0);
    // Side windows (slim, sporty)
    [-0.94, 0.94].forEach(x => addBox(group, THREE, 0.05, 0.32, 1.62, glass, x, 0.74, -0.18));

    // Low-profile wide wheels
    [[1.14, -1.46], [-1.14, -1.46], [1.14, 1.36], [-1.14, 1.36]].forEach(([x, z]) =>
        addWheel(group, THREE, x, z, blk, chr)
    );

    addHeadlights(group, THREE, -2.24);
    addTaillights(group, THREE, 2.24);

    scene.add(group);
    return group;
}

// ── BUS ───────────────────────────────────────────────────────────────────────
export function buildBus(scene, THREE, color) {
    const group = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.55 });
    const dark = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0, 0, 0), 0.40), roughness: 0.42, metalness: 0.45 });
    const white = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.50, metalness: 0.08 });
    const { chr, blk, glass } = getSharedMats(THREE);

    // Main chassis — long and tall with slight taper
    addBox(group, THREE, 2.62, 1.58, 8.85, body, 0, 1.06, 0);
    // Roof — with slight overhang detail
    addBox(group, THREE, 2.58, 0.09, 8.75, dark, 0, 1.88, 0);
    // Roof AC unit
    addBox(group, THREE, 1.2, 0.20, 1.4, blk, 0, 2.0, 0.5);
    addBox(group, THREE, 1.1, 0.08, 1.3, chr, 0, 2.02, 0.5); // AC grille
    // Front face — rounded impression
    addBox(group, THREE, 2.62, 1.58, 0.14, dark, 0, 1.06, -4.48);
    // Rear face
    addBox(group, THREE, 2.62, 1.58, 0.14, dark, 0, 1.06, 4.48);
    // Front bumper (integrated lower)
    addBox(group, THREE, 2.64, 0.28, 0.24, chr, 0, 0.26, -4.54);
    // Rear bumper
    addBox(group, THREE, 2.64, 0.28, 0.24, chr, 0, 0.26, 4.54);
    // Side stripe (bright accent band)
    addBox(group, THREE, 2.64, 0.24, 8.75, white, 0, 1.54, 0);
    // Lower dark skirt
    [-1.33, 1.33].forEach(x => {
        addBox(group, THREE, 0.08, 0.30, 8.8, dark, x, 0.30, 0);
        addBox(group, THREE, 0.06, 0.06, 8.75, chr, x, 0.48, 0); // chrome strip
    });
    // Wheel arch covers
    [[1.33, -3.1], [-1.33, -3.1], [1.33, 2.8], [-1.33, 2.8]].forEach(([x, z]) =>
        addBox(group, THREE, 0.14, 0.54, 1.15, dark, x, 0.40, z)
    );

    // Windows — many along both sides with chrome frames
    const winY = 1.28;
    for (let i = 0; i < 5; i++) {
        const wz = -3.0 + i * 1.35;
        [-1.32, 1.32].forEach(x => {
            const win = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.56, 0.98), glass);
            win.position.set(x, winY, wz);
            group.add(win);
            // Chrome window frame
            const frame = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.62, 1.04), chr);
            frame.position.set(x, winY, wz);
            group.add(frame);
            win.position.x += x > 0 ? 0.01 : -0.01; // push glass forward of frame
        });
    }
    // Front windscreen
    addBox(group, THREE, 2.32, 0.82, 0.07, glass, 0, 1.40, -4.50, -0.09, 0, 0);
    // Rear window
    addBox(group, THREE, 2.32, 0.62, 0.07, glass, 0, 1.40, 4.50, 0.09, 0, 0);

    // Door (right side)
    addBox(group, THREE, 0.08, 1.12, 1.04, dark, -1.32, 0.82, -1.6);
    addBox(group, THREE, 0.06, 0.06, 0.82, chr, -1.35, 1.36, -1.6); // door handle

    // Destination display box above windscreen
    addBox(group, THREE, 2.24, 0.30, 0.10, blk, 0, 1.77, -4.49);
    const destMat = new THREE.MeshStandardMaterial({ color: 0xff8800, emissive: new THREE.Color(0.5, 0.22, 0), emissiveIntensity: 1.2, roughness: 0.1 });
    addBox(group, THREE, 2.04, 0.20, 0.07, destMat, 0, 1.77, -4.52);

    // Headlights — twin round LED
    getSharedGeos(THREE);
    [[0.72, -4.54], [-0.72, -4.54]].forEach(([x, z]) => {
        const hl = new THREE.Mesh(_geoHlLens, getSharedMats(THREE).hlLens);
        hl.rotation.x = Math.PI / 2;
        hl.position.set(x, 0.64, z);
        group.add(hl);
    });
    // Tail lights
    [[0.82, 4.54], [-0.82, 4.54]].forEach(([x, z]) => {
        const tl = new THREE.Mesh(_geoTlLens, getSharedMats(THREE).tlLens);
        tl.rotation.x = Math.PI / 2;
        tl.position.set(x, 0.64, z);
        group.add(tl);
    });

    // Six wheels
    [[1.32, -3.1], [-1.32, -3.1], [1.32, -1.6], [-1.32, -1.6], [1.32, 2.8], [-1.32, 2.8]].forEach(([x, z]) =>
        addWheel(group, THREE, x, z, blk, chr)
    );

    // Mirror arms
    [-1.36, 1.36].forEach(x => {
        addBox(group, THREE, 0.36, 0.05, 0.05, chr, x + (x > 0 ? 0.17 : -0.17), 1.72, -3.82, 0, 0, Math.PI / 2);
        addBox(group, THREE, 0.24, 0.28, 0.09, dark, x + (x > 0 ? 0.35 : -0.35), 1.62, -3.82);
    });

    scene.add(group);
    return group;
}

// ── SCHOOL BUS ────────────────────────────────────────────────────────────────
export function buildSchoolBus(scene, THREE) {
    const group = new THREE.Group();
    const yellow = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.28, metalness: 0.45 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.55, metalness: 0.30 });
    const red = new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.30, metalness: 0.40 });
    const { chr, blk: black, glass } = getSharedMats(THREE);

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
    const textMat = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: new THREE.Color(0.35, 0.12, 0), emissiveIntensity: 1.0, roughness: 0.15 });
    addBox(group, THREE, 2.0, 0.18, 0.06, textMat, 0, 1.7, -5.38);

    // Stop sign arm (right side, retracted)
    addBox(group, THREE, 0.06, 0.55, 0.55, red, 1.3, 1.2, -1.0);

    // Headlights — round LED
    getSharedGeos(THREE);
    [[0.6, -5.40], [-0.6, -5.40]].forEach(([x, z]) => {
        const hl = new THREE.Mesh(_geoHlLens, getSharedMats(THREE).hlLens);
        hl.rotation.x = Math.PI / 2;
        hl.position.set(x, 0.60, z);
        group.add(hl);
    });
    addTaillights(group, THREE, 4.5);

    // Warning lights on roof (rounded pill shape)
    [-0.5, 0.5].forEach(x => {
        const warnMat = new THREE.MeshStandardMaterial({ color: 0xff2200, emissive: new THREE.Color(0.6, 0, 0), emissiveIntensity: 1.1, roughness: 0.12 });
        addCyl(group, THREE, 0.12, 0.12, 0.22, 10, warnMat, x, 1.94, -4.2, 0, 0, Math.PI / 2);
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
    const white = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.22, metalness: 0.35 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1a1a2a, roughness: 0.55, metalness: 0.25 });
    const lime = new THREE.MeshStandardMaterial({ color: 0xaadd00, roughness: 0.32, metalness: 0.12, emissive: new THREE.Color(0.15, 0.28, 0), emissiveIntensity: 0.4 });
    const { chr, blk, glass } = getSharedMats(THREE);

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
    const redMat = new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.32, metalness: 0.20 });
    addBox(group, THREE, 2.47, 0.12, 5.82, redMat, 0, 0.88, 0);

    // Cross symbol on rear
    const crossMat = new THREE.MeshStandardMaterial({ color: 0xdd0000, emissive: new THREE.Color(0.4, 0, 0), emissiveIntensity: 0.9, roughness: 0.15 });
    addBox(group, THREE, 0.58, 0.15, 0.07, crossMat, 0, 1.1, 3.0);
    addBox(group, THREE, 0.15, 0.58, 0.07, crossMat, 0, 1.1, 3.0);

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
        const podMat = new THREE.MeshStandardMaterial({
            color: col,
            emissive: new THREE.Color(col).multiplyScalar(0.7),
            emissiveIntensity: 0.9,
            roughness: 0.10,
            metalness: 0.05,
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
    const yellow = new THREE.MeshStandardMaterial({ color: 0xffc107, roughness: 0.22, metalness: 0.55 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x111122, roughness: 0.50, metalness: 0.30 });
    const { chr, blk, glass } = getSharedMats(THREE);

    // Sedan base
    addBox(group, THREE, 2.08, 0.5, 4.15, yellow, 0, 0.5, 0);
    addBox(group, THREE, 1.75, 0.46, 2.1, yellow, 0, 0.94, -0.1);
    addBox(group, THREE, 1.7, 0.08, 1.95, dark, 0, 1.2, -0.1);
    addBox(group, THREE, 1.92, 0.16, 0.95, yellow, 0, 0.7, -1.6, 0.2, 0, 0);
    addBox(group, THREE, 2.05, 0.2, 0.16, dark, 0, 0.29, -2.1);
    addBox(group, THREE, 2.05, 0.2, 0.16, dark, 0, 0.29, 2.1);

    // Black checker stripe along middle
    const checkMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.55, metalness: 0.10 });
    addBox(group, THREE, 2.1, 0.18, 4.17, checkMat, 0, 0.66, 0);
    // Yellow stripe on top of checker
    addBox(group, THREE, 0.5, 0.20, 4.17, yellow, 0, 0.66, 0);
    // Chrome door trim
    [-0.90, 0.90].forEach(x => addBox(group, THREE, 0.04, 0.04, 3.95, chr, x, 0.56, 0));

    // Taxi sign on roof
    const signBase = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.24, 0.34), dark);
    signBase.position.set(0, 1.31, -0.1);
    group.add(signBase);
    const signMat = new THREE.MeshStandardMaterial({ color: 0xffee44, emissive: new THREE.Color(0.55, 0.50, 0), emissiveIntensity: 1.1, roughness: 0.10 });
    addBox(group, THREE, 0.62, 0.16, 0.10, signMat, 0, 1.31, -0.1);

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
    const white = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.24, metalness: 0.40 });
    const dark = new THREE.MeshStandardMaterial({ color: new THREE.Color(0xeeeeee).lerp(new THREE.Color(0, 0, 0), 0.52), roughness: 0.38, metalness: 0.42 });
    const { chr, blk, glass } = getSharedMats(THREE);

    // Sedan shape
    addBox(group, THREE, 2.12, 0.52, 4.25, white, 0, 0.52, 0);
    addBox(group, THREE, 1.8, 0.48, 2.15, white, 0, 0.98, -0.08);
    addBox(group, THREE, 1.74, 0.09, 2.0, dark, 0, 1.23, -0.08);
    addBox(group, THREE, 1.96, 0.18, 1.0, white, 0, 0.72, -1.66, 0.22, 0, 0);
    addBox(group, THREE, 2.1, 0.22, 0.17, dark, 0, 0.3, -2.15);
    addBox(group, THREE, 2.1, 0.22, 0.17, dark, 0, 0.3, 2.15);

    // Black & white police graphic
    const policeDark = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.55, metalness: 0.20 });
    addBox(group, THREE, 2.14, 0.4, 2.2, policeDark, 0, 0.42, 0.5); // rear dark
    addBox(group, THREE, 2.14, 0.4, 1.8, white, 0, 0.42, -1.0);    // front white

    // "POLICE" door badge
    const badgeMat = new THREE.MeshStandardMaterial({ color: 0x2244cc, emissive: new THREE.Color(0.06, 0.12, 0.4), emissiveIntensity: 0.7, roughness: 0.22, metalness: 0.30 });
    [-1.08, 1.08].forEach(x => addBox(group, THREE, 0.06, 0.24, 0.74, badgeMat, x, 0.66, -0.1));

    // ── LIGHTBAR ──────────────────────────────────────────────────────────────
    const lbBase = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.10, 0.58), chr);
    lbBase.position.set(0, 1.36, -0.1);
    group.add(lbBase);
    const redPod = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: new THREE.Color(0.8, 0, 0), emissiveIntensity: 0.9, roughness: 0.10 });
    const bluePod = new THREE.MeshStandardMaterial({ color: 0x0044ff, emissive: new THREE.Color(0, 0.12, 0.9), emissiveIntensity: 0.9, roughness: 0.10 });
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
    const body = new THREE.MeshStandardMaterial({ color, roughness: 0.30, metalness: 0.60 });
    const dark = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0, 0, 0), 0.45), roughness: 0.42, metalness: 0.48 });
    const white = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.48, metalness: 0.10 });
    const { chr, blk, glass } = getSharedMats(THREE);

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
    const logoMat = new THREE.MeshStandardMaterial({ color: 0xcc4400, emissive: new THREE.Color(0.25, 0.06, 0), emissiveIntensity: 0.7, roughness: 0.20 });
    addBox(group, THREE, 1.82, 0.52, 0.07, logoMat, 0, 1.55, 3.18);

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