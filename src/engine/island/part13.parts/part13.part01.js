// island.js - part 13/21 (statements 152-159 of the original module).
import * as Qe from "three";
import { buildFreshwaterGeometry } from "../hydrology.js";
import { Ie, ne, re } from "./part01.js";
import { ft } from "./part06.js";
import { na, ui } from "./part12.js";

function hi(o) {
  let e = [],
    t = [],
    r = [],
    s = [],
    sw = [],
    c = (u) => {
      (e.push(u.x, ui, u.z),
        t.push(u.fx, u.fz, u.depth, u.sed),
        r.push(re(u.mask, 0, 1) * ne(0, 1.1, u.depth)),
        s.push(u.river),
        sw.push(u.sw, u.lk));
    },
    a = (u, d, p) => ({
      x: u.x + (d.x - u.x) * p,
      z: u.z + (d.z - u.z) * p,
      signed: 0,
      depth: u.depth + (d.depth - u.depth) * p,
      fx: u.fx + (d.fx - u.fx) * p,
      fz: u.fz + (d.fz - u.fz) * p,
      sed: u.sed + (d.sed - u.sed) * p,
      river: u.river + (d.river - u.river) * p,
      mask: u.mask + (d.mask - u.mask) * p,
      sw: u.sw + (d.sw - u.sw) * p,
      lk: u.lk + (d.lk - u.lk) * p,
    }),
    n = (u) => {
      let d = [];
      for (let p = 0; p < u.length; p++) {
        let x = u[p],
          f = u[(p + 1) % u.length];
        (x.signed >= 0 && d.push(x),
          x.signed >= 0 != f.signed >= 0 &&
            d.push(a(x, f, x.signed / (x.signed - f.signed))));
      }
      return d;
    },
    i = o.N,
    m = new Float32Array(i * i);
  for (let u = 0; u < i * i; u++)
    m[u] = o.wet[u] ? 1 : o.h[u] < 0 ? ne(0.42, 0.94, o.inl[u]) : 0;
  let h = (u) => {
    let d = -o.h[u],
      p = Math.hypot(o.flowX[u], o.flowZ[u]),
      lk = o.lakeId && o.lakeId[u] >= 0 ? 1 : 0;
    return {
      x: ((u % i) + 0.5) * o.cell - o.half,
      z: (((u / i) | 0) + 0.5) * o.cell - o.half,
      signed: d,
      depth: Math.max(0, d),
      fx: o.flowX[u],
      fz: o.flowZ[u],
      sed: o.sed[u],
      river: re(ne(0.045, 0.36, p), 0, 1),
      mask: m[u],
      sw: o.swamp ? re(o.swamp[u] * (1 - lk * 0.85), 0, 1) : 0,
      lk,
    };
  };
  for (let u = 0; u < i - 1; u++)
    for (let d = 0; d < i - 1; d++) {
      let p = u * i + d,
        x = [p, p + i, p + 1, p + i + 1],
        f = 0;
      for (let b of x) f = Math.max(f, m[b]);
      if (f <= 0.02) continue;
      let v = x.map(h);
      for (let b of [
        [0, 1, 2],
        [2, 1, 3],
      ]) {
        let g = n(b.map((M) => v[M]));
        for (let M = 1; M + 1 < g.length; M++) (c(g[0]), c(g[M]), c(g[M + 1]));
      }
    }
  let l = new Qe.BufferGeometry();
  return (
    l.setAttribute("position", new Qe.Float32BufferAttribute(e, 3)),
    l.setAttribute("aWater", new Qe.Float32BufferAttribute(t, 4)),
    l.setAttribute("aEdge", new Qe.Float32BufferAttribute(r, 1)),
    l.setAttribute("aRiver", new Qe.Float32BufferAttribute(s, 1)),
    l.setAttribute("aSwamp", new Qe.Float32BufferAttribute(sw, 2)),
    l.setAttribute("aMask", new Qe.Float32BufferAttribute(r, 1)),
    l.computeBoundingSphere(),
    l
  );
}
var mi = `
attribute vec4 aWater;
attribute float aEdge,aRiver,aMask;
attribute vec2 aSwamp;
uniform float uTime,uWindAmt,uWakeCell;
uniform vec2 uWind;
uniform sampler2D uWakeTexture;
uniform vec4 uWakeBox;
varying vec3 vP;
varying vec2 vFlow,vSwamp;
varying float vDepth,vEdge,vRiver,vSed,vLevel,vWake,vMask;
void main(){
  vec3 p=(modelMatrix*vec4(position,1.)).xyz;
  vLevel=p.y;vDepth=aWater.z;vFlow=aWater.xy;
  vSed=aWater.w;vEdge=aEdge;vRiver=aRiver;vSwamp=aSwamp;vMask=aMask;
  vec2 p2=p.xz;
  vec2 uv=(p2-uWakeBox.xy)/max(uWakeBox.z,.001);
  float inside=step(0.,uv.x)*step(uv.x,1.)*step(0.,uv.y)*step(uv.y,1.)*uWakeBox.w;
  vec4 wake=texture2D(uWakeTexture,clamp(uv,.001,.999));
  vWake=wake.b*inside;
  p.y+=wake.r*inside*aEdge;
  vP=p;
  gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);
}`,
  fi =
    ft +
    `
uniform sampler2D uReflection,uRefraction,uWaterTex,uWakeTexture;
uniform float uPx;
uniform mat4 uReflectionMatrix,uRefractionMatrix;
uniform float uReflectionActive,uReflectionLevel,uRefractionActive,uFog,uWindAmt,uRain,uWakeCell;
uniform vec4 uWakeBox;
uniform vec2 uWind;
varying vec3 vP;
varying vec2 vFlow,vSwamp;
varying float vDepth,vEdge,vRiver,vSed,vLevel,vWake,vMask;

vec2 rotateUV(vec2 p,float a){float c=cos(a),s=sin(a);return vec2(c*p.x-s*p.y,s*p.x+c*p.y);}
float fwH(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float fwN(vec2 p){vec2 i=floor(p),f=p-i;f=f*f*(3.-2.*f);return mix(mix(fwH(i),fwH(i+vec2(1.,0.)),f.x),mix(fwH(i+vec2(0.,1.)),fwH(i+vec2(1.,1.)),f.x),f.y);}
// Analytic noise + gradient for silky animated capillary ripples without shimmer
vec3 fwND(vec2 p){
  vec2 i=floor(p),f=p-i;vec2 u=f*f*(3.-2.*f),du=6.*f*(1.-f);
  float a=fwH(i),b=fwH(i+vec2(1.,0.)),c=fwH(i+vec2(0.,1.)),d=fwH(i+vec2(1.,1.));
  float k=a-b-c+d;
  return vec3(a+(b-a)*u.x+(c-a)*u.y+k*u.x*u.y,du*(vec2(b-a,c-a)+k*u.yx));
}
// Dual-phase flow-advected ripple wave map: continuous round every curving river bend
vec4 flowTex(vec2 p,vec2 velocity,float size,float angle,float period){
  float ph=uTime/period;
  float f0=fract(ph),f1=fract(ph+.5);
  float w0=1.-abs(f0*2.-1.),w1=1.-w0;
  vec2 o0=fract(vec2(.173,.619)*floor(ph));
  vec2 o1=fract(vec2(.431,.237)*floor(ph+.5));
  vec4 ta=texture2D(uWaterTex,rotateUV(p-velocity*f0*period,angle)/size+o0);
  vec4 tb=texture2D(uWaterTex,rotateUV(p-velocity*f1*period,angle)/size+vec2(.43,.23)+o1);
  return ta*w0+tb*w1;
}
// Flow-aligned anisotropic river ripples, shallow diamond cross-braiding & marginal eddies
vec2 riverCapillary(vec2 p,vec2 flow,float spd,float shallow,float pixel){
  float b1=1.-smoothstep(.18,.76,pixel),b2=1.-smoothstep(.045,.22,pixel);
  if(b1<.01)return vec2(0.);
  vec2 fd=flow/max(spd,1e-4),fn=vec2(-fd.y,fd.x);
  float T=2.2,ph=uTime/T;
  float f0=fract(ph),f1=fract(ph+.5);
  float w0=1.-abs(f0*2.-1.);
  vec2 qa=p-flow*f0*T*1.65,qb=p-flow*f1*T*1.65+vec2(13.7,5.3);
  float eddy=(fwN(p*.12+uTime*.08)-.5)*shallow*1.45;
  vec2 sa=vec2(dot(qa,fd)*.42,dot(qa,fn)*1.55+eddy);
  vec2 sb=vec2(dot(qb,fd)*.42,dot(qb,fn)*1.55+eddy);
  vec2 g=(fwND(sa).yz*vec2(.42,1.55)*w0+fwND(sb).yz*vec2(.42,1.55)*(1.-w0))*(.030+.055*spd+.038*shallow)*b1;
  vec2 d1=normalize(fd*.72+fn*.69),d2=normalize(fd*.72-fn*.69);
  float p1=dot(p,d1)*2.3-uTime*(2.0+spd*2.1)+fwN(p*.33)*3.2;
  float p2=dot(p,d2)*2.7-uTime*(1.8+spd*1.9)+fwN(p*.37+4.1)*3.2;
  vec2 braid=(d1*cos(p1)+d2*cos(p2))*(.014+.025*shallow)*b1;
  if(b2>.01){
    vec2 sa2=vec2(dot(qa,fd)*1.55,dot(qa,fn)*3.9)+vec2(3.1,7.4);
    vec2 sb2=vec2(dot(qb,fd)*1.55,dot(qb,fn)*3.9)+vec2(3.1,7.4);
    g+=(fwND(sa2).yz*vec2(1.55,3.9)*w0+fwND(sb2).yz*vec2(1.55,3.9)*(1.-w0))*(.009+.018*spd)*b2;
  }
  return fd*g.x+fn*g.y+braid;
}
// Delicate expanding circular ripples: rain drops & swamp rising marsh-gas bubble pops
vec2 surfaceRings(vec2 p,float pixel,float density,float scale,float speed,float amp){
  float vis=1.-smoothstep(.05,.26,pixel);
  if(vis<.01||density<.01)return vec2(0.);
  vec2 g=vec2(0.);
  for(int L=0;L<2;L++){
    float fl=float(L);
    vec2 q=p*scale+vec2(fl*7.13,fl*3.91);
    vec2 i=floor(q),f=q-i-.5;
    float h=fwH(i+fl*23.7);
    if(h>density)continue;
    vec2 c=(vec2(fwH(i+3.1+fl),fwH(i+5.9+fl))-.5)*.46;
    float t=fract(uTime*speed*(.75+.45*h)+h*19.3);
    vec2 dd=f-c;float r=length(dd);
    float x=(r-t*.46)*24.;
    float w=sin(x*1.5)*exp(-x*x*.34)*pow(1.-t,2.1)*smoothstep(0.,.06,t);
    g+=dd/max(r,.001)*w;
  }
  return g*amp*vis;
}
// Physically normalized GGX specular sun sparkle lobe
float ggxLobe(float nh,float nl,float nv,float vh,float rough){
  float a=max(rough*rough,.0005);
  float d=nh*nh*(a-1.)+1.;
  float D=a/max(3.1415926*d*d,1e-5);
  float vis=.5/max(nl*sqrt(nv*nv*(1.-a)+a)+nv*sqrt(nl*nl*(1.-a)+a),1e-4);
  return D*vis*(.0204+.9796*pow(1.-vh,5.))*nl;
}

void main(){
  vec3 eye=cameraPosition-vP;
  float dist=length(eye);
  vec3 V=eye/max(dist,.001);
  float depth=max(vDepth,.01);
  vec2 flow=vFlow;
  float speed=length(flow);
  vec2 wind=normalize(uWind+vec2(.0001));

  // Crisp yet organically feathered water-body blending:
  //   lakeW  -> radiant alpine/tropical jewel lake (clear aquamarine->emerald->deep sapphire teal)
  //   riverW -> majestic flowing wide emerald-jade river with animated eddies & sunlit ripples
  //   swampW -> rich authentic dark olive-amber blackwater mirror with winding open channels & botany
  float lakeFlag=clamp(vSwamp.y,0.,1.);
  float fastMain=smoothstep(.46,.82,speed);
  float swRaw=clamp(vSwamp.x,0.,1.)*(1.-lakeFlag*.94);
  // Rich, unmistakably moody dark steeped tea-olive swamp mirrors throughout every marsh basin & oxbow
  float swOrganic=smoothstep(.20,.48,swRaw+(fwN(vP.xz*.024)-.5)*.14)*(1.-lakeFlag*.94)*(1.-fastMain*.68);
  float running=smoothstep(.07,.38,speed)*clamp(vRiver,0.,1.)*(1.-lakeFlag*.86);
  float swampW=clamp(swOrganic,0.,1.);
  float riverW=running*(1.-swampW*.82);
  float lakeW=clamp(1.-riverW-swampW,0.,1.)*max(lakeFlag,1.-running*.8)*(1.-swampW);
  float wSum=max(lakeW+riverW+swampW,1e-4);
  lakeW/=wSum;riverW/=wSum;swampW/=wSum;
  float sed=clamp(vSed,0.,1.)*(1.-lakeFlag*.84);
  float shallow=1.-smoothstep(.12,1.8,depth);
  float nearShore=1.-smoothstep(.04,.90,depth);

  // Smooth analytic pixel footprint: completely anti-aliased from waterline to mountain overlook
  float pixel=dist*uPx/max(abs(V.y),.075);
  float detail=1.-smoothstep(.25,2.3,pixel);
  float farFade=1.-smoothstep(540.,960.,dist);

  // Gradual estuary-to-sea blend factor (0 = pure inland, 1 = outer estuary merging into open sea)
  float estBlend=1.-smoothstep(.18,.96,vMask);

  // ---- Multi-scale living wave slopes ----
  vec2 slope=vec2(0.);
  float n1=.5,n2=.5,n3=.5,gust=0.;
  if(dist<960.){
    // Soft wandering silver wind cat's-paws across open lakes, keeping sheltered bays razor glassy!
    vec2 wPerp=vec2(-wind.y,wind.x);
    vec2 gp=vec2(dot(vP.xz,wind)*.0095,dot(vP.xz,wPerp)*.021)-vec2(uTime*.042,0.);
    float catPaw=fwN(gp)*.60+fwN(gp*2.35+vec2(5.1,2.7))*.40;
    float shelter=smoothstep(.45,3.2,depth);
    gust=smoothstep(.36,.78,catPaw)*shelter;

    float flowBoost=.48+1.06*riverW;
    vec2 adv1=flow*flowBoost+wind*(.22*lakeW+.035*swampW+.18*estBlend);
    vec2 adv2=flow*(1.32*flowBoost)-wind*(.14*lakeW);
    vec4 t1=flowTex(vP.xz,adv1,11.3,.41,3.2);
    vec4 t2=flowTex(vP.xz,adv2,4.17,-1.06,2.1);
    vec4 t3=flowTex(vP.xz,adv2*1.38,1.63,1.87,1.4);
    n1=t1.b;n2=t2.b;n3=t3.a;
    vec2 g1=rotateUV((t1.rg*2.-1.)*${na.toFixed(1)},-.41)/11.3;
    vec2 g2=rotateUV((t2.rg*2.-1.)*${na.toFixed(1)},1.06)/4.17;
    vec2 g3=rotateUV((t3.rg*2.-1.)*${na.toFixed(1)},-1.87)/1.63;

    // Lakes: mirror-glass sheltered coves interleaved with silky directional wind cat's-paw wave trains
    float lakeAmp=(.08+.92*gust)*(.30+.70*uWindAmt+.35*uRain)*(1.-smoothstep(.35,2.5,pixel)*.52);
    vec2 lakeSlope=(g1*.84+g2*.56+g3*.30*detail)*lakeAmp*4.8;
    float wTrain=cos(dot(vP.xz,wind)*1.08-uTime*1.62+t1.b*3.4)*gust*(.014+.028*uWindAmt)*(1.-smoothstep(.15,.78,pixel));
    float wCross=cos(dot(vP.xz,normalize(wind*.8+wPerp*.6))*1.95-uTime*2.1+t2.b*2.6)*gust*(.007+.013*uWindAmt)*(1.-smoothstep(.08,.42,pixel));
    lakeSlope+=wind*wTrain+wPerp*wCross;

    // Rivers: silky, energetic flow-aligned ripples winding round bends + cross-shoal diamond wavelets + bank eddies
    vec2 riverSlope=(g1*.88+g2*.68+g3*.36*detail)*(.56+.80*speed)*(.50+.50*detail)*6.3;
    riverSlope+=riverCapillary(vP.xz,flow,speed,shallow,pixel)*(.95+.48*min(speed,1.25));

    // Swamps: velvety obsidian-still mirror broken softly by slow concentric marsh-gas bubble rings
    vec2 swampSlope=(g1*.16+g2*.11)*(.08+.15*uWindAmt)*detail*1.5;
    swampSlope+=surfaceRings(vP.xz,pixel,.44,.22,.20,.036)*smoothstep(.20,1.0,depth);

    slope=(lakeSlope*lakeW+riverSlope*riverW+swampSlope*swampW)*farFade;
    // Gradual incoming coastal swell ripples entering the outer estuary mouth
    if(estBlend>.01){
      float sPh=dot(vP.xz,wind)*.34-uTime*1.25+t1.b*2.1;
      float sPh2=dot(vP.xz,normalize(wind*.72+wPerp*.69))*.78-uTime*1.75;
      vec2 estSwell=(wind*cos(sPh)*.032+wPerp*cos(sPh2)*.016)*estBlend*(1.-smoothstep(.25,1.6,pixel));
      slope+=estSwell+(g1*.72+g2*.48)*estBlend*2.4*farFade;
    }
    slope+=g3*nearShore*(1.-swampW*.86)*.82*detail*farFade;
    if(uRain>.01){
      slope+=surfaceRings(vP.xz,pixel,clamp(uRain*1.05,0.,.95),1.75,.95,.14*(.5+.5*uRain));
    }
  }
  // Live interactive boat V-wake ripples
  vec2 wakeUV=(vP.xz-uWakeBox.xy)/max(uWakeBox.z,.001);
  if(uWakeBox.w>.5&&vWake>.0001&&min(min(wakeUV.x,wakeUV.y),min(1.-wakeUV.x,1.-wakeUV.y))>.005){
    float e=uWakeCell/max(uWakeBox.z,.001);
    float wr=texture2D(uWakeTexture,wakeUV+vec2(e,0.)).r;
    float wd=texture2D(uWakeTexture,wakeUV+vec2(0.,e)).r;
    float wc=texture2D(uWakeTexture,wakeUV).r;
    slope+=vec2(wr-wc,wd-wc)/max(uWakeCell,.01)*1.3;
  }

  // ---- UNDERSIDE (Dive mode): faithful kelp3 Snell's window & wavy internal mirror ----
  if(cameraPosition.y<vLevel-.025){
    // Authentic kelp3 rolling multi-directional surface waves (swell + breaking silk chop!)
    vec2 wp=vP.xz;
    vec2 cg=vec2(0.);
    vec2 d0=vec2(.60,-.80),d1=vec2(-.32,.95),d2=vec2(.88,.47),d3=vec2(-.74,.67);
    float w0=dot(wp,d0)*.48-uTime*1.05;
    float w1=dot(wp,d1)*.88-uTime*1.48+1.7;
    float w2=dot(wp,d2)*1.68-uTime*2.15+3.4;
    float w3=dot(wp,d3)*3.05-uTime*2.95+5.1;
    float rf=1.-smoothstep(18.,58.,dist);
    cg+=d0*cos(w0)*.14+d1*cos(w1)*.11+(d2*cos(w2)*.075+d3*cos(w3)*.045)*rf;
    cg+=slope*mix(.50,.85,riverW)*rf;
    float ch=sin(w0)*.44+sin(w1)*.34+sin(w2)*.22*rf;
    vec3 Nu=normalize(vec3(-cg.x,1.,-cg.y));
    vec3 upRay=-V;
    float cosR=max(dot(upRay,Nu),0.);
    // Snell's critical window (~48.6 deg) dynamically sculpted into shimmering glowing molten waves!
    float winEdge=cosR+ch*.11;
    float window=smoothstep(.52,.70,winEdge);
    float fringe=smoothstep(.42,.60,winEdge)*(1.-smoothstep(.64,.78,winEdge));
    float litU=max(uLight,.09)*(1.-.42*uStorm);
    vec3 winBase=mix(mix(vec3(.30,.78,.74),vec3(.32,.72,.52),riverW),vec3(.28,.38,.15),swampW)*litU;
    vec3 skyHi=mix(winBase,mix(vec3(.82,.98,.94),vec3(.74,.74,.38),swampW)*litU,smoothstep(.62,.94,winEdge));
    vec3 sunU=normalize(vec3(uSun.x*.52,max(uSun.y,.42),uSun.z*.52));
    float sAlign=max(dot(normalize(upRay+vec3(cg.x,0.,cg.y)*.52),sunU),0.);
    float sSpark=pow(sAlign,9.)*.95+pow(sAlign,44.)*2.4+pow(max(dot(reflect(-sunU,Nu),-upRay),0.),24.)*.85;
    vec3 sunTint=mix(uSunCol*.68+vec3(.68,.98,.90),vec3(1.0,.90,.46),swampW*.65+.28);
    vec3 winCol=skyHi+sunTint*sSpark*litU*(1.-.72*uStorm)*smoothstep(.26,.65,winEdge);
    // Outside critical cone: dramatic rippling sapphire-emerald liquid-mercury mirror ceiling!
    float waveBand=smoothstep(-.42,.58,ch);
    float crestSpec=pow(clamp(ch*.5+.5,0.,1.),3.2)*rf;
    vec3 tirDark=mix(mix(vec3(.018,.135,.185),vec3(.018,.118,.092),riverW),vec3(.016,.032,.013),swampW)*litU;
    vec3 tirBright=mix(mix(vec3(.11,.48,.49),vec3(.10,.42,.29),riverW),vec3(.12,.19,.072),swampW)*litU;
    vec3 tirCol=mix(tirDark,tirBright,waveBand*.74)+tirBright*crestSpec*.92;
    // Luminous scalloped aquamarine-gold glitter rim tracing wave ribs along Snell's window!
    vec3 rimCol=mix(vec3(.52,.96,.88),vec3(.68,.72,.32),swampW)*litU;
    vec3 colU=mix(tirCol,winCol,window)+rimCol*fringe*(.35+.52*waveBand);
    // Floating swamp mats create painterly backlit shadowed lily skylights directly overhead
    if(swampW>.15){
      float pad=smoothstep(.42,.62,fwN(wp*.085+vec2(2.1,-1.3))*.65+fwN(wp*.26)*.35)*swampW;
      colU=mix(colU,vec3(.020,.040,.013)*litU,pad*.76);
    }
    // Seamlessly melts right into kelp3 sunward-lit underwater backdrop horizon (zero hard bright bar!)
    float sunW=mix(.46,1.0,smoothstep(-.35,.85,dot(upRay,sunU)));
    float murk=mix(mix(.048,.064,riverW),.098,swampW);
    vec3 farUW=mix(mix(vec3(.045,.25,.30),vec3(.046,.22,.16),riverW),vec3(.055,.088,.032),swampW)*litU*sunW*(.66+.34*exp(-max(-cameraPosition.y,0.)*.038));
    float horizFade=exp(-max(dist-3.5,0.)*murk*1.10)*smoothstep(.02,.24,upRay.y);
    colU=mix(farUW,colU,clamp(horizFade,0.,1.));
    float aU=clamp(vEdge,0.,1.);
    gl_FragColor=vec4(colU,aU);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    gl_FragColor.rgb*=gl_FragColor.a;
    return;
  }

  // ---- ABOVE-WATER PHOTOREALISTIC SURFACE ----
  vec3 N=normalize(vec3(-slope.x,1.,-slope.y));
  float nvr=dot(N,V);if(nvr<.01)N=normalize(N-V*nvr*1.02);
  float nv=clamp(dot(N,V),.015,1.);
  // Physically realistic Fresnel: open crystal sight down into kelp3 floor; crisp reflective mirror at grazing angles
  float f0=mix(mix(.024,.021,riverW),.042,swampW);
  float fresnel=f0+(1.-f0)*pow(1.-nv,4.5);
  float reflBoost=lakeW*(1.-gust*.20)*1.02+swampW*1.12+riverW*.94;
  float F=clamp(fresnel*reflBoost,.02,.96);

  // Real-time planar mirror reflections of forested hillsides, trees, peaks, clouds & warm sunset light
  vec3 R=reflect(-V,N);R.y=abs(R.y);
  vec3 planar=vec3(0.);float rvalid=0.;
  if(uReflectionActive>.5){
    vec4 proj=uReflectionMatrix*vec4(vP.x,vLevel,vP.z,1.);
    float distort=mix(mix(.016,.026,riverW),.007,swampW)/(1.+dist*.005);
    vec2 ruv=proj.xy/max(proj.w,.001)+N.xz*distort;
    float edgeB=smoothstep(.005,.045,ruv.x)*(1.-smoothstep(.955,.995,ruv.x))
      *smoothstep(.005,.045,ruv.y)*(1.-smoothstep(.955,.995,ruv.y));
    rvalid=edgeB*step(0.,proj.w)*exp(-abs(vLevel-uReflectionLevel)*1.1)*.96;
    if(rvalid>.001)planar=texture2D(uReflection,clamp(ruv,.003,.997)).rgb;
  }
  vec3 reflection=planar*rvalid;
  if(rvalid<.995)reflection+=sky(R)*(1.-rvalid);
  // Steeped natural blackwater darkening tint inside calm swamp mirror reflections
  reflection*=mix(1.,.86,swampW*.72);

  // Crisp dual-lobe GGX sun shimmer (glinting river ripples + silky warm broad water sheen)
  float baseRough=mix(mix(.017+.055*gust*(.35+.65*uWindAmt),.035+.032*min(speed,1.2),riverW),.013,swampW);
  float rough=clamp(baseRough+pixel*.010+(.052*(1.-detail))*(.26+.74*riverW)+uRain*.048,.012,.38);
  vec3 H=normalize(uSun+V);
  float nh=max(dot(N,H),0.),nl=max(dot(N,uSun),0.),vh=max(dot(V,H),0.);
  float sunVis=smoothstep(.01,.14,uSun.y)*(1.-uStorm*.88);
  float glintSharp=min(ggxLobe(nh,nl,nv,vh,rough),6.4);
  float glintSoft=min(ggxLobe(nh,nl,nv,vh,min(rough*3.0+.05,.45)),1.45)*.25;
  vec3 glitter=uSunCol*(glintSharp+glintSoft)*sunVis*mix(1.,.55,swampW);
  if(uNight>.01&&uMoon.y>.01){
    vec3 Hm=normalize(uMoon+V);
    float mn=min(ggxLobe(max(dot(N,Hm),0.),max(dot(N,uMoon),0.),nv,max(dot(V,Hm),0.),max(rough*1.2,.04)),3.5);
    glitter+=vec3(.16,.21,.32)*mn*uNight*smoothstep(.0,.1,uMoon.y);
  }

  // ---- Rich jewel-toned physical Beer-Lambert color palettes (vivid depth & crystal sight!) ----
  float rainSilt=clamp(uRain*.52+uStorm*.18,0.,.65);
  float optPath=min(depth,36.)/max(nv,.28);
  float lit=max(uLight,.06)*mix(1.,.52,uStorm);

  // 1) Lake: luminous crystalline aquamarine shelf -> lush jewel emerald-teal kelp zone -> profound alpine sapphire-teal deep
  vec3 lakeRim=vec3(.14,.52,.49);
  vec3 lakeMid=mix(vec3(.034,.255,.292),vec3(.011,.118,.168),smoothstep(2.4,9.5,depth));
  vec3 lakeDeep=vec3(.004,.036,.078);
  vec3 lakeBody=mix(lakeMid,lakeDeep,smoothstep(7.6,19.5,depth));
  lakeBody=mix(lakeBody,lakeRim,(1.-smoothstep(.20,3.2,depth))*.72);

  // 2) River: sunlit warm jade-amber over crystal pebbles -> rich mountain-river emerald-teal -> deep dark-jade thalweg
  vec3 rivShoal=mix(vec3(.155,.305,.215),vec3(.225,.265,.148),sed*.48);
  vec3 rivMid=mix(vec3(.026,.182,.152),vec3(.050,.152,.104),sed*.44);
  vec3 rivDeep=mix(vec3(.008,.066,.076),vec3(.018,.062,.048),sed*.42);
  vec3 rivBody=mix(rivMid,rivDeep,smoothstep(3.0,11.0,depth));
  rivBody=mix(rivBody,rivShoal,(1.-smoothstep(.15,1.85,depth))*.60);

  // 3) Swamp: unmistakable moody translucent tea-amber margin -> haunting deep steeped mahogany-olive obsidian mirror!
  vec3 swRim=vec3(.108,.116,.042);
  vec3 swMid=vec3(.022,.038,.014);
  vec3 swDeep=vec3(.005,.011,.005);
  vec3 swBody=mix(mix(swRim,swMid,smoothstep(.14,1.0,depth)),swDeep,smoothstep(.90,2.7,depth));

  vec3 bodyCol=lakeBody*lakeW+rivBody*riverW+swBody*swampW;
  // Seamless estuary-to-sea optical blend: river jade gradually transitions into sunlit coastal turquoise-cerulean
  if(estBlend>.005){
    vec3 seaCoastal=mix(vec3(.07,.58,.68),vec3(.014,.14,.25),smoothstep(1.8,14.,depth));
    seaCoastal=mix(seaCoastal,vec3(.24,.76,.76),smoothstep(2.5,.35,depth)*.40);
    bodyCol=mix(bodyCol,seaCoastal,estBlend*.82);
  }
  bodyCol=mix(bodyCol,mix(vec3(.14,.13,.078),vec3(.085,.078,.045),swampW),rainSilt*(.26+.48*riverW+.20*swampW));

  // Rich dramatic wave-facet contrast on running rivers (bright sky reflections vs deep cool emerald wave slopes!)
  float slopeContrast=dot(N.xz,normalize(uSun.xz+vec2(.001)));
  float facetShift=clamp(slopeContrast*3.2,-1.,1.)*riverW*detail;
  bodyCol*=1.+.22*facetShift;

  // True physical red-first spectral Beer-Lambert transmittance calibrated so our living kelp3 forest,
  // golden-amber streaming ribbons, rounded river pebbles, coral-crusted boulders, dancing Voronoi caustics
  // & shimmering silver/gold fish gleam unmistakably right beneath crystal clear lakes and rivers!
  // Extinction per metre. These were a fifth of this: a metre of lake let 85% of the bed through, so every lake,
// river and swamp read as glass. Now a lake's bed is clear in the shallows and gone by about three metres, a
// river's by two, and a swamp's steeped tea hides it within an arm's length.
vec3 extLake=vec3(.92,.50,.44); vec3 extRiver=mix(vec3(1.18,.74,.80),vec3(1.75,1.28,1.55),sed*.50); vec3 extSwamp=vec3(3.0,2.7,4.4); // steeped amber-tannin kills blue first, creating luminous dark tea water!
vec3 extSea=vec3(.42,.19,.15);
  vec3 ext=mix(extLake*lakeW+extRiver*riverW+extSwamp*swampW,extSea,estBlend*.78)*(1.+rainSilt*.95);
  vec3 transmit=exp(-ext*optPath);
  float avgTrans=dot(transmit,vec3(.28,.48,.24));

  // Delicate vibrant jewel aquamarine/emerald internal sun scattering inside rippling slopes
  float sunBack=pow(clamp(dot(-V,uSun)*.5+.5,0.,1.),3.0);
  vec3 sssCol=mix(mix(vec3(.036,.29,.27),vec3(.052,.24,.15),riverW),vec3(.04,.30,.32),estBlend)*(1.-swampW*.88);
  vec3 sss=sssCol*(.20+.80*sunBack)*uSunCol*sunVis*(.11+.20*min(length(slope)*3.8,1.25))*(1.-F)*(1.-smoothstep(3.0,14.,depth)*.38);
  // Whisper-subtle natural bog-iron/tannin thin-film pearlescence in dead-still sheltered swamp pools at grazing light
  if(swampW>.25){
    float filmPatch=smoothstep(.52,.80,fwN(vP.xz*.095+vec2(4.2,-1.9))*.65+fwN(vP.xz*.28)*.35)*(1.-smoothstep(.08,.24,speed));
    float iridPhase=nv*6.2+fwN(vP.xz*.42)*2.6;
    vec3 iridCol=vec3(.55+.45*cos(iridPhase),.55+.45*cos(iridPhase+2.05),.55+.45*cos(iridPhase+4.1));
    sss+=iridCol*filmPatch*swampW*pow(1.-nv,2.4)*sunVis*lit*.085;
  }

  // Live crisp Snell-refracted bed/kelp/fish + subtle prism chromatic shimmer on sunlit ripples!
  vec3 bodyLit=bodyCol*(1.-transmit)*lit;
  vec3 color=reflection*F+glitter+bodyLit*(1.-F)+sss;
  float validRefract=0.;
  if(uRefractionActive>.5&&dist<320.){
    float bendAmt=min(depth,5.0)*mix(.22,.28,riverW)*smoothstep(.04,.55,depth)/(1.+dist*.010);
    vec2 disp=N.xz*bendAmt;
    vec4 q=uRefractionMatrix*vec4(vP.x+disp.x,vLevel-min(depth,2.8)*.10,vP.z+disp.y,1.);
    vec2 ruv=q.xy/max(q.w,.001);
    float bOk=smoothstep(.004,.024,ruv.x)*(1.-smoothstep(.976,.996,ruv.x))
      *smoothstep(.004,.024,ruv.y)*(1.-smoothstep(.976,.996,ruv.y))*step(0.,q.w);
    validRefract=bOk*(1.-smoothstep(230.,315.,dist));
    if(validRefract>.001){
      vec2 dispCh=N.xz*.0022*shallow*(1.-swampW)*detail;
      vec3 through;
      through.r=texture2D(uRefraction,clamp(ruv+dispCh,.004,.996)).r;
      through.g=texture2D(uRefraction,clamp(ruv,.004,.996)).g;
      through.b=texture2D(uRefraction,clamp(ruv-dispCh,.004,.996)).b;
      // Dancing shallow sunlight caustic flash highlighting golden kelp, boulders & fish below
      float cMask=(1.-smoothstep(1.0,6.8,depth))*(1.-swampW*.68)*sunVis*detail;
      float cSpark=pow(clamp(n2*.55+n3*.45,0.,1.),3.1)*cMask;
      through+=uSunCol*cSpark*mix(vec3(.22,.32,.27),vec3(.26,.30,.17),riverW)*.54;
      color+=through*transmit*(1.-F)*validRefract;
    }
  }
  // True physical alpha transparency whenever viewing outside live refraction target (including elevated vistas!)
  float hwTrans=avgTrans*(1.-F)*(1.-validRefract);
  float alpha=clamp(1.-hwTrans,.12,1.);
  if(validRefract<.5&&depth<6.0){
    float fCaus=(1.-smoothstep(.6,5.8,depth))*(1.-swampW*.72)*sunVis*(1.-smoothstep(180.,460.,dist));
    color+=uSunCol*pow(max(n2*.58+n3*.42,0.),3.3)*fCaus*.16*(1.-F)*(1.-validRefract);
  }

  // ---- Silk-fine river flow seams, gentle shallow cobble riffles & broken foamy meniscus ----
  float foam=0.;
  if(dist<620.){
    float fFade=1.-smoothstep(.55,2.9,pixel);
    vec2 fd=flow/max(speed,1e-4),fn=vec2(-fd.y,fd.x);
    float T=2.4,cy=uTime/T,f0=fract(cy),f1=fract(cy+.5),w0=1.-abs(2.*f0-1.);
    vec2 pa=vP.xz-flow*f0*T*1.6,pb=vP.xz-flow*f1*T*1.6+vec2(9.3,4.7);
    float stA=fwN(vec2(dot(pa,fd)*.082,dot(pa,fn)*.76))*.62+fwN(pa*.54)*.38;
    float stB=fwN(vec2(dot(pb,fd)*.082,dot(pb,fn)*.76))*.62+fwN(pb*.54)*.38;
    float stN=stA*w0+stB*(1.-w0);
    float lace=smoothstep(.42,.82,n2*.55+n3*.45);
    // Domain-warped organic winding downstream foam currents & silky faint eddy filaments (zero straight lines!)
    vec2 wEddy=vec2(fwN(vP.xz*.075+uTime*.04)-.5,fwN(vP.xz*.075+6.3-uTime*.035)-.5)*3.8;
    float curS=fwN(vec2(dot(pa+wEddy,fd)*.065,dot(pa+wEddy,fn)*.34))*w0+fwN(vec2(dot(pb+wEddy,fd)*.065,dot(pb+wEddy,fn)*.34))*(1.-w0);
    float eddySilk=riverW*smoothstep(.20,.62,speed)*smoothstep(.70,.90,curS)*smoothstep(.3,1.4,depth);
    color+=vec3(.07,.13,.12)*eddySilk*lit*(1.-uStorm*.45)*.45;
    foam=max(foam,eddySilk*smoothstep(.78,.93,curS)*lace*.32);
    // Airy sparkling riffle whitewater strictly on quick shallow shingle zones (0.08..0.88 m)
    float riffZone=riverW*smoothstep(.20,.68,speed)*(1.-smoothstep(.18,.88,depth))*smoothstep(.04,.16,depth);
    foam=max(foam,smoothstep(.54,.80,stN*.65+n3*.35)*riffZone*lace*.64);
    // Delicate intermittent foam lace gently lapping curved banks & cobble point bars
    float edgeW=(1.-smoothstep(.03,.34,depth))*smoothstep(.008,.04,depth)*(1.-swampW*.84);
    float edgeBreak=smoothstep(.48,.78,fwN(vP.xz*.28-flow*uTime*.12)*.65+n2*.35);
    foam=max(foam,edgeW*edgeBreak*(.14+.36*riverW+.13*uWindAmt*lakeW));
    // Crisp soft lake wind-foam streaks during brisk winds
    foam=max(foam,lakeW*smoothstep(.54,.98,uWindAmt)*gust*smoothstep(.76,.92,n1*.6+n3*.4)*.40);
    // Subtle estuary convergence foam wisps where fresh river current meets denser sea water
    float estLine=sin(vMask*3.14159)*smoothstep(.08,.35,speed)*smoothstep(.66,.86,n1*.55+n2*.45)*lace*.26;
    foam=max(foam,estLine);
    // Live dynamic boat wake lace
    foam=clamp(max(foam,vWake*smoothstep(.16,.72,n1*.5+n2*.55))*fFade,0.,.88);
  }
  if(foam>.004){
    vec3 fTint=mix(vec3(.90,.95,.94),vec3(.86,.86,.78),swampW*.6+rainSilt*.35);
    vec3 fLit=fTint*(uSunCol*.46*(1.-uStorm*.72)+hzSoft()*.48*lit+vec3(.015,.02,.028)*uNight);
    color=mix(color,fLit,foam);
    alpha=mix(alpha,1.,foam);
  }

  // ---- Atmospheric floating swamp layer: winding open dark mirrors + lacy duckweed, lettuce, lilies & blossoms ----
  float slowM=swampW*smoothstep(.04,.20,depth)*(1.-smoothstep(.30,.62,speed))*(1.-rainSilt*.42);
  if(slowM>.02&&dist<560.){
    vec2 wp=vP.xz+vec2(fwN(vP.xz*.030+1.9)-.5,fwN(vP.xz*.030+7.4)-.5)*16.+flow*uTime*.018;
    // Serpentine mirror-dark navigable channels carved organically through luminous lacy swamp botanicals
    float chan=abs(fwN(wp*.028+vec2(3.7,-2.8))-.5);
    float keepRaft=smoothstep(.062,.16,chan);
    float hugBank=.74+.26*(1.-smoothstep(.6,3.4,depth));
    float macroR=fwN(wp*.075)*.54+fwN(wp*.21+4.3)*.46;
    float microF=1.-smoothstep(.12,.78,pixel);
    float microR=mix(.58,fwN(vP.xz*1.9)*.56+fwN(vP.xz*5.8+2.3)*.44,microF);
    float cf=macroR*keepRaft*hugBank*(.74+.26*microR);
    float halo=smoothstep(.29,.43,cf)*slowM;
    float mat=smoothstep(.37,.51,cf)*slowM*(.84+.16*smoothstep(.26,.70,microR));
    if(halo>.005) color*=1.-.46*halo*(1.-mat*.6);
    if(mat>.005){
      float tx=mix(.5,fwN(vP.xz*2.9)*.58+fwN(vP.xz*8.8+1.2)*.42,microF);
      float letM=smoothstep(.56,.75,fwN(wp*.31+8.4))*mat;
      float padM=smoothstep(.58,.77,fwN(wp*.21-3.9))*(1.-letM*.72)*mat;
      vec3 duckC=mix(vec3(.19,.33,.062),vec3(.36,.49,.112),tx);
      vec3 letC=mix(vec3(.24,.42,.098),vec3(.41,.54,.152),tx);
