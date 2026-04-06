/**
 * WeatherSystem.js — GitCity v6
 * Modes: clear | storm | spring | snow
 * - Sand and Rain (standalone) removed
 * - Storm = rain drops + lightning/thunder
 * - All particles ACCUMULATE on ground plane (never disappear when hitting ground)
 * - Ground layers grow as simulation runs
 */

export function createWeatherSystem(scene, THREE, cityW = 200, cityD = 200) {
    let mode = "clear";

    // Active particle handles
    let stormPoints = null;
    let snowPoints = null;
    let leafInstanced = null;
    let leafData = null;

    // Ground accumulation meshes — persistent, grow over time
    let stormGround = null;   // puddles + sheen
    let snowGround = null;    // blanket + drifts
    let springGround = null;  // fallen leaf points (BufferGeometry, grown dynamically)

    // Accumulation scalars [0..1]
    let stormAccum = 0, snowAccum = 0, springAccum = 0;

    // Lightning
    let lightningGroup = null;
    let lightningLight = null;
    let thunderTimer = 2;
    let lightningVisible = false;
    let lightningFlashTimer = 0;

    // Splatter pool (rain impact rings)
    const splatters = [];
    const MAX_SPLAT = 40;
    let splatterTimer = 0;

    const spread = Math.max(cityW, cityD) * 1.6;
    const GROUND_Y = 0.18;
    const _dummy = new THREE.Object3D();

    // ── SKY OVERLAY ──────────────────────────────────────────────────────────
    const skyOverlay = new THREE.Mesh(
        new THREE.PlaneGeometry(3000, 3000),
        new THREE.MeshBasicMaterial({ color: 0x111122, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
    );
    skyOverlay.rotation.x = -Math.PI / 2;
    skyOverlay.position.y = 290;
    scene.add(skyOverlay);

    function setSky(opacity, color = 0x111122) {
        skyOverlay.material.color.set(color);
        skyOverlay.material.opacity = opacity;
    }

    // ── HELPERS ──────────────────────────────────────────────────────────────
    function makePoints(count, sp, color, size, opac) {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * sp;
            pos[i * 3 + 1] = Math.random() * 180 + 5;
            pos[i * 3 + 2] = (Math.random() - 0.5) * sp;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        return new THREE.Points(geo, new THREE.PointsMaterial({
            color, size, transparent: true, opacity: opac, depthWrite: false,
        }));
    }

    function disposePoints(pts) {
        if (!pts) return;
        pts.geometry.dispose(); pts.material.dispose(); scene.remove(pts);
    }

    // ── SPLATTERS (impact rings on ground) ───────────────────────────────────
    function spawnSplatter(x, z) {
        if (splatters.length >= MAX_SPLAT) {
            const old = splatters.shift();
            scene.remove(old); old.geometry.dispose(); old.material.dispose();
        }
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.04, 0.16, 7),
            new THREE.MeshBasicMaterial({ color: 0x88aacc, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(x, GROUND_Y + 0.02, z);
        ring.userData.age = 0; ring.userData.maxAge = 1.2;
        scene.add(ring); splatters.push(ring);
    }

    function tickSplatters(dt) {
        for (let i = splatters.length - 1; i >= 0; i--) {
            const s = splatters[i]; s.userData.age += dt;
            const p = s.userData.age / s.userData.maxAge;
            const sc = 1 + p * 3; s.scale.set(sc, sc, 1);
            s.material.opacity = 0.5 * (1 - p);
            if (p >= 1) { scene.remove(s); s.geometry.dispose(); s.material.dispose(); splatters.splice(i, 1); }
        }
    }

    function clearSplatters() {
        splatters.forEach(s => { scene.remove(s); s.geometry.dispose(); s.material.dispose(); });
        splatters.length = 0;
    }

    // ── STORM GROUND (puddles accumulate, never shrink while storm is on) ────
    function ensureStormGround() {
        if (stormGround) return;
        stormGround = { sheen: null, puddles: [] };

        stormGround.sheen = new THREE.Mesh(
            new THREE.PlaneGeometry(cityW * 2, cityD * 2),
            new THREE.MeshLambertMaterial({ color: 0x1a2a3a, transparent: true, opacity: 0 })
        );
        stormGround.sheen.rotation.x = -Math.PI / 2;
        stormGround.sheen.position.y = GROUND_Y + 0.01;
        scene.add(stormGround.sheen);

        for (let i = 0; i < 30; i++) {
            const r = 0.5 + Math.random() * 2;
            const p = new THREE.Mesh(
                new THREE.CircleGeometry(r, 8),
                new THREE.MeshLambertMaterial({ color: 0x1a3a66, transparent: true, opacity: 0 })
            );
            p.rotation.x = -Math.PI / 2;
            p.position.set((Math.random() - 0.5) * cityW * 1.5, GROUND_Y + 0.015, (Math.random() - 0.5) * cityD * 1.5);
            scene.add(p); stormGround.puddles.push(p);
        }
    }

    function tickStormGround() {
        if (!stormGround) return;
        // Only grow, never shrink
        stormGround.sheen.material.opacity = Math.min(0.35, stormAccum * 0.35);
        stormGround.puddles.forEach(p => { p.material.opacity = Math.min(0.65, stormAccum * 0.65); });
    }

    // ── SNOW GROUND (blanket grows, never melts while snow is on) ────────────
    function ensureSnowGround() {
        if (snowGround) return;
        snowGround = { blanket: null, drifts: [] };
        snowGround.blanket = new THREE.Mesh(
            new THREE.PlaneGeometry(cityW * 2, cityD * 2),
            new THREE.MeshLambertMaterial({ color: 0xeef2ff, transparent: true, opacity: 0 })
        );
        snowGround.blanket.rotation.x = -Math.PI / 2;
        snowGround.blanket.position.y = GROUND_Y + 0.02;
        scene.add(snowGround.blanket);

        for (let i = 0; i < 18; i++) {
            const d = new THREE.Mesh(
                new THREE.SphereGeometry(0.8 + Math.random() * 2.5, 6, 3),
                new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
            );
            d.scale.y = 0.13;
            d.position.set((Math.random() - 0.5) * cityW * 1.4, GROUND_Y + 0.08, (Math.random() - 0.5) * cityD * 1.4);
            scene.add(d); snowGround.drifts.push(d);
        }
    }

    function tickSnowGround() {
        if (!snowGround) return;
        // Only grow
        snowGround.blanket.material.opacity = Math.min(0.90, snowAccum * 0.90);
        snowGround.drifts.forEach(d => { d.material.opacity = Math.min(0.95, snowAccum * 0.95); });
    }

    // ── SPRING GROUND (fallen leaf points accumulate) ─────────────────────────
    // We keep a large pool and reveal more as accumulation grows
    const SPRING_GROUND_COUNT = 500;
    function ensureSpringGround() {
        if (springGround) return;
        const colors = [0xcc3300, 0xff6600, 0xaa2200, 0xdd8800, 0x886600];
        const pts = new Float32Array(SPRING_GROUND_COUNT * 3);
        const col = new Float32Array(SPRING_GROUND_COUNT * 3);
        for (let i = 0; i < SPRING_GROUND_COUNT; i++) {
            pts[i * 3] = (Math.random() - 0.5) * cityW * 1.6;
            pts[i * 3 + 1] = GROUND_Y + 0.01;
            pts[i * 3 + 2] = (Math.random() - 0.5) * cityD * 1.6;
            const c = new THREE.Color(colors[i % colors.length]);
            col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(pts, 3));
        geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
        springGround = new THREE.Points(geo, new THREE.PointsMaterial({
            size: 1.1, vertexColors: true, transparent: true, opacity: 0, depthWrite: false,
        }));
        // Start with drawRange 0 — we grow it as leaves land
        springGround.geometry.setDrawRange(0, 0);
        scene.add(springGround);
    }

    function tickSpringGround() {
        if (!springGround) return;
        // Reveal more points based on accumulation (only grow)
        const visible = Math.floor(springAccum * SPRING_GROUND_COUNT);
        springGround.geometry.setDrawRange(0, visible);
        springGround.material.opacity = Math.min(0.88, springAccum + 0.1);
    }

    // ── STORM RAIN PARTICLES ──────────────────────────────────────────────────
    // Raindrops bounce/pool on ground instead of teleporting up immediately
    const RAIN_COUNT = 3500;
    let rainVel = null, rainPhase = null, rainGrounded = null;

    function createStorm() {
        if (stormPoints) return;
        stormPoints = makePoints(RAIN_COUNT, spread, 0x88aacc, 0.20, 0.55);
        rainVel = new Float32Array(RAIN_COUNT);
        rainPhase = new Float32Array(RAIN_COUNT);
        rainGrounded = new Uint8Array(RAIN_COUNT); // 0 = falling, 1 = grounded/pooled

        const pos = stormPoints.geometry.attributes.position.array;
        for (let i = 0; i < RAIN_COUNT; i++) {
            rainVel[i] = 48 + Math.random() * 50;
            rainPhase[i] = Math.random() * Math.PI * 2;
            pos[i * 3 + 1] = Math.random() * 200; // stagger
            rainGrounded[i] = 0;
        }
        stormPoints.geometry.attributes.position.needsUpdate = true;
        scene.add(stormPoints);
        ensureStormGround();
        thunderTimer = 1.0;
    }

    function tickStorm(dt, now) {
        if (!stormPoints) return;
        const pos = stormPoints.geometry.attributes.position.array;
        const windX = Math.sin(now * 0.0003) * 4.5;
        splatterTimer += dt;

        // Grow accumulation only
        stormAccum = Math.min(1, stormAccum + dt * 0.04);

        // Fraction of drops that stay pooled on the ground (grows with accumulation)
        const poolFraction = stormAccum * 0.35; // up to 35% of drops stay on ground

        for (let i = 0; i < RAIN_COUNT; i++) {
            if (rainGrounded[i]) {
                // Pooled drop — stays near ground with tiny ripple movement
                pos[i * 3 + 1] = GROUND_Y + 0.01 + Math.sin(now * 0.002 + rainPhase[i]) * 0.008;
                continue;
            }

            pos[i * 3] += (windX + Math.sin(rainPhase[i] + now * 0.001) * 0.8) * dt;
            pos[i * 3 + 1] -= rainVel[i] * dt;
            pos[i * 3 + 2] += Math.cos(rainPhase[i] * 0.7) * 0.6 * dt;

            if (pos[i * 3 + 1] < GROUND_Y) {
                if (splatterTimer > 0.06 && Math.random() < 0.022) {
                    spawnSplatter(pos[i * 3], pos[i * 3 + 2]);
                    splatterTimer = 0;
                }
                // Decide: pool on ground or recycle back up
                if (Math.random() < poolFraction) {
                    rainGrounded[i] = 1; // this drop stays on ground
                    pos[i * 3 + 1] = GROUND_Y + 0.01;
                } else {
                    // Recycle — fly back up
                    pos[i * 3] = (Math.random() - 0.5) * spread;
                    pos[i * 3 + 1] = 185 + Math.random() * 40;
                    pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
                }
            }
        }
        stormPoints.geometry.attributes.position.needsUpdate = true;
        tickStormGround();
        tickSplatters(dt);
        tickThunder(dt, now);
    }

    function disposeStorm() {
        disposePoints(stormPoints); stormPoints = null;
        rainVel = null; rainPhase = null; rainGrounded = null;
        disposeLightning(); clearSplatters();
    }

    // ── SNOW PARTICLES ────────────────────────────────────────────────────────
    const SNOW_COUNT = 2000;
    let snowVelY = null, snowVelX = null, snowPhase = null, snowGrounded = null;

    function createSnow() {
        if (snowPoints) return;
        snowPoints = makePoints(SNOW_COUNT, spread, 0xffffff, 0.48, 0.84);
        snowVelY = new Float32Array(SNOW_COUNT);
        snowVelX = new Float32Array(SNOW_COUNT);
        snowPhase = new Float32Array(SNOW_COUNT);
        snowGrounded = new Uint8Array(SNOW_COUNT);

        const pos = snowPoints.geometry.attributes.position.array;
        for (let i = 0; i < SNOW_COUNT; i++) {
            snowVelY[i] = 2 + Math.random() * 3;
            snowVelX[i] = (Math.random() - 0.5) * 1.2;
            snowPhase[i] = Math.random() * Math.PI * 2;
            pos[i * 3 + 1] = Math.random() * 170;
            snowGrounded[i] = 0;
        }
        snowPoints.geometry.attributes.position.needsUpdate = true;
        scene.add(snowPoints);
        ensureSnowGround();
    }

    function tickSnow(dt, now) {
        if (!snowPoints) return;
        const pos = snowPoints.geometry.attributes.position.array;

        snowAccum = Math.min(1, snowAccum + dt * 0.008);
        const poolFraction = snowAccum * 0.50; // up to 50% of flakes settle

        for (let i = 0; i < SNOW_COUNT; i++) {
            if (snowGrounded[i]) {
                // Settled flake — gentle breath movement
                pos[i * 3] += Math.sin(now * 0.0004 + snowPhase[i]) * 0.002;
                continue;
            }

            const swirl = Math.sin(now * 0.0007 + snowPhase[i]) * 1.5;
            pos[i * 3] += (snowVelX[i] + swirl * 0.09) * dt;
            pos[i * 3 + 1] -= snowVelY[i] * dt;
            pos[i * 3 + 2] += Math.cos(now * 0.0006 + snowPhase[i]) * 0.35 * dt;

            if (pos[i * 3 + 1] < GROUND_Y) {
                if (Math.random() < poolFraction) {
                    snowGrounded[i] = 1;
                    pos[i * 3 + 1] = GROUND_Y + 0.01 + Math.random() * 0.04;
                } else {
                    pos[i * 3] = (Math.random() - 0.5) * spread;
                    pos[i * 3 + 1] = 155 + Math.random() * 28;
                    pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
                }
            }
        }
        snowPoints.geometry.attributes.position.needsUpdate = true;
        tickSnowGround();
    }

    function disposeSnow() {
        disposePoints(snowPoints); snowPoints = null;
        snowVelY = null; snowVelX = null; snowPhase = null; snowGrounded = null;
    }

    // ── SPRING LEAVES — InstancedMesh (1 draw call) ───────────────────────────
    const LEAF_COUNT = 280;

    function buildMapleGeo(s = 0.4) {
        const shape = new THREE.Shape();
        shape.moveTo(0, -s * 0.22);
        shape.bezierCurveTo(s * 0.28, -s * 0.04, s * 0.48, s * 0.18, s * 0.28, s * 0.36);
        shape.bezierCurveTo(s * 0.52, s * 0.28, s * 0.60, s * 0.52, s * 0.38, s * 0.62);
        shape.bezierCurveTo(s * 0.48, s * 0.80, s * 0.20, s * 0.86, 0, s * 0.82);
        shape.bezierCurveTo(-s * 0.20, s * 0.86, -s * 0.48, s * 0.80, -s * 0.38, s * 0.62);
        shape.bezierCurveTo(-s * 0.60, s * 0.52, -s * 0.52, s * 0.28, -s * 0.28, s * 0.36);
        shape.bezierCurveTo(-s * 0.48, s * 0.18, -s * 0.28, -s * 0.04, 0, -s * 0.22);
        return new THREE.ShapeGeometry(shape, 4);
    }

    function createSpring() {
        if (leafInstanced) return;
        const geo = buildMapleGeo(0.40);
        const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, transparent: true, opacity: 0.88, depthWrite: false });
        leafInstanced = new THREE.InstancedMesh(geo, mat, LEAF_COUNT);
        leafInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        const colArr = new Float32Array(LEAF_COUNT * 3);
        const palette = [0xcc3300, 0xff6600, 0xaa2200, 0xdd8800, 0x886600, 0xff4400, 0xffaa00];
        leafData = [];

        for (let i = 0; i < LEAF_COUNT; i++) {
            const c = new THREE.Color(palette[i % palette.length]);
            colArr[i * 3] = c.r; colArr[i * 3 + 1] = c.g; colArr[i * 3 + 2] = c.b;

            const d = {
                px: (Math.random() - 0.5) * spread,
                py: Math.random() * 120 + 12,
                pz: (Math.random() - 0.5) * spread,
                rx: Math.random() * Math.PI * 2, ry: Math.random() * Math.PI * 2, rz: Math.random() * Math.PI * 2,
                rxS: (Math.random() - 0.5) * 2.0,
                ryS: (Math.random() - 0.5) * 2.0,
                rzS: (Math.random() - 0.5) * 2.0,
                velX: (Math.random() - 0.5) * 1.1,
                velY: 1.5 + Math.random() * 2.0,
                velZ: (Math.random() - 0.5) * 1.1,
                sway: Math.random() * Math.PI * 2,
                bob: Math.random() * Math.PI * 2,
                scale: 0.6 + Math.random() * 0.75,
                grounded: false,
                // Once grounded, the leaf rests flat and stays forever
                groundX: 0, groundZ: 0,
            };
            leafData.push(d);

            _dummy.position.set(d.px, d.py, d.pz);
            _dummy.rotation.set(d.rx, d.ry, d.rz);
            _dummy.scale.setScalar(d.scale);
            _dummy.updateMatrix();
            leafInstanced.setMatrixAt(i, _dummy.matrix);
        }

        leafInstanced.instanceColor = new THREE.InstancedBufferAttribute(colArr, 3);
        leafInstanced.instanceColor.needsUpdate = true;
        scene.add(leafInstanced);
        ensureSpringGround();
    }

    function tickSpring(dt, now) {
        if (!leafInstanced || !leafData) return;
        let dirty = false;
        for (let i = 0; i < LEAF_COUNT; i++) {
            const d = leafData[i];
            if (d.grounded) {
                // Leaf rests flat on ground — very gentle wind rock
                d.rz += Math.sin(now * 0.0005 + d.sway) * 0.003;
                _dummy.position.set(d.px, d.py, d.pz);
                _dummy.rotation.set(d.rx, d.ry, d.rz);
                _dummy.scale.setScalar(d.scale);
                _dummy.updateMatrix();
                leafInstanced.setMatrixAt(i, _dummy.matrix);
                dirty = true;
                continue;
            }
            dirty = true;

            const sway = Math.sin(d.sway + now * 0.0013) * 1.3;
            const bob = Math.cos(d.bob + now * 0.0017) * 0.55;
            d.px += (d.velX + sway * 0.07) * dt;
            d.py -= (d.velY - bob * 0.18) * dt;
            d.pz += (d.velZ + Math.cos(d.sway + now * 0.001) * 0.3) * dt;
            d.rx += d.rxS * dt; d.ry += d.ryS * dt; d.rz += d.rzS * dt;

            if (d.py <= GROUND_Y + 0.06) {
                // Land flat and STAY
                d.py = GROUND_Y + 0.06;
                d.rx = -Math.PI / 2 + (Math.random() - 0.5) * 0.15;
                d.ry = Math.random() * Math.PI * 2;
                d.rz = Math.random() * Math.PI * 2;
                d.rxS = 0; d.ryS = 0; d.rzS = 0;
                d.velX = 0; d.velY = 0; d.velZ = 0;
                d.grounded = true;
                springAccum = Math.min(1, springAccum + 1 / LEAF_COUNT);
            }

            _dummy.position.set(d.px, d.py, d.pz);
            _dummy.rotation.set(d.rx, d.ry, d.rz);
            _dummy.scale.setScalar(d.scale);
            _dummy.updateMatrix();
            leafInstanced.setMatrixAt(i, _dummy.matrix);
        }
        if (dirty) leafInstanced.instanceMatrix.needsUpdate = true;
        springAccum = Math.min(1, springAccum + dt * 0.004);
        tickSpringGround();
    }

    function disposeSpring() {
        if (!leafInstanced) return;
        leafInstanced.geometry.dispose(); leafInstanced.material.dispose();
        scene.remove(leafInstanced); leafInstanced = null; leafData = null;
    }

    // ── LIGHTNING ─────────────────────────────────────────────────────────────
    function createLightning() {
        if (lightningGroup) {
            lightningGroup.children.forEach(c => { c.geometry.dispose(); c.material.dispose(); });
            scene.remove(lightningGroup);
        }
        lightningGroup = new THREE.Group();
        const pts = []; let lx = (Math.random() - 0.5) * cityW * 0.8, lz = (Math.random() - 0.5) * cityD * 0.8;
        for (let i = 0; i <= 14; i++) { pts.push(new THREE.Vector3(lx, 180 - i * 13, lz)); lx += (Math.random() - 0.5) * 14; lz += (Math.random() - 0.5) * 14; }
        lightningGroup.add(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({ color: 0xddddff, transparent: true, opacity: 1 })
        ));
        const bPts = [pts[5].clone()]; let bx = pts[5].x, bz2 = pts[5].z;
        for (let j = 0; j < 5; j++) { bx += (Math.random() - 0.5) * 12; bz2 += (Math.random() - 0.5) * 12; bPts.push(new THREE.Vector3(bx, pts[5].y - j * 18, bz2)); }
        lightningGroup.add(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(bPts),
            new THREE.LineBasicMaterial({ color: 0xbbbbff, transparent: true, opacity: 0.65 })
        ));
        scene.add(lightningGroup);
        if (!lightningLight) { lightningLight = new THREE.PointLight(0x9999ff, 0, 900); scene.add(lightningLight); }
        lightningLight.position.set(lx, 100, lz); lightningLight.intensity = 18;
        lightningVisible = true; lightningFlashTimer = 0.26;
    }

    function disposeLightning() {
        if (lightningGroup) { lightningGroup.children.forEach(c => { c.geometry.dispose(); c.material.dispose(); }); scene.remove(lightningGroup); lightningGroup = null; }
        if (lightningLight) { scene.remove(lightningLight); lightningLight = null; }
        lightningVisible = false;
    }

    function tickThunder(dt) {
        thunderTimer -= dt;
        if (thunderTimer <= 0) { createLightning(); thunderTimer = 2.5 + Math.random() * 4.5; }
        if (lightningVisible) {
            lightningFlashTimer -= dt;
            if (lightningFlashTimer < 0.12 && lightningFlashTimer > 0) {
                lightningGroup?.children.forEach(c => { c.material.opacity = Math.random() > 0.4 ? 1 : 0; });
                if (lightningLight) lightningLight.intensity = Math.random() * 20;
            }
            if (lightningFlashTimer <= 0) {
                lightningVisible = false;
                lightningGroup?.children.forEach(c => { c.material.opacity = 0; });
                if (lightningLight) lightningLight.intensity = 0;
            }
        }
    }

    // ── PUBLIC API ────────────────────────────────────────────────────────────
    function setMode(newMode) {
        if (newMode === mode) return;
        // Dispose active particles but KEEP ground accumulation meshes
        disposeStorm(); disposeSpring(); disposeSnow();
        setSky(0); thunderTimer = 2; mode = newMode;

        switch (mode) {
            case "storm": createStorm(); setSky(0.55, 0x060810); thunderTimer = 1.0; break;
            case "spring": createSpring(); setSky(0.04, 0x080f04); break;
            case "snow": createSnow(); setSky(0.19, 0x0d1020); break;
            default: break; // "clear"
        }
    }

    function update(dt, now) {
        switch (mode) {
            case "storm": tickStorm(dt, now); break;
            case "spring": tickSpring(dt, now); break;
            case "snow": tickSnow(dt, now); break;
            default: tickSplatters(dt); break;
        }
    }

    function getMode() { return mode; }

    function dispose() {
        disposeStorm(); disposeLightning(); disposeSpring(); disposeSnow();
        clearSplatters();
        if (stormGround) {
            stormGround.sheen.geometry.dispose(); stormGround.sheen.material.dispose(); scene.remove(stormGround.sheen);
            stormGround.puddles.forEach(p => { p.geometry.dispose(); p.material.dispose(); scene.remove(p); });
            stormGround = null;
        }
        if (snowGround) {
            snowGround.blanket.geometry.dispose(); snowGround.blanket.material.dispose(); scene.remove(snowGround.blanket);
            snowGround.drifts.forEach(d => { d.geometry.dispose(); d.material.dispose(); scene.remove(d); });
            snowGround = null;
        }
        if (springGround) { springGround.geometry.dispose(); springGround.material.dispose(); scene.remove(springGround); springGround = null; }
        skyOverlay.geometry.dispose(); skyOverlay.material.dispose(); scene.remove(skyOverlay);
    }

    return { setMode, update, getMode, dispose };
}