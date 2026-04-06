/**
 * CitySignage.js — GitCity
 * Traffic signals, street signs, distance boards, info displays
 *
 * Usage:
 *   import { addTrafficSignal, addStreetSign, addDistanceBoard } from "./CitySignage";
 *   addTrafficSignal(scene, THREE, x, z);
 *   addDistanceBoard(scene, THREE, x, z, "GitHub · 2.4 km");
 */

// ── TRAFFIC SIGNAL ─────────────────────────────────────────────────────────────
export function addTrafficSignal(scene, THREE, x, z, state = "red") {
    const group = new THREE.Group();

    // Pole — metal post
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 4, 8),
        poleMat
    );
    pole.position.y = 2;
    pole.castShadow = true;
    group.add(pole);

    // Signal housing
    const housingMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const housing = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 1.6, 0.2),
        housingMat
    );
    housing.position.y = 3.5;
    housing.castShadow = true;
    group.add(housing);

    // Three lights
    const states = [
        { pos: 0.4, color: 0xff0000, emissive: new THREE.Color(1, 0, 0), light: true }, // red
        { pos: 0, color: 0xffff00, emissive: new THREE.Color(1, 1, 0), light: true }, // yellow
        { pos: -0.4, color: 0x00ff00, emissive: new THREE.Color(0, 1, 0), light: true }, // green
    ];

    states.forEach((s, i) => {
        const lightBulb = new THREE.Mesh(
            new THREE.SphereGeometry(0.15, 8, 8),
            new THREE.MeshLambertMaterial({
                color: s.color,
                emissive: s.light && state === ["red", "yellow", "green"][i] ? s.emissive : new THREE.Color(0, 0, 0),
            })
        );
        lightBulb.position.set(0, 2.9 + s.pos, 0.12);
        lightBulb.userData = { signalType: "light" };
        group.add(lightBulb);

        if (s.light && state === ["red", "yellow", "green"][i]) {
            const pointLight = new THREE.PointLight(s.color, 1.5, 20);
            pointLight.position.copy(lightBulb.position);
            group.add(pointLight);
        }
    });

    group.position.set(x, 0, z);
    scene.add(group);
    return group;
}

// ── STREET SIGN ────────────────────────────────────────────────────────────────
export function addStreetSign(scene, THREE, x, z, street1 = "Main St", street2 = "GitHub Ave") {
    const group = new THREE.Group();

    const poleMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
    const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, 3.5, 8),
        poleMat
    );
    pole.position.y = 1.75;
    pole.castShadow = true;
    group.add(pole);

    // Street sign arm — horizontal
    const arm = new THREE.Mesh(
        new THREE.BoxGeometry(2.5, 0.08, 0.15),
        poleMat
    );
    arm.position.set(1.2, 3, 0);
    arm.rotation.z = 0.05;
    group.add(arm);

    // Sign placards
    const signMat = new THREE.MeshLambertMaterial({ color: 0x228833 });
    const textMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });

    // Placard 1 (vertical)
    const placard1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.5, 0.15),
        signMat
    );
    placard1.position.set(0.2, 3.4, 0.08);
    placard1.castShadow = true;
    group.add(placard1);

    // Placard 2 (vertical)
    const placard2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.5, 0.15),
        signMat
    );
    placard2.position.set(2.2, 3.2, 0.08);
    placard2.castShadow = true;
    group.add(placard2);

    // Note: In production, would use canvas texture for text
    // For now, we just show the silhouette
    group.userData = { street1, street2 };
    group.position.set(x, 0, z);
    scene.add(group);
    return group;
}

// ── DISTANCE / INFO BOARD ─────────────────────────────────────────────────────
export function addDistanceBoard(scene, THREE, x, z, text = "GitHub · 5.2 km") {
    const group = new THREE.Group();

    // Pole
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
    const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.07, 2.5, 6),
        poleMat
    );
    pole.position.y = 1.25;
    pole.castShadow = true;
    group.add(pole);

    // Board — arrow sign
    const boardMat = new THREE.MeshLambertMaterial({ color: 0xff6b35 });
    const board = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.6, 0.12),
        boardMat
    );
    board.position.y = 2.2;
    board.castShadow = true;
    group.add(board);

    // Arrow tip (triangle prism)
    const arrowGeo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
        0.9, 0, 0, // tip
        0.6, 0.3, 0, // top
        0.6, -0.3, 0, // bottom
        0.9, 0, 0.1, // tip (back)
        0.6, 0.3, 0.1, // top (back)
        0.6, -0.3, 0.1, // bottom (back)
    ]);
    const indices = [0, 1, 2, 3, 5, 4, 0, 2, 5, 0, 5, 3, 0, 3, 4, 0, 4, 1];
    arrowGeo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    arrowGeo.setIndex(indices);
    arrowGeo.computeVertexNormals();

    const arrow = new THREE.Mesh(arrowGeo, boardMat);
    arrow.position.set(0.9, 2.2, 0);
    group.add(arrow);

    group.userData = { text };
    group.position.set(x, 0, z);
    scene.add(group);
    return group;
}

// ── BUS STOP SHELTER ───────────────────────────────────────────────────────────
export function addBusStop(scene, THREE, x, z) {
    const group = new THREE.Group();

    const metalMat = new THREE.MeshLambertMaterial({ color: 0x5a5a5a });
    const glassMat = new THREE.MeshLambertMaterial({
        color: 0x88bbcc,
        transparent: true,
        opacity: 0.5,
    });

    // Roof structure
    const roofSupport1 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 2.5, 8),
        metalMat
    );
    roofSupport1.position.set(-0.8, 1.25, 0);
    roofSupport1.castShadow = true;
    group.add(roofSupport1);

    const roofSupport2 = roofSupport1.clone();
    roofSupport2.position.set(0.8, 1.25, 0);
    group.add(roofSupport2);

    // Roof panel
    const roof = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.1, 3),
        metalMat
    );
    roof.position.y = 2.6;
    roof.castShadow = true;
    group.add(roof);

    // Back wall
    const backWall = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2, 0.2),
        glassMat
    );
    backWall.position.set(0, 1, -1.4);
    group.add(backWall);

    // Side panels
    const sidePanel = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 2, 3),
        glassMat
    );
    sidePanel.position.set(-1, 1, 0);
    group.add(sidePanel);

    const sidePanel2 = sidePanel.clone();
    sidePanel2.position.set(1, 1, 0);
    group.add(sidePanel2);

    // Bench inside
    const benchMat = new THREE.MeshLambertMaterial({ color: 0x8b6f47 });
    const bench = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.1, 0.5),
        benchMat
    );
    bench.position.set(0, 0.6, 0.5);
    bench.castShadow = true;
    group.add(bench);

    group.position.set(x, 0, z);
    scene.add(group);
    return group;
}

// ── MAILBOX ────────────────────────────────────────────────────────────────────
export function addMailbox(scene, THREE, x, z) {
    const group = new THREE.Group();

    const metalMat = new THREE.MeshLambertMaterial({ color: 0xcc2200 });
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x444444 });

    // Post
    const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.06, 1.2, 6),
        poleMat
    );
    post.position.y = 0.6;
    post.castShadow = true;
    group.add(post);

    // Mailbox body
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.35, 0.6),
        metalMat
    );
    body.position.y = 1.1;
    body.castShadow = true;
    group.add(body);

    // Lid (roof)
    const lid = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.15, 0.65),
        metalMat
    );
    lid.position.set(0, 1.35, 0);
    lid.rotation.x = 0.1;
    lid.castShadow = true;
    group.add(lid);

    // Flag
    const flag = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.25, 0.08),
        new THREE.MeshLambertMaterial({ color: 0xff0000 })
    );
    flag.position.set(0.25, 1.05, -0.4);
    flag.castShadow = true;
    group.add(flag);

    group.position.set(x, 0, z);
    scene.add(group);
    return group;
}

// ── BILLBOARD ──────────────────────────────────────────────────────────────────
export function addBillboard(scene, THREE, x, z, width = 4, height = 2.5) {
    const group = new THREE.Group();

    const poleMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
    // Poles
    const pole1 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.2, 4, 8),
        poleMat
    );
    pole1.position.set(-width / 2 + 0.3, 2, 0);
    pole1.castShadow = true;
    group.add(pole1);

    const pole2 = pole1.clone();
    pole2.position.set(width / 2 - 0.3, 2, 0);
    group.add(pole2);

    // Billboard face
    const billMat = new THREE.MeshLambertMaterial({ color: 0xeeee99 });
    const billboard = new THREE.Mesh(
        new THREE.BoxGeometry(width, height, 0.15),
        billMat
    );
    billboard.position.y = 2.5 + height / 2;
    billboard.castShadow = true;
    group.add(billboard);

    // Light strips (LED)
    const lightMat = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        emissive: new THREE.Color(0.3, 0.3, 0.3),
    });
    for (let i = 0; i < 4; i++) {
        const lightStrip = new THREE.Mesh(
            new THREE.BoxGeometry(width - 0.3, 0.08, 0.05),
            lightMat
        );
        lightStrip.position.y = 1.5 + i * (height / 3.5);
        lightStrip.position.z = 0.1;
        group.add(lightStrip);
    }

    group.position.set(x, 0, z);
    scene.add(group);
    return group;
}

// ── UTILITY: Create a simple "repo status" board ───────────────────────────────
export function addRepoBoard(scene, THREE, x, z, repoName = "gitcity", status = "active") {
    const board = addDistanceBoard(scene, THREE, x, z, `${repoName.toUpperCase()}`);
    const statusColor = status === "active" ? 0x00ff00 : 0xff6b35;
    board.children.forEach(child => {
        if (child.material && child.material.color) {
            child.material.color.setHex(statusColor);
        }
    });
    return board;
}