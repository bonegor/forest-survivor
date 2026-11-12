// A separately reviewable, restrained gait proposal. The accepted v1 models
// and timing remain immutable; these settings are applied only on request.
export const GROUNDED_V2 = {
  knight:      {reach:5.5,lift:1.0,pelvisY:45.2,hipHalfWidth:1.05,trackHalfWidth:.75,kneeLimit:1.0,roll:.03},
  archer:      {reach:5.8,lift:1.1,pelvisY:45.2,hipHalfWidth:1.0,trackHalfWidth:.75,kneeLimit:1.1,roll:.035},
  berserker:   {reach:5.8,lift:1.2,pelvisY:45.1,hipHalfWidth:1.15,trackHalfWidth:.85,kneeLimit:1.1,roll:.035},
  witchhunter:{reach:5.2,lift:.9,pelvisY:45.0,hipHalfWidth:1.0,trackHalfWidth:.75,kneeLimit:.9,roll:.025},
  footman:     {reach:6.0,lift:.9,pelvisY:45.2,hipHalfWidth:1.0,trackHalfWidth:.75,kneeLimit:.9,roll:.025},
  marksman:    {reach:5.2,lift:1.0,pelvisY:45.0,hipHalfWidth:1.0,trackHalfWidth:.75,kneeLimit:1.0,roll:.03},
  templar:     {reach:5.3,lift:.85,pelvisY:45.2,hipHalfWidth:1.0,trackHalfWidth:.75,kneeLimit:.9,roll:.025},
  trailblazer: {reach:5.9,lift:1.15,pelvisY:45.0,hipHalfWidth:1.0,trackHalfWidth:.75,kneeLimit:1.1,roll:.035},
  praetorian:  {reach:5.8,lift:.8,pelvisY:45.0,hipHalfWidth:1.0,trackHalfWidth:.75,kneeLimit:.85,roll:.02},
  boltguard:   {reach:5.2,lift:.9,pelvisY:45.0,hipHalfWidth:1.0,trackHalfWidth:.75,kneeLimit:.9,roll:.025},
  swordbearer: {reach:5.4,lift:.95,pelvisY:45.0,hipHalfWidth:1.05,trackHalfWidth:.8,kneeLimit:1.0,roll:.03},
  paladin:     {reach:6.0,lift:.85,pelvisY:45.0,hipHalfWidth:1.0,trackHalfWidth:.75,kneeLimit:.9,roll:.025},
  seraph:      {reach:5.4,lift:.95,pelvisY:45.0,hipHalfWidth:1.0,trackHalfWidth:.75,kneeLimit:1.0,roll:.03},
};

export function groundedV2Config(base) {
  const v=GROUNDED_V2[base.id];if(!v)return base;
  const cx=base.legs.reduce((n,l)=>n+l.hip[0],0)/base.legs.length;
  return {...base,
    legs:base.legs.map(leg=>{
      const side=Math.sign(leg.hip[0]-cx)||1;
      // Attach the complete thigh under the actual belt/pelvis. v1 started at
      // the first visible pixels below cloth, shortening the inferred leg.
      return {...leg,hip:[cx+side*v.hipHalfWidth/base.scale,base.pivot[1]+(v.pelvisY-56)/base.scale],trackOffset:side*v.trackHalfWidth};
    }),
    motion:{...base.motion,...v,version:'v2',kneeSupport:.25,kneeReturn:.42,
      bodyBobPixels:0,hipCompression:.2,support:.5,
      cycleSeconds:2*v.reach/(.5*base.motion.groundSpeed)},
  };
}
