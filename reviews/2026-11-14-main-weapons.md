# Main-weapon design review — 14 November 2026

Scope: every playable hero's primary weapon, plus both starting weapons for Necromancer and Ea-nasir. This is the implementation design review; the independent final playthrough review follows integration. It combines behavior/description inspection with real Game/Weapon collision, timing, wall, evolution and facing fixtures. It does not claim that isolated fixtures establish full-run balance.

Final integration follow-up: the independent playthrough reproduced isolated field-crate failures on twelve starters. Their creature selectors now fall back to a visible nearby prop and fire the actual weapon. Gravebinder can peck a box without receiving soul fuel. All 22 base and evolved kits passed the repaired object-interaction checks; see the [final playthrough review](hero-polish-playthrough-2026-11-14.md). Earlier “retained” acquisition comments below describe the first design pass.

## Changes

- Fixed the reported Praetorian crate failure. The blade previously excluded all props before collision, so a visible strike could never break one in the field. Props now take damage inside the same short forward lane without using the limited monster-hit budget. The blade stays at the world position where its hit landed; its bright central spine makes that lane easier to read. The guard still travels with its owner.
- Applied the same collateral correction to Footman, Templar, Wraith, Arcanist, Thornkeeper, Seraph and Swordbearer. Stone still blocks contact. Props never become automatic targets or consume these weapons' monster-hit allowances. The Footman's prop contact does not falsely trigger its creature-driven secondary shock.
- Fixed Marksman's automatic target selection and every hero's manual crypt aim so a nearer hidden foe cannot steal aim from a visible foe.
- Revised hero-selection targeting descriptions to state the actual direction, acquisition and special behavior. Praetorian text explicitly says the shield effect charges a reprisal and does **not** block incoming damage.
- Preserved weapon damage, cooldowns, creature hit caps and per-lord single-hit safeguards.

## Per-hero assessment

| Hero | Main weapon(s) | Design assessment and resulting action |
| --- | --- | --- |
| Knight | Longsword → Excalibur | Clear short-range positioning weapon. Horizontal facing, extra rear slash and evolved wave give distinct progression. Retained; selection now states left/right facing explicitly. |
| Ranger | Hunting Bow → Stormstring | Directional kiting identity is distinct from aimed crossbows. Last movement direction is the important rule; existing bow-origin and piercing logic retained. Manual crypt aim now rejects hidden foes. |
| Sorcerer | Fireball → Meteor Storm | Nearby acquisition plus impact burst reads as ranged crowd damage; evolution expands into battlefield bombardment. Can release without targets; retained. |
| Shadow | Shadow Blade → Shadowstrike | Nearest-foe targeting, including behind the player, and full-path piercing make a useful evasive weapon. Selection now says this; requested animation speed is handled by the art pass. |
| Necromancer | Raise Dead and Miasma | Summon pressure plus a poisonous movement trail create a coherent dual start. Idle aura and movement trail remain distinct; selection now mentions both. |
| Paladin | Smite → Judgement | Strong-foe priority and a visible holy pillar provide a distinct target-selection role. Retained; face artwork is separate from this weapon review. |
| Druid | Snaring Roots → World Root | Tunnelling roots and control reward spacing. Nearest-foe acquisition retained; manual aim no longer chooses through stone. |
| Berserker | Twin Axes → Bloodstorm | Forward leap and landing chop give commitment and risk, consistent with Bloodrage. Selection now says damage lands on arrival. No speculative balance change. |
| Witch Hunter | Silver Crossbow → Purifier | Strong-foe priority, penetration and evolved silver bursts distinguish it from Ranger. Retained. |
| Ea-nasir | Whip → Lion's Lash; Medium Quality Copper → High Quality Copper (not for sale) | Complementary close/mid-range lash and autonomous copper. The two-stage evolution is understandable when the UI states Whip + Might first, then Phoenix + copper. Root agent owns implementation and progression tests. Recommended visible-target filtering for Whip to avoid wasting field casts through Dungeon Run walls. |
| Footman | Linebreaker → Iron Advance | First-foe strike followed by a delayed shock through the rank behind rewards alignment. Fixed the initial cut and secondary shock passing through props; crate hits do not create the creature-triggered shock. |
| Marksman | Splitpin Crossbow → Splinterline | First impact plus perpendicular splinters rewards attacking the edge of a pack. Fixed blocked-target acquisition; menu explains sideways split rather than generic nearest targeting. |
| Templar | Votive Edge → Hallowed Boundary | Transverse, world-anchored ward is an area-denial tool, not an ordinary sword. Fixed ignored crate contact. Per-body charges and lifetime retained. |
| Trailblazer | Wayline Bow → Runewire | Arrow places a tripline; encourages moving enemies across an established lane. Arrow already hits crates. Tripline's creature-only triggers are consistent with a trap, retained. |
| Thornkeeper | Briar Compass → Heartwood Convergence | Inward convergence around a chosen point is distinct from Druid's tracking tunnel. Fixed props being intangible to thorns, including after creature hit charges are spent while the thorns visibly finish their journey. |
| Wraith | Aftercut Blade → Echo of the Veil | Previous-position echo makes retreat and repositioning meaningful. Fixed crate contacts in both cuts while preserving the one-hit-per-creature-per-cast rule. |
| Gravebinder | Carrion Tithe → Ravenous Edict | Lesser foes feed a stronger priority strike; clear anti-elite-with-escort role. Soul siphons intentionally target creatures, not crates. Retained. |
| Arcanist | Meridian Pendulum → Astral Meridian | Narrow arc at target distance demands spacing and differs from a broad explosion. Fixed crystal sweep passing through crates; alternating direction and body hit cap retained. |
| Praetorian | Shieldward Blade → Aegis Reprisal | Short front lane plus incoming-fire reprisal is coherent but was poorly communicated. Fixed crate collision, anchored the strike visual, added the bright lane spine and explicit face-target/no-block copy. |
| Seraph | Sunwing Edge → Aureole Sundering | Immediate centre cut followed by travelling flanks gives readable staged coverage. Fixed crates in both centre and wing paths; shared monster cap retained. |
| Boltguard | Ratchet Crossbow → Bastion Crank | Ordinary foes charge a piercing bolt, while strong foes stop it. This rewards lining up fodder before elites; existing crate impact and charge accounting retained. Menu now states the stopping rule. |
| Swordbearer | Marchsteel Greatsword → Roadbreaker | Real straight-line stride earns a longer cut and stronger outer edge; a distinct mobile heavy weapon. Fixed crate contact without consuming the charged hit budget. No charge is gained from wall-pushing or teleporting. |

## Verification and remaining boundaries

- 82 focused tests passed across manual crypt strikes, facing, all changed signature behaviors and new prop-contact regressions.
- New coverage checks all eight corrected signatures against a crate, identical creature damage with/without the crate, and stone occlusion. Five autonomous melee weapons also break a crate when it is the only object present.
- Marksman and manual Ranger/Praetorian aim explicitly exercise a nearer blocked target beside a farther visible target.
- A real-Game weapon contact sheet was rendered and inspected at `output/hero-polish-2026-11-14/weapon-review/praetorian_shieldward_blade.png`. That existing isolated VFX harness equips the weapon on the Knight; the final graphics review must inspect the actual Praetorian too.
- Targeted field casters still acquire creatures rather than crates. Their area/path effects can break props; manual crypt strikes retain the shared nearby-box break. This preserves the existing targeting design instead of silently adding new field controls.
- A broader expansion-suite run had one unrelated failure in `test/expansion-spoils.test.js:329`: the lost-response retry test observed zero API calls instead of two, amid pre-existing storage/demo changes. All selected combat regressions passed afterward. Root agent was notified.
