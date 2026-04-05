/**
 * WeatherSystem.js — GitCity
 * Weather effects: Rain + Thunder | Tornado | Spring (dry leaves) | Clear
 *
 * Usage in CitySimulation.jsx:
 *   import { createWeatherSystem } from "./WeatherSystem";
 *   const weather = createWeatherSystem(scene, THREE, cityW, cityD);
 *   weather.setMode("rain"); // 'rain' | 'thunder' | 'tornado' | 'spring' | 'clear'
 *   // in animate loop:
 *   weather.update(dt, performance.now());
 *   // cleanup:
 *   weather.dispose();
 */

export function createWeatherSystem(scene, THREE, cityW = 200, cityD = 200) {

    // ── Internal state ──────────────────────────────────────────────────────────
    let mode = "clear";
    let rainSystem = null;
    let tornadoGroup = null;
    let springSystem = null;
    let lightningMesh = null;
    let lightningLight = null;
    let thunderTimer = 0;
    let thunderInterval = 3;
    let lightningVisible = false;
    let lightningFlashTimer = 0;

    // Sky overlay for stormy atmosphere
    const skyOverlay = new THREE.Mesh(
        new THREE.PlaneGeometry(2000, 2000),
        new THREE.MeshBasicMaterial({
            color: 0x111122,
            transparent: true,
            opacity: 0,
            depthWrite: false,
        })
    );
    skyOverlay.rotation.x = -Math.PI / 2;
    skyOverlay.position.y = 300;
    scene.add(skyOverlay);

    // ── RAIN SYSTEM ─────────────────────────────────────────────────────────────
    function createRain() {
        if (rainSystem) return;
        const COUNT = 4000;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(COUNT * 3);
        const velocities = new Float32Array(COUNT); // y velocity per drop

        const spread = Math.max(cityW, cityD) * 1.5;
        for (let i = 0; i < COUNT; i++) {
            positions[i * 3] = (Math.random() - 0.5) * spread;
            positions[i * 3 + 1] = Math.random() * 160 + 20;
            positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
            velocities[i] = 55 + Math.random() * 35; // fall speed
        }

        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geo.setAttribute("velocity", new THREE.BufferAttribute(velocities, 1));

        const mat = new THREE.PointsMaterial({
            color: 0x99bbdd,
            size: 0.35,
            transparent: true,
            opacity: 0.65,
            depthWrite: false,
        });

        rainSystem = new THREE.Points(geo, mat);
        rainSystem.userData.velocities = velocities;
        rainSystem.userData.spread = spread;
        scene.add(rainSystem);
    }

    function updateRain(dt) {
        if (!rainSystem) return;
        const pos = rainSystem.geometry.attributes.position.array;
        const vel = rainSystem.userData.velocities;
        const spread = rainSystem.userData.spread;

        for (let i = 0; i < vel.length; i++) {
            pos[i * 3 + 1] -= vel[i] * dt;
            // Wind drift
            pos[i * 3] -= 4 * dt;
            if (pos[i * 3 + 1] < 0) {
                pos[i * 3] = (Math.random() - 0.5) * spread;
                pos[i * 3 + 1] = 160 + Math.random() * 40;
                pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
            }
        }
        rainSystem.geometry.attributes.position.needsUpdate = true;
    }

    function disposeRain() {
        if (!rainSystem) return;
        rainSystem.geometry.dispose();
        rainSystem.material.dispose();
        scene.remove(rainSystem);
        rainSystem = null;
    }

    // ── THUNDER / LIGHTNING ──────────────────────────────────────────────────────
    function createLightning() {
        // Zigzag bolt geometry
        const points = [];
        const segments = 12;
        const startY = 180;
        const endY = 2;
        let x = (Math.random() - 0.5) * cityW * 0.8;
        let z = (Math.random() - 0.5) * cityD * 0.8;

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const y = startY - t * (startY - endY);
            x += (Math.random() - 0.5) * 12;
            z += (Math.random() - 0.5) * 12;
            points.push(new THREE.Vector3(x, y, z));
        }

        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const mat = new THREE.LineBasicMaterial({
            color: 0xeeeeff,
            linewidth: 2,
            transparent: true,
            opacity: 1,
        });

        if (lightningMesh) {
            scene.remove(lightningMesh);
            lightningMesh.geometry.dispose();
            lightningMesh.material.dispose();
        }
        lightningMesh = new THREE.Line(geo, mat);
        scene.add(lightningMesh);

        // Flash light
        if (!lightningLight) {
            lightningLight = new THREE.PointLight(0xaaaaff, 0, 600);
            lightningLight.position.set(x, 100, z);
            scene.add(lightningLight);
        } else {
            lightningLight.position.set(x, 100, z);
        }

        lightningVisible = true;
        lightningFlashTimer = 0.18; // visible for 180ms
        lightningLight.intensity = 8;
    }

    function disposeLightning() {
        if (lightningMesh) {
            scene.remove(lightningMesh);
            lightningMesh.geometry.dispose();
            lightningMesh.material.dispose();
            lightningMesh = null;
        }
        if (lightningLight) {
            scene.remove(lightningLight);
            lightningLight = null;
        }
        lightningVisible = false;
    }

    function updateThunder(dt, now) {
        thunderTimer -= dt;
        if (thunderTimer <= 0) {
            createLightning();
            thunderTimer = thunderInterval + Math.random() * 4; // next strike in 3-7s
        }
        if (lightningVisible) {
            lightningFlashTimer -= dt;
            // Double flash effect
            if (lightningFlashTimer < 0.08 && lightningFlashTimer > 0) {
                if (lightningMesh) lightningMesh.material.opacity = Math.random() > 0.4 ? 1 : 0;
                if (lightningLight) lightningLight.intensity = Math.random() * 10;
            }
            if (lightningFlashTimer <= 0) {
                lightningVisible = false;
                if (lightningMesh) lightningMesh.material.opacity = 0;
                if (lightningLight) lightningLight.intensity = 0;
            }
        }
    }

    // ── TORNADO ──────────────────────────────────────────────────────────────────
    function createTornado() {
        if (tornadoGroup) return;
        tornadoGroup = new THREE.Group();

        // Funnel — wide at top, narrow at bottom
        const SEGMENTS = 18;
        const HEIGHT = 120;
        const layers = 30;

        for (let l = 0; l < layers; l++) {
            const t = l / layers;
            const y = t * HEIGHT;
            const radius = 1.5 + t * 22; // narrow bottom, wide top
            const ringGeo = new THREE.TorusGeometry(radius, 0.3 + t * 0.5, 6, SEGMENTS);
            const ringMat = new THREE.MeshBasicMaterial({
                color: new THREE.Color(0.4 + t * 0.3, 0.35 + t * 0.2, 0.3 + t * 0.2),
                transparent: true,
                opacity: 0.25 - t * 0.1,
                wireframe: false,
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.y = y;
            ring.rotation.x = Math.PI / 2;
            tornadoGroup.add(ring);
        }

        // Debris particles
        const debrisCount = 200;
        const debrisGeo = new THREE.BufferGeometry();
        const debrisPos = new Float32Array(debrisCount * 3);
        const debrisAngle = new Float32Array(debrisCount);
        const debrisH = new Float32Array(debrisCount);
        const debrisR = new Float32Array(debrisCount);

        for (let i = 0; i < debrisCount; i++) {
            debrisAngle[i] = Math.random() * Math.PI * 2;
            debrisH[i] = Math.random() * HEIGHT;
            const t = debrisH[i] / HEIGHT;
            debrisR[i] = 1.5 + t * 22 + (Math.random() - 0.5) * 5;
            debrisPos[i * 3] = Math.cos(debrisAngle[i]) * debrisR[i];
            debrisPos[i * 3 + 1] = debrisH[i];
            debrisPos[i * 3 + 2] = Math.sin(debrisAngle[i]) * debrisR[i];
        }

        debrisGeo.setAttribute("position", new THREE.BufferAttribute(debrisPos, 3));
        const debrisMat = new THREE.PointsMaterial({
            color: 0x886644,
            size: 0.8,
            transparent: true,
            opacity: 0.8,
        });
        const debris = new THREE.Points(debrisGeo, debrisMat);
        tornadoGroup.add(debris);

        // Store for animation
        tornadoGroup.userData = {
            debris, debrisAngle, debrisH, debrisR,
            debrisCount, HEIGHT, rotSpeed: 3.5,
        };

        // Place tornado at city edge moving inward
        tornadoGroup.position.set(cityW * 0.6, 0, (Math.random() - 0.5) * cityD * 0.5);
        scene.add(tornadoGroup);
    }

    function updateTornado(dt, now) {
        if (!tornadoGroup) return;
        const ud = tornadoGroup.userData;

        // Spin funnel rings
        tornadoGroup.children.forEach((child, i) => {
            if (child.type === "Mesh") {
                child.rotation.z += ud.rotSpeed * dt * (1 + i * 0.02);
            }
        });

        // Animate debris
        const pos = ud.debris.geometry.attributes.position.array;
        for (let i = 0; i < ud.debrisCount; i++) {
            ud.debrisAngle[i] += (ud.rotSpeed + Math.random() * 0.5) * dt;
            ud.debrisH[i] += (15 + Math.random() * 10) * dt;
            if (ud.debrisH[i] > ud.HEIGHT) ud.debrisH[i] = Math.random() * 10;
            const t = ud.debrisH[i] / ud.HEIGHT;
            ud.debrisR[i] = 1.5 + t * 22 + Math.sin(now * 0.003 + i) * 2;
            pos[i * 3] = Math.cos(ud.debrisAngle[i]) * ud.debrisR[i];
            pos[i * 3 + 1] = ud.debrisH[i];
            pos[i * 3 + 2] = Math.sin(ud.debrisAngle[i]) * ud.debrisR[i];
        }
        ud.debris.geometry.attributes.position.needsUpdate = true;

        // Move tornado slowly across city
        tornadoGroup.position.x -= 8 * dt;
        if (tornadoGroup.position.x < -cityW * 0.8) {
            tornadoGroup.position.x = cityW * 0.8;
            tornadoGroup.position.z = (Math.random() - 0.5) * cityD * 0.5;
        }
    }

    function disposeTornado() {
        if (!tornadoGroup) return;
        tornadoGroup.children.forEach(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
        });
        scene.remove(tornadoGroup);
        tornadoGroup = null;
    }

    // ── SPRING — DRY LEAVES ──────────────────────────────────────────────────────
    function createSpring() {
        if (springSystem) return;
        const COUNT = 600;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(COUNT * 3);
        const spread = Math.max(cityW, cityD) * 1.2;

        // Leaf angles and speeds
        const angles = new Float32Array(COUNT);
        const speeds = new Float32Array(COUNT);
        const radii = new Float32Array(COUNT);
        const heights = new Float32Array(COUNT);

        for (let i = 0; i < COUNT; i++) {
            angles[i] = Math.random() * Math.PI * 2;
            speeds[i] = 0.4 + Math.random() * 0.8;
            radii[i] = 5 + Math.random() * spread * 0.5;
            heights[i] = Math.random() * 40 + 1;
            pos[i * 3] = Math.cos(angles[i]) * radii[i];
            pos[i * 3 + 1] = heights[i];
            pos[i * 3 + 2] = Math.sin(angles[i]) * radii[i];
        }

        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

        // Leaf colors — autumn mix
        const colors = new Float32Array(COUNT * 3);
        const leafColors = [
            [0.85, 0.3, 0.05],  // deep orange
            [0.9, 0.6, 0.1],   // golden yellow
            [0.7, 0.15, 0.05], // dark red
            [0.95, 0.5, 0.0],   // orange
            [0.6, 0.5, 0.1],   // olive brown
        ];
        for (let i = 0; i < COUNT; i++) {
            const c = leafColors[Math.floor(Math.random() * leafColors.length)];
            colors[i * 3] = c[0];
            colors[i * 3 + 1] = c[1];
            colors[i * 3 + 2] = c[2];
        }
        geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({
            size: 1.2,
            vertexColors: true,
            transparent: true,
            opacity: 0.88,
            depthWrite: false,
        });

        springSystem = new THREE.Points(geo, mat);
        springSystem.userData = { angles, speeds, radii, heights, COUNT, spread };
        scene.add(springSystem);
    }

    function updateSpring(dt, now) {
        if (!springSystem) return;
        const ud = springSystem.userData;
        const pos = springSystem.geometry.attributes.position.array;

        for (let i = 0; i < ud.COUNT; i++) {
            // Spiral outward + upward + swirl
            ud.angles[i] += ud.speeds[i] * dt;
            ud.heights[i] += (2 + Math.sin(now * 0.001 + i) * 1.5) * dt;
            ud.radii[i] += 0.5 * dt;

            // Gentle bobbing
            const bob = Math.sin(now * 0.002 + i * 0.7) * 1.5;

            pos[i * 3] = Math.cos(ud.angles[i]) * ud.radii[i];
            pos[i * 3 + 1] = ud.heights[i] + bob;
            pos[i * 3 + 2] = Math.sin(ud.angles[i]) * ud.radii[i];

            // Reset when too high or too far
            if (ud.heights[i] > 60 || ud.radii[i] > ud.spread * 0.7) {
                ud.angles[i] = Math.random() * Math.PI * 2;
                ud.heights[i] = Math.random() * 5 + 0.5;
                ud.radii[i] = 3 + Math.random() * 20;
            }
        }
        springSystem.geometry.attributes.position.needsUpdate = true;
        // Slowly rotate whole system
        springSystem.rotation.y += 0.08 * dt;
    }

    function disposeSpring() {
        if (!springSystem) return;
        springSystem.geometry.dispose();
        springSystem.material.dispose();
        scene.remove(springSystem);
        springSystem = null;
    }

    // ── SKY OVERLAY ──────────────────────────────────────────────────────────────
    function setSkyOverlay(opacity, color = 0x111122) {
        skyOverlay.material.color.set(color);
        skyOverlay.material.opacity = opacity;
    }

    // ── PUBLIC API ───────────────────────────────────────────────────────────────

    function setMode(newMode) {
        if (newMode === mode) return;

        // Cleanup previous
        disposeRain();
        disposeLightning();
        disposeTornado();
        disposeSpring();
        setSkyOverlay(0);
        thunderTimer = 2;

        mode = newMode;

        switch (mode) {
            case "rain":
                createRain();
                setSkyOverlay(0.35, 0x0a0e1a);
                break;
            case "thunder":
                createRain();
                setSkyOverlay(0.5, 0x070a14);
                thunderTimer = 1.5;
                break;
            case "tornado":
                createTornado();
                setSkyOverlay(0.4, 0x1a1408);
                break;
            case "spring":
                createSpring();
                setSkyOverlay(0.05, 0x0a1408);
                break;
            case "clear":
            default:
                setSkyOverlay(0);
                break;
        }
    }

    function update(dt, now) {
        switch (mode) {
            case "rain":
                updateRain(dt);
                break;
            case "thunder":
                updateRain(dt);
                updateThunder(dt, now);
                break;
            case "tornado":
                updateTornado(dt, now);
                break;
            case "spring":
                updateSpring(dt, now);
                break;
            default:
                break;
        }
    }

    function getMode() { return mode; }

    function dispose() {
        disposeRain();
        disposeLightning();
        disposeTornado();
        disposeSpring();
        skyOverlay.geometry.dispose();
        skyOverlay.material.dispose();
        scene.remove(skyOverlay);
    }

    return { setMode, update, getMode, dispose };
}