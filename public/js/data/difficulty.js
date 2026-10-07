export const DIFFICULTY = {
  easy: {
    id: 'easy',
    name: 'Easy',
    flavor: 'A squire\'s first night',
    hp: 0.8,
    dmg: 0.8,
    spawn: 0.85,
    speed: 0.92,
    elite: 0.8,
    gold: 0.75,
    color: '#63c74d',
  },
  medium: {
    id: 'medium',
    name: 'Medium',
    flavor: 'A knight\'s trial',
    hp: 1,
    dmg: 1,
    spawn: 1,
    speed: 1,
    elite: 1,
    gold: 1,
    color: '#feae34',
  },
  hard: {
    id: 'hard',
    name: 'Hard',
    flavor: 'Only legends return',
    hp: 1.75,
    dmg: 1.6,
    spawn: 1.1,
    speed: 1.1,
    elite: 1.35,
    gold: 1.5,
    color: '#e43b44',
  },
};

export const MODES = {
  s15: { id: 's15', name: 'Survival', sub: '15 minutes', minutes: 15, desc: 'Hold out until dawn in the Darkwood.' },
  s30: { id: 's30', name: 'Survival', sub: '30 minutes', minutes: 30, desc: 'The longest night. Hold out until dawn.' },
  dungeon: { id: 'dungeon', name: 'Dungeon Run', sub: '3 floors', desc: 'Slay each floor\'s guardian and descend. Defeat the Demon Lord.' },
};
