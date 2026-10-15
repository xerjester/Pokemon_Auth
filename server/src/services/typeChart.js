// Complete 18-Type Matchup Chart
const TYPE_CHART = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 }
};

/**
 * Calculate the type effectiveness multiplier of an attacking move against defender's type(s)
 * @param {string} moveType 
 * @param {string[]} defenderTypes 
 * @returns {{ multiplier: number, message: string }}
 */
function getTypeEffectiveness(moveType, defenderTypes) {
  if (!moveType) return { multiplier: 1.0, message: '' };
  
  const mType = moveType.toLowerCase();
  let multiplier = 1.0;

  const defTypes = Array.isArray(defenderTypes) ? defenderTypes : [defenderTypes];

  for (const defType of defTypes) {
    if (!defType) continue;
    const dType = defType.toLowerCase();
    if (TYPE_CHART[mType] && TYPE_CHART[mType][dType] !== undefined) {
      multiplier *= TYPE_CHART[mType][dType];
    }
  }

  let message = '';
  if (multiplier === 0) {
    message = 'ไม่ได้ผลเลย! (0x No effect)';
  } else if (multiplier >= 2) {
    message = `โจมตีได้ผลยอดเยี่ยม! (${multiplier}x Super effective!)`;
  } else if (multiplier > 0 && multiplier < 1) {
    message = `โจมตีได้ผลไม่ค่อยดีนัก (${multiplier}x Not very effective...)`;
  }

  return { multiplier, message };
}

module.exports = {
  TYPE_CHART,
  getTypeEffectiveness,
};
