import { HEROES } from '../../public/js/data/heroes.js';

// Descriptions accompany a reference exported from the actual shipping sprite.
// Keep stable hero IDs; old lab variants and archived costumes are not inputs.
const ORIGINAL_BRIEFS = {
  knight: {
    identity: 'A knight in silver and charcoal plate, closed visor, vivid red helmet plume and red cloth accents; one steel sword and the small dark shield visible in the sprite. Keep the current plumed design.',
    scene: 'A ruined forest gate after battle, rain on flagstones, pale dawn behind the trees.',
    pose: 'Walking through the ruined gate, cautiously placing a boot onto a loose wet flagstone, weight shifting forward and head tilted toward the path. Sword and shield carried low and close with relaxed shoulders; plume and cloth hang with natural gravity.',
  },
  archer: {
    identity: 'A female ranger with a visible face beneath a pale moonsteel hood, green tunic and cloak, brown leather belt and boots, a wooden longbow and quiver.',
    scene: 'A mossy forest ridge under moonlight, distant trees dissolving into mist.',
    pose: 'Pausing naturally beside a tree after hearing a bird, body and face turned clearly toward the LEFT edge of the image, chin level or slightly lifted toward the canopy. One hand rests lightly against the trunk and the other carries the bow low. View her in left-facing profile; relaxed weight on one leg, neither crouching nor looking at the ground.',
  },
  mage: {
    identity: 'An elderly male sorcerer with a long white beard, tall pointed blue wizard hat with an orange band, layered blue robes, brown staff tipped with orange fire, and a flame in his free hand.',
    scene: 'Ancient forest standing stones, with drifting embers and cool twilight.',
    pose: 'Seated sideways on a low fallen standing stone, watching a single ember rise above him toward the upper LEFT of the image, head tilted upward. His staff rests against his shoulder and one open hand rests near his lap. Robes settle across the stone and both boots rest on the earth. A quiet moment of curiosity viewed in left three-quarter profile, without a spellcasting display.',
  },
  rogue: {
    identity: 'A supernatural hooded wraith in charcoal, indigo and deep violet, face hidden in darkness, pale eyes and the small pale blade visible in the reference. Tattered spectral cloth replaces walking legs.',
    scene: 'A moonlit ruined cloister swallowed by the dark forest, low violet mist.',
    pose: 'Gliding AWAY from the observer through an arch into the deep cloister, shown predominantly from behind. Hood and torso face into the distant passage, with no over-the-shoulder look or visible face. One low hand carries the blade; the other trails near the wall. The full tapering spectral hem hovers above the path with a visible gap.',
  },
  necromancer: {
    identity: 'A skeletal-faced necromancer with glowing green eyes, an ivory bone crown with two raised points, bone shoulder pieces, deep purple and blue robes with gold trim, and a long wooden staff crowned by a green orb.',
    scene: 'An overgrown graveyard with broken stones and distant crypt arches, green soul light in the fog.',
    pose: 'Bent slightly over a weathered gravestone, brushing ash from a carved inscription with his free fingertips while the staff supports him. His gaze stays on the inscription; a faint green seep of magic lights the stone rather than being displayed toward the viewer.',
  },
  paladin: {
    identity: 'A female holy crusader enclosed in neutral dark iron and steel plate with aged gold trim, a closed cylindrical iron great helm, muted antique-gold tabard and cape, dark leather belt, gold-edged iron shield, and one steel sword. Preserve the barrel-shaped helm and concealed face. No red, crimson or burgundy clothing.',
    scene: 'Inside the open bell porch of a ruined forest chapel, a hanging bell rope, worn stone floor and soft daylight entering from the side.',
    pose: 'Ringing the old chapel bell in a quiet practical motion, standing in LEFT-facing profile with one gloved hand pulling its rope and helm tilted slightly upward toward the bell. The other hand holds the shield low at her side; the single sword is sheathed at her belt. Weight shifts back slightly with the pull, gold cloth falls naturally, full boots and helmet in frame.',
  },
  druid: {
    identity: 'An older male druid with a white beard and visible face, an antlered green hood, layered leaf-green robes and cloak, brown leather belt and boots, and a tall wooden staff with small leaves and a warm amber tip.',
    scene: 'The roots of an immense ancient oak, ferns, moss and drifting fireflies.',
    pose: 'Kneeling beside the ancient oak, quietly inspecting a new shoot between its roots, one hand touching mossy bark and the other steadying his staff. His head dips toward the plant, robes gather on the damp earth and boots settle into the leaves.',
  },
  berserker: {
    identity: 'A muscular male warrior with a red mohawk and red beard, bare chest crossed by brown leather harness straps, pale fur shoulders, dark trousers and heavy boots, holding exactly two steel axes.',
    scene: 'A rocky forest pass after a storm, broken branches and cold mist.',
    pose: 'Crossing a shallow rocky stream with an ordinary careful step, knees softly bent and torso leaning forward for balance. Both axes hang low in separate hands, shoulders loose, eyes following the next foothold, boots disturbing a small ripple.',
  },
  witchhunter: {
    identity: 'A female witch hunter with long auburn hair, a broad-brimmed charcoal pointed hat with a buckle, dark blue-grey leather coat, pale collar, leather belts and boots, and a compact wooden-and-steel crossbow.',
    scene: 'A deserted forest village lane at dusk, a single lantern and a distant ruined chapel.',
    pose: 'Moving quietly beside a timber house, caught mid-step as she turns her head to listen around a doorway. Crossbow held naturally low in both hands, finger clear of the trigger; coat brushes the wall and her weight is on the leading boot.',
  },
};

const RECRUIT_BRIEFS = {
  eanasir: {
    identity: 'A Mesopotamian copper merchant inspired by the supplied standing worshipper statue: warm alabaster skin, large pale round eyes, tightly curled hair, a long tiered curly beard, bare upper torso, a cream fringed kaunakes skirt and bare feet. He holds one tarnished copper disc and one slim leather whip. Preserve the native sprite silhouette and restrained sandstone palette.',
    scene: 'A torchlit crypt trading alcove, with a low stone counter and a small pile of tarnished copper.',
    pose: 'Examining the rim of a copper disc in his leading hand, with the whip hanging loosely from his other hand. His feet rest on the worn flagstones and his skirt falls naturally. Keep the wide-eyed statue likeness while showing an ordinary moment at his counter.',
  },
  footman: {
    identity: 'A veteran infantryman in unadorned silver and slate plate with a closed steel helmet, a single straight sword, and a brown wooden shield with a steel rim and central boss. Match the compact stance and equipment of the shipping sprite.',
    scene: 'A muddy forest road beside a broken stone wall, with cool morning light on the wet leaves.',
    pose: 'Pausing beside the wall to check the strap of the shield on his forearm. His sword points down in the other hand, and both boots rest firmly on the road.',
  },
  marksman: {
    identity: 'A crossbow marksman with auburn hair, a wide dark hat, and rust-brown leather over a dark coat. Keep the compact stock and steel bow of the sprite’s crossbow.',
    scene: 'A weathered timber lookout above a quiet woodland clearing.',
    pose: 'Resting the crossbow against the railing while studying a track through the clearing, seen from the side with her weight on the front boot.',
  },
  templar: {
    identity: 'An enclosed silver-and-gold templar in a narrow-visored helm, with pale cloth, one sword, and a gold-edged shield.',
    scene: 'The stone threshold of a small wayside chapel, with rain trailing from the eaves.',
    pose: 'Checking the chapel door with one shoulder. Keep his shield near the body and his sword lowered toward the paving.',
  },
  trailblazer: {
    identity: 'A woodland scout with pale hair, layered green cloth, brown leather, and a wooden bow. Preserve the light silhouette of the sprite.',
    scene: 'A narrow trail crossing a fern-covered bank under an overcast sky.',
    pose: 'Stopping mid-step to look along the trail. She gathers a branch aside with her free hand and carries the bow low in the other.',
  },
  thornkeeper: {
    identity: 'A white-bearded keeper in green and earth-brown robes, carrying the sprite’s wooden staff crowned with leaves and thorns.',
    scene: 'A bramble hedge growing through an abandoned orchard wall.',
    pose: 'Propping a bent branch off the path with the staff and checking the new growth with his free hand.',
  },
  wraith: {
    identity: 'A floating figure in tattered violet and charcoal cloth, with a concealed face and the sprite’s short pale blade. Keep the spectral hem clear of the ground.',
    scene: 'An empty burial corridor open to a faint strip of moonlight.',
    pose: 'Drifting past a cracked niche with the blade held low, attention turned toward the stone and trailing cloth visible in profile.',
  },
  gravebinder: {
    identity: 'A gravebinder with a pale face and layered purple robes, carrying a dark staff with a green light. Match the hood and staff head to the sprite.',
    scene: 'A sunken path between old grave markers, with damp moss and fog close to the ground.',
    pose: 'Stepping across a toppled marker and steadying herself on her staff as its green light falls on the stone.',
  },
  arcanist: {
    identity: 'An arcanist with a pointed blue hat, blue and warm gold robes, and the sprite’s glowing staff and small flame.',
    scene: 'The open doorway of a ruined observatory, with a chipped stone table and fading evening light.',
    pose: 'Leaning over a damaged stone dial, holding the flame just above its markings and using the staff for support.',
  },
  praetorian: {
    identity: 'A heavy silver-armoured guard with a closed helmet, vivid red crest and cloak, a straight sword, and a tall dark shield with gold trim.',
    scene: 'The landing of a weathered fort stair with grey dawn coming through an arrow slit.',
    pose: 'Taking a deliberate step down the stair. His shield is tucked close to the body and his sword rests low, clear of the stone.',
  },
  seraph: {
    identity: 'A gold-and-silver armoured warrior with a closed helmet, pale gold cloth and the sword and shield in the sprite. Preserve the silhouette and equipment shown in the reference.',
    scene: 'A ruined stone bridge with pale sunlight reflected from the water.',
    pose: 'Stepping around a fallen block while checking the bridge ahead, with shield close and sword lowered.',
  },
  boltguard: {
    identity: 'A siege crossbowman in a broad dark hat and layered blue-grey and brown clothing, carrying the sprite’s heavy crossbow.',
    scene: 'An abandoned barricade along a cold forest road.',
    pose: 'Leaning the crossbow against a timber brace while inspecting its mechanism, his eyes on the stock and both boots planted.',
  },
  swordbearer: {
    identity: 'A steel-clad swordsman with a closed helmet and the broad straight blade, shield, and muted blue-grey details visible in the sprite.',
    scene: 'A cobbled lane at the edge of a ruined forest settlement.',
    pose: 'Moving through a narrow gap in a stone wall, angling the broad blade low to clear the stones and watching the next foothold.',
  },
};

export const BRIEFS = { ...ORIGINAL_BRIEFS, ...RECRUIT_BRIEFS };

export function portraitPrompt(id) {
  if (!Object.hasOwn(HEROES, id) || !Object.hasOwn(BRIEFS, id)) throw new Error(`No portrait brief for hero: ${id}`);
  const hero = HEROES[id], brief = BRIEFS[id];
  const series = Object.hasOwn(ORIGINAL_BRIEFS, id) ? 'one coherent nine-hero series' : 'the style of the original nine portraits';
  return [
    'Use case: stylized-concept. Asset type: Forest Survivor full-body hero portrait.',
    `Subject: ${hero.name}, the ${hero.title}. ${brief.identity}`,
    'Reference image: the current in-game sprite, enlarged with nearest-neighbour sampling. Preserve character identity, costume colours and equipment while showing a candid moment in the world.',
    `Scene: ${brief.scene}`,
    `Candid action: ${brief.pose}`,
    `Style: medieval dark-fantasy pixel-art illustration with deliberate pixel clusters, crisp edges and restrained colours. Match ${series}. Light the character and setting from the same believable environmental sources, with modest contrast and local reflected colour.`,
    'Composition: vertical 2:3 canvas, an observational eye-level view of one hero occupied with the surroundings. Asymmetric framing, natural body weight, attention directed toward the task. Show the complete figure including headgear, boots or spectral hem and equipment with comfortable margins. Hero occupies roughly 65–75 percent of the image height.',
    'Integration: convincing ground contact, contact shadows, damp or dusty hems, foliage and mist sharing the same depth and light as the hero. Cloth follows gravity and the actual movement. The figure belongs inside the scene.',
    'Constraints: an unposed narrative moment with full-body framing. Preserve identity and equipment count. Avoid poster stances, splayed display weapons, camera-facing gazes, exaggerated wind, a bright halo outlining the entire figure, repeated symmetrical compositions and a pasted-on cutout appearance. No extra limbs, duplicate weapons, modern items, text, frame, UI, watermark or other people. Background is an opaque illustrated scene.',
  ].join('\n');
}

export function portraitRoster(ids = Object.keys(HEROES)) {
  return ids.map((id) => {
    const prompt = portraitPrompt(id);
    const { name, title, sprite } = HEROES[id];
    return { id, name, title, sprite, prompt };
  });
}
