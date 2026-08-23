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
    const GRAPHITE = 0x14161B, EDGE = 0x4A505A, AMBER = 0xF2A33C, GREY = 0x6E747E;

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

    /* ---------- station 1: the pipeline in 3D ---------- */
    const s1 = new THREE.Group();
    const stages = 4;
    for (let i = 0; i < stages; i++) {
      const b = edgedBox(2.4, 1.1, 1.1);
      b.position.x = (i - (stages - 1) / 2) * 3.4;
      s1.add(b);
    }
    const railGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-(stages - 1) / 2 * 3.4, 0, 0),
      new THREE.Vector3((stages - 1) / 2 * 3.4, 0, 0)
    ]);
    s1.add(new THREE.Line(railGeo, amberLineMat));
    const pulse3d = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), amberMat);
    s1.add(pulse3d);
    s1.position.copy(W[1]).add(new THREE.Vector3(-4.5, 0, 0));
    s1.rotation.y = 0.35;
    scene.add(s1);

    /* ---------- station 2: the job queue ---------- */
    const s2 = new THREE.Group();
    const qCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-6, -1.5, 2), new THREE.Vector3(-2, 0.5, -1),
      new THREE.Vector3(2, -0.5, 1), new THREE.Vector3(6, 1.2, -2)
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
    dlq.position.set(6.5, -1.5, 0);
    dlq.rotation.x = Math.PI / 2.4;
    s2.add(dlq);
    s2.position.copy(W[2]).add(new THREE.Vector3(-4.5, 0, 0));
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
    [[3.4, 0.4, 5], [4.4, -0.5, 4], [5.4, 0.9, 3]].forEach(([r, tilt, n]) => {
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
    s3.position.copy(W[3]).add(new THREE.Vector3(-4.2, 0.5, 0));
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
    s4.position.copy(W[4]).add(new THREE.Vector3(4.5, -0.5, 0));
    scene.add(s4);

    /* ---------- camera path through the stations ---------- */
    const camOffset = new THREE.Vector3(0, 1.2, 9.5);
    const camPts = W.map(w => w.clone().add(camOffset));
    const path = new THREE.CatmullRomCurve3(camPts, false, 'catmullrom', 0.4);

    /* section-anchor mapping lives in the classic script (window.scrollParam),
       shared with the station rail */
    const scrollParam = window.scrollParam;

    function smooth(t) { return t * t * (3 - 2 * t); }

    let tx = 0, ty = 0, mx = 0, my = 0;
    let lastX = -1, lastY = -1;
    window.addEventListener('pointermove', (e) => {
      tx = e.clientX / window.innerWidth - 0.5;
      ty = e.clientY / window.innerHeight - 0.5;
      lastX = e.clientX; lastY = e.clientY;
    }, { passive: true });

    /* robot interaction: raycast picking on a window listener
       (the canvas is pointer-events: none and must stay that way) */
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const botMeshes = [];
    bot.traverse((o) => { if (o.isMesh) botMeshes.push(o); });
    let nearBot = false, hoverBot = false, pokeT = -1;
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
    const clock = new THREE.Clock();

    /* palette's motion toggle: stop the loop and drop the canvas */
    let dead = false;
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
      mx += (tx - mx) * 0.04;
      my += (ty - my) * 0.04;

      /* camera along the spline */
      const u = scrollParam();
      path.getPoint(u, camPos);
      camera.position.set(camPos.x + mx * 1.2, camPos.y - my * 0.8, camPos.z);
      const seg = Math.min(Math.floor(u * (W.length - 1)), W.length - 2);
      const lt = u * (W.length - 1) - seg;
      look.lerpVectors(W[seg], W[seg + 1], smooth(lt));
      camera.lookAt(look);

      /* station life */
      cloud.rotation.y = t * 0.04;
      amberPts.rotation.y = t * 0.06;
      wf.rotation.y = -t * 0.03;

      const pu = (t * 0.22) % 1;
      pulse3d.position.x = (pu - 0.5) * (stages - 1) * 3.4;

      jobs.forEach((c, i) => {
        const s = (t * 0.06 + i / jobCount) % 1;
        qCurve.getPoint(s, c.position);
        c.rotation.y = t * 0.8 + i;
      });
      dlq.rotation.z = t * 0.5;

      /* robot: idle sway, pointer tracking near the skills station, poke reaction */
      const seg3 = u * (W.length - 1);
      nearBot = seg3 > 1.9 && seg3 < 3.4;
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
      orbits.forEach((o, i) => { o.rotation.y = t * (0.25 + i * 0.1); });

      const overBot = nearBot && lastX >= 0 && hitsBot(lastX, lastY);
      if (overBot !== hoverBot) {
        hoverBot = overBot;
        document.body.style.cursor = overBot ? 'pointer' : '';
      }

      rings.forEach((r, i) => {
        const ph = (t * 0.45 + i / 3) % 1;
        r.scale.setScalar(0.4 + ph * 4);
        r.material.opacity = 0.55 * (1 - ph);
      });

      renderer.render(scene, camera);
    })();
  } catch (e) {
    /* CDN unreachable: the page stays fully usable without 3D */
  }
}
