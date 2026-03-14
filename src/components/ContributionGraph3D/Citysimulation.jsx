/**
 * CitySimulation.jsx — GitCity v8
 * Fixed: camera close to car, day/night works, trees on roadsides,
 * AI traffic on correct lanes, truck/bus/van, pedestrians,
 * sky beams, simple realistic plane with landing light,
 * car drives straight, advanced welcome screen.
 */

import { useEffect, useRef, useState, useMemo } from "react";

const CELL = 7, ROAD = 9, WEEKS = 4;

function hex3(h, T) { return new T.Color(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255); }
function rng(seed) { let s = ((seed % 2147483647) + 2147483647) % 2147483647 || 1; return () => { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; }; }
function groupDistricts(cells) {
    const byWeek = {}; cells.forEach(c => { (byWeek[c.week] ??= []).push(c); });
    const weeks = Object.keys(byWeek).map(Number).sort((a, b) => a - b);
    const dists = [];
    for (let i = 0; i < weeks.length; i += WEEKS) {
        const dw = weeks.slice(i, i + WEEKS), dc = dw.flatMap(w => byWeek[w]);
        const total = dc.reduce((s, c) => s + c.count, 0);
        const date = dc[0]?.date;
        const label = date ? new Date(date).toLocaleString("default", { month: "short", year: "2-digit" }) : `W${i}`;
        dists.push({ index: dists.length, weeks: dw, cells: dc, total, peak: Math.max(...dc.map(c => c.count), 0), label });
    }
    return dists;
}
function buildRoadSegs(cols, rows, ox, oz, BW, BD) {
    const segs = [];
    function add(x1, z1, x2, z2) { const dx = x2 - x1, dz = z2 - z1, len = Math.sqrt(dx * dx + dz * dz); if (len < 1) return; segs.push({ x1, z1, x2, z2, dx: dx / len, dz: dz / len, len, angle: Math.atan2(dx, dz) }); }
    for (let r = 0; r <= rows; r++) { const rz = oz + r * (BD + ROAD) + ROAD / 2; add(ox - ROAD, rz, ox + (cols * (BW + ROAD)) + ROAD, rz); }
    for (let c = 0; c <= cols; c++) { const rx = ox + c * (BW + ROAD) + ROAD / 2; add(rx, oz - ROAD, rx, oz + (rows * (BD + ROAD)) + ROAD); }
    return segs;
}
function snapRoad(x, z, segs) {
    let best = null, bd = Infinity;
    for (const s of segs) { const ex = x - s.x1, ez = z - s.z1; let t = (ex * s.dx + ez * s.dz) / s.len; t = Math.max(0, Math.min(1, t)); const px = s.x1 + s.dx * s.len * t, pz = s.z1 + s.dz * s.len * t; const d = Math.sqrt((x - px) ** 2 + (z - pz) ** 2); if (d < bd) { bd = d; best = { px, pz, angle: s.angle, dist: d, seg: s }; } }
    if (!best) return { x, z, angle: 0, dist: 999 };
    return { x: best.px - best.seg.dz * 2, z: best.pz + best.seg.dx * 2, angle: best.seg.angle, dist: best.dist };
}

export function CitySimulation({ cells, stats, theme, profile }) {
    const mountRef = useRef(null);
    const keysRef = useRef({});
    const mouseRef = useRef({ down: false, lx: 0, ly: 0, ox: 0, oy: 0.3, zoom: 1, orbit: false });
    const hoverRef = useRef({ nx: 0, ny: 0 });
    const frameRef = useRef(null);
    const nightRef = useRef(true);

    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState(null);
    const [night, setNight] = useState(true);
    const [card, setCard] = useState(null);
    const [kmh, setKmh] = useState(0);
    const [loc, setLoc] = useState("GitCity");
    const [mm, setMm] = useState({ cx: 0, cz: 0, sc: 0.4, blocks: [] });
    const [showHelp, setShowHelp] = useState(false);
    const [welcome, setWelcome] = useState(true);

    const districts = useMemo(() => groupDistricts(cells), [cells]);
    const maxTotal = useMemo(() => Math.max(...districts.map(d => d.total), 1), [districts]);
    const username = profile?.name || "";

    useEffect(() => {
        if (window.THREE) { setLoaded(true); return; }
        const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
        s.onload = () => setLoaded(true); s.onerror = () => setError("Failed to load Three.js");
        document.head.appendChild(s);
    }, []);

    useEffect(() => { if (!loaded) return; const t = setTimeout(() => setWelcome(false), 4000); return () => clearTimeout(t); }, [loaded]);

    // Sync nightRef so animate loop sees latest value without re-triggering effect
    useEffect(() => { nightRef.current = night; }, [night]);

    useEffect(() => {
        if (!loaded || !mountRef.current || !cells.length) return;
        const THREE = window.THREE;
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
        try { if (mountRef.current.firstChild?.tagName === "CANVAS") mountRef.current.removeChild(mountRef.current.firstChild); } catch (e) { }

        const W = mountRef.current.clientWidth || 900, H = mountRef.current.clientHeight || 520;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(W, H); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.6;
        mountRef.current.appendChild(renderer.domElement);

        // Scene — background and fog updated every frame via nightRef
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x05091c);
        scene.fog = new THREE.FogExp2(0x05091c, 0.0016);

        const camera = new THREE.PerspectiveCamera(60, W / H, 0.5, 1000);
        camera.position.set(0, 8, 16); camera.lookAt(0, 0, 0);

        // Dynamic lights (updated in animate based on nightRef)
        const ambient = new THREE.AmbientLight(0xffffff, 0.4); scene.add(ambient);
        const sun = new THREE.DirectionalLight(0x2244aa, 0.7);
        sun.position.set(-100, 60, -80); sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = sun.shadow.camera.bottom = -400;
        sun.shadow.camera.right = sun.shadow.camera.top = 400; sun.shadow.camera.far = 900; scene.add(sun);
        const hemi = new THREE.HemisphereLight(0x0a1428, 0x080810, 0.25); scene.add(hemi);

        // Sky elements
        const starsGeo = new THREE.BufferGeometry();
        const starPos = new Float32Array(900 * 3);
        for (let i = 0; i < 900; i++) { starPos[i * 3] = (Math.random() - .5) * 1400; starPos[i * 3 + 1] = 60 + Math.random() * 200; starPos[i * 3 + 2] = (Math.random() - .5) * 1400; }
        starsGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
        const stars = new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.45, transparent: true, opacity: 0.88 }));
        scene.add(stars);

        const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 16), new THREE.MeshBasicMaterial({ color: 0xddeeff }));
        moonMesh.position.set(-250, 260, -350); scene.add(moonMesh);

        const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(10, 16, 16), new THREE.MeshBasicMaterial({ color: 0xfffce0 }));
        sunDisc.position.set(300, 320, -200); scene.add(sunDisc);
        sunDisc.visible = false;

        // Cloud group (day)
        const cloudGroup = new THREE.Group(); scene.add(cloudGroup); cloudGroup.visible = false;
        for (let i = 0; i < 10; i++) {
            const cg = new THREE.Group();
            for (let j = 0; j < 4; j++) { const cm = new THREE.Mesh(new THREE.SphereGeometry(7 + Math.random() * 5, 8, 8), new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.82 })); cm.position.set(j * 9 - 13, Math.random() * 4, Math.random() * 4); cg.add(cm); }
            cg.position.set((Math.random() - .5) * 300, 80 + Math.random() * 40, (Math.random() - .5) * 300); cloudGroup.add(cg);
        }

        // Materials
        const accentCol = hex3(theme.accent, THREE);
        const roadMat = new THREE.MeshLambertMaterial({ color: 0x141420 });
        const markMat = new THREE.MeshLambertMaterial({ color: 0xeeee44 });
        const sidewMat = new THREE.MeshLambertMaterial({ color: 0x1a1a2a });
        const gndMat = new THREE.MeshLambertMaterial({ color: 0x090912 });
        const darkMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        const lampMat = new THREE.MeshLambertMaterial({ color: 0x778899 });

        // Ground
        const gnd = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), gndMat);
        gnd.rotation.x = -Math.PI / 2; gnd.receiveShadow = true; scene.add(gnd);

        // Layout
        const cols = Math.ceil(Math.sqrt(districts.length));
        const rows = Math.ceil(districts.length / cols);
        const BW = WEEKS * CELL, BD = 7 * CELL;
        const cityW = cols * (BW + ROAD) + ROAD, cityD = rows * (BD + ROAD) + ROAD;
        const ox = -cityW / 2, oz = -cityD / 2;
        // Reposition clouds now that we know city size
        cloudGroup.children.forEach((cg, i) => { cg.position.set((Math.random() - .5) * cityW * 1.4, 80 + Math.random() * 40, (Math.random() - .5) * cityD * 1.4); });
        const roadSegs = buildRoadSegs(cols, rows, ox, oz, BW, BD);

        function drawRoad(x1, z1, x2, z2, w = ROAD) {
            const dx = x2 - x1, dz = z2 - z1, len = Math.sqrt(dx * dx + dz * dz); if (len < 0.5) return;
            const angle = Math.atan2(dx, dz);
            const rm = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, len), roadMat); rm.position.set((x1 + x2) / 2, 0.09, (z1 + z2) / 2); rm.rotation.y = angle; rm.receiveShadow = true; scene.add(rm);
            for (let i = 0, n = Math.floor(len / 10); i < n; i++) { const t = (i + 0.5) / n; const d = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.15, 3.5), markMat); d.position.set(x1 + dx * t, 0.15, z1 + dz * t); d.rotation.y = angle; scene.add(d); }
        }
        function addLamp(x, z) {
            const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 7, 6), lampMat); p.position.set(x, 3.5, z); scene.add(p);
            const a = new THREE.Mesh(new THREE.BoxGeometry(2, 0.08, 0.08), lampMat); a.position.set(x + 1, 7.1, z); scene.add(a);
            const b = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6), new THREE.MeshLambertMaterial({ color: 0xffffcc, emissive: new THREE.Color(0.85, 0.85, 0.15) })); b.position.set(x + 2, 7.0, z); scene.add(b);
            const pl = new THREE.PointLight(0xffeeaa, 0.8, 18); pl.position.set(x + 2, 6.8, z); scene.add(pl);
        }
        function addTree(x, z, palm = false, sc = 1) {
            const h = (palm ? 5 : 3.2) * sc * (0.8 + Math.random() * 0.4);
            const tr = new THREE.Mesh(new THREE.CylinderGeometry(palm ? 0.1 : 0.18, palm ? 0.14 : 0.24, h, 7), new THREE.MeshLambertMaterial({ color: 0x5a3010 })); tr.position.set(x, h / 2, z); scene.add(tr);
            if (palm) { for (let i = 0; i < 7; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.9, 5), new THREE.MeshLambertMaterial({ color: 0x1a6a1a })); f.position.set(x + Math.cos(i / 7 * Math.PI * 2) * 1.2, h, z + Math.sin(i / 7 * Math.PI * 2) * 1.2); f.rotation.z = 0.65; f.rotation.y = i / 7 * Math.PI * 2; scene.add(f); } }
            else { const top = new THREE.Mesh(new THREE.SphereGeometry((0.9 + Math.random() * 0.6) * sc, 8, 8), new THREE.MeshLambertMaterial({ color: 0x1a6a1a })); top.position.set(x, h + 0.7, z); scene.add(top); }
        }

        // Roads + trees ON ROAD EDGES (not in blocks)
        // Build occupied grid — only draw roads where districts exist
        const occupied = new Set(districts.map((_, di) => { const c2 = di % cols, r2 = Math.floor(di / cols); return r2 + '_' + c2; }));
        function hasDistrict(r2, c2) { return occupied.has(r2 + '_' + c2); }
        // Horizontal roads — only between cols that have at least one occupied block in that row
        for (let r = 0; r <= rows; r++) {
            const rz = oz + r * (BD + ROAD) + ROAD / 2;
            // Find first and last occupied column in this row (roads connect districts in same row)
            let minC = -1, maxC = -1;
            for (let c = 0; c < cols; c++) {
                const above = r > 0 && hasDistrict(r - 1, c); const below = r < rows && hasDistrict(r, c);
                if (above || below) { if (minC === -1) minC = c; maxC = c; }
            }
            if (minC === -1) continue;
            const x1 = ox + minC * (BW + ROAD); const x2 = ox + (maxC + 1) * (BW + ROAD) + ROAD;
            drawRoad(x1, rz, x2, rz, ROAD);
            for (let c = minC; c <= maxC; c++) {
                const tx = ox + c * (BW + ROAD) + ROAD + BW / 2;
                addTree(tx, rz - ROAD / 2 - 1.5, Math.random() > 0.5, 0.85);
                addTree(tx, rz + ROAD / 2 + 1.5, Math.random() > 0.5, 0.85);
                addLamp(ox + c * (BW + ROAD), rz + ROAD * 0.4);
            }
        }
        // Vertical roads — only between rows that have occupied blocks in that column
        for (let c = 0; c <= cols; c++) {
            const rx = ox + c * (BW + ROAD) + ROAD / 2;
            let minR = -1, maxR = -1;
            for (let r = 0; r < rows; r++) {
                const left = c > 0 && hasDistrict(r, c - 1); const right = c < cols && hasDistrict(r, c);
                if (left || right) { if (minR === -1) minR = r; maxR = r; }
            }
            if (minR === -1) continue;
            const z1 = oz + minR * (BD + ROAD); const z2 = oz + (maxR + 1) * (BD + ROAD) + ROAD;
            drawRoad(rx, z1, rx, z2, ROAD);
            for (let r = minR; r <= maxR; r++) {
                const tz = oz + r * (BD + ROAD) + ROAD + BD / 2;
                addTree(rx - ROAD / 2 - 1.5, tz, Math.random() > 0.5, 0.85);
                addTree(rx + ROAD / 2 + 1.5, tz, Math.random() > 0.5, 0.85);
            }
        }
        // Intersection patches only at occupied corners
        for (let r = 0; r <= rows; r++)for (let c = 0; c <= cols; c++) {
            const adj = (r > 0 && c > 0 && hasDistrict(r - 1, c - 1)) || (r > 0 && c < cols && hasDistrict(r - 1, c)) || (r < rows && c > 0 && hasDistrict(r, c - 1)) || (r < rows && c < cols && hasDistrict(r, c));
            if (!adj) continue;
            const ix = ox + c * (BW + ROAD) + ROAD / 2, iz = oz + r * (BD + ROAD) + ROAD / 2;
            const p = new THREE.Mesh(new THREE.BoxGeometry(ROAD, 0.19, ROAD), roadMat); p.position.set(ix, 0.095, iz); scene.add(p);
        }

        // Center monument
        const monP = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 14, 8), lampMat); monP.position.y = 7; scene.add(monP);
        const monTop = new THREE.Mesh(new THREE.SphereGeometry(1.6, 14, 14), new THREE.MeshLambertMaterial({ color: accentCol, emissive: accentCol.clone().multiplyScalar(0.6) })); monTop.position.y = 15; scene.add(monTop);
        const monLight = new THREE.PointLight(accentCol, 5, 55); monLight.position.y = 15; scene.add(monLight);

        // Sidewalk pads
        districts.forEach((dist, di) => {
            const col = di % cols, row = Math.floor(di / cols);
            const bx0 = ox + col * (BW + ROAD) + ROAD, bz0 = oz + row * (BD + ROAD) + ROAD;
            const sw = new THREE.Mesh(new THREE.BoxGeometry(BW, 0.28, BD), sidewMat); sw.position.set(bx0 + BW / 2, 0.14, bz0 + BD / 2); sw.receiveShadow = true; scene.add(sw);
        });

        // ── REAL CONTRIBUTION BUILDINGS ─────────────────────────────────────────
        const blockInfos = [];
        const buildingObjs = [];
        const skyBeams = [];
        const globalMax = stats.maxCount || 1;

        districts.forEach((dist, di) => {
            const col = di % cols, row = Math.floor(di / cols);
            const rand = rng(di * 6271 + 1);
            const bx0 = ox + col * (BW + ROAD) + ROAD, bz0 = oz + row * (BD + ROAD) + ROAD;
            const bCx = bx0 + BW / 2, bCz = bz0 + BD / 2;
            blockInfos.push({ x: bCx, z: bCz, w: BW, d: BD, label: dist.label, di });

            dist.cells.forEach(cell => {
                const { week, day, count, date } = cell;
                if (count === 0) return;
                const lw = dist.weeks.indexOf(week); if (lw === -1) return;
                const ratio = count / globalMax;
                const wx = bx0 + lw * CELL + CELL / 2, wz = bz0 + day * CELL + CELL / 2;
                const fw = CELL * 0.76, fd = CELL * 0.76;
                const bH = Math.max(2, ratio * 68 + (ratio > 0.5 ? ratio * 18 : 0));
                const lvl = Math.min(4, Math.ceil(ratio * 4));
                const bColor = hex3(theme.levels[lvl], THREE);
                const isSkyscraper = bH > 44, isHighrise = bH > 24 && !isSkyscraper;
                const finalColor = isSkyscraper ? bColor.clone().lerp(new THREE.Color(0.15, 0.3, 0.5), 0.45)
                    : isHighrise ? bColor.clone().lerp(new THREE.Color(0.4, 0.25, 0.15), 0.3)
                        : bColor.clone().lerp(new THREE.Color(0.2, 0.22, 0.3), 0.22);
                const bMat = new THREE.MeshLambertMaterial({ color: finalColor, emissive: finalColor.clone().multiplyScalar(0.28) });
                const bMesh = new THREE.Mesh(new THREE.BoxGeometry(fw, bH, fd), bMat);
                bMesh.position.set(wx, bH / 2 + 0.28, wz); bMesh.castShadow = true; bMesh.receiveShadow = true;
                bMesh.userData = { cell, origEmissive: bMat.emissive.clone(), distLabel: dist.label };
                scene.add(bMesh); buildingObjs.push({ mesh: bMesh, cell, wx, wz, distLabel: dist.label, bH });

                // Glass overlay
                if (isSkyscraper) {
                    const gm = new THREE.MeshLambertMaterial({ color: 0x4488bb, transparent: true, opacity: 0.28 });
                    const gf = new THREE.Mesh(new THREE.BoxGeometry(fw * 1.02, bH, fd * 1.02), gm); gf.position.set(wx, bH / 2 + 0.28, wz); scene.add(gf);
                }
                // Setbacks
                if (isSkyscraper && bH > 40) {
                    const t1H = bH * 0.28, t1 = new THREE.Mesh(new THREE.BoxGeometry(fw * 0.7, t1H, fd * 0.7), bMat); t1.position.set(wx, bH + t1H / 2 + 0.28, wz); t1.castShadow = true; scene.add(t1);
                    const t2H = bH * 0.14, t2 = new THREE.Mesh(new THREE.BoxGeometry(fw * 0.44, t2H, fd * 0.44), bMat); t2.position.set(wx, bH + t1H + t2H / 2 + 0.28, wz); t2.castShadow = true; scene.add(t2);
                    const spire = new THREE.Mesh(new THREE.ConeGeometry(fw * 0.1, bH * 0.28, 8), new THREE.MeshLambertMaterial({ color: 0xaaaacc })); spire.position.set(wx, bH + t1H + t2H + bH * 0.14 + 0.28, wz); scene.add(spire);
                    // SILVER SKY BEAM
                    if (ratio > 0.65) {
                        const beamMat = new THREE.MeshBasicMaterial({ color: 0xccddff, transparent: true, opacity: 0.055, side: THREE.DoubleSide });
                        const beam = new THREE.Mesh(new THREE.ConeGeometry(5, 250, 8, 1, true), beamMat);
                        const beamTop = bH + t1H + t2H + bH * 0.28 + 0.28; beam.rotation.x = Math.PI; beam.position.set(wx, beamTop - 125, wz); scene.add(beam);
                        const topLight = new THREE.PointLight(0xccddff, 4, 90); topLight.position.set(wx, beamTop, wz); scene.add(topLight);
                        skyBeams.push({ beam, off: rand() * Math.PI * 2 });
                    }
                } else if (isHighrise && bH > 20) {
                    const tH = bH * 0.24, t = new THREE.Mesh(new THREE.BoxGeometry(fw * 0.68, tH, fd * 0.68), bMat); t.position.set(wx, bH + tH / 2 + 0.28, wz); t.castShadow = true; scene.add(t);
                }

                // WINDOWS on all 4 faces
                if (bH > 3) {
                    const flH = 2.4, floors = Math.floor(bH / flH), wCX = Math.max(1, Math.floor(fw / 2.0)), wCZ = Math.max(1, Math.floor(fd / 2.0));
                    const r2 = rng(date ? parseInt(date.replace(/-/g, ""), 10) : di * 7 + day);
                    const wEmit = new THREE.Color(0.95, 0.82, 0.18);
                    for (let f = 0; f < Math.min(floors, 26); f++) {
                        const fy = f * flH + 1.4 + 0.28;
                        for (let cx2 = 0; cx2 < wCX; cx2++) {
                            const lit = r2() > 0.25; const wm = new THREE.MeshLambertMaterial({ color: 0xffe8a0, emissive: lit ? wEmit : new THREE.Color(0, 0, 0), transparent: true, opacity: lit ? 0.95 : 0.1 });
                            const wx2 = wx - fw / 2 + (cx2 + 0.5) * (fw / wCX);
                            const wf = new THREE.Mesh(new THREE.PlaneGeometry(fw / wCX * 0.62, flH * 0.58), wm); wf.position.set(wx2, fy, wz - fd / 2 - 0.01); scene.add(wf);
                            const wb = wf.clone(); wb.position.set(wx2, fy, wz + fd / 2 + 0.01); wb.rotation.y = Math.PI; scene.add(wb);
                        }
                        for (let cz2 = 0; cz2 < wCZ; cz2++) {
                            const lit = r2() > 0.25; const wm = new THREE.MeshLambertMaterial({ color: 0xffe8a0, emissive: lit ? wEmit : new THREE.Color(0, 0, 0), transparent: true, opacity: lit ? 0.95 : 0.1 });
                            const wz2 = wz - fd / 2 + (cz2 + 0.5) * (fd / wCZ);
                            const wl = new THREE.Mesh(new THREE.PlaneGeometry(fd / wCZ * 0.62, flH * 0.58), wm); wl.position.set(wx - fw / 2 - 0.01, fy, wz2); wl.rotation.y = -Math.PI / 2; scene.add(wl);
                            const wr = wl.clone(); wr.position.set(wx + fw / 2 + 0.01, fy, wz2); wr.rotation.y = Math.PI / 2; scene.add(wr);
                        }
                    }
                    if (bH > 28) { const bc = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), new THREE.MeshLambertMaterial({ color: 0xff2200, emissive: new THREE.Color(1, 0, 0) })); bc.position.set(wx, bH + 0.28 + 0.28, wz); scene.add(bc); }
                }
            });
        });

        // ── SKY BEAMS — only from peak building, multiple fan rays ──────────────
        // Pick single tallest building
        const peakBeam = skyBeams.reduce((a, b) => (!a || b.bH > a.bH) ? b : a, null);
        const finalBeams = [];
        if (peakBeam && peakBeam.wx !== undefined) {
            const { wx: pbx, wz: pbz, bH: pbH } = peakBeam;
            const topH = pbH;
            // Point light at top
            const pkLight = new THREE.PointLight(0x88aaff, 6, 120); pkLight.position.set(pbx, topH, pbz); scene.add(pkLight);
            // Beacon
            const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 10), new THREE.MeshLambertMaterial({ color: 0xaaccff, emissive: new THREE.Color(0.5, 0.6, 1) })); beacon.position.set(pbx, topH + 1.5, pbz); scene.add(beacon);
            // 12 laser rays fanning out in all directions
            for (let ri = 0; ri < 12; ri++) {
                const angle = ri / 12 * Math.PI * 2;
                // Each ray is a thin long cylinder tilted outward
                const rayLen = 280; const tiltAngle = Math.PI / 7; // tilt from vertical
                const rayGeo = new THREE.CylinderGeometry(0.25, 0.08, rayLen, 6, 1);
                const rayMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.07 });
                const ray = new THREE.Mesh(rayGeo, rayMat);
                // Position midpoint along ray direction
                const midX = pbx + Math.sin(angle) * Math.sin(tiltAngle) * rayLen / 2;
                const midY = topH + Math.cos(tiltAngle) * rayLen / 2;
                const midZ = pbz + Math.cos(angle) * Math.sin(tiltAngle) * rayLen / 2;
                ray.position.set(midX, midY, midZ);
                ray.rotation.z = tiltAngle; ray.rotation.y = angle;
                scene.add(ray);
                finalBeams.push({ mesh: ray, off: ri / 12 * Math.PI * 2, angle, tilt: tiltAngle, pbx, pbz, topH });
            }
            // Central vertical beam
            const vBeamMat = new THREE.MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.08, side: THREE.DoubleSide });
            const vBeam = new THREE.Mesh(new THREE.ConeGeometry(3, 300, 8, 1, true), vBeamMat);
            vBeam.rotation.x = Math.PI; vBeam.position.set(pbx, topH - 150, pbz); scene.add(vBeam);
            finalBeams.push({ mesh: vBeam, isVertical: true, pbx, pbz, topH });
        }
        // Replace skyBeams array content
        skyBeams.length = 0; finalBeams.forEach(b => skyBeams.push(b));

        // ── PLAYER CAR ──────────────────────────────────────────────────────────
        const carGroup = new THREE.Group();
        const cBMat = new THREE.MeshLambertMaterial({ color: accentCol });
        const cDark = new THREE.MeshLambertMaterial({ color: accentCol.clone().lerp(new THREE.Color(0, 0, 0), 0.4) });
        const cGls = new THREE.MeshLambertMaterial({ color: 0x334466, transparent: true, opacity: 0.7 });
        const cChr = new THREE.MeshLambertMaterial({ color: 0x888899 });

        // Body
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.55, 4.2), cBMat); body.position.y = 0.52; body.castShadow = true; carGroup.add(body);
        // Cabin
        const cab = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.5, 2.1), cBMat); cab.position.set(0, 0.97, -0.1); carGroup.add(cab);
        // Roof
        const roof = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 1.95), cDark); roof.position.set(0, 1.23, -0.1); carGroup.add(roof);
        // Hood
        const hood = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.2, 0.95), cBMat); hood.position.set(0, 0.73, -1.62); hood.rotation.x = 0.22; carGroup.add(hood);
        // Front/rear bumpers
        const fBump = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.24, 0.18), cDark); fBump.position.set(0, 0.31, -2.12); carGroup.add(fBump);
        const rBump = fBump.clone(); rBump.position.set(0, 0.31, 2.12); carGroup.add(rBump);
        // Windshields
        const fWS = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.48, 0.07), cGls); fWS.position.set(0, 0.97, -1.23); fWS.rotation.x = -0.28; carGroup.add(fWS);
        const rWS = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.38, 0.07), cGls); rWS.position.set(0, 0.97, 0.98); rWS.rotation.x = 0.28; carGroup.add(rWS);
        // Side windows
        [-0.88, 0.88].forEach(sx => { const sw2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.36, 1.75), cGls); sw2.position.set(sx, 0.97, -0.1); carGroup.add(sw2); });
        // Wheels
        const wGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.25, 16);
        [[1.08, -1.42], [-1.08, -1.42], [1.08, 1.32], [-1.08, 1.32]].forEach(([wx2, wz2]) => {
            const w = new THREE.Mesh(wGeo, darkMat); w.rotation.z = Math.PI / 2; w.position.set(wx2, 0.28, wz2); w.castShadow = true; carGroup.add(w);
            const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.27, 8), cChr); rim.rotation.z = Math.PI / 2; rim.position.set(wx2 > 0 ? wx2 + 0.13 : wx2 - 0.13, 0.28, wz2); carGroup.add(rim);
        });
        // LED headlight strip
        const hlMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: new THREE.Color(0.95, 0.95, 0.95) });
        const hlStrip = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.07, 0.05), hlMat); hlStrip.position.set(0, 0.67, -2.13); carGroup.add(hlStrip);
        // DRL
        [-0.58, 0.58].forEach(hx => { const drl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.04), hlMat); drl.position.set(hx, 0.52, -2.14); carGroup.add(drl); });
        // Tail lights
        const tlMat = new THREE.MeshLambertMaterial({ color: 0xff1100, emissive: new THREE.Color(0.7, 0.1, 0) });
        const tl = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.07, 0.05), tlMat); tl.position.set(0, 0.67, 2.13); carGroup.add(tl);
        // Side skirts
        [-1.06, 1.06].forEach(sx => { const sk = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.11, 3.75), cDark); sk.position.set(sx, 0.18, 0); carGroup.add(sk); });
        // Headlights spot
        const hlSpot = new THREE.SpotLight(0xffffff, 2.5, 45, Math.PI / 7, 0.7); hlSpot.position.set(0, 0.8, -2.1); hlSpot.target.position.set(0, 0, -22); carGroup.add(hlSpot); carGroup.add(hlSpot.target);
        // GIT plate
        const plate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.27, 0.05), new THREE.MeshLambertMaterial({ color: 0xf5f5f0 })); plate.position.set(0, 0.37, -2.15); carGroup.add(plate);
        const lm = new THREE.MeshLambertMaterial({ color: 0x111111 });
        [[-0.3, 0], [0, 0], [0.3, 0]].forEach(([lx]) => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 0.06), lm); l.position.set(lx, 0.37, -2.18); carGroup.add(l); });

        const startSeg = roadSegs[Math.floor(roadSegs.length / 2)];
        carGroup.position.set(startSeg.x1 + startSeg.dx * startSeg.len * 0.3, 0, startSeg.z1 + startSeg.dz * startSeg.len * 0.3);
        carGroup.rotation.y = startSeg.angle + Math.PI;
        scene.add(carGroup);

        // ── AI TRAFFIC — on road segments, different lanes ───────────────────────
        const traffic = [];
        const trafficColors = [0xff3300, 0x0055ff, 0x33cc44, 0xffaa00, 0xcc22cc, 0x00cccc, 0xff8800, 0x8844ff, 0xffffff, 0x884400];

        function makeCar(color, segIdx, t, dir, laneOff) {
            const ag = new THREE.Group();
            const ab = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.52, 3.4), new THREE.MeshLambertMaterial({ color })); ab.position.y = 0.38; ag.add(ab);
            const acb = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.44, 1.8), new THREE.MeshLambertMaterial({ color })); acb.position.y = 0.8; ag.add(acb);
            [[0.85, -1.05], [-0.85, -1.05], [0.85, 1.0], [-0.85, 1.0]].forEach(([wx3, wz3]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.24, 10), darkMat); w.rotation.z = Math.PI / 2; w.position.set(wx3, 0.22, wz3); ag.add(w); });
            const tl2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.07, 0.05), new THREE.MeshLambertMaterial({ color: 0xff1100, emissive: new THREE.Color(0.5, 0, 0) })); tl2.position.set(0, 0.55, 1.72); ag.add(tl2);
            const s = roadSegs[segIdx]; ag.position.set(s.x1 + s.dx * s.len * t, 0, s.z1 + s.dz * s.len * t); ag.rotation.y = dir > 0 ? s.angle : s.angle + Math.PI; scene.add(ag);
            traffic.push({ group: ag, segIdx, t, speed: 2 + Math.random() * 2.5, dir, laneOff, type: "car" });
        }
        function makeTruck(color, segIdx, t, dir, laneOff) {
            const ag = new THREE.Group();
            // Cab
            const cab2 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 2.8), new THREE.MeshLambertMaterial({ color })); cab2.position.set(0, 0.85, -2.2); ag.add(cab2);
            // Trailer
            const trl = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.6, 6), new THREE.MeshLambertMaterial({ color: 0x888899 })); trl.position.set(0, 1.0, 1.5); ag.add(trl);
            [[1.0, -2.8], [-1.0, -2.8], [1.0, 0.5], [-1.0, 0.5], [1.0, 3.5], [-1.0, 3.5]].forEach(([wx3, wz3]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.32, 10), darkMat); w.rotation.z = Math.PI / 2; w.position.set(wx3, 0.32, wz3); ag.add(w); });
            const s = roadSegs[segIdx]; ag.position.set(s.x1 + s.dx * s.len * t, 0, s.z1 + s.dz * s.len * t); ag.rotation.y = dir > 0 ? s.angle : s.angle + Math.PI; scene.add(ag);
            traffic.push({ group: ag, segIdx, t, speed: 1.2 + Math.random() * 0.8, dir, laneOff, type: "truck" });
        }
        function makeBus(segIdx, t, dir, laneOff) {
            const ag = new THREE.Group();
            const bb = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.6, 9.5), new THREE.MeshLambertMaterial({ color: 0xffcc00 })); bb.position.y = 0.95; ag.add(bb);
            const bw = new THREE.Mesh(new THREE.BoxGeometry(2.52, 0.55, 7.5), new THREE.MeshLambertMaterial({ color: 0x88aacc, transparent: true, opacity: 0.7 })); bw.position.y = 1.4; ag.add(bw);
            [[1.18, -3.2], [-1.18, -3.2], [1.18, 0], [-1.18, 0], [1.18, 3.2], [-1.18, 3.2]].forEach(([wx3, wz3]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.34, 12), darkMat); w.rotation.z = Math.PI / 2; w.position.set(wx3, 0.3, wz3); ag.add(w); });
            const s = roadSegs[segIdx]; ag.position.set(s.x1 + s.dx * s.len * t, 0, s.z1 + s.dz * s.len * t); ag.rotation.y = dir > 0 ? s.angle : s.angle + Math.PI; scene.add(ag);
            traffic.push({ group: ag, segIdx, t, speed: 1.4 + Math.random() * 0.5, dir, laneOff, type: "bus" });
        }

        const N = Math.min(districts.length, 30);
        for (let i = 0; i < N; i++) {
            const si = i % roadSegs.length, t = Math.random(), d = Math.random() > 0.5 ? 1 : -1, lo = (Math.random() - .5) * 1.5;
            if (i % 8 === 0) makeTruck(trafficColors[i % trafficColors.length], si, t, d, lo);
            else if (i % 6 === 0) makeBus(si, t, d, lo);
            else makeCar(trafficColors[i % trafficColors.length], si, t, d, lo);
        }

        // ── PEDESTRIANS ────────────────────────────────────────────────────────
        const peds = [];
        const pedColors = [0xff8866, 0x88aaff, 0xffcc44, 0xbbffbb, 0xff88cc, 0xdddddd, 0xffaa55];
        districts.forEach((dist, di) => {
            if (di % 3 !== 0) return;
            const col = di % cols, row = Math.floor(di / cols);
            const bx0 = ox + col * (BW + ROAD) + ROAD, bz0 = oz + row * (BD + ROAD) + ROAD;
            const pg = new THREE.Group();
            const pc = pedColors[di % pedColors.length];
            const sM = new THREE.MeshLambertMaterial({ color: 0xffcc99 });
            const bM2 = new THREE.MeshLambertMaterial({ color: pc });
            const pM = new THREE.MeshLambertMaterial({ color: 0x334455 });
            const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.5, 0.22), bM2); torso.position.y = 0.86; pg.add(torso);
            const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.28), sM); head.position.y = 1.34; pg.add(head);
            const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.44, 0.14), bM2); armL.position.set(-0.28, 0.78, 0); pg.add(armL);
            const armR = armL.clone(); armR.position.set(0.28, 0.78, 0); pg.add(armR);
            const legL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.46, 0.15), pM); legL.position.set(-0.1, 0.26, 0); pg.add(legL);
            const legR = legL.clone(); legR.position.set(0.1, 0.26, 0); pg.add(legR);
            pg.position.set(bx0 - 1.8, 0, bz0 + BD / 2); pg.castShadow = true; scene.add(pg);
            peds.push({ group: pg, minZ: bz0, maxZ: bz0 + BD, dir: 1, phase: Math.random() * Math.PI * 2, legL, legR, armL, armR });
        });

        // ── AIRPLANE — simple + realistic, flies immediately ────────────────────
        function buildPlane(sc = 1) {
            const pg = new THREE.Group();
            const wM = new THREE.MeshLambertMaterial({ color: 0xddddee });
            const darkGM = new THREE.MeshLambertMaterial({ color: 0x333344 });
            const acM = new THREE.MeshLambertMaterial({ color: accentCol, emissive: accentCol.clone().multiplyScalar(0.4) });

            // Fuselage
            const fuse = new THREE.Mesh(new THREE.CylinderGeometry(1.3 * sc, 0.7 * sc, 18 * sc, 12), wM); fuse.rotation.z = Math.PI / 2; pg.add(fuse);
            const nose = new THREE.Mesh(new THREE.ConeGeometry(1.3 * sc, 4.5 * sc, 12), wM); nose.rotation.z = -Math.PI / 2; nose.position.set(-11.2 * sc, 0, 0); pg.add(nose);
            const tail = new THREE.Mesh(new THREE.ConeGeometry(0.7 * sc, 2.5 * sc, 10), wM); tail.rotation.z = Math.PI / 2; tail.position.set(10.5 * sc, 0, 0); pg.add(tail);

            // Swept main wings
            [[1, -0.2, 6], [1, -0.2, -6]].forEach(([rx, ry, rz]) => {
                const wing = new THREE.Mesh(new THREE.BoxGeometry(6 * sc, 0.2 * sc, 12 * sc), wM);
                wing.position.set(rx * sc, ry * sc, rz * sc); wing.rotation.y = rz > 0 ? -0.14 : 0.14; wing.rotation.x = 0.05; pg.add(wing);
                // Winglet
                const wlet = new THREE.Mesh(new THREE.BoxGeometry(0.7 * sc, 1.4 * sc, 0.12 * sc), wM);
                wlet.position.set(rx * sc, 0.8 * sc, (rz > 0 ? 12.5 : -12.5) * sc); pg.add(wlet);
                // Engine
                const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.85 * sc, 0.85 * sc, 4.5 * sc, 12), darkGM); eng.rotation.z = Math.PI / 2; eng.position.set(2.5 * sc, -1.0 * sc, rz * 0.62 * sc); pg.add(eng);
                // Engine ring
                const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.85 * sc, 0.12 * sc, 8, 12), acM); ring2.rotation.y = Math.PI / 2; ring2.position.set(0.2 * sc, -1.0 * sc, rz * 0.62 * sc); pg.add(ring2);
            });
            // H-stab
            const hs = new THREE.Mesh(new THREE.BoxGeometry(0.7 * sc, 0.18 * sc, 5.5 * sc), wM); hs.position.set(7.5 * sc, 0.3 * sc, 0); pg.add(hs);
            // V-fin
            const vf = new THREE.Mesh(new THREE.BoxGeometry(0.18 * sc, 3.5 * sc, 3.2 * sc), wM); vf.position.set(8 * sc, 2 * sc, 0); pg.add(vf);
            // Airline stripe
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(16 * sc, 0.6 * sc, 0.1 * sc), acM); stripe.position.set(-1 * sc, 0.8 * sc, -1.4 * sc); pg.add(stripe);
            const stripe2 = stripe.clone(); stripe2.position.set(-1 * sc, 0.8 * sc, 1.4 * sc); pg.add(stripe2);
            // Cockpit
            const cock = new THREE.Mesh(new THREE.BoxGeometry(0.1 * sc, 0.7 * sc, 2.5 * sc), new THREE.MeshLambertMaterial({ color: 0x88ccff, transparent: true, opacity: 0.8 })); cock.position.set(-9.5 * sc, 0.6 * sc, 0); pg.add(cock);
            // Nav lights
            const blR = new THREE.Mesh(new THREE.SphereGeometry(0.2 * sc, 6, 6), new THREE.MeshLambertMaterial({ color: 0xff0000, emissive: new THREE.Color(1, 0, 0) })); blR.position.set(-1.5 * sc, -0.3 * sc, 12.5 * sc); pg.add(blR);
            const blG = new THREE.Mesh(new THREE.SphereGeometry(0.2 * sc, 6, 6), new THREE.MeshLambertMaterial({ color: 0x00ff00, emissive: new THREE.Color(0, 1, 0) })); blG.position.set(-1.5 * sc, -0.3 * sc, -12.5 * sc); pg.add(blG);
            const blW = new THREE.Mesh(new THREE.SphereGeometry(0.22 * sc, 6, 6), new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: new THREE.Color(0.9, 0.9, 0.9) })); blW.position.set(9.5 * sc, 3.8 * sc, 0); pg.add(blW);
            // LANDING LIGHT underneath
            const ll2 = new THREE.Mesh(new THREE.SphereGeometry(0.3 * sc, 6, 6), new THREE.MeshLambertMaterial({ color: 0xffffee, emissive: new THREE.Color(1, 1, 0.9) })); ll2.position.set(-9 * sc, -1.3 * sc, 0); pg.add(ll2);
            const landLight = new THREE.SpotLight(0xffffcc, 3, 80, Math.PI / 10, 0.5); landLight.position.set(-9 * sc, -1.3 * sc, 0); landLight.target.position.set(-30 * sc, -30 * sc, 0); pg.add(landLight); pg.add(landLight.target);
            // Cabin windows row
            for (let w2 = 0; w2 < 6; w2++) {
                const cw = new THREE.Mesh(new THREE.BoxGeometry(0.1 * sc, 0.4 * sc, 0.7 * sc), new THREE.MeshLambertMaterial({ color: 0x88aacc, transparent: true, opacity: 0.7, emissive: new THREE.Color(0.1, 0.15, 0.25) }));
                cw.position.set(-5 * sc + w2 * 2 * sc, 0.9 * sc, -1.32 * sc); pg.add(cw);
                const cw2 = cw.clone(); cw2.position.set(-5 * sc + w2 * 2 * sc, 0.9 * sc, 1.32 * sc); pg.add(cw2);
            }
            return { group: pg, blR, blG, blW, ll: ll2 };
        }
        const { group: orbG, blR: orbBlR, blG: orbBlG, blW: orbBlW } = buildPlane(1.1);
        orbG.position.set(0, 72, 0); scene.add(orbG);
        const orbPlane = { group: orbG, blR: orbBlR, blG: orbBlG, blW: orbBlW, t: 0, r: Math.max(cityW, cityD) * 0.35 };

        // Pre-compute ray targets
        const rayMeshes = buildingObjs.map(b => b.mesh);
        const raycaster = new THREE.Raycaster();

        // Mouse
        const canvas = renderer.domElement;
        const mouse = mouseRef.current;
        const onMD = e => { mouse.down = true; mouse.lx = e.clientX; mouse.ly = e.clientY; mouse.orbit = true; };
        const onMU = () => { mouse.down = false; };
        const onMM = e => {
            const rect = canvas.getBoundingClientRect();
            hoverRef.current.nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            hoverRef.current.ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            if (!mouse.down) return;
            mouse.ox += (e.clientX - mouse.lx) * 0.008; mouse.oy = Math.max(0.05, Math.min(1.3, mouse.oy + (e.clientY - mouse.ly) * 0.006));
            mouse.lx = e.clientX; mouse.ly = e.clientY;
        };
        const onWH = e => { mouse.zoom = Math.max(0.15, Math.min(25, mouse.zoom * (e.deltaY > 0 ? 1.12 : 0.88))); };
        const onDC = () => { mouse.orbit = false; };
        canvas.addEventListener("mousedown", onMD); canvas.addEventListener("mouseup", onMU);
        canvas.addEventListener("mousemove", onMM); canvas.addEventListener("wheel", onWH, { passive: true });
        canvas.addEventListener("dblclick", onDC); canvas.addEventListener("contextmenu", e => e.preventDefault());
        const onKD = e => keysRef.current[e.key] = true;
        const onKU = e => keysRef.current[e.key] = false;
        window.addEventListener("keydown", onKD); window.addEventListener("keyup", onKU);
        const onResize = () => { if (!mountRef.current) return; const w2 = mountRef.current.clientWidth, h2 = mountRef.current.clientHeight; camera.aspect = w2 / h2; camera.updateProjectionMatrix(); renderer.setSize(w2, h2); };
        window.addEventListener("resize", onResize);

        function moveOnRoad(obj, dt, spd) {
            const seg = roadSegs[obj.segIdx]; if (!seg) return;
            obj.t += spd * dt / seg.len * obj.dir;
            if (obj.t > 1 || obj.t < 0) {
                obj.t = obj.t > 1 ? 0 : 1; let bi = obj.segIdx, bd2 = Infinity;
                const ex = obj.dir > 0 ? seg.x2 : seg.x1, ez = obj.dir > 0 ? seg.z2 : seg.z1;
                roadSegs.forEach((s, si) => { if (si === obj.segIdx) return; const d = Math.min(Math.sqrt((s.x1 - ex) ** 2 + (s.z1 - ez) ** 2), Math.sqrt((s.x2 - ex) ** 2 + (s.z2 - ez) ** 2)); if (d < bd2 && d < ROAD * 1.5) { bd2 = d; bi = si; } });
                obj.segIdx = bi; if (Math.random() > 0.7) obj.dir *= -1;
            }
            const s2 = roadSegs[obj.segIdx]; const t2 = Math.max(0, Math.min(1, obj.t));
            const px = s2.x1 + s2.dx * s2.len * t2, pz = s2.z1 + s2.dz * s2.len * t2;
            // Lane offset perpendicular — each vehicle has its own laneOff for randomness
            const perp = obj.laneOff || 1.8;
            obj.group.position.set(px - s2.dz * obj.dir * perp, 0, pz + s2.dx * obj.dir * perp);
            obj.group.rotation.y = obj.dir > 0 ? s2.angle : s2.angle + Math.PI;
        }

        const CAR_SPD = 13, TURN = 1.65;
        let lastT = performance.now(), prevNearest = null, hoverFr = 0;
        const camP = new THREE.Vector3(), camL = new THREE.Vector3(), orbitTgt = new THREE.Vector3();
        // Init camera right behind car
        camP.set(carGroup.position.x + Math.sin(carGroup.rotation.y) * 16, 9, carGroup.position.z + Math.cos(carGroup.rotation.y) * 16);

        function animate() {
            frameRef.current = requestAnimationFrame(animate);
            const now = performance.now(), dt = Math.min((now - lastT) / 1000, 0.05); lastT = now;
            const keys = keysRef.current, m = mouseRef.current, car = carGroup;

            // ── DAY/NIGHT UPDATE each frame ──
            const NM = nightRef.current;
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
            stars.visible = NM; moonMesh.visible = NM; sunDisc.visible = !NM; cloudGroup.visible = !NM;
            monLight.visible = NM; hlSpot.intensity = NM ? 2.5 : 0;
            gndMat.color.set(NM ? 0x090912 : 0x3a6a2a);

            // Drive — keep car.rotation.y purely from input, no road angle forcing
            let spd = 0;
            const fwdKey = keys["ArrowUp"] || keys["w"] || keys["W"];
            const bkKey = keys["ArrowDown"] || keys["s"] || keys["S"];
            if (keys["ArrowLeft"] || keys["a"] || keys["A"]) car.rotation.y += TURN * dt;
            if (keys["ArrowRight"] || keys["d"] || keys["D"]) car.rotation.y -= TURN * dt;
            // Forward direction strictly from car.rotation.y — NO tilt
            const fwdX = -Math.sin(car.rotation.y), fwdZ = -Math.cos(car.rotation.y);
            if (fwdKey) { car.position.x += fwdX * CAR_SPD * dt; car.position.z += fwdZ * CAR_SPD * dt; spd = CAR_SPD; m.orbit = false; }
            if (bkKey) { car.position.x -= fwdX * CAR_SPD * 0.5 * dt; car.position.z -= fwdZ * CAR_SPD * 0.5 * dt; spd = -CAR_SPD * 0.5; m.orbit = false; }
            // Gentle road pull ONLY sideways, never tilts car
            if (fwdKey || bkKey) {
                const sn = snapRoad(car.position.x, car.position.z, roadSegs);
                if (sn.dist < ROAD * 0.9) { car.position.x += (sn.x - car.position.x) * 0.04; car.position.z += (sn.z - car.position.z) * 0.04; }
            }
            car.position.y = 0; car.rotation.x = 0; car.rotation.z = 0; // ensure no tilt
            setKmh(Math.abs(Math.round(spd * 3.6 * 0.28)));

            // Camera — close follow, zoom via scroll
            if (m.orbit) {
                // Orbit around car — zoom out to see full city
                const dist = 16 * m.zoom;
                orbitTgt.lerp(car.position.clone(), 0.08);
                camP.lerp(new THREE.Vector3(
                    orbitTgt.x + dist * Math.sin(m.ox) * Math.cos(m.oy),
                    orbitTgt.y + Math.max(4, dist * Math.sin(m.oy)) + 2,
                    orbitTgt.z + dist * Math.cos(m.ox) * Math.cos(m.oy)
                ), 0.1);
                camL.lerp(orbitTgt.clone().add(new THREE.Vector3(0, 1, 0)), 0.1);
            } else {
                // Follow cam — snap to car quickly when driving starts
                const followDist = 14; const followH = 5.5;
                const idealX = car.position.x - fwdX * followDist;
                const idealZ = car.position.z - fwdZ * followDist;
                const snapSpeed = (fwdKey || bkKey) ? 0.18 : 0.08;
                camP.lerp(new THREE.Vector3(idealX, car.position.y + followH, idealZ), snapSpeed);
                camL.lerp(car.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 0.15);
                m.ox = car.rotation.y + Math.PI; m.oy = 0.3;
            }
            camera.position.copy(camP); camera.lookAt(camL);

            // Location
            let locLabel = "GitCity Roads";
            for (const bi of blockInfos) { if (Math.abs(car.position.x - bi.x) < bi.w / 2 + 3 && Math.abs(car.position.z - bi.z) < bi.d / 2 + 3) { locLabel = bi.label + " District"; break; } }
            if (Math.sqrt(car.position.x ** 2 + car.position.z ** 2) < 15) locLabel = "City Center ✦";
            setLoc(locLabel);

            // Traffic
            traffic.forEach(tc => moveOnRoad(tc, dt, tc.speed));

            // Pedestrians — patrol sidewalks
            peds.forEach(ped => {
                ped.phase += dt * 3.5; ped.group.position.z += ped.dir * 1.1 * dt;
                if (ped.group.position.z > ped.maxZ) { ped.dir = -1; ped.group.rotation.y = Math.PI; }
                if (ped.group.position.z < ped.minZ) { ped.dir = 1; ped.group.rotation.y = 0; }
                ped.legL.rotation.x = Math.sin(ped.phase) * 0.55; ped.legR.rotation.x = -Math.sin(ped.phase) * 0.55;
                ped.armL.rotation.x = -Math.sin(ped.phase) * 0.38; ped.armR.rotation.x = Math.sin(ped.phase) * 0.38;
            });

            // Sky beams sway
            skyBeams.forEach(sb => {
                if (sb.mesh) {
                    sb.mesh.visible = NM;
                    if (!sb.isVertical && sb.mesh.material.opacity !== undefined) {
                        // Slowly pulse opacity
                        sb.mesh.material.opacity = 0.04 + Math.abs(Math.sin(now * 0.0008 + sb.off)) * 0.06;
                    }
                }
            });

            // Orbital airplane
            orbPlane.t += dt; const ot = orbPlane.t;
            orbPlane.group.position.set(Math.cos(ot * 0.06) * orbPlane.r, 55 + Math.sin(ot * 0.04) * 8, Math.sin(ot * 0.06) * orbPlane.r);
            orbPlane.group.rotation.y = -(ot * 0.07 + Math.PI / 2); orbPlane.group.rotation.z = Math.sin(ot * 0.07) * 0.04;
            const ob = Math.sin(now * 0.0035) > 0.2;
            orbPlane.blR.material.emissive.set(ob ? 1 : 0, 0, 0); orbPlane.blG.material.emissive.set(0, ob ? 0 : 1, 0);
            orbPlane.blW.material.emissive.setScalar(Math.sin(now * 0.007) > 0.5 ? 0.9 : 0);

            // Building glow near car
            buildingObjs.forEach(bo => {
                const d2 = (bo.wx - car.position.x) ** 2 + (bo.wz - car.position.z) ** 2;
                if (d2 < 196) { bo.mesh.material.emissive.setRGB(accentCol.r * 0.5 * (1 - d2 / 196), accentCol.g * 0.5 * (1 - d2 / 196), accentCol.b * 0.5 * (1 - d2 / 196)); }
                else bo.mesh.material.emissive.copy(bo.mesh.userData.origEmissive);
            });

            // Hover raycasting
            hoverFr++; const isDriving = fwdKey || bkKey;
            if (!isDriving && hoverFr % 6 === 0 && rayMeshes.length > 0) {
                try {
                    raycaster.setFromCamera({ x: hoverRef.current.nx, y: hoverRef.current.ny }, camera);
                    const hits = raycaster.intersectObjects(rayMeshes, false);
                    if (hits.length > 0) {
                        const hitObj = buildingObjs.find(b => b.mesh === hits[0].object);
                        if (hitObj && hitObj !== prevNearest) {
                            prevNearest = hitObj; const p3 = new THREE.Vector3(hitObj.wx, hitObj.bH / 2, hitObj.wz); p3.project(camera);
                            setCard({ cell: hitObj.cell, x: Math.min((p3.x * .5 + .5) * W, W - 175), y: Math.max(8, (-p3.y * .5 + .5) * H - 130) });
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
            canvas.removeEventListener("mousedown", onMD); canvas.removeEventListener("mouseup", onMU);
            canvas.removeEventListener("mousemove", onMM); canvas.removeEventListener("wheel", onWH);
            canvas.removeEventListener("dblclick", onDC);
            window.removeEventListener("keydown", onKD); window.removeEventListener("keyup", onKU);
            window.removeEventListener("resize", onResize);
            try { renderer.dispose(); } catch (e) { }
        };
    }, [loaded, cells, theme, stats, districts, maxTotal]);

    if (error) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#ff6b6b", fontFamily: "monospace" }}>⚠ {error}</div>;
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

            {/* ADVANCED WELCOME */}
            {welcome && (
                <div style={{
                    position: "absolute", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden",
                    background: `radial-gradient(ellipse 80% 70% at 50% 40%, ${theme.surface}ee 0%, ${theme.bg}ff 70%)`,
                    backdropFilter: "blur(12px)"
                }}>
                    {/* Grid background */}
                    <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${theme.border}20 1px,transparent 1px),linear-gradient(90deg,${theme.border}20 1px,transparent 1px)`, backgroundSize: "40px 40px", animation: "gridSlide 3s linear infinite" }} />
                    {/* Scan line */}
                    <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${theme.accent},transparent)`, animation: "scanLine 2s ease-in-out infinite" }} />

                    <div style={{ position: "relative", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.2rem" }}>
                        {/* Icon */}
                        <div style={{ fontSize: "3rem", animation: "float 2s ease-in-out infinite", filter: `drop-shadow(0 0 20px ${theme.glow})` }}>⬡</div>
                        <div style={{ fontSize: "0.55rem", letterSpacing: "0.45em", color: theme.muted, textTransform: "uppercase", animation: "fadeInUp 0.6s ease both" }}>Welcome to</div>
                        {/* Main title */}
                        <div style={{
                            fontSize: "4rem", fontWeight: 900, color: theme.accent, letterSpacing: "-0.02em", lineHeight: 1,
                            textShadow: `0 0 40px ${theme.glow}90,0 0 80px ${theme.glow}40,0 0 120px ${theme.glow}20`,
                            animation: "titleReveal 0.8s cubic-bezier(0.2,0,0,1) 0.3s both"
                        }}>
                            GitCity
                        </div>
                        {username && (
                            <div style={{
                                fontSize: "1.1rem", color: theme.text, fontWeight: 600, letterSpacing: "0.05em",
                                animation: "fadeInUp 0.6s ease 0.7s both"
                            }}>
                                <span style={{ color: theme.muted, fontWeight: 400 }}>@</span>{username}
                            </div>
                        )}
                        {/* Stats row */}
                        <div style={{ display: "flex", gap: "2rem", marginTop: "0.5rem", animation: "fadeInUp 0.6s ease 1s both" }}>
                            {[
                                { v: cells.length, l: "Days Mapped" },
                                { v: districts.length, l: "Districts" },
                                { v: cells.filter(c => c.count > 0).length, l: "Active Days" },
                            ].map(({ v, l }) => (
                                <div key={l} style={{ textAlign: "center" }}>
                                    <div style={{ fontSize: "1.4rem", fontWeight: 800, color: theme.accent }}>{v.toLocaleString()}</div>
                                    <div style={{ fontSize: "0.52rem", color: theme.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>{l}</div>
                                </div>
                            ))}
                        </div>
                        {/* Pulsing bar */}
                        <div style={{ width: 200, height: 3, background: theme.border, borderRadius: 2, overflow: "hidden", marginTop: "0.5rem", animation: "fadeInUp 0.6s ease 1.2s both" }}>
                            <div style={{ height: "100%", background: `linear-gradient(90deg,${theme.accent},${theme.glow})`, borderRadius: 2, animation: "loadBar 3.2s ease forwards" }} />
                        </div>
                        <div style={{ fontSize: "0.55rem", color: theme.muted, letterSpacing: "0.12em", animation: "fadeInUp 0.6s ease 1.4s both" }}>
                            LOADING CITY…
                        </div>
                    </div>

                    <style>{`
            @keyframes gridSlide{to{background-position:0 40px;}}
            @keyframes scanLine{0%{top:-5%}100%{top:105%}}
            @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
            @keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
            @keyframes titleReveal{from{opacity:0;transform:scale(0.8) translateY(30px)}to{opacity:1;transform:scale(1) translateY(0)}}
            @keyframes loadBar{0%{width:0}100%{width:100%}}
          `}</style>
                </div>
            )}

            {/* Minimap */}
            <div style={{ position: "absolute", top: "0.6rem", left: "0.6rem", width: MM, height: MM, background: `${theme.surface}ee`, border: `1px solid ${theme.border}`, borderRadius: 8, overflow: "hidden", zIndex: 10 }}>
                {(mm.blocks || []).map((bi, i) => {
                    const bx2 = MM / 2 + (bi.x || 0) * ms, bz2 = MM / 2 + (bi.z || 0) * ms;
                    const bw2 = Math.max(2, (bi.w || 8) * ms), bd2 = Math.max(2, (bi.d || 8) * ms);
                    const d2 = districts[bi.di]; if (!d2) return null;
                    const int2 = (d2.total || 0) / maxTotal;
                    return <div key={i} style={{ position: "absolute", left: bx2 - bw2 / 2, top: bz2 - bd2 / 2, width: bw2, height: bd2, background: theme.levels[Math.min(4, Math.ceil(int2 * 4))], opacity: 0.7, borderRadius: 1 }} />;
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

            {/* Contribution card */}
            {card && (
                <div style={{ position: "absolute", left: card.x, top: card.y, background: `${theme.surface}f2`, border: `1px solid ${theme.accent}70`, borderRadius: 10, padding: "0.6rem 0.85rem", fontFamily: "monospace", fontSize: "0.63rem", color: theme.text, pointerEvents: "none", zIndex: 20, minWidth: 155, boxShadow: `0 0 24px ${theme.glow}35`, transition: "all 0.15s" }}>
                    <div style={{ height: 2, background: `linear-gradient(90deg,transparent,${theme.accent},transparent)`, borderRadius: 1, marginBottom: "0.4rem" }} />
                    <div style={{ color: theme.accent, fontWeight: 700, fontSize: "0.88rem" }}>{card.cell.count} commit{card.cell.count !== 1 ? "s" : ""}</div>
                    <div style={{ opacity: 0.85, marginTop: "0.18rem", fontSize: "0.6rem" }}>{new Date(card.cell.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</div>
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: "0.38rem" }}>
                        {Array.from({ length: Math.min(card.cell.count, 16) }).map((_, i) => <div key={i} style={{ width: 6, height: 6, borderRadius: 1, background: theme.accent, opacity: 0.8 }} />)}
                        {card.cell.count > 16 && <span style={{ color: theme.muted, fontSize: "0.52rem", alignSelf: "center" }}>+{card.cell.count - 16}</span>}
                    </div>
                </div>
            )}

            {/* Controls */}
            <div style={{ position: "absolute", bottom: "0.6rem", left: "0.6rem", fontFamily: "monospace", zIndex: 10 }}>
                <button onClick={() => setShowHelp(h => !h)} style={{ background: `${theme.surface}cc`, border: `1px solid ${theme.border}`, borderRadius: 5, padding: "0.28rem 0.55rem", cursor: "pointer", color: theme.muted, fontSize: "0.55rem", fontFamily: "inherit" }}>{showHelp ? "▼ hide" : "▲ controls"}</button>
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

            {/* Day/Night */}
            <button onClick={() => setNight(n => !n)} style={{ position: "absolute", bottom: "0.6rem", right: "0.6rem", background: `${theme.surface}cc`, border: `1px solid ${night ? theme.accent : theme.border}`, borderRadius: 6, padding: "0.32rem 0.7rem", cursor: "pointer", color: night ? theme.accent : theme.muted, fontSize: "0.58rem", fontFamily: "monospace", letterSpacing: "0.08em", zIndex: 10 }}>
                {night ? "☀ Day" : "☾ Night"}
            </button>
        </div>
    );
}