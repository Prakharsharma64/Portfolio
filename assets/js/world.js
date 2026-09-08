/* three.js as ES module. One persistent world, five stations, camera on a spline. */
let motionOff = false;
try { motionOff = localStorage.getItem('motion-off') === '1'; } catch (e) { }
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && !motionOff) {
  try {
    const THREE = await import('https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.module.min.js');

    const holder = document.getElementById('world');
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0C0D10, 0.028);
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    holder.appendChild(renderer.domElement);

    const mobile = window.innerWidth < 860;
    const GRAPHITE = 0x14161B, EDGE = 0x4A505A, AMBER = 0xF2A33C, GREY = 0x7A808A;

    const edgeMat = new THREE.LineBasicMaterial({ color: EDGE, transparent: true, opacity: 0.9 });
    const amberLineMat = new THREE.LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0.5 });
    const faceMat = new THREE.MeshBasicMaterial({ color: GRAPHITE });
    const amberMat = new THREE.MeshBasicMaterial({ color: AMBER });

    function edgedBox(w, h, d) {
      const g = new THREE.Group();
      const geo = new THREE.BoxGeometry(w, h, d);
      g.add(new THREE.Mesh(geo, faceMat));
      g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
      return g;
    }

    function sphereCloud(count, radius, stretchX) {
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const r = radius * Math.cbrt(Math.random());
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(2 * Math.random() - 1);
        pos[i * 3] = r * Math.sin(ph) * Math.cos(th) * stretchX;
        pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th) * 0.85;
        pos[i * 3 + 2] = r * Math.cos(ph);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      return g;
    }

    /* ---------- station anchors in world space ---------- */
    const W = [
      new THREE.Vector3(0, 0, 0),        // hero: embedding space
      new THREE.Vector3(16, -5, -34),    // work: the pipeline
      new THREE.Vector3(-16, -10, -68),  // experience: the job queue
      new THREE.Vector3(2, -16, -102),   // skills: the robot
      new THREE.Vector3(14, -22, -132)   // contact: the beacon
    ];

    /* ---------- station 0: embedding-space field ---------- */
    const s0 = new THREE.Group();
    const cloud = new THREE.Points(
      sphereCloud(mobile ? 240 : 480, 3.4, 1.7),
      new THREE.PointsMaterial({ color: GREY, size: 0.035, transparent: true, opacity: 0.5 })
    );
    const amberPts = new THREE.Points(
      sphereCloud(mobile ? 16 : 30, 2.3, 1.5),
      new THREE.PointsMaterial({ color: AMBER, size: 0.075, transparent: true, opacity: 0.85 })
    );
    const wf = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(2.3, 1)),
      new THREE.LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0.08 })
    );
    wf.rotation.x = 0.35;
    s0.add(cloud, amberPts, wf);
    s0.position.copy(W[0]);
    scene.add(s0);

    /* static kNN threads so the field reads as a graph, not dust */
    const cloudTarget = cloud.geometry.getAttribute('position').array.slice();
    const amberTarget = amberPts.geometry.getAttribute('position').array.slice();
    let links, linkArr, linkCount = 0;
    {
      const maxLinks = mobile ? 60 : 110;
      const n = cloudTarget.length / 3;
      const linkPos = [];
      for (let i = 0; i < n && linkPos.length / 6 < maxLinks; i += 3) {
        let best = -1, bestD = 1.44;
        for (let j = 0; j < n; j++) {
          if (j === i) continue;
          const dx = cloudTarget[i * 3] - cloudTarget[j * 3];
          const dy = cloudTarget[i * 3 + 1] - cloudTarget[j * 3 + 1];
          const dz = cloudTarget[i * 3 + 2] - cloudTarget[j * 3 + 2];
          const d = dx * dx + dy * dy + dz * dz;
          if (d < bestD) { bestD = d; best = j; }
        }
        if (best >= 0) {
          linkPos.push(
            cloudTarget[i * 3], cloudTarget[i * 3 + 1], cloudTarget[i * 3 + 2],
            cloudTarget[best * 3], cloudTarget[best * 3 + 1], cloudTarget[best * 3 + 2]);
        }
      }
      const g = new THREE.BufferGeometry();
      linkArr = new Float32Array(linkPos);
      linkCount = linkArr.length / 6;
      g.setAttribute('position', new THREE.BufferAttribute(linkArr, 3));
      links = new THREE.LineSegments(g,
        new THREE.LineBasicMaterial({ color: GREY, transparent: true, opacity: 0.14 }));
      s0.add(links);
    }

    /* graph activations: a random thread fires, a spark travels it, the far
       node flares on arrival */
    const ACT_N = 3;
    const acts = [];
    for (let i = 0; i < ACT_N; i++) {
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), amberMat);
      const flare = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), amberMat);
      spark.visible = flare.visible = false;
      links.add(spark, flare);
      acts.push({ spark, flare, link: 0, start: -1 });
    }
    let nextAct = 0.8;

    /* the cursor as a query vector: amber probe + threads to its nearest
       neighbors (hover devices only; touch has no pointer to track) */
    const Q_K = 5;
    let qGroup = null, qDot = null, qLines = null, qLinePos = null, qSparks = null;
    const qBestD = new Float64Array(Q_K), qBestI = new Int32Array(Q_K);
    if (window.matchMedia('(hover: hover)').matches) {
      qGroup = new THREE.Group();
      qDot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), amberMat);
      qLinePos = new Float32Array(Q_K * 6);
      const qGeo = new THREE.BufferGeometry();
      qGeo.setAttribute('position', new THREE.BufferAttribute(qLinePos, 3));
      qLines = new THREE.LineSegments(qGeo,
        new THREE.LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0.4 }));
      qGroup.add(qDot, qLines);
      qSparks = [];
      for (let k = 0; k < Q_K; k++) {
        const sp = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), amberMat);
        qGroup.add(sp);
        qSparks.push(sp);
      }
      qGroup.visible = false;
      s0.add(qGroup);
    }

    /* ---------- station 1: the pipeline in 3D ---------- */
    const s1 = new THREE.Group();
    const stages = 4;
    const stageBoxes = [];
    for (let i = 0; i < stages; i++) {
      const b = edgedBox(2.4, 1.1, 1.1);
      b.position.x = (i - (stages - 1) / 2) * 3.4;
      stageBoxes.push(b);
      s1.add(b);
    }
    const railGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-(stages - 1) / 2 * 3.4, 0, 0),
      new THREE.Vector3((stages - 1) / 2 * 3.4, 0, 0)
    ]);
    s1.add(new THREE.Line(railGeo, amberLineMat));
    const packets = [];
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), amberMat);
      packets.push(p);
      s1.add(p);
    }
    s1.position.copy(W[1]).add(new THREE.Vector3(-7, -2.5, -6));
    s1.rotation.y = 0.35;
    scene.add(s1);

    /* ---------- station 2: the job queue ---------- */
    const s2 = new THREE.Group();
    const qCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4.5, -1.5, 2), new THREE.Vector3(-1.5, 0.5, -1),
      new THREE.Vector3(1.5, -0.5, 1), new THREE.Vector3(4.5, 1.2, -2)
    ]);
    s2.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(qCurve.getPoints(60)),
      new THREE.LineBasicMaterial({ color: EDGE, transparent: true, opacity: 0.5 })
    ));
    const jobs = [];
    const jobCount = mobile ? 7 : 10;
    for (let i = 0; i < jobCount; i++) {
      const isAmber = i % 4 === 0;
      const c = new THREE.Group();
      const geo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
      c.add(new THREE.Mesh(geo, isAmber ? amberMat : faceMat));
      c.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
      jobs.push(c);
      s2.add(c);
    }
    // the dead-letter loop: a small ring off the main path
    const dlq = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(
        new THREE.EllipseCurve(0, 0, 1.5, 1.5, 0, Math.PI * 2).getPoints(40)
          .map(p => new THREE.Vector3(p.x, p.y, 0))
      ),
      amberLineMat
    );
    dlq.position.set(4, -3.5, -2);
    dlq.rotation.x = Math.PI / 2.4;
    s2.add(dlq);
    /* the dead-letter detour: now and then a job fails, arcs off the main
       path, does one lap of the DLQ ring, and is dropped */
    const reject = new THREE.Group();
    {
      const geo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
      reject.add(new THREE.Mesh(geo, amberMat));
      reject.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
    }
    reject.visible = false;
    s2.add(reject);
    const dlqRx = Math.PI / 2.4;
    const rejFrom = qCurve.getPoint(0.78);
    function dlqPoint(th, out) {
      out.set(
        4 + Math.cos(th) * 1.5,
        -3.5 + Math.sin(th) * 1.5 * Math.cos(dlqRx),
        -2 + Math.sin(th) * 1.5 * Math.sin(dlqRx));
      return out;
    }
    s2.position.copy(W[2]).add(new THREE.Vector3(-9, 0, -4));
    s2.rotation.y = -0.3;
    scene.add(s2);

    /* ---------- station 3: the robot with skill satellites ---------- */
    const s3 = new THREE.Group();
    const bot = new THREE.Group();
    const head = edgedBox(2.1, 1.7, 1.7);
    bot.add(head);
    const eyeGeo = new THREE.BoxGeometry(0.34, 0.22, 0.06);
    const eyeL = new THREE.Mesh(eyeGeo, amberMat);
    const eyeR = new THREE.Mesh(eyeGeo, amberMat);
    eyeL.position.set(-0.48, 0.12, 0.88);
    eyeR.position.set(0.48, 0.12, 0.88);
    bot.add(eyeL, eyeR);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7), new THREE.MeshBasicMaterial({ color: EDGE }));
    antenna.position.y = 1.2;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), amberMat);
    tip.position.y = 1.6;
    bot.add(antenna, tip);
    const torso = edgedBox(1.5, 1.1, 1.1);
    torso.position.y = -1.55;
    bot.add(torso);
    s3.add(bot);
    // orbital rings of skill satellites
    const orbits = [];
    [[2.4, 0.4, 5], [3.2, -0.5, 4], [4.0, 0.9, 3]].forEach(([r, tilt, n]) => {
      const o = new THREE.Group();
      o.add(new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(
          new THREE.EllipseCurve(0, 0, r, r, 0, Math.PI * 2).getPoints(64)
            .map(p => new THREE.Vector3(p.x, 0, p.y))
        ),
        new THREE.LineBasicMaterial({ color: EDGE, transparent: true, opacity: 0.35 })
      ));
      for (let i = 0; i < n; i++) {
        const sat = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10),
          i === 0 ? amberMat : new THREE.MeshBasicMaterial({ color: GREY }));
        const a = (i / n) * Math.PI * 2;
        sat.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
        o.add(sat);
      }
      o.rotation.x = tilt;
      orbits.push(o);
      s3.add(o);
    });
    s3.position.copy(W[3]).add(new THREE.Vector3(6.5, 0.5, -9));
    scene.add(s3);

    /* ---------- station 4: the beacon ---------- */
    const s4 = new THREE.Group();
    const towerGeo = new THREE.ConeGeometry(1.1, 3.2, 4, 1, true);
    s4.add(new THREE.LineSegments(new THREE.EdgesGeometry(towerGeo), edgeMat));
    const beam = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), amberMat);
    beam.position.y = 1.9;
    s4.add(beam);
    const rings = [];
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(
          new THREE.EllipseCurve(0, 0, 1, 1, 0, Math.PI * 2).getPoints(48)
            .map(p => new THREE.Vector3(p.x, 0, p.y))
        ),
        new THREE.LineBasicMaterial({ color: AMBER, transparent: true, opacity: 0.5 })
      );
      ring.position.y = 1.9;
      rings.push(ring);
      s4.add(ring);
    }
    s4.position.copy(W[4]).add(new THREE.Vector3(4.5, -0.5, -2));
    scene.add(s4);

    /* ---------- camera path through the stations ---------- */
    const camOffset = new THREE.Vector3(0, 1.2, 9.5);
    const camPts = W.map(w => w.clone().add(camOffset));
    const path = new THREE.CatmullRomCurve3(camPts, false, 'catmullrom', 0.4);

    /* sparse dust scattered along the whole flight path, pushed ahead of the
       camera: travel between stations never shows an empty black frame */
    {
      const pts = path.getPoints(140);
      const n = mobile ? 240 : 520;
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const p = pts[Math.floor(Math.random() * pts.length)];
        pos[i * 3] = p.x + (Math.random() - 0.5) * 18;
        pos[i * 3 + 1] = p.y + (Math.random() - 0.5) * 11;
        pos[i * 3 + 2] = p.z - 5 - Math.random() * 16;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      scene.add(new THREE.Points(g,
        new THREE.PointsMaterial({ color: GREY, size: 0.05, transparent: true, opacity: 0.38 })));
    }

    /* section-anchor mapping lives in the classic script (window.scrollParam),
       shared with the station rail; if rail.js ever failed to load, hold the
       camera at station 0 instead of throwing inside every rAF tick */
    const scrollParam = window.scrollParam || function () { return 0; };

    function smooth(t) { return t * t * (3 - 2 * t); }

    let tx = 0, ty = 0, mx = 0, my = 0;
    let lastX = -1, lastY = -1;
    window.addEventListener('pointermove', (e) => {
      tx = e.clientX / window.innerWidth - 0.5;
      ty = e.clientY / window.innerHeight - 0.5;
      lastX = e.clientX; lastY = e.clientY;
      pointerMoved = true;
    }, { passive: true });

    /* robot interaction: raycast picking on a window listener
       (the canvas is pointer-events: none and must stay that way) */
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const botMeshes = [];
    bot.traverse((o) => { if (o.isMesh) botMeshes.push(o); });
    let nearBot = false, hoverBot = false, overBot = false, pointerMoved = false, pokeT = -1;
    let botYaw = 0, botPitch = 0, eyeShiftX = 0, eyeShiftY = 0;

    function hitsBot(cx, cy) {
      ndc.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return ray.intersectObjects(botMeshes, false).length > 0;
    }
    window.addEventListener('pointerdown', (e) => {
      if (!nearBot || pokeT >= 0) return;
      if (hitsBot(e.clientX, e.clientY)) pokeT = clock.getElapsedTime();
    });

    function size() {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    }
    size();
    window.addEventListener('resize', size);

    const look = new THREE.Vector3();
    const camPos = new THREE.Vector3();
    const tanNow = new THREE.Vector3();
    const tanAhead = new THREE.Vector3();
    const qPos = new THREE.Vector3();
    const UP = new THREE.Vector3(0, 1, 0);
    const clock = new THREE.Clock();
    let roll = 0, entranceZ = 0, lastT = 0, frameN = 0;
    let pulsePhase = 0, jobPhase = 0, orbitPhase = 0, ringPhase = 0;
    let rejStart = -1, nextReject = 2;
    const rejV = new THREE.Vector3();
    const entrance = { active: false, start: -1, dur: 1.6 };

    /* palette's motion toggle: stop the loop and drop the canvas */
    let dead = false;
    let worldAnnounced = false; /* reveals.js holds the loader until the first frame */
    window.killWorld = () => {
      dead = true;
      renderer.domElement.remove();
      document.body.style.cursor = '';
    };

    (function tick() {
      if (dead) return;
      requestAnimationFrame(tick);
      if (document.hidden) return;
      const t = clock.getElapsedTime();
      const dt = Math.min(t - lastT, 0.05);
      lastT = t;
      mx += (tx - mx) * 0.04;
      my += (ty - my) * 0.04;

      /* camera along the spline */
      const u = scrollParam();

      /* entrance: field converges while the camera dollies in (skipped if the
         page loads already scrolled past the hero) */
      if (entrance.start < 0) {
        entrance.start = t;
        entrance.active = u < 0.04;
      }
      if (entrance.active) {
        const e = smooth(Math.min((t - entrance.start) / entrance.dur, 1));
        const spread = 1 + (1 - e) * 2.2;
        const cp = cloud.geometry.attributes.position.array;
        for (let i = 0; i < cp.length; i++) cp[i] = cloudTarget[i] * spread;
        cloud.geometry.attributes.position.needsUpdate = true;
        const ap = amberPts.geometry.attributes.position.array;
        for (let i = 0; i < ap.length; i++) ap[i] = amberTarget[i] * spread;
        amberPts.geometry.attributes.position.needsUpdate = true;
        wf.scale.setScalar(0.5 + 0.5 * e);
        links.material.opacity = 0.14 * e;
        entranceZ = (1 - e) * 6;
        if (e >= 1) { entrance.active = false; entranceZ = 0; }
      }

      /* phones: geometry sits behind body text, so dim the world past the hero
         (the CSS transition on #world smooths the change) */
      if (mobile) holder.style.opacity = u > 0.04 ? 0.45 : 1;
      path.getPoint(u, camPos);
      camera.position.set(camPos.x + mx * 1.2, camPos.y - my * 0.8, camPos.z + entranceZ);
      const seg = Math.min(Math.floor(u * (W.length - 1)), W.length - 2);
      const lt = u * (W.length - 1) - seg;

      /* bank into turns; lead the look mid-leg so travel feels piloted */
      path.getTangent(u, tanNow);
      path.getTangent(Math.min(u + 0.02, 1), tanAhead);
      const targetRoll = Math.max(-0.06, Math.min(0.06, -(tanAhead.x - tanNow.x) * 2.2));
      roll += (targetRoll - roll) * 0.05;
      camera.up.set(Math.sin(roll), Math.cos(roll), 0);
      look.lerpVectors(W[seg], W[seg + 1], smooth(lt));
      look.addScaledVector(tanNow, Math.sin(lt * Math.PI) * 1.3);
      camera.lookAt(look);

      /* station life (arrival proximity wakes each station up) */
      const segF = u * (W.length - 1);
      const prox = (i) => Math.max(0, 1 - Math.abs(segF - i) / 0.7);
      cloud.rotation.y = t * 0.04;
      links.rotation.y = t * 0.04;
      amberPts.rotation.y = t * 0.06;
      wf.rotation.y = -t * 0.03;

      /* hero life: activations, breathing, drift (idle once well past the hero) */
      if (segF < 1.2) {
        if (t >= nextAct && !entrance.active && linkCount) {
          nextAct = t + 1 + Math.random() * 1.2;
          const free = acts.find(x => x.start < 0);
          if (free) { free.link = Math.floor(Math.random() * linkCount); free.start = t; }
        }
        acts.forEach(a => {
          if (a.start < 0) return;
          const p = (t - a.start) / 0.9;
          if (p >= 1) { a.start = -1; a.spark.visible = a.flare.visible = false; return; }
          const o = a.link * 6;
          const tr = smooth(Math.min(p / 0.7, 1));
          a.spark.visible = true;
          a.spark.position.set(
            linkArr[o] + (linkArr[o + 3] - linkArr[o]) * tr,
            linkArr[o + 1] + (linkArr[o + 4] - linkArr[o + 1]) * tr,
            linkArr[o + 2] + (linkArr[o + 5] - linkArr[o + 2]) * tr);
          const fl = Math.max(0, (p - 0.7) / 0.3);
          a.flare.visible = fl > 0;
          if (fl > 0) {
            a.flare.position.set(linkArr[o + 3], linkArr[o + 4], linkArr[o + 5]);
            a.flare.scale.setScalar(0.4 + Math.sin(fl * Math.PI) * 1.6);
          }
        });

        amberPts.material.size = 0.075 * (1 + 0.3 * Math.sin(t * 1.1));
        amberPts.material.opacity = 0.72 + 0.13 * Math.sin(t * 1.1 + 1);

        /* per-point wander keeps the field fluid (desktop; entrance owns the buffer) */
        if (!mobile && !entrance.active) {
          const cp = cloud.geometry.attributes.position.array;
          for (let i = 0; i < cp.length; i += 3) {
            cp[i] = cloudTarget[i] + Math.sin(t * 0.5 + cloudTarget[i + 1] * 2.3) * 0.06;
            cp[i + 1] = cloudTarget[i + 1] + Math.sin(t * 0.6 + cloudTarget[i + 2] * 2.1) * 0.05;
            cp[i + 2] = cloudTarget[i + 2] + Math.sin(t * 0.4 + cloudTarget[i] * 1.9) * 0.06;
          }
          cloud.geometry.attributes.position.needsUpdate = true;
          const ap = amberPts.geometry.attributes.position.array;
          for (let i = 0; i < ap.length; i += 3) {
            ap[i] = amberTarget[i] + Math.sin(t * 0.45 + amberTarget[i + 1] * 2.0) * 0.07;
            ap[i + 1] = amberTarget[i + 1] + Math.sin(t * 0.55 + amberTarget[i + 2] * 2.2) * 0.06;
            ap[i + 2] = amberTarget[i + 2] + Math.sin(t * 0.5 + amberTarget[i] * 1.8) * 0.07;
          }
          amberPts.geometry.attributes.position.needsUpdate = true;
        }
      }

      /* the cursor as a query vector: probe + live nearest-neighbor threads */
      if (qGroup) {
        const showQ = segF < 0.5 && lastX >= 0;
        qGroup.visible = showQ;
        if (showQ) {
          qGroup.rotation.y = cloud.rotation.y;
          ndc.set((lastX / window.innerWidth) * 2 - 1, -(lastY / window.innerHeight) * 2 + 1);
          ray.setFromCamera(ndc, camera);
          if (ray.ray.direction.z < -0.001) {
            qPos.copy(ray.ray.direction)
              .multiplyScalar(-ray.ray.origin.z / ray.ray.direction.z)
              .add(ray.ray.origin);
            if (qPos.length() > 4.6) qPos.setLength(4.6);
            qPos.applyAxisAngle(UP, -cloud.rotation.y);
            qDot.position.lerp(qPos, 0.15);
            const P = cloud.geometry.attributes.position.array;
            for (let k = 0; k < Q_K; k++) { qBestD[k] = 1e9; qBestI[k] = 0; }
            for (let i = 0; i < P.length / 3; i++) {
              const dx = P[i * 3] - qDot.position.x;
              const dy = P[i * 3 + 1] - qDot.position.y;
              const dz = P[i * 3 + 2] - qDot.position.z;
              const d = dx * dx + dy * dy + dz * dz;
              if (d < qBestD[Q_K - 1]) {
                let k = Q_K - 1;
                while (k > 0 && qBestD[k - 1] > d) {
                  qBestD[k] = qBestD[k - 1]; qBestI[k] = qBestI[k - 1]; k--;
                }
                qBestD[k] = d; qBestI[k] = i;
              }
            }
            for (let k = 0; k < Q_K; k++) {
              const i = qBestI[k], o = k * 6;
              qLinePos[o] = qDot.position.x;
              qLinePos[o + 1] = qDot.position.y;
              qLinePos[o + 2] = qDot.position.z;
              qLinePos[o + 3] = P[i * 3];
              qLinePos[o + 4] = P[i * 3 + 1];
              qLinePos[o + 5] = P[i * 3 + 2];
            }
            qLines.geometry.attributes.position.needsUpdate = true;
            /* retrieval pulses: sparks stream outward along each thread */
            for (let k = 0; k < Q_K; k++) {
              const o = k * 6;
              const ph = (t * 0.7 + k / Q_K) % 1;
              qSparks[k].position.set(
                qLinePos[o] + (qLinePos[o + 3] - qLinePos[o]) * ph,
                qLinePos[o + 1] + (qLinePos[o + 4] - qLinePos[o + 1]) * ph,
                qLinePos[o + 2] + (qLinePos[o + 5] - qLinePos[o + 2]) * ph);
            }
          }
        }
      }

      /* pipeline: staggered packets; stages bump as a packet passes through */
      pulsePhase += dt * (0.22 + prox(1) * 0.34);
      const spanX = (stages - 1) * 3.4;
      packets.forEach((p, i) => {
        const ph = (pulsePhase + i / packets.length) % 1;
        p.position.x = (ph - 0.5) * spanX;
      });
      stageBoxes.forEach((b, j) => {
        const bx = (j - (stages - 1) / 2) * 3.4;
        let bump = 0;
        packets.forEach((p) => { bump += Math.max(0, 1 - Math.abs(p.position.x - bx) / 1.2); });
        b.scale.setScalar(1 + Math.min(bump, 1) * 0.1);
      });

      jobPhase += dt * (0.06 + prox(2) * 0.09);
      jobs.forEach((c, i) => {
        const s = (jobPhase + i / jobCount) % 1;
        qCurve.getPoint(s, c.position);
        c.rotation.y = t * 0.8 + i;
      });
      dlq.rotation.z += dt * (0.5 + prox(2) * 1.6);

      /* dead-letter detour, only while the station is being watched */
      if (rejStart < 0 && t >= nextReject && prox(2) > 0.4) rejStart = t;
      if (rejStart >= 0) {
        const rp = t - rejStart;
        reject.visible = true;
        if (rp < 0.8) {
          const k = smooth(rp / 0.8);
          reject.position.lerpVectors(rejFrom, dlqPoint(0, rejV), k);
          reject.position.y += Math.sin(k * Math.PI) * 0.8;
          reject.scale.setScalar(1);
        } else if (rp < 2.4) {
          dlqPoint(((rp - 0.8) / 1.6) * Math.PI * 2, reject.position);
        } else if (rp < 2.9) {
          reject.scale.setScalar(Math.max(0.001, 1 - (rp - 2.4) / 0.5));
        } else {
          reject.visible = false;
          rejStart = -1;
          nextReject = t + 5 + Math.random() * 4;
        }
        reject.rotation.y = t * 2;
        reject.rotation.x = t * 1.3;
      }

      /* robot: idle sway, pointer tracking near the skills station, poke reaction */
      nearBot = segF > 1.9 && segF < 3.4;
      const idleYaw = Math.sin(t * 0.4) * 0.3;
      botYaw += ((nearBot ? idleYaw + tx * 0.6 : idleYaw) - botYaw) * 0.06;
      botPitch += ((nearBot ? -ty * 0.35 : 0) - botPitch) * 0.06;
      eyeShiftX += ((nearBot ? tx * 0.12 : 0) - eyeShiftX) * 0.08;
      eyeShiftY += ((nearBot ? -ty * 0.12 : 0) - eyeShiftY) * 0.08;

      let spin = 0, squash = 1, tipBoost = 0, bobAmp = 0.25;
      if (pokeT >= 0) {
        const p = Math.min((t - pokeT) / 0.7, 1);
        const bump = Math.sin(p * Math.PI);
        spin = (1 - Math.pow(1 - p, 3)) * Math.PI * 2;
        squash = 1 - bump * 0.85;
        tipBoost = bump;
        bobAmp = 0.25 * (1 + bump);
        if (p >= 1) pokeT = -1;
      }
      bot.position.y = Math.sin(t * 1.1) * bobAmp;
      bot.rotation.y = botYaw + spin;
      bot.rotation.x = botPitch;
      eyeL.position.set(-0.48 + eyeShiftX, 0.12 + eyeShiftY, 0.88);
      eyeR.position.set(0.48 + eyeShiftX, 0.12 + eyeShiftY, 0.88);
      eyeL.scale.y = squash;
      eyeR.scale.y = squash;
      const blink = (Math.sin(t * 2.2) + 1) / 2;
      const tipBase = 0.8 + blink * 0.5;
      tip.scale.setScalar(tipBase + (1.8 - tipBase) * tipBoost);
      orbitPhase += dt * (1 + prox(3) * 0.8);
      orbits.forEach((o, i) => { o.rotation.y = orbitPhase * (0.25 + i * 0.1); });

      /* hover raycast only when the pointer moved (plus a slow keep-fresh tick) */
      frameN++;
      if (!nearBot) overBot = false;
      else if (lastX >= 0 && (pointerMoved || (frameN & 15) === 0)) {
        overBot = hitsBot(lastX, lastY);
        pointerMoved = false;
      }
      if (overBot !== hoverBot) {
        hoverBot = overBot;
        document.body.style.cursor = overBot ? 'pointer' : '';
      }

      ringPhase += dt * (0.45 + prox(4) * 0.55);
      rings.forEach((r, i) => {
        const ph = (ringPhase + i / 3) % 1;
        r.scale.setScalar(0.4 + ph * (2.6 + prox(4) * 1.2));
        r.material.opacity = 0.55 * (1 - ph);
      });

      renderer.render(scene, camera);
      if (!worldAnnounced) {
        worldAnnounced = true;
        window.dispatchEvent(new Event('world-ready'));
      }
    })();
  } catch (e) {
    /* CDN unreachable: the page stays fully usable without 3D */
  }
}
