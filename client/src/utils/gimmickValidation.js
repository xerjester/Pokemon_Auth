/**
 * Strict Battle Gimmick Validation for Client UI
 * Ensures Mega Evolution, Z-Moves, and Dynamax are only enabled when legal.
 */

export const MEGA_ELIGIBLE_SPECIES = [
  'charizard',
  'lucario',
  'mewtwo',
  'gengar',
  'garchomp',
  'blastoise',
  'venusaur'
];

/**
 * Check if the given active Pokémon can Mega Evolve
 * @param {object} pokemon - active Pokémon object with name, held_item_name, isMega
 * @returns {{ canMega: boolean, reason?: string, megaName?: string }}
 */
export function checkMegaEvolution(pokemon) {
  if (!pokemon) return { canMega: false, reason: 'ไม่พบโปเกมอน' };
  if (pokemon.isMega) return { canMega: false, reason: 'แปลงร่าง Mega อยู่แล้ว' };

  const pName = (pokemon.name || '').toLowerCase();
  const heldItem = (pokemon.held_item_name || '').toLowerCase();

  // 1. Is species eligible for Mega Evolution?
  const isEligibleSpecies = MEGA_ELIGIBLE_SPECIES.some(species => pName.includes(species));
  if (!isEligibleSpecies) {
    return {
      canMega: false,
      reason: `${pokemon.nickname || pokemon.name} ไม่ใช่สายพันธุ์ที่สามารถ Mega Evolve ได้ตามระบบหลัก`
    };
  }

  // 2. Does held item match this species' Mega Stone?
  if (!heldItem) {
    return {
      canMega: false,
      reason: `ต้องสวมใส่หิน Mega Stone ที่ตรงกับ ${pokemon.name} ก่อนจึงจะแปลงร่างได้`
    };
  }

  if (pName.includes('charizard')) {
    if (heldItem.includes('charizardite')) {
      return { canMega: true, megaName: heldItem.includes('y') ? 'Mega Charizard Y' : 'Mega Charizard X' };
    }
    return { canMega: false, reason: 'ต้องสวมใส่ Charizardite X หรือ Y' };
  }

  if (pName.includes('lucario')) {
    if (heldItem.includes('lucarionite')) return { canMega: true, megaName: 'Mega Lucario' };
    return { canMega: false, reason: 'ต้องสวมใส่ Lucarionite' };
  }

  if (pName.includes('mewtwo')) {
    if (heldItem.includes('mewtwonite')) return { canMega: true, megaName: 'Mega Mewtwo Y' };
    return { canMega: false, reason: 'ต้องสวมใส่ Mewtwonite' };
  }

  if (pName.includes('gengar')) {
    if (heldItem.includes('gengarite')) return { canMega: true, megaName: 'Mega Gengar' };
    return { canMega: false, reason: 'ต้องสวมใส่ Gengarite' };
  }

  if (pName.includes('garchomp')) {
    if (heldItem.includes('garchompite')) return { canMega: true, megaName: 'Mega Garchomp' };
    return { canMega: false, reason: 'ต้องสวมใส่ Garchompite' };
  }

  if (pName.includes('blastoise')) {
    if (heldItem.includes('blastoisinite')) return { canMega: true, megaName: 'Mega Blastoise' };
    return { canMega: false, reason: 'ต้องสวมใส่ Blastoisinite' };
  }

  if (pName.includes('venusaur')) {
    if (heldItem.includes('venusaurite')) return { canMega: true, megaName: 'Mega Venusaur' };
    return { canMega: false, reason: 'ต้องสวมใส่ Venusaurite' };
  }

  return { canMega: false, reason: 'หิน Mega Stone ไม่ตรงกับสายพันธุ์' };
}

/**
 * Check if the active Pokémon can unleash a Z-Move
 * @param {object} pokemon - active Pokémon object with moves, held_item_name
 * @returns {{ canZMove: boolean, reason?: string, zMoveName?: string }}
 */
export function checkZMove(pokemon) {
  if (!pokemon) return { canZMove: false, reason: 'ไม่พบโปเกมอน' };

  const heldItem = (pokemon.held_item_name || '').toLowerCase();
  if (!heldItem || (!heldItem.includes(' z') && !heldItem.includes('ium_z') && !heldItem.includes('-z'))) {
    return { canZMove: false, reason: 'ต้องสวมใส่ผลึก Z-Crystal ประจำธาตุ' };
  }

  let zType = null;
  let zName = 'Z-Move';
  if (heldItem.includes('firium')) { zType = 'fire'; zName = 'Inferno Overdrive'; }
  else if (heldItem.includes('waterium')) { zType = 'water'; zName = 'Hydro Vortex'; }
  else if (heldItem.includes('electrium')) { zType = 'electric'; zName = '10,000,000 Volt Thunderbolt'; }
  else if (heldItem.includes('grassium')) { zType = 'grass'; zName = 'Bloom Doom'; }
  else if (heldItem.includes('dragonium')) { zType = 'dragon'; zName = 'Devastating Drake'; }
  else if (heldItem.includes('fightinium')) { zType = 'fighting'; zName = 'All-Out Pummeling'; }
  else if (heldItem.includes('psychium')) { zType = 'psychic'; zName = 'Shattered Psyche'; }

  if (!zType) return { canZMove: false, reason: 'ผลึก Z-Crystal ไม่ถูกต้อง' };

  const moves = pokemon.moves || [];
  const hasMatchingMove = moves.some(m => (m.type || '').toLowerCase() === zType);
  if (!hasMatchingMove) {
    return { canZMove: false, reason: `ต้องมีสกิลธาตุ ${zType.toUpperCase()} เพื่อปลดปล่อยท่า ${zName}` };
  }

  return { canZMove: true, zMoveName: zName };
}
