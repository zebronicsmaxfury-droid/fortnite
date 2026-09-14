// Sky dome, sun, clouds, lighting and fog.
window.FN = window.FN || {};
(function () {
  const S = {};
  S.create = function (scene) {
    // Sky dome shader: horizon -> zenith gradient with sun glow
    // Sphere radius set to 1300 so it stays comfortably within the 1500 camera far plane!
    const geo = new THREE.SphereGeometry(1300, 16, 8);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: {
        top: { value: new THREE.Color(0x3d8fe4) }, mid: { value: new THREE.Color(0x7cbdf3) }, bottom: { value: new THREE.Color(0xdcefff) },
        sunDir: { value: new THREE.Vector3(0.35, 0.6, 0.35).normalize() }, tint: { value: new THREE.Color(0xffffff) }, stormMix: { value: 0 },
      },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `varying vec3 vDir; uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 tint; uniform float stormMix;
        void main(){ float h = clamp(vDir.y, -0.2, 1.0); vec3 c = h < 0.15 ? mix(bottom, mid, smoothstep(-0.05, 0.15, h)) : mix(mid, top, smoothstep(0.15, 0.8, h));
        float s = max(dot(vDir, sunDir), 0.0); c += vec3(1.0, 0.95, 0.8) * pow(s, 220.0) * 1.2 + vec3(1.0, 0.9, 0.7) * pow(s, 12.0) * 0.18;
        vec3 stormC = mix(vec3(0.55, 0.35, 0.7), vec3(0.35, 0.2, 0.5), h); c = mix(c, stormC, stormMix); gl_FragColor = vec4(c * tint, 1.0); }`
    });
    S.dome = new THREE.Mesh(geo, mat); S.dome.frustumCulled = false; S.dome.renderOrder = -10; scene.add(S.dome);
    S.mat = mat;

    // Lights
    S.hemi = new THREE.HemisphereLight(0xcfe9ff, 0x6c8f3a, 0.95); scene.add(S.hemi);
    S.sun = new THREE.DirectionalLight(0xfff4e0, 1.7);
    S.sun.position.set(300, 520, 300); S.sun.castShadow = false; // shadows disabled for performance
    const sc = S.sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 50; sc.far = 1200;
    S.sun.shadow.mapSize.set(128, 128); S.sun.shadow.bias = -0.0008; S.sun.shadow.normalBias = 0.6; S.sun.shadow.radius = 2;
    scene.add(S.sun); scene.add(S.sun.target);
    S.ambient = new THREE.AmbientLight(0xffffff, 0.18); scene.add(S.ambient);

    // Fog — bring it closer on potato/low to aggressively cull distant fill
    S.fogColor = new THREE.Color(0xbfe0fa); S.fogNear = 280; S.fogFar = 1400;
    scene.fog = new THREE.Fog(S.fogColor, S.fogNear, S.fogFar);
    scene.background = null;

    // Clouds (billboards) — count comes from quality preset
    S.clouds = new THREE.Group(); S.clouds.name = 'clouds'; S.cloudSprites = [];
    const q = FN.Engine && FN.Engine.quality ? FN.Engine.quality : null;
    const cloudN = q ? q.cloudsCount : 0;
    if (cloudN > 0) {
      const r = FN.U.mulberry32(21);
      for (let i = 0; i < cloudN; i++) {
        const tex = FN.Tex.cloud(i % 6);
        const m = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.92, depthWrite: false, fog: false });
        const sp = new THREE.Sprite(m);
        const sz = 260 + r() * 420; sp.scale.set(sz, sz * 0.5, 1);
        sp.position.set((r() - 0.5) * 5200, 560 + r() * 380, (r() - 0.5) * 5200);
        sp.userData.speed = 1.2 + r() * 2.0;
        S.clouds.add(sp); S.cloudSprites.push(sp);
      }
    }
    scene.add(S.clouds);
    // Sun sprite — always create safely with 1200 distance (< 1500 camera far)
    const sunSp = new THREE.Sprite(new THREE.SpriteMaterial({ map: FN.Tex.glow(), color: 0xfff6d0, transparent: true, opacity: 0.9, depthWrite: false, fog: false }));
    sunSp.scale.set(260, 260, 1); sunSp.position.copy(mat.uniforms.sunDir.value).multiplyScalar(1200); S.sunSprite = sunSp; scene.add(sunSp);
    return S;
  };
  S.update = function (dt, camPos) {
    if (S.dome) S.dome.position.copy(camPos);
    if (S.sunSprite && S.mat) S.sunSprite.position.copy(S.mat.uniforms.sunDir.value).multiplyScalar(1200).add(camPos);
    if (S.clouds && S.clouds.children.length > 0) {
      for (const c of S.clouds.children) { c.position.x += c.userData.speed * dt; if (c.position.x > 2800) c.position.x = -2800; }
      S.clouds.position.set(camPos.x * 0.6, 0, camPos.z * 0.6);
    }
    if (S.sun) { S.sun.position.set(camPos.x + 300, camPos.y + 520, camPos.z + 300); S.sun.target.position.set(camPos.x, camPos.y, camPos.z); S.sun.target.updateMatrixWorld(); }
  };
  S.setQuality = function (on) { if (S.clouds) S.clouds.visible = !!on; };
  S.setStorm = function (mix, scene) {
    if (!S.mat) return; S.mat.uniforms.stormMix.value = mix;
    const base = new THREE.Color(0xbfe0fa), storm = new THREE.Color(0x8a5cb8);
    scene.fog.color.copy(base).lerp(storm, mix);
    scene.fog.near = FN.U.lerp(S.fogNear, 60, mix); scene.fog.far = FN.U.lerp(S.fogFar, 700, mix);
    S.hemi.intensity = 0.95 - 0.35 * mix; S.sun.intensity = 1.7 - 0.9 * mix;
  };
  FN.Sky = S;
})();
