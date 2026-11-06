import footman from './weapons/footman.js';
import footmanBehavior from './weapons/footman-behavior.js';
import marksman from './weapons/marksman.js';
import marksmanBehavior from './weapons/marksman-behavior.js';
import templar from './weapons/templar.js';
import templarBehavior from './weapons/templar-behavior.js';
import trailblazer from './weapons/trailblazer.js';
import trailblazerBehavior from './weapons/trailblazer-behavior.js';
import thornkeeper from './weapons/thornkeeper.js';
import thornkeeperBehavior from './weapons/thornkeeper-behavior.js';
import wraith from './weapons/wraith.js';
import wraithBehavior from './weapons/wraith-behavior.js';
import gravebinder from './weapons/gravebinder.js';
import gravebinderBehavior from './weapons/gravebinder-behavior.js';
import arcanist from './weapons/arcanist.js';
import arcanistBehavior from './weapons/arcanist-behavior.js';
import praetorian from './weapons/praetorian.js';
import praetorianBehavior from './weapons/praetorian-behavior.js';
import seraph from './weapons/seraph.js';
import seraphBehavior from './weapons/seraph-behavior.js';
import boltguard from './weapons/boltguard.js';
import boltguardBehavior from './weapons/boltguard-behavior.js';
import swordbearer from './weapons/swordbearer.js';
import swordbearerBehavior from './weapons/swordbearer-behavior.js';

export const EXPANSION_BEHAVIORS = {
  [footman.id]: footmanBehavior,
  [marksman.id]: marksmanBehavior,
  [templar.id]: templarBehavior,
  [trailblazer.id]: trailblazerBehavior,
  [thornkeeper.id]: thornkeeperBehavior,
  [wraith.id]: wraithBehavior,
  [gravebinder.id]: gravebinderBehavior,
  [arcanist.id]: arcanistBehavior,
  [praetorian.id]: praetorianBehavior,
  [seraph.id]: seraphBehavior,
  [boltguard.id]: boltguardBehavior,
  [swordbearer.id]: swordbearerBehavior,
};
