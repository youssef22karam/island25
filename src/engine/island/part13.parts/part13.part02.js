      vec3 padC=mix(vec3(.078,.210,.044),vec3(.18,.325,.076),tx);
      vec3 al=mix(mix(duckC,letC,letM),padC,padM);
      // Occasional creamy-white & soft-blush water lily blossoms perched on dense lily-pad clusters
      float bloom=0.;
      if(padM>.25&&microF>.05){
        vec2 bCell=floor(vP.xz*1.35),bF=fract(vP.xz*1.35)-.5;
        float bSeed=fwH(bCell+vec2(19.3,7.7));
        if(bSeed>.86){
          vec2 bOff=(vec2(fwH(bCell+3.1),fwH(bCell+8.7))-.5)*.45;
          float br=length(bF-bOff);
          bloom=smoothstep(.15,.04,br)*padM*microF;
          vec3 petalCol=mix(vec3(.96,.94,.86),vec3(.95,.76,.82),step(.93,bSeed));
          vec3 coreCol=vec3(.96,.78,.22);
          al=mix(al,mix(petalCol,coreCol,smoothstep(.06,.02,br)),bloom);
        }
      }
      vec3 pN=normalize(vec3((tx-.5)*.32,1.,(fwN(vP.xz*2.9+4.2)-.5)*.32));
      float pSun=max(dot(pN,uSun),0.);
      vec3 matLit=al*(hzSoft()*(.38+.15*pN.y)*lit+uSunCol*pSun*.64*(1.-uStorm*.68)+vec3(.01,.015,.02)*uNight);
      matLit+=uSunCol*pow(max(dot(pN,H),0.),44.)*padM*.20*sunVis;
      matLit*=.76+.24*smoothstep(.04,.42,mat)+bloom*.15;
      color=mix(color,matLit,clamp(mat*.92,0.,1.));
      alpha=mix(alpha,1.,clamp(mat*.96,0.,1.));
    }
  }

  // Ultra-silky feather kissing every sculpted curve of sand, pebbles, moss & dark rock banks
  float shoreFeather=smoothstep(.005,.09,depth)*vEdge;
  color*=1.-.10*(1.-smoothstep(.01,.16,depth))*smoothstep(.005,.02,depth);

  // Subtle lyrical morning/golden-hour bayou mist drifting faintly above swamps & serene channels
  float mistWisp=.65+.35*fwN(vP.xz*.012+vec2(uTime*.010,-uTime*.007));
  float valleyMist=(uTwi*.0024+uDay*.00038)*(1.-uNight)*(.26+swampW*.95)*mistWisp*exp(-max(cameraPosition.y-vLevel,0.)*.07);
  float fog=1.-exp(-dist*(uFog+valleyMist));
  color=mix(color,horizon(),fog);
  alpha=mix(alpha,1.,fog);
  alpha*=shoreFeather;
  color*=shoreFeather;

  gl_FragColor=vec4(color/max(alpha,.0001),alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor.rgb*=gl_FragColor.a;
}`;
function Ir(o, e) {
  let t = buildFreshwaterGeometry(o),
    r = new Qe.ShaderMaterial({
      uniforms: e,
      vertexShader: mi,
      fragmentShader: fi,
      transparent: !0,
      depthWrite: !1,
      side: Qe.DoubleSide,
      blending: Qe.CustomBlending,
      blendSrc: Qe.OneFactor,
      blendDst: Qe.OneMinusSrcAlphaFactor,
      blendEquation: Qe.AddEquation,
    }),
    s = new Qe.Mesh(t, r);
  return ((s.renderOrder = 2), (s.frustumCulled = !0), s);
}
function Pr(o, e) {
  let t = Ie(o.seed ^ 305874191),
    r = [],
    s = [],
    c = Math.max(2, Math.round(o.N / 180));
  for (let m = 1; m < o.N - 1; m += c)
    for (let h = 1; h < o.N - 1; h += c) {
      let l = m * o.N + h;
      if (!(!o.wet[l] || o.swamp[l] < 0.42) && !(t() > 0.30))
        for (let u = 0; u < 3; u++)
          (r.push(
            ((l % o.N) + t()) * o.cell - o.half,
            0.14 + t() * 1.45,
            (((l / o.N) | 0) + t()) * o.cell - o.half,
          ),
            s.push(t()));
    }
  if (!r.length) return null;
  let a = new Qe.BufferGeometry();
  (a.setAttribute("position", new Qe.Float32BufferAttribute(r, 3)),
    a.setAttribute("aSeed", new Qe.Float32BufferAttribute(s, 1)));
  let n = new Qe.ShaderMaterial({
      uniforms: e,
      transparent: !0,
      depthWrite: !1,
      blending: Qe.NormalBlending,
      vertexShader: `attribute float aSeed;uniform float uTime;varying float vFade;varying float vSeed;
      void main(){vec3 p=(modelMatrix*vec4(position,1.)).xyz;
        float phase=fract(uTime*(.024+aSeed*.024)+aSeed*13.);
        p.y+=phase*(.55+aSeed*1.25);p.xz+=vec2(sin(aSeed*49.+uTime*.06),cos(aSeed*73.+uTime*.045))*5.5;
        vec4 clip=viewMatrix*vec4(p,1.);gl_Position=projectionMatrix*clip;
        gl_PointSize=min(220.,(58.+aSeed*80.)*180./max(-clip.z,1.));
        float above=step(0.,cameraPosition.y);
        vFade=above*sin(phase*3.14159)*smoothstep(5.,22.,-clip.z)*(1.-smoothstep(240.,520.,-clip.z));
        vSeed=aSeed;}`,
      fragmentShader: `uniform vec3 uSunCol;uniform float uLight,uTwi,uNight,uStorm;
      varying float vFade;varying float vSeed;
      void main(){
      vec2 uv=gl_PointCoord-.5;
      float d=length(uv*vec2(1.0,1.45))*2.;
      float soft=exp(-d*d*2.4)*(1.-smoothstep(.45,1.,d));
      float a=soft*vFade*(.032+.038*uTwi+.018*uStorm)*(1.-.55*uNight);
      if(a<.001)discard;
      vec3 dayMist=vec3(.80,.88,.82)*max(uLight,.14);
      vec3 goldMist=mix(dayMist,uSunCol*vec3(1.05,.96,.82)*max(uLight,.22),uTwi*.68+.18);
      vec3 col=mix(goldMist,vec3(.14,.20,.26),uNight*.85);
      gl_FragColor=vec4(col,a);}`,
    }),
    i = new Qe.Points(a, n);
  return ((i.renderOrder = 2.5), i);
}
var ro = 8e3,
  Vr = 400,
  Gr = 10;
function ra(o, e, t, r) {
  let s =
    (Math.imul(o | 0, 374761393) +
      Math.imul(e | 0, 668265263) +
      Math.imul(t | 0, 2246822519) +
      Math.imul(r | 0, 1597334677)) |
    0;
  return (
    (s = Math.imul(s ^ (s >>> 13), 1274126177)),
    (s ^= s >>> 16),
    (s >>> 0) / 4294967296
  );
}
function Or(o, e, t) {
  return (o === 0 && e === 0) || ra(o, e, 1, t) < 0.72;
}
function Mn(o, e, t) {
  let r = o === 0 && e === 0,
    s = [3200, 4e3, 4800, 5400],
    c = r ? 7200 : s[Math.floor(ra(o, e, 2, t) * s.length)],
    a = c / 2,
    n = Math.max(ro / 2 - a - 150, 0),
    i = (o + 0.5) * ro + (ra(o, e, 3, t) * 2 - 1) * n - ro / 2,
    m = (e + 0.5) * ro + (ra(o, e, 4, t) * 2 - 1) * n - ro / 2;
  return {
    ix: o,
    iz: e,
    key: `${o},${e}`,
    cx: i,
    cz: m,
    seed: Math.floor(ra(o, e, 9, t) * 1e9) ^ t,
    N: Math.round(c / Gr),
    cell: Gr,
    span: c,
    half: a,
    isHome: r,
  };
}
export { Ir, Mn, Or, Pr, Vr, ro };
