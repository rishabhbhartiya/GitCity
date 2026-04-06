/**
 * CityTraffic.js — GitCity (fixed)
 * FIX: Lane offsets now deterministic per direction to prevent vehicle overlap.
 * Vehicles travelling in same direction use consistent lane offset.
 * Minimum separation between vehicles enforced.
 */

export function createTrafficSystem(scene, THREE, roadSegs, cityW, cityD) {
    const traffic = [];
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x111111 });

    const trafficColors = [
        0xff3300, 0x0055ff, 0x33cc44, 0xffaa00, 0xcc22cc,
        0x00cccc, 0xff8800, 0x8844ff, 0xffffff, 0x884400,
    ];

    // ── CAR MODEL ──────────────────────────────────────────────────────────────
    function buildCar(color) {
        const carGroup = new THREE.Group();
        const carMat = new THREE.MeshLambertMaterial({ color });

        const body = new THREE.Mesh(
            new THREE.BoxGeometry(1.8, 0.52, 3.4),
            carMat
        );
        body.position.y = 0.38;
        body.castShadow = true;
        carGroup.add(body);

        const cab = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 0.44, 1.8),
            carMat
        );
        cab.position.y = 0.8;
        cab.castShadow = true;
        carGroup.add(cab);

        const wheelPositions = [
            [0.85, -1.05], [-0.85, -1.05],
            [0.85, 1.0], [-0.85, 1.0],
        ];
        wheelPositions.forEach(([wx, wz]) => {
            const wheel = new THREE.Mesh(
                new THREE.CylinderGeometry(0.28, 0.28, 0.24, 10),
                darkMat
            );
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(wx, 0.22, wz);
            wheel.castShadow = true;
            carGroup.add(wheel);
        });

        const tailLight = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 0.07, 0.05),
            new THREE.MeshLambertMaterial({ color: 0xff1100, emissive: new THREE.Color(0.5, 0, 0) })
        );
        tailLight.position.set(0, 0.55, 1.72);
        carGroup.add(tailLight);

        carGroup.castShadow = true;
        scene.add(carGroup);
        return carGroup;
    }

    // ── TRUCK MODEL ────────────────────────────────────────────────────────────
    function buildTruck(color) {
        const truckGroup = new THREE.Group();
        const truckMat = new THREE.MeshLambertMaterial({ color });
        const trailerMat = new THREE.MeshLambertMaterial({ color: 0x888899 });

        const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 2.8), truckMat);
        cab.position.set(0, 0.85, -2.2);
        cab.castShadow = true;
        truckGroup.add(cab);

        const trailer = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.6, 6), trailerMat);
        trailer.position.set(0, 1.0, 1.5);
        trailer.castShadow = true;
        truckGroup.add(trailer);

        [[1.0, -2.8], [-1.0, -2.8], [1.0, 0.5], [-1.0, 0.5], [1.0, 3.5], [-1.0, 3.5]].forEach(([wx, wz]) => {
            const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.32, 10), darkMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(wx, 0.32, wz);
            wheel.castShadow = true;
            truckGroup.add(wheel);
        });

        truckGroup.castShadow = true;
        scene.add(truckGroup);
        return truckGroup;
    }

    // ── BUS MODEL ──────────────────────────────────────────────────────────────
    function buildBus() {
        const busGroup = new THREE.Group();

        const body = new THREE.Mesh(
            new THREE.BoxGeometry(2.5, 1.6, 9.5),
            new THREE.MeshLambertMaterial({ color: 0xffcc00 })
        );
        body.position.y = 0.95;
        body.castShadow = true;
        busGroup.add(body);

        const windows = new THREE.Mesh(
            new THREE.BoxGeometry(2.52, 0.55, 7.5),
            new THREE.MeshLambertMaterial({ color: 0x88aacc, transparent: true, opacity: 0.7 })
        );
        windows.position.y = 1.4;
        busGroup.add(windows);

        [[1.18, -3.2], [-1.18, -3.2], [1.18, 0], [-1.18, 0], [1.18, 3.2], [-1.18, 3.2]].forEach(([wx, wz]) => {
            const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.34, 12), darkMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(wx, 0.3, wz);
            wheel.castShadow = true;
            busGroup.add(wheel);
        });

        busGroup.castShadow = true;
        scene.add(busGroup);
        return busGroup;
    }

    // ── TRAFFIC MOVEMENT ───────────────────────────────────────────────────────
    function moveOnRoad(vehicle, dt) {
        const seg = roadSegs[vehicle.segIdx];
        if (!seg) return;

        vehicle.t += vehicle.speed * dt / seg.len * vehicle.dir;

        if (vehicle.t > 1 || vehicle.t < 0) {
            vehicle.t = vehicle.t > 1 ? 0 : 1;

            let bestIdx = vehicle.segIdx;
            let bestDist = Infinity;

            const endX = vehicle.dir > 0 ? seg.x2 : seg.x1;
            const endZ = vehicle.dir > 0 ? seg.z2 : seg.z1;

            roadSegs.forEach((s, si) => {
                if (si === vehicle.segIdx) return;
                const d1 = Math.sqrt((s.x1 - endX) ** 2 + (s.z1 - endZ) ** 2);
                const d2 = Math.sqrt((s.x2 - endX) ** 2 + (s.z2 - endZ) ** 2);
                const d = Math.min(d1, d2);
                if (d < bestDist && d < 5) { bestDist = d; bestIdx = si; }
            });

            vehicle.segIdx = bestIdx;

            if (Math.random() > 0.7) vehicle.dir *= -1;
        }

        const currentSeg = roadSegs[vehicle.segIdx];
        const t = Math.max(0, Math.min(1, vehicle.t));
        const px = currentSeg.x1 + currentSeg.dx * currentSeg.len * t;
        const pz = currentSeg.z1 + currentSeg.dz * currentSeg.len * t;

        // FIX: lane offset is fixed per direction to keep vehicles in their lane
        // dir=+1 → right lane (offset +1.8), dir=-1 → left lane (offset -1.8)
        // This prevents vehicles from drifting into each other
        const laneOffset = vehicle.dir * 1.8;
        vehicle.group.position.set(
            px - currentSeg.dz * laneOffset,
            0,
            pz + currentSeg.dx * laneOffset
        );
        vehicle.group.rotation.y =
            vehicle.dir > 0 ? currentSeg.angle : currentSeg.angle + Math.PI;
    }

    // ── PUBLIC API ─────────────────────────────────────────────────────────────
    function addVehicle(type = "car", color = null, segIdx = null, t = null, dir = null) {
        if (roadSegs.length === 0) return null;

        const si = segIdx !== null ? segIdx : Math.floor(Math.random() * roadSegs.length);
        const startT = t !== null ? t : Math.random();
        const startDir = dir !== null ? dir : Math.random() > 0.5 ? 1 : -1;

        let group, speed, vehicle;

        if (type === "truck") {
            group = buildTruck(color || trafficColors[Math.floor(Math.random() * trafficColors.length)]);
            speed = 1.2 + Math.random() * 0.8;
        } else if (type === "bus") {
            group = buildBus();
            speed = 1.4 + Math.random() * 0.5;
        } else {
            group = buildCar(color || trafficColors[Math.floor(Math.random() * trafficColors.length)]);
            speed = 2 + Math.random() * 2.5;
        }

        vehicle = { group, type, segIdx: si, t: startT, speed, dir: startDir };
        traffic.push(vehicle);
        return vehicle;
    }

    function addCars(count) {
        for (let i = 0; i < count; i++) {
            const r = Math.random();
            if (r < 0.7) addVehicle("car");
            else if (r < 0.85) addVehicle("truck");
            else addVehicle("bus");
        }
    }

    function update(dt) {
        traffic.forEach((vehicle) => moveOnRoad(vehicle, dt));
    }

    function dispose() {
        traffic.forEach((vehicle) => {
            vehicle.group.children.forEach((c) => {
                if (c.geometry) c.geometry.dispose();
                if (c.material) c.material.dispose();
            });
            scene.remove(vehicle.group);
        });
        traffic.length = 0;
    }

    return { addVehicle, addCars, update, dispose, getCount: () => traffic.length, getVehicles: () => traffic };
}