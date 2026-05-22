/**
 * WeatherSystem.js 
 */

export function createWeatherSystem(scene, THREE, cityW = 200, cityD = 200) {
    let phase = "clear";

    // ── Storm particles ───────────────────────────────────────────────────────
    let stormPoints = null;
    let rainVel = null, rainPhase = null;

    // ── Lightning ─────────────────────────────────────────────────────────────
    let lightningGroup = null;
    let lightningLight = null;
    let thunderTimer = 2;
    let lightningVisible = false;
    let lightningFlashTimer = 0;

    // ── Splatters ─────────────────────────────────────────────────────────────
    const splatters = [];
    const MAX_SPLAT = 40;
    let splatterTimer = 0;

    const spread = Math.max(cityW, cityD) * 1.6;
    const GROUND_Y = 0.18;
    const RAIN_COUNT = 3500;

    // ── Sky overlay ───────────────────────────────────────────────────────────
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

    // ── Generic point cloud helper ────────────────────────────────────────────
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

    // ── Splatters ─────────────────────────────────────────────────────────────
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

    // ── STORM RAIN ────────────────────────────────────────────────────────────
    function createStorm() {
        if (stormPoints) return;
        stormPoints = makePoints(RAIN_COUNT, spread, 0x88aacc, 0.20, 0.55);
        rainVel = new Float32Array(RAIN_COUNT);
        rainPhase = new Float32Array(RAIN_COUNT);

        const pos = stormPoints.geometry.attributes.position.array;
        for (let i = 0; i < RAIN_COUNT; i++) {
            rainVel[i] = 48 + Math.random() * 50;
            rainPhase[i] = Math.random() * Math.PI * 2;
            pos[i * 3 + 1] = Math.random() * 200;
        }
        stormPoints.geometry.attributes.position.needsUpdate = true;
        scene.add(stormPoints);
        thunderTimer = 1.0;
    }

    function tickStorm(dt, now) {
        if (!stormPoints) return;
        const pos = stormPoints.geometry.attributes.position.array;
        const windX = Math.sin(now * 0.0003) * 4.5;
        splatterTimer += dt;

        for (let i = 0; i < RAIN_COUNT; i++) {
            pos[i * 3] += (windX + Math.sin(rainPhase[i] + now * 0.001) * 0.8) * dt;
            pos[i * 3 + 1] -= rainVel[i] * dt;
            pos[i * 3 + 2] += Math.cos(rainPhase[i] * 0.7) * 0.6 * dt;

            if (pos[i * 3 + 1] < GROUND_Y) {
                if (splatterTimer > 0.06 && Math.random() < 0.022) {
                    spawnSplatter(pos[i * 3], pos[i * 3 + 2]);
                    splatterTimer = 0;
                }
                pos[i * 3] = (Math.random() - 0.5) * spread;
                pos[i * 3 + 1] = 185 + Math.random() * 40;
                pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
            }
        }
        stormPoints.geometry.attributes.position.needsUpdate = true;
        tickSplatters(dt);
        tickThunder(dt);
    }

    function disposeStorm() {
        disposePoints(stormPoints); stormPoints = null;
        rainVel = null; rainPhase = null;
        disposeLightning(); clearSplatters();
    }

    // ── LIGHTNING ─────────────────────────────────────────────────────────────
    function createLightning() {
        if (lightningGroup) {
            lightningGroup.children.forEach(c => { c.geometry.dispose(); c.material.dispose(); });
            scene.remove(lightningGroup);
        }
        lightningGroup = new THREE.Group();
        const pts = [];
        let lx = (Math.random() - 0.5) * cityW * 0.8, lz = (Math.random() - 0.5) * cityD * 0.8;
        for (let i = 0; i <= 14; i++) {
            pts.push(new THREE.Vector3(lx, 180 - i * 13, lz));
            lx += (Math.random() - 0.5) * 14;
            lz += (Math.random() - 0.5) * 14;
        }
        lightningGroup.add(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({ color: 0xddddff, transparent: true, opacity: 1 })
        ));
        const bPts = [pts[5].clone()];
        let bx = pts[5].x, bz2 = pts[5].z;
        for (let j = 0; j < 5; j++) {
            bx += (Math.random() - 0.5) * 12; bz2 += (Math.random() - 0.5) * 12;
            bPts.push(new THREE.Vector3(bx, pts[5].y - j * 18, bz2));
        }
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
        if (lightningGroup) {
            lightningGroup.children.forEach(c => { c.geometry.dispose(); c.material.dispose(); });
            scene.remove(lightningGroup); lightningGroup = null;
        }
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

    // ── PUBLIC API ─────────────────────────────────────────────────────────────
    function setPhase(newPhase) {
        if (newPhase === phase) return;
        phase = newPhase;

        switch (phase) {
            case "storm":
                createStorm();
                setSky(0.55, 0x060810);
                thunderTimer = 1.0;
                break;

            case "clear":
            default:
                disposeStorm();
                disposeLightning();
                clearSplatters();
                setSky(0);
                break;
        }
    }

    // Legacy setMode() shim
    function setMode(m) {
        if (m === "storm") setPhase("storm");
        else setPhase("clear");
    }

    function update(dt, now) {
        switch (phase) {
            case "storm":
                tickStorm(dt, now);
                break;
            case "clear":
            default:
                tickSplatters(dt);
                break;
        }
    }

    function getPhase() { return phase; }
    function getMode() { return phase; }

    function dispose() {
        disposeStorm(); disposeLightning();
        clearSplatters();
        skyOverlay.geometry.dispose(); skyOverlay.material.dispose(); scene.remove(skyOverlay);
    }

    return { setMode, setPhase, update, getPhase, getMode, dispose };
}