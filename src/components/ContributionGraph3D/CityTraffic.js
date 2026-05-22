/**
 * CityTraffic.js — GitCity v5 (Simulation-Grade)
 */

export function createTrafficSystem(scene, THREE, roadSegs, cityW, cityD, onCollision) {
    const LANE_OFFSET = 1.8;   // half-road-width lane separation
    const LANE_COUNT = 2;     // lanes per direction (1 = single, 2 = dual)
    const LANE_WIDTH = 1.9;   // width per lane
    const IDM_A = 2.8;   // max comfortable acceleration  m/s²
    const IDM_B = 5.5;   // comfortable braking           m/s²
    const IDM_T = 1.4;   // desired time headway          s
    const IDM_S0 = 2.2;   // minimum jam gap                m
    const IDM_DELTA = 4;     // free-flow exponent

    // Hard braking (emergency)
    const DECEL_HARD = 14.0;

    // Speed limits (m/s, roughly proportional to km/h display)
    const MAX_SPEED_CAR = 13.5;
    const MAX_SPEED_TRUCK = 8.5;
    const MAX_SPEED_BUS = 8.0;
    const AMBULANCE_SPD = 26;

    // Intersection geometry
    const INTER_RADIUS = 6.0;
    const STOP_LINE_DIST = 3.5;   // how far before intersection centre to stop

    // Traffic-light timing
    const LIGHT_GREEN = 10.0;  // seconds
    const LIGHT_YELLOW = 2.2;
    const LIGHT_RED = 10.0;
    const CYCLE_LEN = LIGHT_GREEN + LIGHT_YELLOW + LIGHT_RED;
    // hits each intersection on green
    const WAVE_SPEED = 10.0;

    // Lane change
    const LC_COOLDOWN = 5.0;   // seconds between lane changes
    const LC_SAFE_GAP = 10.0;  // gap required in target lane

    // Collision event
    const COLLISION_INTERVAL = 300;
    const EVENT_DURATION = 30;
    const MUSHROOM_DURATION = 8;

    // Exhaust
    const EXHAUST_EMIT_RATE = 0.08;  // seconds between puffs per vehicle
    const EXHAUST_LIFE = 1.8;   // puff lifetime seconds
    const EXHAUST_POOL = 400;   // max simultaneous puffs

    const traffic = [];
    const explosions = [];
    const lights = [];
    let ambulance = null;
    let globalTime = 0;

    let collisionTimer = 0;
    let lastCollisionTime = -COLLISION_INTERVAL;
    let activeEvent = null;

    const cameraShake = { active: false, intensity: 0, duration: 0, elapsed: 0 };

    // Exhaust particle pool
    const exhaustPool = [];
    const exhaustActive = [];
    const exhaustGeo = new THREE.SphereGeometry(0.18, 4, 4);
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const trafficColors = [
        0xff3300, 0x0055ff, 0x33cc44, 0xffaa00, 0xcc22cc,
        0x00cccc, 0xff8800, 0x8844ff, 0xffffff, 0x884400,
    ];

    // Pre-allocate exhaust materials (light grey → darker as puff ages)
    const exhaustMats = [0, 1, 2, 3].map(i => new THREE.MeshBasicMaterial({
        color: 0xaaaaaa,
        transparent: true,
        opacity: 0.35 - i * 0.07,
        depthWrite: false,
    }));

    function getExhaustMesh() {
        if (exhaustPool.length > 0) return exhaustPool.pop();
        const m = new THREE.Mesh(exhaustGeo, exhaustMats[0].clone());
        m.visible = false;
        scene.add(m);
        return m;
    }

    function recycleExhaust(p) {
        p.mesh.visible = false;
        exhaustPool.push(p.mesh);
        const idx = exhaustActive.indexOf(p);
        if (idx >= 0) exhaustActive.splice(idx, 1);
    }

    const intersections = (function buildIntersections() {
        const pts = [];
        roadSegs.forEach((s, si) => {
            [[s.x1, s.z1], [s.x2, s.z2]].forEach(([ex, ez]) => {
                let hit = null;
                for (const p of pts) {
                    if (Math.hypot(p.x - ex, p.z - ez) < 3.5) { hit = p; break; }
                }
                if (!hit) { hit = { x: ex, z: ez, segs: [] }; pts.push(hit); }
                if (!hit.segs.includes(si)) hit.segs.push(si);
            });
        });
        return pts.filter(p => p.segs.length >= 2);
    })();

    // Pre-compute road axis direction for each intersection (for green-wave offset)
    // We assign each intersection a "main axis" = direction of the longest connected road
    intersections.forEach(inter => {
        let bestLen = 0, bestAngle = 0;
        inter.segs.forEach(si => {
            const s = roadSegs[si];
            if (s.len > bestLen) { bestLen = s.len; bestAngle = s.angle; }
        });
        inter.mainAngle = bestAngle;
    });

    // TRAFFIC LIGHT SYSTEM — GREEN-WAVE SYNCHRONIZATION
    (function assignGreenWaveOffsets() {
        // Build adjacency chains along axis-aligned road segments
        const byX = [...intersections].sort((a, b) => a.x - b.x);
        let cumDistX = 0;
        for (let i = 0; i < byX.length; i++) {
            if (i > 0) cumDistX += Math.hypot(byX[i].x - byX[i - 1].x, byX[i].z - byX[i - 1].z);
            byX[i].waveOffsetX = cumDistX / WAVE_SPEED;
        }
        const byZ = [...intersections].sort((a, b) => a.z - b.z);
        let cumDistZ = 0;
        for (let i = 0; i < byZ.length; i++) {
            if (i > 0) cumDistZ += Math.hypot(byZ[i].x - byZ[i - 1].x, byZ[i].z - byZ[i - 1].z);
            byZ[i].waveOffsetZ = cumDistZ / WAVE_SPEED;
        }
        // Blend: use X-axis wave for intersections whose main road is roughly horizontal
        intersections.forEach(inter => {
            const isHorizontal = Math.abs(Math.cos(inter.mainAngle)) > 0.5;
            inter.phaseOffset = isHorizontal
                ? (inter.waveOffsetX || 0) % CYCLE_LEN
                : (inter.waveOffsetZ || 0) % CYCLE_LEN;
        });
    })();

    intersections.forEach(inter => {
        lights.push({ inter, state: "green", timeInState: 0 });
    });

    function updateLights(dt) {
        globalTime += dt;
        for (const l of lights) {
            const t = (globalTime + l.inter.phaseOffset) % CYCLE_LEN;
            l.state = t < LIGHT_GREEN ? "green"
                : t < LIGHT_GREEN + LIGHT_YELLOW ? "yellow"
                    : "red";
        }
    }

    function getLightStateAt(inter) {
        if (!inter) return "green";
        const l = lights.find(li => li.inter === inter);
        return l ? l.state : "green";
    }

    function nearestInter(x, z) {
        let best = null, bd = Infinity;
        for (const p of intersections) {
            const d = Math.hypot(p.x - x, p.z - z);
            if (d < bd) { bd = d; best = p; }
        }
        return bd < INTER_RADIUS * 2.5 ? { inter: best, dist: bd } : null;
    }

    function worldPos(v) {
        const s = roadSegs[v.segIdx];
        const t = Math.max(0, Math.min(1, v.t));
        // lateral offset = lane index * LANE_WIDTH, directed by dir & laneIdx
        const laneOff = LANE_OFFSET + v.laneIdx * LANE_WIDTH;
        return {
            x: s.x1 + s.dx * s.len * t - s.dz * (v.dir * laneOff),
            z: s.z1 + s.dz * s.len * t + s.dx * (v.dir * laneOff),
        };
    }

    // Exhaust pipe position (rear of vehicle, slightly elevated)
    function exhaustPos(v) {
        const s = roadSegs[v.segIdx];
        const t = Math.max(0, Math.min(1, v.t));
        const laneOff = LANE_OFFSET + v.laneIdx * LANE_WIDTH;
        // 1.6 m behind centre (rear), 0.25 m side for pipe
        const rearOffset = -v.dir * 1.6;
        const sideOff = 0.5;
        return {
            x: s.x1 + s.dx * (s.len * t + rearOffset) - s.dz * (v.dir * laneOff + sideOff),
            y: 0.32,
            z: s.z1 + s.dz * (s.len * t + rearOffset) + s.dx * (v.dir * laneOff + sideOff),
        };
    }
    // SAFETY-DISTANCE: speed-adaptive following gap
    //   safetyDist(v) = s0 + v * T  (kinematic safe stopping gap)
    function safetyDist(v) {
        return IDM_S0 + Math.max(0, v.currentSpeed) * IDM_T;
    }
 
     
    // GAP TO LEADER — same-segment, same-lane, ahead only
    function gapToLeader(vehicle) {
        const myPos = worldPos(vehicle);
        let minGap = Infinity, leader = null;

        for (const other of traffic) {
            if (other === vehicle || other.crashed) continue;
            if (other.segIdx !== vehicle.segIdx) continue;
            if (other.dir !== vehicle.dir) continue;
            if (other.laneIdx !== vehicle.laneIdx) continue;

            const ahead = vehicle.dir > 0 ? other.t > vehicle.t : other.t < vehicle.t;
            if (!ahead) continue;

            const op = worldPos(other);
            const gap = Math.hypot(op.x - myPos.x, op.z - myPos.z);
            const vLen = other.type === "bus" ? 5.2 : other.type === "truck" ? 4.0 : 2.0;
            const netGap = gap - vLen * 0.55;

            if (netGap < minGap) { minGap = netGap; leader = other; }
        }
        return { gap: minGap, leader };
    }

    // INTERSECTION BEHAVIOR — STOP / YIELD / GO
    function intersectionDecision(vehicle) {
        const seg = roadSegs[vehicle.segIdx];
        const tToEnd = vehicle.dir > 0 ? 1 - vehicle.t : vehicle.t;
        const distToEnd = tToEnd * seg.len;

        // Not near end of segment
        if (distToEnd > INTER_RADIUS * 2.8) return { action: "go" };

        const ex = vehicle.dir > 0 ? seg.x2 : seg.x1;
        const ez = vehicle.dir > 0 ? seg.z2 : seg.z1;
        const ni = nearestInter(ex, ez);
        if (!ni) return { action: "go" };

        const ls = getLightStateAt(ni.inter);
        const inBox = distToEnd < INTER_RADIUS;

        // --- RULE 1: RED --- hard stop before stop line
        if (ls === "red") {
            if (distToEnd > STOP_LINE_DIST) return { action: "stop", dist: distToEnd - STOP_LINE_DIST };
            return { action: "stopped" };
        }

        // --- RULE 2: YELLOW --- decelerate and stop if not yet past centre
        if (ls === "yellow") {
            if (distToEnd > STOP_LINE_DIST + 1.0)
                return { action: "decel", dist: distToEnd - STOP_LINE_DIST };
            return { action: "go" };  // already committed, proceed
        }

        // --- RULE 3: Conflicting vehicle in intersection box ---
        if (!inBox) {
            for (const other of traffic) {
                if (other === vehicle || other.crashed) continue;
                if (other.segIdx === vehicle.segIdx) continue;
                const op = worldPos(other);
                const dBox = Math.hypot(op.x - ni.inter.x, op.z - ni.inter.z);
                if (dBox < INTER_RADIUS * 0.85) {
                    const os = roadSegs[other.segIdx];
                    // Cross-traffic (angle between roads > 30°)
                    const dot = os.dx * seg.dx + os.dz * seg.dz;
                    if (Math.abs(dot) < 0.6) return { action: "yield", dist: distToEnd };
                }
            }

            // --- RULE 4: Give way to main road (more incoming segments = main road) ---
            const mySegs = ni.inter.segs.length;
            for (const other of traffic) {
                if (other === vehicle || other.crashed) continue;
                if (other.segIdx === vehicle.segIdx) continue;
                if (!ni.inter.segs.includes(other.segIdx)) continue;
                const otherInterSegs = ni.inter.segs.length;
                const op = worldPos(other);
                const d = Math.hypot(op.x - ni.inter.x, op.z - ni.inter.z);
                // Other vehicle is approaching the same intersection and we are secondary
                if (d < INTER_RADIUS * 1.8 && mySegs < otherInterSegs) {
                    return { action: "yield", dist: distToEnd };
                }
            }
        }

        return { action: "go" };
    }

     
    // IDM ACCELERATION — smooth S-curves via IDM formula
    //
    //  IDM: a = A * [1 - (v/v0)^δ - (s*(v,Δv)/s)^2]
    //  Returns signed acceleration m/s²
     
    function calcAccel(v, gapData, interDecision) {
        const spd = v.currentSpeed;
        const v0 = v.maxSpeed;

        // --- Intersection overrides ---
        if (interDecision.action === "stopped") {
            return spd > 0.1 ? -DECEL_HARD : 0;
        }
        if (interDecision.action === "stop" || interDecision.action === "yield") {
            // Treat intersection stop-line as a stationary "ghost leader" at dist
            const ghostGap = Math.max(0.1, interDecision.dist - IDM_S0);
            return idmWithLeader(spd, v0, ghostGap, 0, 0);
        }
        if (interDecision.action === "decel") {
            const ghostGap = Math.max(0.1, interDecision.dist);
            return idmWithLeader(spd, v0, ghostGap, 0, 0);
        }

        // --- Normal following ---
        const { gap, leader } = gapData;
        if (leader) {
            const leaderSpd = leader.currentSpeed;
            const deltaV = spd - leaderSpd;  // approaching speed
            return idmWithLeader(spd, v0, gap, deltaV, leader.currentSpeed);
        }

        // --- Free flow ---
        return IDM_A * (1 - Math.pow(Math.max(0, spd / v0), IDM_DELTA));
    }

    function idmWithLeader(v, v0, s, deltaV, vL) {
        const sStar = IDM_S0 + Math.max(0, v * IDM_T + (v * deltaV) / (2 * Math.sqrt(IDM_A * IDM_B)));
        const freeAcc = 1 - Math.pow(Math.max(0, v / v0), IDM_DELTA);
        const interAcc = -Math.pow(sStar / Math.max(s, 0.01), 2);
        return IDM_A * (freeAcc + interAcc);
    }
     
    // LANE-CHANGE SYSTEM
    function tryLaneChange(vehicle) {
        if (vehicle.laneCD > 0) return false;
        if (vehicle.crashed) return false;

        const { gap } = gapToLeader(vehicle);
        if (gap > safetyDist(vehicle) * 1.6) return false;  // current lane fine

        // Try adjacent lane indices
        for (let delta = -1; delta <= 1; delta += 2) {
            const targetLane = vehicle.laneIdx + delta;
            if (targetLane < 0 || targetLane >= LANE_COUNT) continue;

            // Check clearance in target lane (front and rear)
            const myPos = worldPos(vehicle);
            let clearFront = Infinity, clearRear = Infinity;

            for (const other of traffic) {
                if (other === vehicle || other.crashed) continue;
                if (other.segIdx !== vehicle.segIdx) continue;
                if (other.dir !== vehicle.dir) continue;
                if (other.laneIdx !== targetLane) continue;

                const op = worldPos(other);
                const dist = Math.hypot(op.x - myPos.x, op.z - myPos.z);
                const ahead = vehicle.dir > 0 ? other.t > vehicle.t : other.t < vehicle.t;
                if (ahead) clearFront = Math.min(clearFront, dist);
                else clearRear = Math.min(clearRear, dist);
            }

            if (clearFront >= LC_SAFE_GAP && clearRear >= LC_SAFE_GAP * 0.7) {
                // Commit to lane change
                vehicle.laneIdx = targetLane;
                vehicle.laneCD = LC_COOLDOWN + Math.random() * 2;
                vehicle.laneChanging = true;
                setTimeout(() => { if (vehicle) vehicle.laneChanging = false; }, 1500);
                return true;
            }
        }
        return false;
    }

    // MOVE VEHICLE ON ROAD     
    function moveOnRoad(v, dt) {
        if (v.crashed) return;
        if (v.laneCD > 0) v.laneCD -= dt;

        tryLaneChange(v);

        const gapData = gapToLeader(v);
        const interDecision = intersectionDecision(v);
        const acc = calcAccel(v, gapData, interDecision);

        // Clamp: can't decelerate harder than DECEL_HARD, can't go negative speed
        v.currentSpeed = Math.max(0, Math.min(v.maxSpeed,
            v.currentSpeed + Math.max(-DECEL_HARD, Math.min(IDM_A * 1.2, acc)) * dt
        ));

        const seg = roadSegs[v.segIdx];
        const distMoved = v.currentSpeed * dt;
        v.t += v.dir * (distMoved / seg.len);

        // Wrap to next segment
        if (v.t > 1.02) {
            v.t = 0.02;
            v.segIdx = (v.segIdx + 1) % roadSegs.length;
        } else if (v.t < -0.02) {
            v.t = 0.98;
            v.segIdx = (v.segIdx - 1 + roadSegs.length) % roadSegs.length;
        }

        // Update mesh
        const pos = worldPos(v);
        v.group.position.set(pos.x, 0, pos.z);
        v.group.rotation.y = roadSegs[v.segIdx].angle + (v.dir < 0 ? Math.PI : 0);

        // Emit exhaust
        v.exhaustTimer -= dt;
        if (v.exhaustTimer <= 0) {
            v.exhaustTimer = EXHAUST_EMIT_RATE + Math.random() * 0.04;
            if (exhaustActive.length < EXHAUST_POOL) emitExhaust(v);
        }
    }

     
    // EXHAUST FUME PARTICLES  
    function emitExhaust(v) {
        const ep = exhaustPos(v);
        const mesh = getExhaustMesh();
        mesh.position.set(ep.x, ep.y, ep.z);
        mesh.visible = true;

        // Speed influences opacity & size: idle = thick grey, high speed = thinner
        const speedRatio = v.currentSpeed / v.maxSpeed;
        const opacity = 0.12 + (1 - speedRatio) * 0.30;
        const scale = 0.7 + (1 - speedRatio) * 1.0;

        mesh.scale.setScalar(scale);
        mesh.material.opacity = opacity;
        mesh.material.color.setHex(speedRatio < 0.3 ? 0x888888 : 0xcccccc);

        const drift = {
            mesh,
            age: 0,
            maxAge: EXHAUST_LIFE + Math.random() * 0.6,
            vy: 0.35 + Math.random() * 0.25,
            vx: (Math.random() - 0.5) * 0.4,
            vz: (Math.random() - 0.5) * 0.4,
            initOpacity: opacity,
            initScale: scale,
        };
        exhaustActive.push(drift);
    }

    function updateExhaust(dt) {
        for (let i = exhaustActive.length - 1; i >= 0; i--) {
            const p = exhaustActive[i];
            p.age += dt;

            if (p.age >= p.maxAge) { recycleExhaust(p); continue; }

            const life = 1 - p.age / p.maxAge;
            p.mesh.position.x += p.vx * dt;
            p.mesh.position.y += p.vy * dt;
            p.mesh.position.z += p.vz * dt;

            // Expand & fade
            const s = p.initScale * (1 + p.age * 1.4);
            p.mesh.scale.setScalar(s);
            p.mesh.material.opacity = p.initOpacity * life * life;
        }
    }

     
    // EXPLOSION SYSTEM (unchanged structure, minor tuning)
     
    function createHugeExplosion(x, z) {
        const exp = { x, z, age: 0, maxAge: MUSHROOM_DURATION, particles: [], mushroom: null, light: null, shockwave: null };

        const light = new THREE.PointLight(0xff4400, 15, 100);
        light.position.set(x, 5, z);
        scene.add(light);
        exp.light = light;

        for (let i = 0; i < 150; i++) {
            const angle = Math.random() * Math.PI * 2;
            const elev = Math.random() * Math.PI * 0.5;
            const speed = 8 + Math.random() * 12;
            const spark = new THREE.Mesh(
                new THREE.SphereGeometry(0.3, 6, 6),
                new THREE.MeshBasicMaterial({ color: Math.random() > 0.5 ? 0xff6600 : 0xffaa00 })
            );
            spark.position.set(x, 1, z);
            scene.add(spark);
            exp.particles.push({
                mesh: spark,
                vx: Math.cos(angle) * Math.cos(elev) * speed,
                vy: Math.sin(elev) * speed * 1.5,
                vz: Math.sin(angle) * Math.cos(elev) * speed,
                life: 1,
            });
        }

        const mg = new THREE.Group();
        const ball = new THREE.Mesh(new THREE.SphereGeometry(8, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.8 }));
        ball.position.y = 5; mg.add(ball);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, 15, 16),
            new THREE.MeshBasicMaterial({ color: 0x994400, transparent: true, opacity: 0.7 }));
        stem.position.y = 12; mg.add(stem);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(10, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6),
            new THREE.MeshBasicMaterial({ color: 0x663300, transparent: true, opacity: 0.6 }));
        cap.position.y = 22; mg.add(cap);
        for (let i = 0; i < 5; i++) {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(4 + i * 2, 1.5, 8, 16),
                new THREE.MeshBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.4 }));
            ring.position.y = 8 + i * 3; ring.rotation.x = Math.PI / 2; mg.add(ring);
        }
        mg.position.set(x, 0, z); mg.scale.set(0.1, 0.1, 0.1);
        scene.add(mg); exp.mushroom = mg;

        const sw = new THREE.Mesh(new THREE.RingGeometry(0.5, 1.5, 32),
            new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
        sw.rotation.x = -Math.PI / 2; sw.position.set(x, 0.5, z);
        scene.add(sw); exp.shockwave = sw;

        explosions.push(exp);
        cameraShake.active = true; cameraShake.intensity = 0.8;
        cameraShake.duration = 2.5; cameraShake.elapsed = 0;
    }

    function updateExplosions(dt) {
        for (let i = explosions.length - 1; i >= 0; i--) {
            const exp = explosions[i];
            exp.age += dt;
            const lr = exp.age / exp.maxAge;
            exp.particles.forEach(p => {
                p.mesh.position.x += p.vx * dt;
                p.mesh.position.y += p.vy * dt;
                p.mesh.position.z += p.vz * dt;
                p.vy -= 15 * dt;
                p.life -= dt * 0.8;
                if (p.mesh.material) p.mesh.material.opacity = Math.max(0, p.life);
            });
            if (exp.mushroom) {
                const gs = Math.min(1.5, lr * 3);
                exp.mushroom.scale.set(gs, gs, gs);
                exp.mushroom.position.y = lr * 8;
                exp.mushroom.children.forEach(c => { if (c.material) c.material.opacity = Math.max(0, 1 - lr); });
            }
            if (exp.light) exp.light.intensity = 15 * (1 - lr);
            if (exp.shockwave) {
                const sc = 1 + lr * 20;
                exp.shockwave.scale.set(sc, sc, 1);
                if (exp.shockwave.material) exp.shockwave.material.opacity = Math.max(0, 0.8 * (1 - lr));
            }
            if (exp.age >= exp.maxAge) {
                exp.particles.forEach(p => scene.remove(p.mesh));
                if (exp.mushroom) scene.remove(exp.mushroom);
                if (exp.light) scene.remove(exp.light);
                if (exp.shockwave) scene.remove(exp.shockwave);
                explosions.splice(i, 1);
            }
        }
    }

     
    // COLLISION DETECTION
     
    function checkCollisions() {
        if (globalTime - lastCollisionTime < COLLISION_INTERVAL) return;
        if (activeEvent) return;

        for (let i = 0; i < traffic.length; i++) {
            const v1 = traffic[i]; if (v1.crashed) continue;
            for (let j = i + 1; j < traffic.length; j++) {
                const v2 = traffic[j]; if (v2.crashed) continue;
                const p1 = worldPos(v1), p2 = worldPos(v2);
                if (Math.hypot(p1.x - p2.x, p1.z - p2.z) < 3.2) {
                    v1.crashed = v2.crashed = true;
                    const cx = (p1.x + p2.x) / 2, cz = (p1.z + p2.z) / 2;
                    createHugeExplosion(cx, cz);
                    if (typeof onCollision === "function") onCollision();
                    if (ambulance && !ambulance.active) {
                        ambulance.active = true; ambulance.arrived = false;
                        ambulance.targetX = cx; ambulance.targetZ = cz;
                        ambulance.speed = 0;
                        const angle = Math.random() * Math.PI * 2;
                        ambulance.mesh.position.set(cx + Math.cos(angle) * 50, 0, cz + Math.sin(angle) * 50);
                    }
                    activeEvent = { startTime: globalTime, cx, cz, v1, v2 };
                    lastCollisionTime = globalTime;
                    return;
                }
            }
        }
    }

    function updateCollisionEvent(dt) {
        if (!activeEvent) return;
        if (globalTime - activeEvent.startTime >= EVENT_DURATION) {
            [activeEvent.v1, activeEvent.v2].forEach(v => {
                if (!v) return;
                scene.remove(v.group);
                const idx = traffic.indexOf(v);
                if (idx >= 0) traffic.splice(idx, 1);
            });
            if (ambulance) { ambulance.active = false; ambulance.mesh.position.set(-9999, 0, -9999); }
            activeEvent = null;
        }
    }

     
    // AMBULANCE
     
    function initAmbulance() {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 4.5),
            new THREE.MeshLambertMaterial({ color: 0xffffff }));
        body.position.y = 0.8; body.castShadow = true; g.add(body);
        const cross1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.1),
            new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        cross1.position.set(0, 1.2, -2.3); g.add(cross1);
        const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.1),
            new THREE.MeshBasicMaterial({ color: 0xff0000 }));
        cross2.position.set(0, 1.2, -2.3); g.add(cross2);
        ['red', 'blue'].forEach((col, i) => {
            const l = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.3),
                new THREE.MeshBasicMaterial({ color: col === 'red' ? 0xff0000 : 0x0000ff }));
            l.position.set(i === 0 ? -0.8 : 0.8, 1.5, 1.5); g.add(l);
        });
        [[1.0, -1.5], [-1.0, -1.5], [1.0, 1.5], [-1.0, 1.5]].forEach(([wx, wz]) => {
            const w = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.3, 8), darkMat);
            w.rotation.z = Math.PI / 2; w.position.set(wx, 0.35, wz); g.add(w);
        });
        g.position.set(-9999, 0, -9999);
        scene.add(g);
        ambulance = { mesh: g, active: false, arrived: false, targetX: 0, targetZ: 0, speed: 0 };
    }

    function updateAmbulance(dt) {
        if (!ambulance || !ambulance.active || ambulance.arrived) return;
        const dx = ambulance.targetX - ambulance.mesh.position.x;
        const dz = ambulance.targetZ - ambulance.mesh.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 4) { ambulance.arrived = true; ambulance.speed = 0; return; }
        ambulance.speed = Math.min(AMBULANCE_SPD, ambulance.speed + IDM_A * 3 * dt);
        ambulance.mesh.position.x += (dx / dist) * ambulance.speed * dt;
        ambulance.mesh.position.z += (dz / dist) * ambulance.speed * dt;
        ambulance.mesh.rotation.y = Math.atan2(dx, dz);
    }

     
    // VEHICLE MESH BUILDERS
     
    function buildCar(color) {
        const g = new THREE.Group(), mat = new THREE.MeshLambertMaterial({ color });
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.52, 3.4), mat);
        body.position.y = 0.38; body.castShadow = true; g.add(body);
        const cab = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.44, 1.8), mat);
        cab.position.y = 0.80; cab.castShadow = true; g.add(cab);
        [[0.85, -1.05], [-0.85, -1.05], [0.85, 1.0], [-0.85, 1.0]].forEach(([wx, wz]) => {
            const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.24, 8), darkMat);
            w.rotation.z = Math.PI / 2; w.position.set(wx, 0.22, wz); g.add(w);
        });
        const tl = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.07, 0.05),
            new THREE.MeshLambertMaterial({ color: 0xff1100, emissive: new THREE.Color(0.5, 0, 0) }));
        tl.position.set(0, 0.55, 1.72); g.add(tl);
        scene.add(g); return g;
    }

    function buildTruck(color) {
        const g = new THREE.Group();
        const mat = new THREE.MeshLambertMaterial({ color });
        const trl = new THREE.MeshLambertMaterial({ color: 0x888899 });
        const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 2.8), mat);
        cab.position.set(0, 0.85, -2.2); cab.castShadow = true; g.add(cab);
        const trailer = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.6, 6), trl);
        trailer.position.set(0, 1.0, 1.5); trailer.castShadow = true; g.add(trailer);
        [[1.0, -2.8], [-1.0, -2.8], [1.0, 0.5], [-1.0, 0.5], [1.0, 3.5], [-1.0, 3.5]].forEach(([wx, wz]) => {
            const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.32, 8), darkMat);
            w.rotation.z = Math.PI / 2; w.position.set(wx, 0.32, wz); g.add(w);
        });
        scene.add(g); return g;
    }

    function buildBus() {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.6, 9.5),
            new THREE.MeshLambertMaterial({ color: 0xffcc00 }));
        body.position.y = 0.95; body.castShadow = true; g.add(body);
        const win = new THREE.Mesh(new THREE.BoxGeometry(2.52, 0.55, 7.5),
            new THREE.MeshLambertMaterial({ color: 0x88aacc, transparent: true, opacity: 0.7 }));
        win.position.y = 1.4; g.add(win);
        [[1.18, -3.2], [-1.18, -3.2], [1.18, 0], [-1.18, 0], [1.18, 3.2], [-1.18, 3.2]].forEach(([wx, wz]) => {
            const w = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.34, 8), darkMat);
            w.rotation.z = Math.PI / 2; w.position.set(wx, 0.3, wz); g.add(w);
        });
        scene.add(g); return g;
    }

     
    // PUBLIC API — addVehicle / addCars / update / dispose
     
    function addVehicle(type = "car", color = null, segIdx = null, t = null, dir = null) {
        if (roadSegs.length === 0) return null;

        const si = segIdx !== null ? segIdx : Math.floor(Math.random() * roadSegs.length);
        const startT = t !== null ? t : Math.random();
        const startDir = dir !== null ? dir : (Math.random() > 0.5 ? 1 : -1);
        // Assign lane index: lane 0 = inner (kerb), lane 1 = outer (fast)
        const laneIdx = Math.floor(Math.random() * LANE_COUNT);

        let group, maxSpeed;
        if (type === "truck") {
            group = buildTruck(color || trafficColors[Math.floor(Math.random() * trafficColors.length)]);
            maxSpeed = MAX_SPEED_TRUCK + Math.random() * 2;
        } else if (type === "bus") {
            group = buildBus();
            maxSpeed = MAX_SPEED_BUS + Math.random() * 1.5;
        } else {
            group = buildCar(color || trafficColors[Math.floor(Math.random() * trafficColors.length)]);
            maxSpeed = MAX_SPEED_CAR * (0.65 + Math.random() * 0.6);
        }

        const vehicle = {
            group, type, segIdx: si, t: startT, dir: startDir,
            maxSpeed,
            currentSpeed: maxSpeed * 0.45,
            crashed: false,
            laneIdx,
            laneCD: Math.random() * LC_COOLDOWN,
            laneChanging: false,
            exhaustTimer: Math.random() * EXHAUST_EMIT_RATE,
        };
        traffic.push(vehicle);
        return vehicle;
    }

    function addCars(count) {
        const segSlots = {};
        const MIN_SEP = 0.28;

        for (let i = 0; i < count; i++) {
            const r = Math.random();
            const type = r < 0.68 ? "car" : r < 0.84 ? "truck" : "bus";

            let bestSi = null, bestT = 0.5, bestDir = Math.random() > 0.5 ? 1 : -1;

            for (let attempt = 0; attempt < 20; attempt++) {
                const si = Math.floor(Math.random() * roadSegs.length);
                if (roadSegs[si].len < 8) continue;
                const dir = Math.random() > 0.5 ? 1 : -1;
                const slots = (segSlots[si] || []).filter(v => v.dir === dir);
                const tc = 0.15 + Math.random() * 0.7;
                if (slots.every(v => Math.abs(v.t - tc) > MIN_SEP)) {
                    bestSi = si; bestT = tc; bestDir = dir; break;
                }
            }
            if (bestSi === null) bestSi = Math.floor(Math.random() * roadSegs.length);
            if (!segSlots[bestSi]) segSlots[bestSi] = [];
            segSlots[bestSi].push({ t: bestT, dir: bestDir });
            addVehicle(type, null, bestSi, bestT, bestDir);
        }
    }

    function update(dt, camera) {
        updateLights(dt);

        for (const v of traffic) moveOnRoad(v, dt);

        collisionTimer += dt;
        if (collisionTimer > 0.1) { checkCollisions(); collisionTimer = 0; }

        updateExplosions(dt);
        updateAmbulance(dt);
        updateCollisionEvent(dt);
        updateExhaust(dt);

        // Camera shake
        if (cameraShake.active && camera) {
            cameraShake.elapsed += dt;
            if (cameraShake.elapsed < cameraShake.duration) {
                const intensity = cameraShake.intensity * (1 - cameraShake.elapsed / cameraShake.duration);
                camera.position.x += (Math.random() - 0.5) * intensity;
                camera.position.y += (Math.random() - 0.5) * intensity;
                camera.position.z += (Math.random() - 0.5) * intensity;
            } else {
                cameraShake.active = false;
            }
        }
    }

    function dispose() {
        traffic.forEach(v => {
            v.group.children.forEach(c => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); });
            scene.remove(v.group);
        });
        traffic.length = 0;
        exhaustActive.forEach(p => scene.remove(p.mesh));
        exhaustPool.forEach(m => scene.remove(m));
        exhaustActive.length = 0; exhaustPool.length = 0;
        if (ambulance) { scene.remove(ambulance.mesh); ambulance = null; }
    }

    initAmbulance();

    return {
        addVehicle,
        addCars,
        update,
        dispose,
        getCount: () => traffic.length,
        getVehicles: () => traffic,
        getLights: () => lights,
        getCameraShake: () => cameraShake,
    };
}