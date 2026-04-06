/**
 * CitySimulation.jsx — GitCity v14 (fixed)
 * FIXES:
 * - Lamp posts, benches, kiosks placed firmly on footpath (never on road)
 * - Traffic signals placed at footpath corners (not road center)
 * - Street signs, distance boards on footpath side only
 * - Parked vehicles spaced so they don't overlap each other
 * - Pedestrian speed reduced
 * - Traffic lane offsets fixed to prevent vehicle overlap
 */

import { useEffect, useRef, useState, useMemo } from "react";
import { createWeatherSystem } from "./WeatherSystem";
import { createPedestrianSystem, addTree } from "./PedestrianSystem";
import { createTrafficSystem } from "./CityTraffic";
import { buildVehicle, updateVehicleLights } from "./CityVehicles";
import { addTrafficSignal, addStreetSign, addDistanceBoard, addBillboard } from "./CitySignage";
import { decoratePlaza, addBench, addKiosk, addGarden } from "./CityAssets";

const CELL = 7, ROAD = 9, WEEKS = 4;

function hex3(h, T) {
    return new T.Color(
        parseInt(h.slice(1, 3), 16) / 255,
        parseInt(h.slice(3, 5), 16) / 255,
        parseInt(h.slice(5, 7), 16) / 255
    );
}

function rng(seed) {
    let s = ((seed % 2147483647) + 2147483647) % 2147483647 || 1;
    return () => {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

function groupDistricts(cells) {
    const byWeek = {};
    cells.forEach((c) => { (byWeek[c.week] ??= []).push(c); });
    const weeks = Object.keys(byWeek).map(Number).sort((a, b) => a - b);
    const dists = [];
    for (let i = 0; i < weeks.length; i += WEEKS) {
        const dw = weeks.slice(i, i + WEEKS), dc = dw.flatMap((w) => byWeek[w]);
        const total = dc.reduce((s, c) => s + c.count, 0);
        const date = dc[0]?.date;
        const label = date
            ? new Date(date).toLocaleString("default", { month: "short", year: "2-digit" })
            : `W${i}`;
        dists.push({ index: dists.length, weeks: dw, cells: dc, total, peak: Math.max(...dc.map((c) => c.count), 0), label });
    }
    return dists;
}

function buildRoadSegs(cols, rows, ox, oz, BW, BD) {
    const segs = [];
    function add(x1, z1, x2, z2) {
        const dx = x2 - x1, dz = z2 - z1, len = Math.sqrt(dx * dx + dz * dz);
        if (len < 1) return;
        segs.push({ x1, z1, x2, z2, dx: dx / len, dz: dz / len, len, angle: Math.atan2(dx, dz) });
    }
    for (let r = 0; r <= rows; r++) {
        const rz = oz + r * (BD + ROAD) + ROAD / 2;
        add(ox - ROAD, rz, ox + cols * (BW + ROAD) + ROAD, rz);
    }
    for (let c = 0; c <= cols; c++) {
        const rx = ox + c * (BW + ROAD) + ROAD / 2;
        add(rx, oz - ROAD, rx, oz + rows * (BD + ROAD) + ROAD);
    }
    return segs;
}

function snapRoad(x, z, segs) {
    let best = null, bd = Infinity;
    for (const s of segs) {
        const ex = x - s.x1, ez = z - s.z1;
        let t = (ex * s.dx + ez * s.dz) / s.len;
        t = Math.max(0, Math.min(1, t));
        const px = s.x1 + s.dx * s.len * t, pz = s.z1 + s.dz * s.len * t;
        const d = Math.sqrt((x - px) ** 2 + (z - pz) ** 2);
        if (d < bd) { bd = d; best = { px, pz, angle: s.angle, dist: d, seg: s }; }
    }
    if (!best) return { x, z, angle: 0, dist: 999 };
    return {
        x: best.px - best.seg.dz * 2,
        z: best.pz + best.seg.dx * 2,
        angle: best.seg.angle,
        dist: best.dist,
    };
}

// ── AABB collision helper ─────────────────────────────────────────────────────
function aabbPushOut(mover, obstacle) {
    const dx = mover.x - obstacle.x;
    const dz = mover.z - obstacle.z;
    const ox = (mover.hw + obstacle.hw) - Math.abs(dx);
    const oz = (mover.hd + obstacle.hd) - Math.abs(dz);
    if (ox <= 0 || oz <= 0) return null;
    if (ox < oz) return { px: Math.sign(dx) * ox, pz: 0 };
    return { px: 0, pz: Math.sign(dz) * oz };
}

// ── WEATHER MODES ─────────────────────────────────────────────────────────────
const WEATHER_MODES = [
    { key: "clear", label: "☀ Clear" },
    { key: "storm", label: "⛈ Storm" },
    { key: "spring", label: "🍂 Leaves" },
    { key: "snow", label: "❄ Snow" },
];

export function CitySimulation({ cells, stats, theme, profile }) {
    const mountRef = useRef(null);
    const keysRef = useRef({});
    const mouseRef = useRef({ down: false, lx: 0, ly: 0, ox: 0, oy: 0.3, zoom: 1, orbit: false });
    const hoverRef = useRef({ nx: 0, ny: 0 });
    const frameRef = useRef(null);
    const nightRef = useRef(true);
    const weatherRef = useRef(null);
    const trafficRef = useRef(null);
    const audioRef = useRef(null);
    const playerCarRef = useRef(null);

    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(null);
    const [night, setNight] = useState(true);
    const [weatherMode, setWeatherMode] = useState("clear");
    const [card, setCard] = useState(null);
    const [kmh, setKmh] = useState(0);
    const [loc, setLoc] = useState("GitCity");
    const [mm, setMm] = useState({ cx: 0, cz: 0, sc: 0.4, blocks: [] });
    const [showHelp, setShowHelp] = useState(false);
    const [welcome, setWelcome] = useState(true);
    const [musicOn, setMusicOn] = useState(false);

    const districts = useMemo(() => groupDistricts(cells), [cells]);
    const maxTotal = useMemo(() => Math.max(...districts.map((d) => d.total), 1), [districts]);
    const username = profile?.name || "";

    // ── Load Three.js ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (window.THREE) { setLoaded(true); return; }
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
        s.onload = () => setLoaded(true);
        s.onerror = () => setError("Failed to load Three.js");
        document.head.appendChild(s);
    }, []);

    useEffect(() => {
        if (!loaded) return;
        const t = setTimeout(() => setWelcome(false), 4000);
        return () => clearTimeout(t);
    }, [loaded]);

    // ── Music ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        const audio = new Audio("/music.mp3");
        audio.loop = true; audio.volume = 0.35;
        audioRef.current = audio;
        return () => { audio.pause(); audio.src = ""; };
    }, []);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (musicOn) audio.play().catch(() => { });
        else audio.pause();
    }, [musicOn]);

    useEffect(() => { nightRef.current = night; }, [night]);
    useEffect(() => { if (weatherRef.current) weatherRef.current.setMode(weatherMode); }, [weatherMode]);

    // ── MAIN THREE.JS EFFECT ──────────────────────────────────────────────────
    useEffect(() => {
        if (!loaded || !mountRef.current || !cells.length) return;
        const THREE = window.THREE;
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
        try {
            if (mountRef.current.firstChild?.tagName === "CANVAS")
                mountRef.current.removeChild(mountRef.current.firstChild);
        } catch (e) { }

        const W = mountRef.current.clientWidth || 900;
        const H = mountRef.current.clientHeight || 520;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(W, H);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.6;
        mountRef.current.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x05091c);
        scene.fog = new THREE.FogExp2(0x05091c, 0.0016);

        const camera = new THREE.PerspectiveCamera(60, W / H, 0.5, 1000);
        camera.position.set(0, 8, 16);
        camera.lookAt(0, 0, 0);

        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambient);
        const sun = new THREE.DirectionalLight(0x2244aa, 0.7);
        sun.position.set(-100, 60, -80);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.left = sun.shadow.camera.bottom = -400;
        sun.shadow.camera.right = sun.shadow.camera.top = 400;
        sun.shadow.camera.far = 900;
        scene.add(sun);
        const hemi = new THREE.HemisphereLight(0x0a1428, 0x080810, 0.25);
        scene.add(hemi);

        // Stars
        const starsGeo = new THREE.BufferGeometry();
        const starPos = new Float32Array(900 * 3);
        for (let i = 0; i < 900; i++) {
            starPos[i * 3] = (Math.random() - 0.5) * 1400;
            starPos[i * 3 + 1] = 60 + Math.random() * 200;
            starPos[i * 3 + 2] = (Math.random() - 0.5) * 1400;
        }
        starsGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
        const stars = new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.45, transparent: true, opacity: 0.88 }));
        scene.add(stars);

        const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 16), new THREE.MeshBasicMaterial({ color: 0xddeeff }));
        moonMesh.position.set(-250, 260, -350);
        scene.add(moonMesh);

        const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(10, 16, 16), new THREE.MeshBasicMaterial({ color: 0xfffce0 }));
        sunDisc.position.set(300, 320, -200);
        sunDisc.visible = false;
        scene.add(sunDisc);

        // Clouds
        const cloudGroup = new THREE.Group();
        scene.add(cloudGroup);
        cloudGroup.visible = false;
        for (let i = 0; i < 10; i++) {
            const cg = new THREE.Group();
            for (let j = 0; j < 4; j++) {
                const cm = new THREE.Mesh(
                    new THREE.SphereGeometry(7 + Math.random() * 5, 8, 8),
                    new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.82 })
                );
                cm.position.set(j * 9 - 13, Math.random() * 4, Math.random() * 4);
                cg.add(cm);
            }
            cg.position.set((Math.random() - 0.5) * 300, 80 + Math.random() * 40, (Math.random() - 0.5) * 300);
            cloudGroup.add(cg);
        }

        const accentCol = hex3(theme.accent, THREE);
        const roadMat = new THREE.MeshLambertMaterial({ color: 0x141420 });
        const markMat = new THREE.MeshLambertMaterial({ color: 0xeeee44 });
        const sidewMat = new THREE.MeshLambertMaterial({ color: 0x1a1a2a });
        const gndMat = new THREE.MeshLambertMaterial({ color: 0x090912 });
        const lampMat = new THREE.MeshLambertMaterial({ color: 0x778899 });
        const pathMat = new THREE.MeshLambertMaterial({ color: 0x252535 });
        const kerbMat = new THREE.MeshLambertMaterial({ color: 0x3a3a52 });

        const gnd = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), gndMat);
        gnd.rotation.x = -Math.PI / 2;
        gnd.receiveShadow = true;
        scene.add(gnd);

        const cols = Math.ceil(Math.sqrt(districts.length));
        const rows = Math.ceil(districts.length / cols);
        const BW = WEEKS * CELL, BD = 7 * CELL;
        const cityW = cols * (BW + ROAD) + ROAD;
        const cityD = rows * (BD + ROAD) + ROAD;
        const ox = -cityW / 2, oz = -cityD / 2;

        cloudGroup.children.forEach((cg) => {
            cg.position.set((Math.random() - 0.5) * cityW * 1.4, 80 + Math.random() * 40, (Math.random() - 0.5) * cityD * 1.4);
        });

        const roadSegs = buildRoadSegs(cols, rows, ox, oz, BW, BD);

        // ── WEATHER SYSTEM ────────────────────────────────────────────────────
        const weather = createWeatherSystem(scene, THREE, cityW, cityD);
        weatherRef.current = weather;
        weather.setMode(weatherMode);

        // ── COLLISION BOXES ───────────────────────────────────────────────────
        const collisionBoxes = [];

        // ── ROAD DRAWING ──────────────────────────────────────────────────────
        function drawRoad(x1, z1, x2, z2, w = ROAD) {
            const dx = x2 - x1, dz = z2 - z1, len = Math.sqrt(dx * dx + dz * dz);
            if (len < 0.5) return;
            const angle = Math.atan2(dx, dz);
            const rm = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, len), roadMat);
            rm.position.set((x1 + x2) / 2, 0.09, (z1 + z2) / 2);
            rm.rotation.y = angle;
            rm.receiveShadow = true;
            scene.add(rm);
            for (let i = 0, n = Math.floor(len / 10); i < n; i++) {
                const t = (i + 0.5) / n;
                const d = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 3.5), markMat);
                d.position.set(x1 + dx * t, 0.15, z1 + dz * t);
                d.rotation.y = angle;
                scene.add(d);
            }
        }

        // ── FOOTPATH DRAWING ──────────────────────────────────────────────────
        // FIX: footpath offset from road CENTRE = ROAD/2 + 1.1  (unchanged)
        // Furniture must be placed at this offset or slightly further OUT
        // away from road (never closer than ROAD/2 + 0.5 to road centre)
        const FOOTPATH_OFFSET = ROAD / 2 + 1.1;   // centre of footpath strip
        const FURNITURE_OFFSET = ROAD / 2 + 1.8;  // slightly further from road edge

        function drawFootpath(x1, z1, x2, z2) {
            const dx = x2 - x1, dz = z2 - z1;
            const len = Math.sqrt(dx * dx + dz * dz);
            if (len < 0.5) return;
            const angle = Math.atan2(dx, dz);
            const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
            const px = -dz / len, pz = dx / len;

            [-1, 1].forEach(side => {
                const fpx = mx + px * FOOTPATH_OFFSET * side;
                const fpz = mz + pz * FOOTPATH_OFFSET * side;

                const path = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.22, len), pathMat);
                path.position.set(fpx, 0.11, fpz);
                path.rotation.y = angle;
                path.receiveShadow = true;
                scene.add(path);

                const kerb = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, len), kerbMat);
                kerb.position.set(fpx - px * 1.15 * side, 0.13, fpz - pz * 1.15 * side);
                kerb.rotation.y = angle;
                scene.add(kerb);

                const tacMat = new THREE.MeshLambertMaterial({ color: 0xddcc88 });
                const tac = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.23, len), tacMat);
                tac.position.set(fpx + px * 0.9 * side, 0.115, fpz + pz * 0.9 * side);
                tac.rotation.y = angle;
                scene.add(tac);
            });
        }

        // Footpath furniture positions along a road segment
        // FIX: use FURNITURE_OFFSET (slightly outside footpath centre, away from road)
        function getFootpathPoints(x1, z1, x2, z2, spacing = 14) {
            const dx = x2 - x1, dz = z2 - z1;
            const len = Math.sqrt(dx * dx + dz * dz);
            if (len < 0.5) return [];
            const nx = -dz / len, nz = dx / len;
            const pts = [];
            const steps = Math.floor(len / spacing);
            for (let i = 1; i < steps; i++) {
                const t = i / steps;
                const bx = x1 + dx * t, bz = z1 + dz * t;
                // Push furniture further out from road (FURNITURE_OFFSET > FOOTPATH_OFFSET)
                pts.push(
                    { x: bx + nx * FURNITURE_OFFSET, z: bz + nz * FURNITURE_OFFSET },
                    { x: bx - nx * FURNITURE_OFFSET, z: bz - nz * FURNITURE_OFFSET }
                );
            }
            return pts;
        }

        const footpathPoints = [];

        // ── LAMP POST ─────────────────────────────────────────────────────────
        // FIX: lamp placed at exact footpath side position, never on road
        function addLamp(x, z) {
            const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 7, 6), lampMat);
            p.position.set(x, 3.5, z);
            scene.add(p);
            const a = new THREE.Mesh(new THREE.BoxGeometry(2, 0.08, 0.08), lampMat);
            a.position.set(x + 1, 7.1, z);
            scene.add(a);
            const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6), new THREE.MeshLambertMaterial({ color: 0xffffcc, emissive: new THREE.Color(0.85, 0.85, 0.15) }));
            b.position.set(x + 2, 7.0, z);
            scene.add(b);
            const pl = new THREE.PointLight(0xffeeaa, 0.8, 18);
            pl.position.set(x + 2, 6.8, z);
            scene.add(pl);
        }

        const treeTypes = ["oak", "pine", "palm", "cherry", "dead"];
        let treeTypeIdx = 0;
        const occupied = new Set(districts.map((_, di) => {
            const c2 = di % cols, r2 = Math.floor(di / cols);
            return r2 + "_" + c2;
        }));
        function hasDistrict(r2, c2) { return occupied.has(r2 + "_" + c2); }

        // ── Build roads + footpaths ───────────────────────────────────────────
        for (let r = 0; r <= rows; r++) {
            const rz = oz + r * (BD + ROAD) + ROAD / 2;
            let minC = -1, maxC = -1;
            for (let c = 0; c < cols; c++) {
                const above = r > 0 && hasDistrict(r - 1, c), below = r < rows && hasDistrict(r, c);
                if (above || below) { if (minC === -1) minC = c; maxC = c; }
            }
            if (minC === -1) continue;
            const x1 = ox + minC * (BW + ROAD), x2 = ox + (maxC + 1) * (BW + ROAD) + ROAD;
            drawRoad(x1, rz, x2, rz, ROAD);
            drawFootpath(x1, rz, x2, rz);
            footpathPoints.push(...getFootpathPoints(x1, rz, x2, rz, 16));

            for (let c = minC; c <= maxC; c++) {
                const tx = ox + c * (BW + ROAD) + ROAD + BW / 2;

                // FIX: Trees on footpath strip, pushed well outside road edge
                addTree(scene, THREE, tx, rz - FURNITURE_OFFSET - 0.3, treeTypes[treeTypeIdx++ % treeTypes.length], 0.85);
                addTree(scene, THREE, tx, rz + FURNITURE_OFFSET + 0.3, treeTypes[treeTypeIdx++ % treeTypes.length], 0.85);

                // FIX: Lamp on outer edge of footpath (away from road)
                addLamp(ox + c * (BW + ROAD) + ROAD * 0.5 + 1.5, rz + FURNITURE_OFFSET + 0.5);

                if (r % 2 === 0 && c % 2 === 0) {
                    // FIX: Traffic signal placed at footpath outer edge corner
                    // (FURNITURE_OFFSET from road centre, not on road itself)
                    const states = ["red", "yellow", "green"];
                    addTrafficSignal(scene, THREE,
                        ox + c * (BW + ROAD) + ROAD + 1.2,
                        rz + FURNITURE_OFFSET + 0.6,
                        states[Math.floor(Math.random() * states.length)]
                    );
                }
            }
        }

        for (let c = 0; c <= cols; c++) {
            const rx = ox + c * (BW + ROAD) + ROAD / 2;
            let minR = -1, maxR = -1;
            for (let r = 0; r < rows; r++) {
                const left = c > 0 && hasDistrict(r, c - 1), right = c < cols && hasDistrict(r, c);
                if (left || right) { if (minR === -1) minR = r; maxR = r; }
            }
            if (minR === -1) continue;
            const z1 = oz + minR * (BD + ROAD), z2 = oz + (maxR + 1) * (BD + ROAD) + ROAD;
            drawRoad(rx, z1, rx, z2, ROAD);
            drawFootpath(rx, z1, rx, z2);
            footpathPoints.push(...getFootpathPoints(rx, z1, rx, z2, 16));

            for (let r = minR; r <= maxR; r++) {
                const tz = oz + r * (BD + ROAD) + ROAD + BD / 2;

                // FIX: Trees on footpath side (FURNITURE_OFFSET away from road centre)
                addTree(scene, THREE, rx - FURNITURE_OFFSET - 0.3, tz, treeTypes[treeTypeIdx++ % treeTypes.length], 0.85);
                addTree(scene, THREE, rx + FURNITURE_OFFSET + 0.3, tz, treeTypes[treeTypeIdx++ % treeTypes.length], 0.85);

                if (r % 3 === 0) {
                    // FIX: Street sign on footpath side (not on road)
                    addStreetSign(scene, THREE, rx + FURNITURE_OFFSET + 0.5, tz - BD * 0.3, "GitAve", "Code St");
                }
            }
        }

        // Intersection corner pads
        for (let r = 0; r <= rows; r++) {
            for (let c = 0; c <= cols; c++) {
                const adj =
                    (r > 0 && c > 0 && hasDistrict(r - 1, c - 1)) ||
                    (r > 0 && c < cols && hasDistrict(r - 1, c)) ||
                    (r < rows && c > 0 && hasDistrict(r, c - 1)) ||
                    (r < rows && c < cols && hasDistrict(r, c));
                if (!adj) continue;
                const ix = ox + c * (BW + ROAD) + ROAD / 2, iz = oz + r * (BD + ROAD) + ROAD / 2;
                const p = new THREE.Mesh(new THREE.BoxGeometry(ROAD, 0.19, ROAD), roadMat);
                p.position.set(ix, 0.095, iz);
                scene.add(p);

                const cornerPad = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.22, 2.2), pathMat);
                cornerPad.position.set(ix + ROAD / 2 + 1.1, 0.11, iz + ROAD / 2 + 1.1);
                scene.add(cornerPad);
                const cp2 = cornerPad.clone(); cp2.position.set(ix - ROAD / 2 - 1.1, 0.11, iz + ROAD / 2 + 1.1); scene.add(cp2);
                const cp3 = cornerPad.clone(); cp3.position.set(ix + ROAD / 2 + 1.1, 0.11, iz - ROAD / 2 - 1.1); scene.add(cp3);
                const cp4 = cornerPad.clone(); cp4.position.set(ix - ROAD / 2 - 1.1, 0.11, iz - ROAD / 2 - 1.1); scene.add(cp4);
            }
        }

        // ── Helper: is a point safely on footpath ─────────────────────────────
        // FIX: tighter check — point must be at least ROAD/2 + 0.8 from road centre
        function isOnFootpath(x, z) {
            // Must not be inside any building block
            for (let di = 0; di < districts.length; di++) {
                const col = di % cols, row = Math.floor(di / cols);
                const bx0 = ox + col * (BW + ROAD) + ROAD;
                const bz0 = oz + row * (BD + ROAD) + ROAD;
                if (x > bx0 - 1.5 && x < bx0 + BW + 1.5 && z > bz0 - 1.5 && z < bz0 + BD + 1.5) return false;
            }
            // Must be outside road carriageway — min distance from road centre = ROAD/2 + 0.8
            for (const seg of roadSegs) {
                const ex = x - seg.x1, ez = z - seg.z1;
                let t = (ex * seg.dx + ez * seg.dz) / seg.len;
                t = Math.max(0, Math.min(1, t));
                const px2 = seg.x1 + seg.dx * seg.len * t;
                const pz2 = seg.z1 + seg.dz * seg.len * t;
                const perp = Math.sqrt((x - px2) ** 2 + (z - pz2) ** 2);
                if (perp < ROAD / 2 + 0.5) return false;  // FIX: was ROAD/2 - 0.5
            }
            return true;
        }

        // ── BILLBOARDS — placed outside city block grid ───────────────────────
        const bbPositions = [
            [ox + cityW * 0.3, oz - ROAD * 3],
            [ox + cityW * 0.7, oz - ROAD * 3],
            [ox - ROAD * 3, oz + cityD * 0.4],
        ];
        bbPositions.forEach(([bx, bz]) => addBillboard(scene, THREE, bx, bz, 5, 3));

        // ── CENTRAL MONUMENT ─────────────────────────────────────────────────
        const monP = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 14, 8), lampMat);
        monP.position.y = 7;
        scene.add(monP);
        const monTop = new THREE.Mesh(new THREE.SphereGeometry(1.6, 14, 14), new THREE.MeshLambertMaterial({ color: accentCol, emissive: accentCol.clone().multiplyScalar(0.6) }));
        monTop.position.y = 15;
        scene.add(monTop);
        const monLight = new THREE.PointLight(accentCol, 5, 55);
        monLight.position.y = 15;
        scene.add(monLight);

        decoratePlaza(scene, THREE, 0, 0, 18, 0.2);

        // FIX: Distance boards placed outside road carriageway
        addDistanceBoard(scene, THREE, ROAD / 2 + 3, ROAD / 2 + 3, "GitCity HQ · 0.0 km");
        addDistanceBoard(scene, THREE, -(ROAD / 2 + 3), ROAD / 2 + 3, "GitHub · ∞ km");

        // ── DISTRICTS & BUILDINGS ─────────────────────────────────────────────
        const blockInfos = [], buildingObjs = [], skyBeams = [];
        const globalMax = stats.maxCount || 1;

        districts.forEach((dist, di) => {
            const col = di % cols, row = Math.floor(di / cols);
            const rand = rng(di * 6271 + 1);
            const bx0 = ox + col * (BW + ROAD) + ROAD, bz0 = oz + row * (BD + ROAD) + ROAD;
            blockInfos.push({ x: bx0 + BW / 2, z: bz0 + BD / 2, w: BW, d: BD, label: dist.label, di });

            const sw = new THREE.Mesh(new THREE.BoxGeometry(BW, 0.28, BD), sidewMat);
            sw.position.set(bx0 + BW / 2, 0.14, bz0 + BD / 2);
            sw.receiveShadow = true;
            scene.add(sw);

            // ── REPO BOARD — on the sidewalk in front of the block ───────────
            if (dist.total > 0) {
                const boardX = bx0 + BW * 0.25;
                // FIX: place board on the footpath strip at FURNITURE_OFFSET from road
                // front of block is bz0; footpath is at bz0 - FURNITURE_OFFSET
                const boardZ = bz0 - FURNITURE_OFFSET;

                const boardMat = new THREE.MeshLambertMaterial({ color: 0x111122 });
                const boardFace = new THREE.MeshLambertMaterial({ color: 0x001133 });
                const glowMat = new THREE.MeshLambertMaterial({
                    color: accentCol,
                    emissive: accentCol.clone().multiplyScalar(0.9),
                });

                const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 5.5, 8), boardMat);
                pole.position.set(boardX, 2.75, boardZ);
                scene.add(pole);

                const panel = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.2, 0.18), boardFace);
                panel.position.set(boardX, 5.5, boardZ);
                panel.castShadow = true;
                scene.add(panel);

                const topBar = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.18, 0.22), glowMat);
                topBar.position.set(boardX, 6.65, boardZ);
                scene.add(topBar);

                const intensity = Math.min(1, dist.total / maxTotal);
                const dotCount = Math.max(1, Math.round(intensity * 12));
                const dotMat = new THREE.MeshLambertMaterial({
                    color: accentCol,
                    emissive: accentCol.clone().multiplyScalar(0.7),
                });
                for (let d = 0; d < 12; d++) {
                    const dotLit = d < dotCount;
                    const dm = new THREE.Mesh(
                        new THREE.BoxGeometry(0.28, 0.28, 0.1),
                        dotLit ? dotMat : new THREE.MeshLambertMaterial({ color: 0x223344 })
                    );
                    dm.position.set(boardX - 2.0 + d * 0.34, 5.0, boardZ - 0.1);
                    scene.add(dm);
                }

                const bLight = new THREE.PointLight(accentCol, 0.6, 12);
                bLight.position.set(boardX, 5.5, boardZ - 0.5);
                scene.add(bLight);

                const labelMat = new THREE.MeshLambertMaterial({ color: 0xaabbcc, emissive: new THREE.Color(0.1, 0.15, 0.2) });
                const lm = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.22, 0.08), labelMat);
                lm.position.set(boardX, 6.1, boardZ - 0.08);
                scene.add(lm);
            }

            // ── Street furniture — only on confirmed footpath points ──────────
            const nearFP = footpathPoints.filter(p =>
                Math.abs(p.x - (bx0 + BW / 2)) < BW * 0.8 &&
                Math.abs(p.z - (bz0 + BD / 2)) < BD * 0.8 &&
                isOnFootpath(p.x, p.z)
            );

            let fpIdx = 0;
            if (rand() < 0.35 && nearFP[fpIdx]) {
                const fp = nearFP[fpIdx++];
                addBench(scene, THREE, fp.x, fp.z);
            }
            if (rand() < 0.22 && nearFP[fpIdx]) {
                const fp = nearFP[fpIdx++];
                addKiosk(scene, THREE, fp.x, fp.z);
            }
            if (rand() < 0.28 && nearFP[fpIdx]) {
                const fp = nearFP[fpIdx++];
                addGarden(scene, THREE, fp.x, fp.z, 0.75);
            }

            // ── Buildings ─────────────────────────────────────────────────────
            dist.cells.forEach((cell) => {
                const { week, day, count, date } = cell;
                if (count === 0) return;
                const lw = dist.weeks.indexOf(week);
                if (lw === -1) return;

                const ratio = count / globalMax;
                const wx = bx0 + lw * CELL + CELL / 2, wz = bz0 + day * CELL + CELL / 2;
                const fw = CELL * 0.76, fd = CELL * 0.76;
                const bH = Math.max(2, ratio * 68 + (ratio > 0.5 ? ratio * 18 : 0));
                const lvl = Math.min(4, Math.ceil(ratio * 4));
                const bColor = hex3(theme.levels[lvl], THREE);

                const isSkyscraper = bH > 44, isHighrise = bH > 24 && !isSkyscraper;
                const finalColor = isSkyscraper
                    ? bColor.clone().lerp(new THREE.Color(0.15, 0.3, 0.5), 0.45)
                    : isHighrise
                        ? bColor.clone().lerp(new THREE.Color(0.4, 0.25, 0.15), 0.3)
                        : bColor.clone().lerp(new THREE.Color(0.2, 0.22, 0.3), 0.22);

                const bMat = new THREE.MeshLambertMaterial({ color: finalColor, emissive: finalColor.clone().multiplyScalar(0.28) });
                const bMesh = new THREE.Mesh(new THREE.BoxGeometry(fw, bH, fd), bMat);
                bMesh.position.set(wx, bH / 2 + 0.28, wz);
                bMesh.castShadow = true;
                bMesh.receiveShadow = true;
                bMesh.userData = { cell, origEmissive: bMat.emissive.clone(), distLabel: dist.label };
                scene.add(bMesh);
                buildingObjs.push({ mesh: bMesh, cell, wx, wz, distLabel: dist.label, bH });

                collisionBoxes.push({ x: wx, z: wz, hw: fw / 2 + 0.4, hd: fd / 2 + 0.4 });

                if (isSkyscraper) {
                    const gm = new THREE.MeshLambertMaterial({ color: 0x4488bb, transparent: true, opacity: 0.28 });
                    const gf = new THREE.Mesh(new THREE.BoxGeometry(fw * 1.02, bH, fd * 1.02), gm);
                    gf.position.set(wx, bH / 2 + 0.28, wz);
                    scene.add(gf);
                }

                if (isSkyscraper && bH > 40) {
                    const t1H = bH * 0.28, t1 = new THREE.Mesh(new THREE.BoxGeometry(fw * 0.7, t1H, fd * 0.7), bMat);
                    t1.position.set(wx, bH + t1H / 2 + 0.28, wz); t1.castShadow = true; scene.add(t1);
                    const t2H = bH * 0.14, t2 = new THREE.Mesh(new THREE.BoxGeometry(fw * 0.44, t2H, fd * 0.44), bMat);
                    t2.position.set(wx, bH + t1H + t2H / 2 + 0.28, wz); t2.castShadow = true; scene.add(t2);
                    const spire = new THREE.Mesh(new THREE.ConeGeometry(fw * 0.1, bH * 0.28, 8), new THREE.MeshLambertMaterial({ color: 0xaaaacc }));
                    spire.position.set(wx, bH + t1H + t2H + bH * 0.14 + 0.28, wz); scene.add(spire);

                    if (ratio > 0.65) {
                        const beamMat = new THREE.MeshBasicMaterial({ color: 0xccddff, transparent: true, opacity: 0.055, side: THREE.DoubleSide });
                        const beam = new THREE.Mesh(new THREE.ConeGeometry(5, 250, 8, 1, true), beamMat);
                        const beamTop = bH + t1H + t2H + bH * 0.28 + 0.28;
                        beam.rotation.x = Math.PI;
                        beam.position.set(wx, beamTop - 125, wz);
                        scene.add(beam);
                        const topLight = new THREE.PointLight(0xccddff, 4, 90);
                        topLight.position.set(wx, beamTop, wz);
                        scene.add(topLight);
                        skyBeams.push({ mesh: beam, topLight, off: Math.random() * Math.PI * 2, wx, wz, bH: bH + t1H + t2H + bH * 0.28 });
                    }
                } else if (isHighrise && bH > 20) {
                    const tH = bH * 0.24, t = new THREE.Mesh(new THREE.BoxGeometry(fw * 0.68, tH, fd * 0.68), bMat);
                    t.position.set(wx, bH + tH / 2 + 0.28, wz); t.castShadow = true; scene.add(t);
                }

                if (bH > 3) {
                    const flH = 2.4, floors = Math.floor(bH / flH);
                    const wCX = Math.max(1, Math.floor(fw / 2.0)), wCZ = Math.max(1, Math.floor(fd / 2.0));
                    const r2 = rng(date ? parseInt(date.replace(/-/g, ""), 10) : di * 7 + day);
                    const wEmit = new THREE.Color(0.95, 0.82, 0.18);

                    for (let f = 0; f < Math.min(floors, 26); f++) {
                        const fy = f * flH + 1.4 + 0.28;
                        for (let cx2 = 0; cx2 < wCX; cx2++) {
                            const lit = r2() > 0.25;
                            const wm = new THREE.MeshLambertMaterial({ color: 0xffe8a0, emissive: lit ? wEmit : new THREE.Color(0, 0, 0), transparent: true, opacity: lit ? 0.95 : 0.1 });
                            const wx2 = wx - fw / 2 + (cx2 + 0.5) * (fw / wCX);
                            const wf = new THREE.Mesh(new THREE.PlaneGeometry((fw / wCX) * 0.62, flH * 0.58), wm);
                            wf.position.set(wx2, fy, wz - fd / 2 - 0.01); scene.add(wf);
                            const wb = wf.clone(); wb.position.set(wx2, fy, wz + fd / 2 + 0.01); wb.rotation.y = Math.PI; scene.add(wb);
                        }
                        for (let cz2 = 0; cz2 < wCZ; cz2++) {
                            const lit = r2() > 0.25;
                            const wm = new THREE.MeshLambertMaterial({ color: 0xffe8a0, emissive: lit ? wEmit : new THREE.Color(0, 0, 0), transparent: true, opacity: lit ? 0.95 : 0.1 });
                            const wz2 = wz - fd / 2 + (cz2 + 0.5) * (fd / wCZ);
                            const wl = new THREE.Mesh(new THREE.PlaneGeometry((fd / wCZ) * 0.62, flH * 0.58), wm);
                            wl.position.set(wx - fw / 2 - 0.01, fy, wz2); wl.rotation.y = -Math.PI / 2; scene.add(wl);
                            const wr = wl.clone(); wr.position.set(wx + fw / 2 + 0.01, fy, wz2); wr.rotation.y = Math.PI / 2; scene.add(wr);
                        }
                    }

                    if (bH > 28) {
                        const bc = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), new THREE.MeshLambertMaterial({ color: 0xff2200, emissive: new THREE.Color(1, 0, 0) }));
                        bc.position.set(wx, bH + 0.28 + 0.28, wz);
                        scene.add(bc);
                    }
                }
            });
        });

        // ── Sky beams ─────────────────────────────────────────────────────────
        const peakBeam = skyBeams.reduce((a, b) => (!a || (b.bH !== undefined && b.bH > a.bH)) ? b : a, null);
        const finalBeams = [];
        if (peakBeam && peakBeam.wx !== undefined) {
            const { wx: pbx, wz: pbz, bH: pbH } = peakBeam;
            const pkLight = new THREE.PointLight(0x88aaff, 6, 120);
            pkLight.position.set(pbx, pbH, pbz);
            scene.add(pkLight);
            const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 10), new THREE.MeshLambertMaterial({ color: 0xaaccff, emissive: new THREE.Color(0.5, 0.6, 1) }));
            beacon.position.set(pbx, pbH + 1.5, pbz);
            scene.add(beacon);
            for (let ri = 0; ri < 12; ri++) {
                const angle = (ri / 12) * Math.PI * 2, rayLen = 280, tiltAngle = Math.PI / 7;
                const ray = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.08, rayLen, 6, 1), new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.07 }));
                const midX = pbx + Math.sin(angle) * Math.sin(tiltAngle) * (rayLen / 2);
                const midY = pbH + Math.cos(tiltAngle) * (rayLen / 2);
                const midZ = pbz + Math.cos(angle) * Math.sin(tiltAngle) * (rayLen / 2);
                ray.position.set(midX, midY, midZ);
                ray.rotation.z = tiltAngle; ray.rotation.y = angle;
                scene.add(ray);
                finalBeams.push({ mesh: ray, off: (ri / 12) * Math.PI * 2 });
            }
            const vBeam = new THREE.Mesh(new THREE.ConeGeometry(3, 300, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.08, side: THREE.DoubleSide }));
            vBeam.rotation.x = Math.PI; vBeam.position.set(pbx, pbH - 150, pbz);
            scene.add(vBeam); finalBeams.push({ mesh: vBeam, isVertical: true });
        }

        // ── PEDESTRIAN SYSTEM ─────────────────────────────────────────────────
        const pedSystem = createPedestrianSystem(
            scene, THREE, districts, cols, ox, oz, BW, BD, ROAD,
            footpathPoints, roadSegs
        );

        // ── TRAFFIC SYSTEM ────────────────────────────────────────────────────
        const traffic = createTrafficSystem(scene, THREE, roadSegs, cityW, cityD);
        traffic.addCars(Math.min(districts.length, 30));
        trafficRef.current = traffic;

        // ── PLAYER CAR ────────────────────────────────────────────────────────
        const playerCar = buildVehicle(scene, THREE, "sedan", accentCol.getHex());
        const startSeg = roadSegs[Math.floor(roadSegs.length / 2)];
        playerCar.position.set(
            startSeg.x1 + startSeg.dx * startSeg.len * 0.3,
            0,
            startSeg.z1 + startSeg.dz * startSeg.len * 0.3
        );
        playerCar.rotation.y = startSeg.angle + Math.PI;
        playerCarRef.current = playerCar;

        const PLAYER_HW = 1.1, PLAYER_HD = 2.2;

        // ── PARKED SPECIAL VEHICLES ───────────────────────────────────────────
        // FIX: space vehicles well apart so they don't overlap each other
        // Place on footpath / parking bay area (outside road carriageway)
        // Use FURNITURE_OFFSET + small margin from road edge
        const parkRow = oz + BD + ROAD * 2 + 1;  // safely outside road area

        function parkVehicle(type, x, z, ry) {
            const v = buildVehicle(scene, THREE, type);
            v.position.set(x, 0, z);
            v.rotation.y = ry;
            collisionBoxes.push({ x, z, hw: 1.3, hd: 2.6 });
            return v;
        }

        // FIX: space parked vehicles 6+ units apart to prevent overlap
        const ambulance = parkVehicle("ambulance", ox + 4, parkRow, Math.PI / 4);
        const police = parkVehicle("police", ox + 12, parkRow, -Math.PI / 6);
        const schoolBus = parkVehicle("schoolbus", ox + 22, parkRow, 0);
        const taxi = parkVehicle("taxi", ox + 30, parkRow, Math.PI);
        const sportscar = parkVehicle("sportscar", ox + 38, parkRow, Math.PI / 3);

        const emergencyVehicles = [ambulance, police];

        // ── EVENT HANDLERS ────────────────────────────────────────────────────
        const rayMeshes = buildingObjs.map((b) => b.mesh);
        const raycaster = new THREE.Raycaster();
        const canvas = renderer.domElement;
        const mouse = mouseRef.current;

        const onMD = (e) => { mouse.down = true; mouse.lx = e.clientX; mouse.ly = e.clientY; mouse.orbit = true; };
        const onMU = () => { mouse.down = false; };
        const onMM = (e) => {
            const rect = canvas.getBoundingClientRect();
            hoverRef.current.nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            hoverRef.current.ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
            if (!mouse.down) return;
            mouse.ox += (e.clientX - mouse.lx) * 0.008;
            mouse.oy = Math.max(0.05, Math.min(1.3, mouse.oy + (e.clientY - mouse.ly) * 0.006));
            mouse.lx = e.clientX; mouse.ly = e.clientY;
        };
        const onWH = (e) => { mouse.zoom = Math.max(0.15, Math.min(25, mouse.zoom * (e.deltaY > 0 ? 1.12 : 0.88))); };
        const onDC = () => { mouse.orbit = false; };

        canvas.addEventListener("mousedown", onMD);
        canvas.addEventListener("mouseup", onMU);
        canvas.addEventListener("mousemove", onMM);
        canvas.addEventListener("wheel", onWH, { passive: true });
        canvas.addEventListener("dblclick", onDC);
        canvas.addEventListener("contextmenu", (e) => e.preventDefault());

        const onKD = (e) => { keysRef.current[e.key] = true; };
        const onKU = (e) => { keysRef.current[e.key] = false; };
        window.addEventListener("keydown", onKD);
        window.addEventListener("keyup", onKU);

        const onResize = () => {
            if (!mountRef.current) return;
            const w2 = mountRef.current.clientWidth, h2 = mountRef.current.clientHeight;
            camera.aspect = w2 / h2; camera.updateProjectionMatrix(); renderer.setSize(w2, h2);
        };
        window.addEventListener("resize", onResize);

        const CAR_SPD = 13, TURN = 1.65;
        let lastT = performance.now(), prevNearest = null, hoverFr = 0;
        const camP = new THREE.Vector3(), camL = new THREE.Vector3(), orbitTgt = new THREE.Vector3();
        camP.set(playerCar.position.x + Math.sin(playerCar.rotation.y) * 16, 9, playerCar.position.z + Math.cos(playerCar.rotation.y) * 16);

        function animate() {
            frameRef.current = requestAnimationFrame(animate);
            const now = performance.now(), dt = Math.min((now - lastT) / 1000, 0.05);
            lastT = now;

            const keys = keysRef.current, m = mouseRef.current, car = playerCar;
            const NM = nightRef.current;

            // Sky & Lighting
            const skyColor = NM ? 0x05091c : 0x87ceeb;
            scene.background.set(skyColor);
            scene.fog.color.set(skyColor);
            renderer.toneMappingExposure = NM ? 1.6 : 2.0;
            ambient.intensity = NM ? 0.4 : 0.9;
            sun.intensity = NM ? 0.7 : 1.6;
            sun.color.set(NM ? 0x2244aa : 0xfff4d0);
            sun.position.set(NM ? -100 : 150, NM ? 60 : 220, NM ? -80 : 100);
            hemi.intensity = NM ? 0.25 : 0.6;
            hemi.color.set(NM ? 0x0a1428 : 0x88bbff);
            stars.visible = NM; moonMesh.visible = NM; sunDisc.visible = !NM;
            cloudGroup.visible = !NM; monLight.visible = NM;
            gndMat.color.set(NM ? 0x090912 : 0x3a6a2a);

            weather.update(dt, now);
            emergencyVehicles.forEach(v => updateVehicleLights(v, dt, now));

            // Vehicle movement
            let spd = 0;
            const fwdKey = keys["ArrowUp"] || keys["w"] || keys["W"];
            const bkKey = keys["ArrowDown"] || keys["s"] || keys["S"];
            if (keys["ArrowLeft"] || keys["a"] || keys["A"]) car.rotation.y += TURN * dt;
            if (keys["ArrowRight"] || keys["d"] || keys["D"]) car.rotation.y -= TURN * dt;

            const fwdX = -Math.sin(car.rotation.y), fwdZ = -Math.cos(car.rotation.y);
            const prevX = car.position.x, prevZ = car.position.z;

            if (fwdKey) { car.position.x += fwdX * CAR_SPD * dt; car.position.z += fwdZ * CAR_SPD * dt; spd = CAR_SPD; m.orbit = false; }
            if (bkKey) { car.position.x -= fwdX * CAR_SPD * 0.5 * dt; car.position.z -= fwdZ * CAR_SPD * 0.5 * dt; spd = -CAR_SPD * 0.5; m.orbit = false; }

            if (fwdKey || bkKey) {
                const sn = snapRoad(car.position.x, car.position.z, roadSegs);
                if (sn.dist < ROAD * 0.9) {
                    car.position.x += (sn.x - car.position.x) * 0.04;
                    car.position.z += (sn.z - car.position.z) * 0.04;
                }

                const mover = { x: car.position.x, z: car.position.z, hw: PLAYER_HW, hd: PLAYER_HD };
                let pushed = false;
                for (const box of collisionBoxes) {
                    const push = aabbPushOut(mover, box);
                    if (push) {
                        car.position.x += push.px;
                        car.position.z += push.pz;
                        mover.x = car.position.x;
                        mover.z = car.position.z;
                        pushed = true;
                    }
                }
                if (pushed) {
                    for (const box of collisionBoxes) {
                        const push2 = aabbPushOut({ x: car.position.x, z: car.position.z, hw: PLAYER_HW, hd: PLAYER_HD }, box);
                        if (push2) { car.position.x = prevX; car.position.z = prevZ; break; }
                    }
                }
            }

            car.position.y = 0; car.rotation.x = 0; car.rotation.z = 0;
            setKmh(Math.abs(Math.round(spd * 3.6 * 0.28)));

            // Camera
            if (m.orbit) {
                const dist2 = 16 * m.zoom;
                orbitTgt.lerp(car.position.clone(), 0.08);
                camP.lerp(new THREE.Vector3(
                    orbitTgt.x + dist2 * Math.sin(m.ox) * Math.cos(m.oy),
                    orbitTgt.y + Math.max(4, dist2 * Math.sin(m.oy)) + 2,
                    orbitTgt.z + dist2 * Math.cos(m.ox) * Math.cos(m.oy)
                ), 0.1);
                camL.lerp(orbitTgt.clone().add(new THREE.Vector3(0, 1, 0)), 0.1);
            } else {
                const snapSpeed = fwdKey || bkKey ? 0.18 : 0.08;
                camP.lerp(new THREE.Vector3(car.position.x - fwdX * 14, car.position.y + 5.5, car.position.z - fwdZ * 14), snapSpeed);
                camL.lerp(car.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 0.15);
                m.ox = car.rotation.y + Math.PI; m.oy = 0.3;
            }
            camera.position.copy(camP); camera.lookAt(camL);

            // Location label
            let locLabel = "GitCity Roads";
            for (const bi of blockInfos) {
                if (Math.abs(car.position.x - bi.x) < bi.w / 2 + 3 && Math.abs(car.position.z - bi.z) < bi.d / 2 + 3) {
                    locLabel = bi.label + " District"; break;
                }
            }
            if (Math.sqrt(car.position.x ** 2 + car.position.z ** 2) < 15) locLabel = "City Center ✦";
            setLoc(locLabel);

            traffic.update(dt); pedSystem.update(dt);

            finalBeams.forEach((sb) => {
                if (sb.mesh) {
                    sb.mesh.visible = NM;
                    if (!sb.isVertical && sb.mesh.material.opacity !== undefined)
                        sb.mesh.material.opacity = 0.04 + Math.abs(Math.sin(now * 0.0008 + sb.off)) * 0.06;
                }
            });

            buildingObjs.forEach((bo) => {
                const d2 = (bo.wx - car.position.x) ** 2 + (bo.wz - car.position.z) ** 2;
                if (d2 < 196)
                    bo.mesh.material.emissive.setRGB(accentCol.r * 0.5 * (1 - d2 / 196), accentCol.g * 0.5 * (1 - d2 / 196), accentCol.b * 0.5 * (1 - d2 / 196));
                else
                    bo.mesh.material.emissive.copy(bo.mesh.userData.origEmissive);
            });

            // Hover tooltips
            hoverFr++;
            const isDriving = fwdKey || bkKey;
            if (!isDriving && hoverFr % 6 === 0 && rayMeshes.length > 0) {
                try {
                    raycaster.setFromCamera({ x: hoverRef.current.nx, y: hoverRef.current.ny }, camera);
                    const hits = raycaster.intersectObjects(rayMeshes, false);
                    if (hits.length > 0) {
                        const hitObj = buildingObjs.find((b) => b.mesh === hits[0].object);
                        if (hitObj && hitObj !== prevNearest) {
                            prevNearest = hitObj;
                            const p3 = new THREE.Vector3(hitObj.wx, hitObj.bH / 2, hitObj.wz);
                            p3.project(camera);
                            setCard({ cell: hitObj.cell, x: Math.min((p3.x * 0.5 + 0.5) * W, W - 175), y: Math.max(8, (-p3.y * 0.5 + 0.5) * H - 130) });
                        }
                    } else if (prevNearest) { prevNearest = null; setCard(null); }
                } catch (e) { }
            }
            if (isDriving && card) setCard(null);

            setMm({ cx: car.position.x, cz: car.position.z, sc: 100 / Math.max(cityW, cityD) / 1.4, blocks: blockInfos });

            renderer.render(scene, camera);
        }

        animate();

        return () => {
            cancelAnimationFrame(frameRef.current);
            weather.dispose(); pedSystem.dispose(); traffic.dispose();
            weatherRef.current = null; trafficRef.current = null; playerCarRef.current = null;
            canvas.removeEventListener("mousedown", onMD);
            canvas.removeEventListener("mouseup", onMU);
            canvas.removeEventListener("mousemove", onMM);
            canvas.removeEventListener("wheel", onWH);
            canvas.removeEventListener("dblclick", onDC);
            window.removeEventListener("keydown", onKD);
            window.removeEventListener("keyup", onKU);
            window.removeEventListener("resize", onResize);
            try { renderer.dispose(); } catch (e) { }
        };
    }, [loaded, cells, theme, stats, districts, maxTotal]);

    if (error) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#ff6b6b", fontFamily: "monospace" }}>
            ⚠ {error}
        </div>
    );

    if (!loaded) return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: theme.muted, fontFamily: "monospace", gap: "0.5rem", flexDirection: "column" }}>
            <div style={{ fontSize: "2rem", animation: "spin 1s linear infinite" }}>⬡</div>
            <div style={{ fontSize: "0.72rem", letterSpacing: "0.15em" }}>BUILDING GITCITY…</div>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
    );

    const MM = 110, ms = mm.sc || 0.4;

    return (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <div ref={mountRef} style={{ width: "100%", height: "100%", cursor: "crosshair" }} />

            {/* WELCOME SCREEN */}
            {welcome && (
                <div style={{ position: "absolute", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", background: `radial-gradient(ellipse 80% 70% at 50% 40%, ${theme.surface}ee 0%, ${theme.bg}ff 70%)`, backdropFilter: "blur(12px)" }}>
                    <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${theme.border}20 1px,transparent 1px),linear-gradient(90deg,${theme.border}20 1px,transparent 1px)`, backgroundSize: "40px 40px", animation: "gridSlide 3s linear infinite" }} />
                    <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${theme.accent},transparent)`, animation: "scanLine 2s ease-in-out infinite" }} />
                    <div style={{ position: "relative", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.2rem" }}>
                        <div style={{ fontSize: "3rem", animation: "float 2s ease-in-out infinite", filter: `drop-shadow(0 0 20px ${theme.glow})` }}>⬡</div>
                        <div style={{ fontSize: "0.55rem", letterSpacing: "0.45em", color: theme.muted, textTransform: "uppercase" }}>Welcome to</div>
                        <div style={{ fontSize: "4rem", fontWeight: 900, color: theme.accent, letterSpacing: "-0.02em", lineHeight: 1, textShadow: `0 0 40px ${theme.glow}90,0 0 80px ${theme.glow}40`, animation: "titleReveal 0.8s cubic-bezier(0.2,0,0,1) 0.3s both" }}>GitCity</div>
                        {username && (
                            <div style={{ fontSize: "1.1rem", color: theme.text, fontWeight: 600 }}>
                                <span style={{ color: theme.muted, fontWeight: 400 }}>@</span>{username}
                            </div>
                        )}
                        <div style={{ display: "flex", gap: "2rem" }}>
                            {[{ v: cells.length, l: "Days Mapped" }, { v: districts.length, l: "Districts" }, { v: cells.filter((c) => c.count > 0).length, l: "Active Days" }].map(({ v, l }) => (
                                <div key={l} style={{ textAlign: "center" }}>
                                    <div style={{ fontSize: "1.4rem", fontWeight: 800, color: theme.accent }}>{v.toLocaleString()}</div>
                                    <div style={{ fontSize: "0.52rem", color: theme.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>{l}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ width: 200, height: 3, background: theme.border, borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ height: "100%", background: `linear-gradient(90deg,${theme.accent},${theme.glow})`, borderRadius: 2, animation: "loadBar 3.2s ease forwards" }} />
                        </div>
                        <div style={{ fontSize: "0.55rem", color: theme.muted, letterSpacing: "0.12em" }}>LOADING CITY…</div>
                    </div>
                    <style>{`
                        @keyframes gridSlide{to{background-position:0 40px;}}
                        @keyframes scanLine{0%{top:-5%}100%{top:105%}}
                        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
                        @keyframes titleReveal{from{opacity:0;transform:scale(0.8) translateY(30px)}to{opacity:1;transform:scale(1) translateY(0)}}
                        @keyframes loadBar{0%{width:0}100%{width:100%}}
                    `}</style>
                </div>
            )}

            {/* MINIMAP */}
            <div style={{ position: "absolute", top: "0.6rem", left: "0.6rem", width: MM, height: MM, background: `${theme.surface}ee`, border: `1px solid ${theme.border}`, borderRadius: 8, overflow: "hidden", zIndex: 10 }}>
                {(mm.blocks || []).map((bi, i) => {
                    const bx2 = MM / 2 + (bi.x || 0) * ms, bz2 = MM / 2 + (bi.z || 0) * ms;
                    const bw2 = Math.max(2, (bi.w || 8) * ms), bd2 = Math.max(2, (bi.d || 8) * ms);
                    const d2 = districts[bi.di];
                    if (!d2) return null;
                    const int2 = (d2.total || 0) / maxTotal;
                    return (
                        <div key={i} style={{ position: "absolute", left: bx2 - bw2 / 2, top: bz2 - bd2 / 2, width: bw2, height: bd2, background: theme.levels[Math.min(4, Math.ceil(int2 * 4))], opacity: 0.7, borderRadius: 1 }} />
                    );
                })}
                <div style={{ position: "absolute", left: Math.max(4, Math.min(MM - 8, MM / 2 + (mm.cx || 0) * ms)) - 5, top: Math.max(4, Math.min(MM - 8, MM / 2 + (mm.cz || 0) * ms)) - 5, width: 10, height: 10, borderRadius: "50%", background: theme.accent, boxShadow: `0 0 8px ${theme.accent}`, zIndex: 3 }} />
                <div style={{ position: "absolute", bottom: 2, left: 3, fontSize: "0.42rem", color: theme.muted, fontFamily: "monospace" }}>MAP</div>
            </div>

            {/* HUD */}
            <div style={{ position: "absolute", top: "0.6rem", left: `${MM + 12}px`, background: `${theme.surface}cc`, border: `1px solid ${theme.border}`, borderRadius: 6, padding: "0.35rem 0.65rem", fontFamily: "monospace", fontSize: "0.58rem", color: theme.accent, lineHeight: 1.75, zIndex: 10 }}>
                <div style={{ opacity: 0.6, letterSpacing: "0.12em", fontSize: "0.5rem" }}>⬡ GITCITY</div>
                <div style={{ color: theme.text, fontWeight: 600 }}>{loc}</div>
                <div style={{ color: kmh > 0 ? theme.accent : theme.muted, fontWeight: 700 }}>{kmh} km/h</div>
                <div style={{ color: theme.muted, fontSize: "0.5rem" }}>{districts.length} districts · {cells.length} days</div>
            </div>

            {/* COMMIT CARD */}
            {card && (
                <div style={{ position: "absolute", left: card.x, top: card.y, background: `${theme.surface}f2`, border: `1px solid ${theme.accent}70`, borderRadius: 10, padding: "0.6rem 0.85rem", fontFamily: "monospace", fontSize: "0.63rem", color: theme.text, pointerEvents: "none", zIndex: 20, minWidth: 155, boxShadow: `0 0 24px ${theme.glow}35`, transition: "all 0.15s" }}>
                    <div style={{ height: 2, background: `linear-gradient(90deg,transparent,${theme.accent},transparent)`, borderRadius: 1, marginBottom: "0.4rem" }} />
                    <div style={{ color: theme.accent, fontWeight: 700, fontSize: "0.88rem" }}>{card.cell.count} commit{card.cell.count !== 1 ? "s" : ""}</div>
                    <div style={{ opacity: 0.85, marginTop: "0.18rem", fontSize: "0.6rem" }}>
                        {new Date(card.cell.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                    </div>
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: "0.38rem" }}>
                        {Array.from({ length: Math.min(card.cell.count, 16) }).map((_, i) => (
                            <div key={i} style={{ width: 6, height: 6, borderRadius: 1, background: theme.accent, opacity: 0.8 }} />
                        ))}
                        {card.cell.count > 16 && <span style={{ color: theme.muted, fontSize: "0.52rem", alignSelf: "center" }}>+{card.cell.count - 16}</span>}
                    </div>
                </div>
            )}

            {/* CONTROLS HELP */}
            <div style={{ position: "absolute", bottom: "0.6rem", left: "0.6rem", fontFamily: "monospace", zIndex: 10 }}>
                <button onClick={() => setShowHelp((h) => !h)} style={{ background: `${theme.surface}cc`, border: `1px solid ${theme.border}`, borderRadius: 5, padding: "0.28rem 0.55rem", cursor: "pointer", color: theme.muted, fontSize: "0.55rem", fontFamily: "inherit" }}>
                    {showHelp ? "▼ hide" : "▲ controls"}
                </button>
                {showHelp && (
                    <div style={{ marginTop: "0.3rem", background: `${theme.surface}ee`, border: `1px solid ${theme.border}`, borderRadius: 7, padding: "0.5rem 0.7rem", fontSize: "0.58rem", color: theme.muted, lineHeight: 1.9 }}>
                        <div style={{ color: theme.accent, marginBottom: "0.15rem" }}>DRIVE</div>
                        <div>W/↑ forward · S/↓ reverse · A/← · D/→</div>
                        <div style={{ color: theme.accent, marginTop: "0.3rem", fontSize: "0.52rem" }}>CAMERA</div>
                        <div style={{ fontSize: "0.52rem" }}>Drag — orbit · Scroll — zoom · Dbl-click — follow</div>
                        <div style={{ color: theme.accent, marginTop: "0.3rem", fontSize: "0.52rem" }}>HOVER</div>
                        <div style={{ fontSize: "0.52rem" }}>Hover building → see commit card</div>
                    </div>
                )}
            </div>

            {/* WEATHER + DAY/NIGHT + MUSIC */}
            <div style={{ position: "absolute", bottom: "0.6rem", right: "0.6rem", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.35rem", zIndex: 10 }}>
                <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 320 }}>
                    {WEATHER_MODES.map(({ key, label }) => {
                        const active = weatherMode === key;
                        return (
                            <button key={key} onClick={() => setWeatherMode(key)} style={{ background: active ? `${theme.accent}25` : `${theme.surface}cc`, border: `1px solid ${active ? theme.accent : theme.border}`, borderRadius: 5, padding: "0.25rem 0.5rem", cursor: "pointer", color: active ? theme.accent : theme.muted, fontSize: "0.55rem", fontFamily: "monospace", letterSpacing: "0.05em", fontWeight: active ? 700 : 400, transition: "all 0.15s", boxShadow: active ? `0 0 8px ${theme.glow}40` : "none" }}>
                                {label}
                            </button>
                        );
                    })}
                </div>
                <div style={{ display: "flex", gap: "0.35rem" }}>
                    <button onClick={() => setMusicOn((m) => !m)} style={{ background: musicOn ? `${theme.accent}25` : `${theme.surface}cc`, border: `1px solid ${musicOn ? theme.accent : theme.border}`, borderRadius: 6, padding: "0.32rem 0.7rem", cursor: "pointer", color: musicOn ? theme.accent : theme.muted, fontSize: "0.58rem", fontFamily: "monospace", letterSpacing: "0.08em", transition: "all 0.15s" }}>
                        {musicOn ? "🎵 Music On" : "🔇 Music Off"}
                    </button>
                    <button onClick={() => setNight((n) => !n)} style={{ background: `${theme.surface}cc`, border: `1px solid ${night ? theme.accent : theme.border}`, borderRadius: 6, padding: "0.32rem 0.7rem", cursor: "pointer", color: night ? theme.accent : theme.muted, fontSize: "0.58rem", fontFamily: "monospace", letterSpacing: "0.08em" }}>
                        {night ? "☀ Day" : "☾ Night"}
                    </button>
                </div>
            </div>
        </div>
    );
}