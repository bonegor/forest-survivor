// The near eye on the production idle sets the local fitting point for each
// kit. Different proportions are intentional, particularly the two spectres.
// A kit names its dyed material, headpiece, shoulder piece and breast device.
export const heroKits = {
  knight: [[42,25], 'plate', [
    ['Gryphon of Cinders','cinder','wing','scale','talon'],
    ['Glacier Knight','glacier','antler','plate','shard'],
    ['Sable Tourney','orchid','split','mantle','lozenge'],
    ['Lion of the Crown','sun','laurel','lion','sun']]],
  archer: [[40,34], 'leather', [
    ['White Kestrel','glacier','quill','mantle','fletch'],
    ['Blackthorn Scout','briar','leaf','scale','briar'],
    ['Crimson Falcon','cinder','pinion','pauldron','talon'],
    ['Moonbow','dusk','crescent','cloak','moon']]],
  mage: [[44,30], 'robe', [
    ['Azure Hierophant','sapphire','mitre','collar','star'],
    ['Frostglass Magus','aurora','shards','mantle','shard'],
    ['Solar Astrologer','royal','lens','collar','sun'],
    ['Violet Comet','umbra','crescent','cloak','comet']]],
  rogue: [[54,32], 'shade', [
    ['Moth of Midnight','dusk','moth','cloak','eye'],
    ['Pale Revenant','bone','skull','mantle','ribs'],
    ['Gloam Viper','venom','viper','scale','briar'],
    ['Red Harlequin','garnet','split','pauldron','lozenge']]],
  necromancer: [[44,31], 'robe', [
    ['Ossuary King','bone','ossuary','collar','ribs'],
    ['Viridian Oracle','venom','viper','mantle','eye'],
    ['Ruby Reliquary','garnet','mitre','scale','chalice'],
    ['Midnight Raven','dusk','raven','cloak','talon']]],
  paladin: [[39,31], 'plate', [
    ['Dawn Confessor','sun','sunburst','lion','cross'],
    ['Rose Cathedral','garnet','mitre','plate','chalice'],
    ['Saint of the Tides','tide','wing','mantle','wave'],
    ['Ivory Votary','bone','veil','collar','star']]],
  druid: [[42,35], 'robe', [
    ['Winter Hart','glacier','antler','mantle','briar'],
    ['Autumn Stag','harvest','fork','scale','leaf'],
    ['Emerald Mycologist','briar','cap','cloak','spore'],
    ['Moonflower','orchid','flower','collar','moon']]],
  berserker: [[24,16], 'leather', [
    ['Blood Wolf','garnet','wolf','fang','ribs'],
    ['Valkyrie of Rime','glacier','wing','pauldron','shard'],
    ['Thunder Boar','storm','horn','plate','bolt'],
    ['Copper Bear','harvest','bear','mantle','talon']]],
  witchhunter: [[39,33], 'leather', [
    ['Ivory Inquisitor','bone','brooch','mantle','cross'],
    ['Raven Marshal','dusk','quill','cloak','talon'],
    ['Scarlet Exorcist','garnet','veil','collar','chalice'],
    ['Brass Hexfinder','storm','lens','scale','eye']]],
  eanasir: [[42,20], 'stone', [
    ['King of Lapis','sapphire','diadem','collar','tablet'],
    ['Malachite Factor','briar','turban','mantle','bull'],
    ['Gilded Bull','sun','horn','scale','sun'],
    ['Obsidian Scribe','garnet','seal','cloak','tablet']]],
  footman: [[44,31], 'plate', [
    ['Redwall Veteran','cinder','split','plate','tower'],
    ['White Boar','bone','boar','fang','talon'],
    ['Officer of the Tide','tide','pinion','pauldron','wave'],
    ['Brass Gatekeeper','storm','bar','scale','key']]],
  marksman: [[45,35], 'leather', [
    ['Snow Owl','glacier','moth','mantle','eye'],
    ['Cardinal Shot','garnet','quill','pauldron','fletch'],
    ['Amber Fox','harvest','fox','cloak','talon'],
    ['Star Surveyor','sapphire','lens','collar','star']]],
  templar: [[42,32], 'plate', [
    ['Black Chalice','garnet','ossuary','collar','chalice'],
    ['Dawn Chapter','sun','wing','plate','sun'],
    ['Azure Reliquary','sapphire','mitre','scale','cross'],
    ['Knight of Glass','glacier','shards','pauldron','shard']]],
  trailblazer: [[39,34], 'leather', [
    ['Thistle Ranger','orchid','flower','mantle','briar'],
    ['Snowshoe Scout','bone','wolf','fang','fletch'],
    ['Heron Guide','tide','pinion','cloak','wave'],
    ['Cinder Pathfinder','cinder','leaf','scale','comet']]],
  thornkeeper: [[40,30], 'robe', [
    ['Grove Sovereign','briar','antler','scale','briar'],
    ['Nightshade Warden','orchid','cap','cloak','spore'],
    ['Autumn Regent','harvest','leaf','lion','leaf'],
    ['Saltbloom Keeper','tide','flower','mantle','wave']]],
  wraith: [[47,33], 'shade', [
    ['Shroud of Crows','dusk','raven','cloak','talon'],
    ['Frost Phantom','glacier','skull','fang','shard'],
    ['Blood Moth','garnet','moth','mantle','eye'],
    ['Jade Spectre','venom','shards','scale','ribs']]],
  gravebinder: [[43,30], 'robe', [
    ['Barrow Queen','bone','ossuary','collar','ribs'],
    ['Scarlet Mourner','garnet','veil','cloak','chalice'],
    ['Moth Diviner','orchid','moth','mantle','eye'],
    ['Adder Priestess','venom','viper','scale','briar']]],
  arcanist: [[44,32], 'robe', [
    ['Imperial Astrolabe','sapphire','lens','collar','star'],
    ['Ember Conjurer','cinder','quill','mantle','comet'],
    ['Moonlit Alchemist','orchid','crescent','cloak','moon'],
    ['Pearl Thaumaturge','tide','brooch','scale','shard']]],
  praetorian: [[40,33], 'plate', [
    ['Eagle Standard','sun','wing','lion','sun'],
    ['Iron Centurion','cinder','split','plate','tower'],
    ['Sea Tribune','tide','pinion','scale','wave'],
    ['Night Cohort','dusk','bar','pauldron','star']]],
  seraph: [[39,31], 'plate', [
    ['Seraph of Daybreak','sun','sunburst','lion','sun'],
    ['Angel of the Tides','tide','wing','mantle','wave'],
    ['Ruby Penitent','garnet','veil','collar','cross'],
    ['Angel of Stars','orchid','shards','plate','star']]],
  boltguard: [[44,35], 'leather', [
    ['Storm Artillerist','storm','lens','pauldron','bolt'],
    ['Ember Brigade','cinder','quill','scale','fletch'],
    ['Permafrost Gunner','glacier','wolf','mantle','shard'],
    ['Copper Dragoons','harvest','brooch','plate','key']]],
  swordbearer: [[42,32], 'plate', [
    ['Ivory Duelist','bone','pinion','pauldron','lozenge'],
    ['Scarlet Lion','garnet','lion','lion','talon'],
    ['Sapphire Blade','sapphire','shards','plate','shard'],
    ['Verdant Champion','briar','laurel','scale','leaf']]],
  sentinel: [[39,32], 'plate', [
    ['Black Rose Bastion','garnet','flower','plate','lozenge'],
    ['Azure Gryphon','sapphire','wing','pauldron','talon'],
    ['Golden Aegis','sun','laurel','lion','sun'],
    ['Sentinel of Rime','glacier','bar','mantle','shard']]],
};
