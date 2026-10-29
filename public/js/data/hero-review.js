// Approved defaults, selected by the owner after reviewing the native models.
export const HERO_DEFAULT_LOOKS = Object.freeze({
  archer: 'v4b', mage: 'v4a', rogue: 'v4a', necromancer: 'v4a',
  paladin: 'v4a', druid: 'v4a', berserker: 'v4a', witchhunter: 'original',
});

// Two native model proposals per hero, following the owner's 29 October picks.
export const HERO_REVIEW = {
  archer: [
    { name: 'Greenveil Scout', detail: 'A fitted green hood frames both eyes. A leather jerkin, compact braid, quiver and short cape give her a lean scout silhouette.' },
    { name: 'Moonsteel Huntress', detail: 'Swept silver hair and a gold circlet, a steel shoulder guard, split green tunic and longer cape.' },
  ],
  mage: [
    { name: 'Ember Sage', detail: 'An upright battle hat, short forked beard and clasped mantle give Eldrin a more commanding silhouette.' },
    { name: 'Cinder Seer', detail: 'A fitted low cowl, circlet, cropped beard and broad mantle frame a focused three-quarter face.' },
  ],
  rogue: [
    { name: 'Nightveil', detail: 'A continuous pointed hood and spectral cowl, with twin blades and trailing cloth. Always hovering.' },
    { name: 'Dusk Reaver', detail: 'A broader airborne mantle and distinct hood above continuous spectral folds. No walking legs or footsteps.' },
  ],
  necromancer: [
    { name: 'Bone Regent', detail: 'A bone tiara and sculpted shoulder armour frame the skull above the original robes and staff motion.' },
    { name: 'Crypt Oracle', detail: 'A hooded skull and carved skull staff create a darker, enclosed silhouette.' },
  ],
  paladin: [
    { name: 'Iron Vow', detail: 'An angular greathelm, restrained crown lighting and a three-quarter visor, developed from V3.' },
    { name: 'Dawn Sentinel', detail: 'A swept sallet and projecting visor, with a distinct shield and shoulder plates, developed from V3.' },
  ],
  druid: [
    { name: 'Oakwarden', detail: 'A fitted green hood and mantle, a neat short beard and a compact branch crown replace the unkempt silhouette.' },
    { name: 'Staglord', detail: 'Swept brown hair with a silver temple streak, a short dark beard and visible jaw, beneath an antler crown and carved bark collar.' },
  ],
  berserker: [
    { name: 'Red Fang', detail: 'A narrower V3 build, focused three-quarter face and topknot, with connected legs and less splayed feet.' },
    { name: 'Ash Reaver', detail: 'A crested V3-derived warrior with a defined face, crossed harness and a restrained, planted stride.' },
  ],
  witchhunter: [
    { name: 'Briar Marshal', detail: 'A feathered hat, red scarf, leather baldric and shorter split duster frame a clearer face.' },
    { name: 'Silver Inquisitor', detail: 'A tapered pilgrim hat, silver armour and sweeping mantle give the hunter a second silhouette.' },
  ],
};
