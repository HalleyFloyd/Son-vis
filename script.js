// ============================================================================
// ZOMBIE SURVIVAL 2D - MOTOR PRINCIPAL MEJORADO Y OPTIMIZADO
// ============================================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const MAP_SIZE = 6000;

// === TERRENO HOSTIL PASTEL + CHARCOS DE SANGRE REALISTAS ===
const TERRAIN_COLORS = ['#F1E9E1', '#E1DFE2', '#f1d2d4'];
const GRID_COLOR = '#5C1710';
const GRID_SIZE = 50;
const BLOOD_COLORS = ['#A90113', '#BB0216'];
let bloodPuddles = [];

function hashTile(tx, ty) {
  let h = Math.abs((tx * 374761393 + ty * 668265263) % 2147483647);
  return h % TERRAIN_COLORS.length;
}

function initBloodPuddles() {
  bloodPuddles = [];
  const TARGET = 160;
  let attempts = 0;
  while (bloodPuddles.length < TARGET && attempts < TARGET * 30) {
    attempts++;
    const x = 140 + Math.random() * (MAP_SIZE - 280);
    const y = 140 + Math.random() * (MAP_SIZE - 280);
    const color = BLOOD_COLORS[Math.random() < 0.55 ? 0 : 1];
    const rotation = Math.random() * Math.PI * 2;
    const size = 30 + Math.random() * 30;

    let cand = {
      x, y, color, rotation, size,
      alpha: 0.8 + Math.random() * 0.15,
      splatters: []
    };

    const splatterCount = 6 + Math.floor(Math.random() * 7);
    for (let i = 0; i < splatterCount; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = cand.size * 0.85 + Math.random() * cand.size * 0.65;
      const rr = 1.4 + Math.random() * 3.2;
      cand.splatters.push({
        ang, dist, r: rr,
        hasTail: Math.random() < 0.5,
        tailLen: 4 + Math.random() * 7
      });
    }

    // Comprobación de no superposición excesiva
    let ok = true;
    for (let o of bloodPuddles) {
      if (Math.hypot(o.x - cand.x, o.y - cand.y) < cand.size + o.size + 20) {
        ok = false;
        break;
      }
    }
    if (ok) bloodPuddles.push(cand);
  }
}

function drawBloodPuddle(p) {
  const sx = p.x - camera.x;
  const sy = p.y - camera.y;
  if (sx < -120 || sx > canvas.width + 120 || sy < -120 || sy > canvas.height + 120) return;

  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(p.rotation);
  ctx.globalAlpha = p.alpha;
  ctx.fillStyle = p.color;

  ctx.beginPath();
  const STEPS = 36;
  let prevX = 0, prevY = 0, firstX = 0, firstY = 0;
  for (let i = 0; i <= STEPS; i++) {
    const ang = (i / STEPS) * Math.PI * 2;
    const noise = Math.sin(ang * 3.7 + p.x * 0.005) * 0.14 + Math.cos(ang * 5.2 + p.y * 0.005) * 0.09;
    const r = p.size * (1 + noise);
    const px = Math.cos(ang) * r;
    const py = Math.sin(ang) * r * 0.92;
    if (i === 0) {
      ctx.moveTo(px, py);
      firstX = px; firstY = py;
    } else {
      const mx = (prevX + px) * 0.5;
      const my = (prevY + py) * 0.5;
      ctx.quadraticCurveTo(prevX, prevY, mx, my);
    }
    prevX = px; prevY = py;
  }
  ctx.quadraticCurveTo(prevX, prevY, firstX, firstY);
  ctx.closePath();
  ctx.fill();

  for (let sp of p.splatters) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(Math.cos(sp.ang) * sp.dist, Math.sin(sp.ang) * sp.dist * 0.78, sp.r, 0, Math.PI * 2);
    ctx.fill();
    if (sp.hasTail) {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(sp.ang) * sp.dist, Math.sin(sp.ang) * sp.dist * 0.78);
      ctx.lineTo(Math.cos(sp.ang) * (sp.dist - sp.tailLen), Math.sin(sp.ang) * (sp.dist - sp.tailLen) * 0.78);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ============================================================================
// SISTEMA DE AUDIO ENRIQUECIDO (WEB AUDIO API SINTETIZADO)
// ============================================================================
class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) this.ctx = new AudioContext();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  createNoiseBuffer(duration = 0.2) {
    if (!this.ctx) return null;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  playShoot(weaponId) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;

    if (weaponId === 'sniper') {
      // Boom profundo con estruendo
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(20, now + 0.25);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.25);

      const noise = this.ctx.createBufferSource();
      const noiseGain = this.ctx.createGain();
      noise.buffer = this.createNoiseBuffer(0.25);
      if (noise.buffer) {
        noiseGain.gain.setValueAtTime(0.15, now);
        noiseGain.gain.linearRampToValueAtTime(0.001, now + 0.25);
        noise.connect(noiseGain); noiseGain.connect(this.ctx.destination);
        noise.start(now);
      }
    } else if (weaponId === 'shotgun') {
      // Disparo pesado múltiple
      const noise = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      noise.buffer = this.createNoiseBuffer(0.18);
      if (noise.buffer) {
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        noise.connect(gain); gain.connect(this.ctx.destination);
        noise.start(now);
      }
    } else if (weaponId === 'rifle') {
      // Ráfaga táctica
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.07);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.07);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.07);
    } else if (weaponId === 'smg') {
      // Snap rápido
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.04);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.04);
    } else if (weaponId === 'wand') {
      // Brillo mágico
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.1);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.1);
    } else if (weaponId === 'fireball') {
      // Lanzamiento ígneo
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(40, now + 0.15);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.15);
    } else if (weaponId === 'plasma') {
      // Pulso de energía
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.12);
    } else if (weaponId === 'void') {
      // Pulso del vacío
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.linearRampToValueAtTime(220, now + 0.1);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.1);
    } else if (weaponId === 'laser') {
      // Rayo láser sónico
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.08);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.08);
    } else {
      // Pistola básica estándar
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.08);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.08);
    }
  }

  playExplosion() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const noise = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    noise.buffer = this.createNoiseBuffer(0.35);
    if (!noise.buffer) return;

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, now);
    filter.frequency.exponentialRampToValueAtTime(40, now + 0.35);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.35);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
  }

  playSpit() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.12);
  }

  playPlayerHit() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(45, now + 0.15);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.15);
  }

  playShieldDeflect() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.18);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(now); osc.stop(now + 0.18);
  }

  playLevelUp() {
    if (!this.ctx || this.muted) return;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const start = this.ctx.currentTime + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.08, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(start); osc.stop(start + 0.2);
    });
  }

  playZombieGrowl() {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(70, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(30, this.ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(); osc.stop(this.ctx.currentTime + 0.2);
  }

  playXp() {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.06);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(); osc.stop(this.ctx.currentTime + 0.06);
  }
}
const sounds = new SoundManager();

// ============================================================================
// BASE DE DATOS DE HÉROES Y ARMAS
// ============================================================================
const HEROES = [
  { id: 'dog_brown', name: 'Perro Café', desc: 'Aura Ignis: Emite un pulso ardiente en área que daña a los enemigos cercanos.' },
  { id: 'dog_black', name: 'Perro Negro', desc: 'Maldición de Sombra: Mayor agilidad y un aura tenebrosa que inflige daño continuo.' },
  { id: 'cat', name: 'Gato Sigiloso', desc: 'Zarpazo Veloz: Lanza micro-cortes periódicos en un abanico frontal.' },
  { id: 'bear', name: 'Oso Robusto', desc: 'Fuerza Salvaje: Genera un pulso defensivo que frena e inflige daño a zombies.' },
  { id: 'bird', name: 'Ave Fénix', desc: 'Ráfaga de Viento: Lanza ondas de choque que empujan levemente a los zombies.' },
  { id: 'trex', name: 'T-Rex', desc: 'Mordisco Devastador: Un poderoso ataque a corta distancia en área.' }
];

// AJUSTE SOLICITADO: Daño base de pistola básica ajustado a 8 (antes 4)
const WEAPONS = [
  { id: 'pistol', name: 'Pistola Básica', type: 'physical', damage: 8, fireRate: 24, speed: 12, baseRange: 450, description: 'Disparo único equilibrado con alcance medio y daño reforzado.' },
  { id: 'shotgun', name: 'Escopeta', type: 'physical', damage: 3, fireRate: 48, speed: 9, pellets: 5, baseRange: 320, description: 'Ráfaga de perdigones a corta distancia con alta dispersión.' },
  { id: 'rifle', name: 'Rifle Táctico', type: 'physical', damage: 3, fireRate: 9, speed: 14, baseRange: 520, description: 'Alta cadencia de fuego y proyectiles cinéticos rápidos.' },
  { id: 'sniper', name: 'Francotirador', type: 'physical', damage: 10, fireRate: 65, speed: 20, pierce: 3, baseRange: 900, description: 'Gran daño, penetración pesada y alcance sobresaliente.' },
  { id: 'smg', name: 'Subfusil Dual', type: 'physical', damage: 2, fireRate: 5, speed: 11, baseRange: 380, description: 'Velocidad de disparo extrema con cañones dobles alternados.' },
  { id: 'wand', name: 'Varita Mágica', type: 'magical', damage: 5, fireRate: 28, speed: 10, baseRange: 480, description: 'Estrellas arcanas fulgurantes de rango medio.' },
  { id: 'fireball', name: 'Báculo de Fuego', type: 'magical', damage: 8, fireRate: 45, speed: 8, baseRange: 420, description: 'Esferas ígneas con explosión real en área de impacto.' },
  { id: 'plasma', name: 'Cañón de Plasma', type: 'magical', damage: 6, fireRate: 35, speed: 11, pierce: 2, baseRange: 550, description: 'Esfera de energía eléctrica oscilante que atraviesa enemigos.' },
  { id: 'void', name: 'Orbe del Vacío', type: 'magical', damage: 4, fireRate: 18, speed: 7, baseRange: 400, description: 'Vórtices de materia oscura constante de corto alcance.' },
  { id: 'laser', name: 'Rayo Arcano', type: 'magical', damage: 10, fireRate: 50, speed: 24, pierce: 2, baseRange: 800, description: 'Haz láser brillante y veloz de gran precisión y largo alcance.' }
];

// 90 AUMENTOS ÚNICOS BASE
const AUGMENTS_DATABASE = [
  { id: 'a1', name: 'Fuerza Muscular', rarity: 'Común', desc: 'Aumenta el Daño Físico (AD) en +3.', apply: p => p.ad += 3 },
  { id: 'a2', name: 'Afinidad Arcana', rarity: 'Común', desc: 'Aumenta el Poder Mágico (AP) en +3.', apply: p => p.ap += 3 },
  { id: 'a3', name: 'Chaleco Ligero', rarity: 'Común', desc: 'Aumenta la Armadura en +3.', apply: p => p.armor += 3 },
  { id: 'a4', name: 'Manto Protector', rarity: 'Común', desc: 'Aumenta la Resistencia Mágica en +3.', apply: p => p.mr += 3 },
  { id: 'a5', name: 'Puntas Afiladas', rarity: 'Común', desc: 'Aumenta la Penetración Física en +3%.', apply: p => p.physPen += 3 },
  { id: 'a6', name: 'Canalización Mágica', rarity: 'Común', desc: 'Aumenta la Penetración Mágica en +3%.', apply: p => p.magPen += 3 },
  { id: 'a7', name: 'Vampirismo Menor', rarity: 'Común', desc: 'Aumenta el Robo de Vida en +1.5%.', apply: p => p.lifeSteal += 1.5 },
  { id: 'a8', name: 'Sanguijuela Arcana', rarity: 'Común', desc: 'Aumenta la Succión Mágica en +1.5%.', apply: p => p.spellVamp += 1.5 },
  { id: 'a9', name: 'Bebida Energética', rarity: 'Común', desc: 'Aumenta la Velocidad de Movimiento en +0.15.', apply: p => p.moveSpeed += 0.15 },
  { id: 'a10', name: 'Manos Ligeras', rarity: 'Común', desc: 'Aumenta la Velocidad de Ataque en +4%.', apply: p => p.attackSpeed += 0.04 },
  { id: 'a11', name: 'Vitalidad Básica', rarity: 'Común', desc: 'Aumenta la Vida Máxima en +10.', apply: p => { p.maxHp += 10; p.hp += 10; } },
  { id: 'a12', name: 'Imán de Chatarra', rarity: 'Común', desc: 'Aumenta el radio de recogida de XP en +20px.', apply: p => p.pickupRadius += 20 },
  { id: 'a13', name: 'Mente Abierta', rarity: 'Común', desc: 'Gana un +8% de Experiencia adicional.', apply: p => p.xpMultiplier += 0.08 },
  { id: 'a14', name: 'Vendaje de Emergencia', rarity: 'Común', desc: 'Aumenta el Poder de Curación en +5%.', apply: p => p.healPower += 5 },
  { id: 'a15', name: 'Munición Pesada', rarity: 'Común', desc: '+2 AD pero reduce la velocidad de movimiento en -0.05.', apply: p => { p.ad += 2; p.moveSpeed -= 0.05; } },
  { id: 'c1', name: 'Mirilla Básica', rarity: 'Común', desc: '+2% Probabilidad de Crítico.', apply: p => p.critChance += 2 },
  { id: 'c2', name: 'Impacto Ligero', rarity: 'Común', desc: '+5% Daño Crítico.', apply: p => p.critDamage += 5 },
  { id: 'c3', name: 'Ojo Entrenado', rarity: 'Común', desc: '+1.5% Probabilidad de Crítico y +3% Daño Crítico.', apply: p => { p.critChance += 1.5; p.critDamage += 3; } },
  { id: 'c4', name: 'Golpe Preciso', rarity: 'Común', desc: '+1.5% Probabilidad de Crítico y +1.5 AD.', apply: p => { p.critChance += 1.5; p.ad += 1.5; } },
  { id: 'c5', name: 'Chispa Arcana', rarity: 'Común', desc: '+1.5% Probabilidad de Crítico y +1.5 AP.', apply: p => { p.critChance += 1.5; p.ap += 1.5; } },
  { id: 'c6', name: 'Reflejos Agudos', rarity: 'Común', desc: '+1% Probabilidad de Crítico y +0.1 Vel. Movimiento.', apply: p => { p.critChance += 1; p.moveSpeed += 0.1; } },
  { id: 'c7', name: 'Gatillo Ajustado', rarity: 'Común', desc: '+4% Daño Crítico y +2% Vel. Ataque.', apply: p => { p.critDamage += 4; p.attackSpeed += 0.02; } },
  { id: 'r1', name: 'Lente Pulido', rarity: 'Común', desc: '+5% Alcance de Disparo.', apply: p => p.rangeMultiplier += 0.05 },
  { id: 'r2', name: 'Polvora Extendida', rarity: 'Común', desc: '+4% Alcance de Disparo y +1.5 AD.', apply: p => { p.rangeMultiplier += 0.04; p.ad += 1.5; } },
  { id: 'r3', name: 'Canalización Distante', rarity: 'Común', desc: '+4% Alcance de Disparo y +1.5 AP.', apply: p => { p.rangeMultiplier += 0.04; p.ap += 1.5; } },

  { id: 'a16', name: 'Músculos Reforzados', rarity: 'Raro', desc: 'Aumenta el Daño Físico (AD) en +6.', apply: p => p.ad += 6 },
  { id: 'a17', name: 'Sabiduría Sobrenatural', rarity: 'Raro', desc: 'Aumenta el Poder Mágico (AP) en +6.', apply: p => p.ap += 6 },
  { id: 'a18', name: 'Placas de Acero', rarity: 'Raro', desc: 'Aumenta la Armadura en +6.', apply: p => p.armor += 6 },
  { id: 'a19', name: 'Barrera Espiritual', rarity: 'Raro', desc: 'Aumenta la Resistencia Mágica en +6.', apply: p => p.mr += 6 },
  { id: 'a20', name: 'Proyectiles Perforantes', rarity: 'Raro', desc: 'Aumenta la Penetración Física en +6%.', apply: p => p.physPen += 6 },
  { id: 'a21', name: 'Disrupcion Runica', rarity: 'Raro', desc: 'Aumenta la Penetración Mágica en +6%.', apply: p => p.magPen += 6 },
  { id: 'a22', name: 'Seductores de Sangre', rarity: 'Raro', desc: 'Aumenta el Robo de Vida en +3%.', apply: p => p.lifeSteal += 3 },
  { id: 'a23', name: 'Devorador de Almas', rarity: 'Raro', desc: 'Aumenta la Succión Mágica en +3%.', apply: p => p.spellVamp += 3 },
  { id: 'a24', name: 'Botas del Viento', rarity: 'Raro', desc: 'Aumenta la Velocidad de Movimiento en +0.3.', apply: p => p.moveSpeed += 0.3 },
  { id: 'a25', name: 'Gatillo Fácil', rarity: 'Raro', desc: 'Aumenta la Velocidad de Ataque en +8%.', apply: p => p.attackSpeed += 0.08 },
  { id: 'a26', name: 'Corazón Robusto', rarity: 'Raro', desc: 'Aumenta la Vida Máxima en +20.', apply: p => { p.maxHp += 20; p.hp += 20; } },
  { id: 'a27', name: 'Super Imán', rarity: 'Raro', desc: 'Aumenta el radio de recogida de XP en +40px.', apply: p => p.pickupRadius += 40 },
  { id: 'a28', name: 'Estudioso de Combate', rarity: 'Raro', desc: 'Gana un +16% de Experiencia adicional.', apply: p => p.xpMultiplier += 0.16 },
  { id: 'a29', name: 'Balsamo Curativo', rarity: 'Raro', desc: 'Aumenta el Poder de Curación en +12%.', apply: p => p.healPower += 12 },
  { id: 'a30', name: 'Bala Fría', rarity: 'Raro', desc: 'Tus ataques tienen 8% de probabilidad de congelar zombies.', apply: p => p.freezeChance += 0.08 },
  { id: 'a31', name: 'Balística Pesada', rarity: 'Raro', desc: 'Tus proyectiles traspasan a 1 enemigo extra.', apply: p => p.extraPierce += 1 },
  { id: 'a32', name: 'Sinergia Físico-Robo', rarity: 'Raro', desc: '+3 AD y +2% Robo de Vida.', apply: p => { p.ad += 3; p.lifeSteal += 2; } },
  { id: 'a33', name: 'Sinergia Mágico-Succión', rarity: 'Raro', desc: '+3 AP y +2% Succión Mágica.', apply: p => { p.ap += 3; p.spellVamp += 2; } },
  { id: 'a34', name: 'Piel Blindada', rarity: 'Raro', desc: '+4 Armadura y +4 Resistencia Mágica.', apply: p => { p.armor += 4; p.mr += 4; } },
  { id: 'a35', name: 'Paso Ligero', rarity: 'Raro', desc: '+0.2 Vel. Movimiento y +4% Vel. Ataque.', apply: p => { p.moveSpeed += 0.2; p.attackSpeed += 0.04; } },
  { id: 'c8', name: 'Lente de Aumento', rarity: 'Raro', desc: '+4% Probabilidad de Crítico.', apply: p => p.critChance += 4 },
  { id: 'c9', name: 'Fuerza Devastadora', rarity: 'Raro', desc: '+12% Daño Crítico.', apply: p => p.critDamage += 12 },
  { id: 'c10', name: 'Anatomía Mortal', rarity: 'Raro', desc: '+3% Probabilidad de Crítico y +6% Daño Crítico.', apply: p => { p.critChance += 3; p.critDamage += 6; } },
  { id: 'c11', name: 'Vampiro Letal', rarity: 'Raro', desc: '+2% Probabilidad de Crítico y +2% Robo de Vida.', apply: p => { p.critChance += 2; p.lifeSteal += 2; } },
  { id: 'c12', name: 'Magia de Impacto', rarity: 'Raro', desc: '+2% Probabilidad de Crítico y +2% Succión Mágica.', apply: p => { p.critChance += 2; p.spellVamp += 2; } },
  { id: 'c13', name: 'Disparo del Halcón', rarity: 'Raro', desc: '+3% Probabilidad de Crítico y +3 AD.', apply: p => { p.critChance += 3; p.ad += 3; } },
  { id: 'r4', name: 'Cañón Estriado', rarity: 'Raro', desc: '+10% Alcance de Disparo.', apply: p => p.rangeMultiplier += 0.10 },
  { id: 'r5', name: 'Mira Telescópica', rarity: 'Raro', desc: '+8% Alcance de Disparo y +3% Prob. Crítico.', apply: p => { p.rangeMultiplier += 0.08; p.critChance += 3; } },
  { id: 'r6', name: 'Inyección Hiperbólica', rarity: 'Raro', desc: '+8% Alcance de Disparo y +4% Vel. Ataque.', apply: p => { p.rangeMultiplier += 0.08; p.attackSpeed += 0.04; } },

  { id: 'a36', name: 'Titán de Acero', rarity: 'Épico', desc: 'Aumenta la Armadura en +10 y la Vida Máxima en +25.', apply: p => { p.armor += 10; p.maxHp += 25; p.hp += 25; } },
  { id: 'a37', name: 'Baluarte Mágico', rarity: 'Épico', desc: 'Aumenta la Res. Mágica en +10 y el Poder Mágico en +6.', apply: p => { p.mr += 10; p.ap += 6; } },
  { id: 'a38', name: 'Ataque de Velocidad', rarity: 'Épico', desc: 'Convierte un +5% de tu Vel. Movimiento en AD.', apply: p => p.ad += Math.round(p.moveSpeed * 1.2) },
  { id: 'a39', name: 'Converter de Armadura', rarity: 'Épico', desc: 'Gana +1 de AD por cada 5 puntos de Armadura.', apply: p => p.ad += Math.round(p.armor / 5) },
  { id: 'a40', name: 'Amplificador Rúnico', rarity: 'Épico', desc: 'Gana +1 de AP por cada 5 puntos de Res. Mágica.', apply: p => p.ap += Math.round(p.mr / 5) },
  { id: 'a41', name: 'Frenesí de Sangre', rarity: 'Épico', desc: '+4% Robo de Vida y +6% Vel. Ataque.', apply: p => { p.lifeSteal += 4; p.attackSpeed += 0.06; } },
  { id: 'a42', name: 'Tormenta Mística', rarity: 'Épico', desc: '+4% Succión Mágica y +6 AP.', apply: p => { p.spellVamp += 4; p.ap += 6; } },
  { id: 'a43', name: 'Escudo de Fuerza', rarity: 'Épico', desc: 'Otorga un escudo regenerable que absorbe 1 impacto cada 10s.', apply: p => { p.hasShieldAbility = true; p.shieldActive = true; } },
  { id: 'a44', name: 'Cargador Extendido', rarity: 'Épico', desc: 'Dispara 1 proyectil adicional en cada ataque.', apply: p => p.extraBullets += 1 },
  { id: 'a45', name: 'Gran Sabiduría', rarity: 'Épico', desc: 'Aumenta la XP ganada en un +25%.', apply: p => p.xpMultiplier += 0.25 },
  { id: 'a46', name: 'Perforador Total', rarity: 'Épico', desc: '+8% Pen. Física y +8% Pen. Mágica.', apply: p => { p.physPen += 8; p.magPen += 8; } },
  { id: 'a47', name: 'Piel Espinosa', rarity: 'Épico', desc: 'Devuelve 5 de daño físico a los enemigos que te golpean.', apply: p => p.thornsDamage += 5 },
  { id: 'a48', name: 'Piroclasto', rarity: 'Épico', desc: 'Tus ataques mágicos queman a los enemigos causándoles daño continuo.', apply: p => p.burnAura = true },
  { id: 'a49', name: 'Curación Vital', rarity: 'Épico', desc: '+20% Poder Curativo y +15 Vida Máxima.', apply: p => { p.healPower += 20; p.maxHp += 15; p.hp += 15; } },
  { id: 'a50', name: 'Paso de Sombra', rarity: 'Épico', desc: '+0.5 Vel. Movimiento y +5% Probabilidad de Esquivar.', apply: p => { p.moveSpeed += 0.5; p.dodgeChance = Math.min(0.40, p.dodgeChance + 0.05); } },
  { id: 'c14', name: 'Precisión Quirúrgica', rarity: 'Épico', desc: '+6% Probabilidad de Crítico y +12% Daño Crítico.', apply: p => { p.critChance += 6; p.critDamage += 12; } },
  { id: 'c15', name: 'Executioner', rarity: 'Épico', desc: '+25% Daño Crítico.', apply: p => p.critDamage += 25 },
  { id: 'c16', name: 'Crit-Vampirismo', rarity: 'Épico', desc: '+4% Probabilidad de Crítico y +3% Robo de Vida/Succión.', apply: p => { p.critChance += 4; p.lifeSteal += 3; p.spellVamp += 3; } },
  { id: 'c17', name: 'Cadencia Crítica', rarity: 'Épico', desc: '+5% Probabilidad de Crítico y +8% Vel. Ataque.', apply: p => { p.critChance += 5; p.attackSpeed += 0.08; } },
  { id: 'r7', name: 'Proyección Balística', rarity: 'Épico', desc: '+18% Alcance de Disparo y +5 AD/AP.', apply: p => { p.rangeMultiplier += 0.18; p.ad += 5; p.ap += 5; } },
  { id: 'r8', name: 'Ojo de Águila', rarity: 'Épico', desc: '+15% Alcance de Disparo y +10% Daño Crítico.', apply: p => { p.rangeMultiplier += 0.15; p.critDamage += 10; } },

  { id: 'a51', name: 'Dios de la Guerra', rarity: 'Legendario', desc: '+15 Daño Físico (AD) y +10% Vel. Ataque.', apply: p => { p.ad += 15; p.attackSpeed += 0.10; } },
  { id: 'a52', name: 'Archimago Absoluto', rarity: 'Legendario', desc: '+15 Poder Mágico (AP) y +12% Pen. Mágica.', apply: p => { p.ap += 15; p.magPen += 12; } },
  { id: 'a53', name: 'Inmortalidad Terrenal', rarity: 'Legendario', desc: '+45 Vida Máxima y +10 Armadura.', apply: p => { p.maxHp += 45; p.hp += 45; p.armor += 10; } },
  { id: 'a54', name: 'Vampiro Supremo', rarity: 'Legendario', desc: '+6% Robo de Vida, +6% Succión Mágica y +15% Poder Curación.', apply: p => { p.lifeSteal += 6; p.spellVamp += 6; p.healPower += 15; } },
  { id: 'a55', name: 'Lluvia de Plomo', rarity: 'Legendario', desc: '+1 Proyectil adicional por cada disparo.', apply: p => p.extraBullets += 1 },
  { id: 'a56', name: 'Cero Absoluto', rarity: 'Legendario', desc: '15% de probabilidad de congelar a los enemigos en área.', apply: p => p.freezeChance += 0.15 },
  { id: 'a57', name: 'Singularidad Mágica', rarity: 'Legendario', desc: 'Convierte el 5% de todo el daño infligido en curación directa.', apply: p => p.omnivamp += 5 },
  { id: 'a58', name: 'Pacto de Sangre', rarity: 'Legendario', desc: '+50% AD pero reduce tu vida máxima actual un 10%.', apply: p => { p.ad = Math.round(p.ad * 1.5); p.maxHp = Math.round(p.maxHp * 0.9); p.hp = Math.min(p.hp, p.maxHp); } },
  { id: 'a59', name: 'Motor de Antimateria', rarity: 'Legendario', desc: '+0.8 Vel. Movimiento y recoge XP de todo el mapa automáticamente.', apply: p => { p.moveSpeed += 0.8; p.globalPickup = true; } },
  { id: 'a60', name: 'Avatar de la Destrucción', rarity: 'Legendario', desc: '+10 AD, +10 AP, +8 Armadura, +8 Res. Mágica.', apply: p => { p.ad += 10; p.ap += 10; p.armor += 8; p.mr += 8; } },
  { id: 'c18', name: 'Ojo del Apocalipsis', rarity: 'Legendario', desc: '+10% Probabilidad de Crítico y +25% Daño Crítico.', apply: p => { p.critChance += 10; p.critDamage += 25; } },
  { id: 'c19', name: 'Aniquilación Crítica', rarity: 'Legendario', desc: '+40% Daño Crítico.', apply: p => p.critDamage += 40 },
  { id: 'c20', name: 'Maestría Mortal', rarity: 'Legendario', desc: '+8% Probabilidad de Crítico, +10 AD y +10 AP.', apply: p => { p.critChance += 8; p.ad += 10; p.ap += 10; } },
  { id: 'r9', name: 'Horizonte Infinito', rarity: 'Legendario', desc: '+35% Alcance de Disparo y +12% Velocidad de Ataque.', apply: p => { p.rangeMultiplier += 0.35; p.attackSpeed += 0.12; } },
  { id: 'r10', name: 'Francotirador Arcano', rarity: 'Legendario', desc: '+30% Alcance de Disparo, +8% Prob. Crítico y +20% Daño Crítico.', apply: p => { p.rangeMultiplier += 0.30; p.critChance += 8; p.critDamage += 20; } }
];

// 10 NUEVOS AUMENTOS INFINITOS EN CASO DE ADQUIRIR LOS 90 (PREVENCIÓN DE SOFTLOCK)
const INFINITE_AUGMENTS_DATABASE = [
  { id: 'inf1', name: 'Regeneración de Emergencia', rarity: 'Infinito', desc: 'Restaura instantáneamente un 15% de tu Vida Máxima.', apply: p => { const h = p.maxHp * 0.15; p.hp = Math.min(p.maxHp, p.hp + h); damageTexts.push(new DamageText(p.x, p.y, `+${Math.round(h)}`, false, '#2ecc71')); } },
  { id: 'inf2', name: 'Vitalidad Suprema', rarity: 'Infinito', desc: '+5 de Vida Máxima y sana +5 de Vida.', apply: p => { p.maxHp += 5; p.hp += 5; } },
  { id: 'inf3', name: 'Refuerzo de Placas', rarity: 'Infinito', desc: '+5 de Armadura permanente.', apply: p => p.armor += 5 },
  { id: 'inf4', name: 'Manto Espiritual', rarity: 'Infinito', desc: '+5 de Resistencia Mágica permanente.', apply: p => p.mr += 5 },
  { id: 'inf5', name: 'Fuerza Inagotable', rarity: 'Infinito', desc: '+5 de Daño Físico (AD).', apply: p => p.ad += 5 },
  { id: 'inf6', name: 'Poder Infinito', rarity: 'Infinito', desc: '+5 de Poder Mágico (AP).', apply: p => p.ap += 5 },
  { id: 'inf7', name: 'Perforación Continua', rarity: 'Infinito', desc: '+1% de Penetración Física.', apply: p => p.physPen += 1 },
  { id: 'inf8', name: 'Canalización Eterna', rarity: 'Infinito', desc: '+1% de Penetración Mágica.', apply: p => p.magPen += 1 },
  { id: 'inf9', name: 'Frenesí Infinito', rarity: 'Infinito', desc: '+0.01 de Velocidad de Ataque.', apply: p => p.attackSpeed += 0.01 },
  { id: 'inf10', name: 'Paso Veloz', rarity: 'Infinito', desc: '+0.01 de Velocidad de Movimiento.', apply: p => p.moveSpeed += 0.01 }
];

// ============================================================================
// CLASES PRINCIPALES
// ============================================================================

class Player {
  constructor(x, y, hero) {
    this.x = x; this.y = y;
    this.hero = hero || HEROES[0];
    this.radius = 16;
    this.maxHp = 100; this.hp = 100;
    this.level = 1; this.xp = 0; this.nextLevelXp = 50;

    this.ad = 10;
    this.ap = 10;
    this.armor = 0;
    this.mr = 0;
    this.physPen = 0;
    this.magPen = 0;
    this.lifeSteal = 0;
    this.spellVamp = 0;
    this.healPower = 0;
    this.attackSpeed = 1.0;
    this.moveSpeed = 3.5;
    this.rangeMultiplier = 1.0;

    this.critChance = 5;
    this.critDamage = 50;

    this.shieldActive = false; this.shieldTimer = 0; this.hasShieldAbility = false;
    this.extraBullets = 0; this.extraPierce = 0; this.freezeChance = 0;
    this.pickupRadius = 80; this.xpMultiplier = 1.0;
    this.thornsDamage = 0; this.dodgeChance = 0; this.omnivamp = 0; this.globalPickup = false;
    this.burnAura = false;

    this.angle = 0;
    this.passiveTimer = 0;
    this.passiveVisualTimer = 0;

    this.grievousTimer = 0;
    this.grievousPercent = 0;
  }

  update(keys, joystick, aimJoystick) {
    let dx = 0, dy = 0;
    if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
    if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

    if (joystick.active) {
      dx = joystick.x;
      dy = joystick.y;
    }

    const len = Math.hypot(dx, dy);
    if (len > 0) {
      const nextVx = (dx / len) * this.moveSpeed;
      const nextVy = (dy / len) * this.moveSpeed;
      
      let canMoveX = true, canMoveY = true;
      for (let obs of obstacles) {
        if (Math.hypot(obs.x - (this.x + nextVx), obs.y - this.y) < obs.radius + this.radius) canMoveX = false;
        if (Math.hypot(obs.x - this.x, obs.y - (this.y + nextVy)) < obs.radius + this.radius) canMoveY = false;
      }

      if (canMoveX) this.x += nextVx;
      if (canMoveY) this.y += nextVy;
    }

    this.x = Math.max(this.radius, Math.min(MAP_SIZE - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(MAP_SIZE - this.radius, this.y));

    // Apuntado en móviles y auto-apuntado
    if (aimJoystick.active) {
      this.angle = Math.atan2(aimJoystick.y, aimJoystick.x);
    } else if (autoAimEnabled && zombies.length > 0) {
      let nearest = null;
      let minD = Infinity;
      const maxRange = selectedWeapon.baseRange * this.rangeMultiplier + 100;
      for (let z of zombies) {
        const d = Math.hypot(z.x - this.x, z.y - this.y);
        if (d < minD && d <= maxRange) {
          minD = d;
          nearest = z;
        }
      }
      if (nearest) {
        this.angle = Math.atan2(nearest.y - this.y, nearest.x - this.x);
      } else if (joystick.active && len > 0) {
        this.angle = Math.atan2(dy, dx);
      }
    } else if (joystick.active && len > 0 && !isMouseAiming) {
      this.angle = Math.atan2(dy, dx);
    }

    if (this.grievousTimer > 0) {
      this.grievousTimer--;
      if (this.grievousTimer <= 0) this.grievousPercent = 0;
    }

    if (this.hasShieldAbility && !this.shieldActive) {
      this.shieldTimer++;
      if (this.shieldTimer >= 600) {
        this.shieldActive = true;
        this.shieldTimer = 0;
      }
    }

    // Pasivas de los Héroes
    this.passiveTimer++;
    if (this.passiveTimer >= 45) {
      this.passiveTimer = 0;
      this.passiveVisualTimer = 18; // Duración de la animación visual
      const passiveScaling = (this.ad * 0.5) + (this.ap * 0.5);

      if (this.hero.id === 'dog_brown' || this.hero.id === 'dog_black') {
        const auraRadius = 110;
        zombies.forEach(z => {
          if (Math.hypot(z.x - this.x, z.y - this.y) < auraRadius) {
            z.hp -= passiveScaling;
            damageTexts.push(new DamageText(z.x, z.y, Math.round(passiveScaling), false, this.hero.id === 'dog_brown' ? '#ffaa00' : '#a855f7'));
            if (this.hero.id === 'dog_brown') spawnFlameParticles(z.x, z.y, 4);
          }
        });
      } else if (this.hero.id === 'cat') {
        const range = 140;
        const catAngle = this.angle;
        zombies.forEach(z => {
          const zAngle = Math.atan2(z.y - this.y, z.x - this.x);
          let angleDiff = Math.abs(catAngle - zAngle);
          if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
          if (Math.hypot(z.x - this.x, z.y - this.y) < range && angleDiff < 0.8) {
            z.hp -= passiveScaling * 1.2;
            damageTexts.push(new DamageText(z.x, z.y, Math.round(passiveScaling * 1.2), false, '#00ffcc'));
          }
        });
      } else if (this.hero.id === 'bear') {
        const range = 100;
        zombies.forEach(z => {
          if (Math.hypot(z.x - this.x, z.y - this.y) < range) {
            z.hp -= passiveScaling * 1.5;
            damageTexts.push(new DamageText(z.x, z.y, Math.round(passiveScaling * 1.5), false, '#e74c3c'));
          }
        });
      } else if (this.hero.id === 'bird') {
        const range = 160;
        zombies.forEach(z => {
          const pushDx = z.x - this.x;
          const pushDy = z.y - this.y;
          const dist = Math.hypot(pushDx, pushDy) || 1;
          if (dist < range) {
            z.hp -= passiveScaling;
            z.x += (pushDx / dist) * 18;
            z.y += (pushDy / dist) * 18;
            damageTexts.push(new DamageText(z.x, z.y, Math.round(passiveScaling), false, '#7ee8fa'));
          }
        });
      } else if (this.hero.id === 'trex') {
        const range = 95;
        const biteAngle = this.angle;
        zombies.forEach(z => {
          const zAngle = Math.atan2(z.y - this.y, z.x - this.x);
          let angleDiff = Math.abs(biteAngle - zAngle);
          if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
          if (Math.hypot(z.x - this.x, z.y - this.y) < range && angleDiff < 0.9) {
            z.hp -= passiveScaling * 2.0;
            damageTexts.push(new DamageText(z.x, z.y, Math.round(passiveScaling * 2.0), true, '#ff3333'));
          }
        });
      }
    }

    if (this.passiveVisualTimer > 0) this.passiveVisualTimer--;
  }

  draw() {
    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;

    // Feedback Visual de las Pasivas de los Héroes
    if (this.passiveVisualTimer > 0) {
      ctx.save();
      const progress = 1 - (this.passiveVisualTimer / 18);
      if (this.hero.id === 'dog_brown') {
        // Onda expansiva de fuego anaranjada
        ctx.strokeStyle = `rgba(255, 120, 0, ${1 - progress})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 30 + progress * 80, 0, Math.PI * 2);
        ctx.stroke();
      } else if (this.hero.id === 'dog_black') {
        // Onda de sombra oscura púrpura
        ctx.strokeStyle = `rgba(168, 85, 247, ${1 - progress})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 30 + progress * 80, 0, Math.PI * 2);
        ctx.stroke();
      } else if (this.hero.id === 'cat') {
        // Tres cortes en abanico frontal
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(this.angle);
        ctx.strokeStyle = `rgba(0, 255, 204, ${1 - progress})`;
        ctx.lineWidth = 3;
        for (let o = -1; o <= 1; o++) {
          ctx.beginPath();
          ctx.arc(40 * progress, o * 18, 50, -0.4, 0.4);
          ctx.stroke();
        }
        ctx.restore();
      } else if (this.hero.id === 'bear') {
        // Terremoto defensivo rojo
        ctx.strokeStyle = `rgba(231, 76, 60, ${1 - progress})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 20 + progress * 80, 0, Math.PI * 2);
        ctx.stroke();
      } else if (this.hero.id === 'bird') {
        // Ráfaga de viento blanca/azul
        ctx.strokeStyle = `rgba(126, 232, 250, ${1 - progress})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(screenX, screenY, 30 + progress * 130, 0, Math.PI * 2);
        ctx.stroke();
      } else if (this.hero.id === 'trex') {
        // Mandíbula carnívora mordiendo
        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.rotate(this.angle);
        ctx.strokeStyle = `rgba(255, 51, 51, ${1 - progress})`;
        ctx.fillStyle = `rgba(255, 51, 51, ${(1 - progress) * 0.3})`;
        ctx.beginPath();
        ctx.arc(35, 0, 45, -0.6, 0.6);
        ctx.lineTo(20, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    // Dibujo del Héroe
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(this.angle);

    if (this.hero.id === 'dog_brown') {
      ctx.fillStyle = '#d2b48c'; ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8b4513'; ctx.beginPath(); ctx.arc(-8, -12, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-8, 12, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(4, -5, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(4, 5, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(10, 0, 3, 0, Math.PI * 2); ctx.fill();
    } else if (this.hero.id === 'dog_black') {
      ctx.fillStyle = '#111115'; ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-8, -12, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-8, 12, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#00ffff'; ctx.beginPath(); ctx.arc(4, -5, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(4, 5, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff0055'; ctx.beginPath(); ctx.arc(10, 0, 3, 0, Math.PI * 2); ctx.fill();
    } else if (this.hero.id === 'cat') {
      ctx.fillStyle = '#f39c12'; ctx.beginPath(); ctx.arc(0, 0, this.radius - 1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d35400'; ctx.beginPath(); ctx.moveTo(-2, -14); ctx.lineTo(6, -8); ctx.lineTo(-6, -6); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-2, 14); ctx.lineTo(6, 8); ctx.lineTo(-6, 6); ctx.fill();
      ctx.fillStyle = '#2ecc71'; ctx.beginPath(); ctx.arc(4, -4, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(4, 4, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(9, 0, 2, 0, Math.PI * 2); ctx.fill();
    } else if (this.hero.id === 'bear') {
      ctx.fillStyle = '#5c4033'; ctx.beginPath(); ctx.arc(0, 0, this.radius + 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3b281e'; ctx.beginPath(); ctx.arc(-6, -14, 7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-6, 14, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(5, -5, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(5, 5, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d2b48c'; ctx.beginPath(); ctx.arc(10, 0, 5, 0, Math.PI * 2); ctx.fill();
    } else if (this.hero.id === 'bird') {
      ctx.fillStyle = '#3498db'; ctx.beginPath(); ctx.arc(0, 0, this.radius - 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2980b9'; ctx.beginPath(); ctx.arc(-10, -8, 8, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-10, 8, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.moveTo(6, -5); ctx.lineTo(16, 0); ctx.lineTo(6, 5); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(3, -4, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(3, 4, 2.5, 0, Math.PI * 2); ctx.fill();
    } else if (this.hero.id === 'trex') {
      ctx.fillStyle = '#27ae60'; ctx.beginPath(); ctx.arc(0, 0, this.radius + 2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1e8449'; ctx.beginPath(); ctx.arc(-8, 0, this.radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f39c12'; ctx.beginPath(); ctx.arc(5, -5, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(5, 5, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(12, -3, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(12, 3, 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    if (this.shieldActive) {
      ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(screenX, screenY, this.radius + 6, 0, Math.PI * 2); ctx.stroke();
    }
  }
}

// ============================================================================
// CLASE ZOMBIE (CON COMPORTAMIENTO SPITTER CORREGIDO Y QUEMADURAS)
// ============================================================================
class Zombie {
  constructor(x, y, type = 'normal') {
    this.x = x; this.y = y; this.type = type;
    this.frozenTimer = 0;
    this.burnTimer = 0;
    this.burnDps = 0;
    this.growlTimer = Math.random() * 300;
    this.deadProcessed = false;
    this.attackCooldown = 0;
    this.spitCooldown = 60 + Math.random() * 120; // Para el spitter

    const waveScale = 1 + (wave - 1) * 0.03;
    const waveSpeedScale = 1 + Math.min(0.15, (wave - 1) * 0.01);
    const waveAttackSpeedScale = 1 + Math.min(0.20, (wave - 1) * 0.005);

    const zombieStats = {
      runner:  { radius: 12, speed: 3.00, hp: 45,  physicalDamage: 1.60, magicalDamage: 1.60, armor: 8.0,  mr: 8.0,  attackSpeed: 6.5, xp: 8,  grievous: 0.15 },
      normal:  { radius: 16, speed: 2.00, hp: 80,  physicalDamage: 2.00, magicalDamage: 2.00, armor: 10.0, mr: 10.0, attackSpeed: 6.0, xp: 12, grievous: 0.10 },
      spitter: { radius: 15, speed: 1.65, hp: 70,  physicalDamage: 2.20, magicalDamage: 2.20, armor: 9.0,  mr: 12.0, attackSpeed: 5.5, xp: 18, grievous: 0.25 },
      tank:    { radius: 24, speed: 1.15, hp: 200, physicalDamage: 2.70, magicalDamage: 2.70, armor: 13.5, mr: 13.5, attackSpeed: 4.5, xp: 30, grievous: 0.35 }
    };
    const stats = zombieStats[type] || zombieStats.normal;
    this.radius = stats.radius;
    this.speed = stats.speed * waveSpeedScale;
    this.maxHp = stats.hp * waveScale;
    this.physicalDamage = stats.physicalDamage * waveScale;
    this.magicalDamage = stats.magicalDamage * waveScale;
    this.attackSpeed = stats.attackSpeed * waveAttackSpeedScale;
    this.xpValue = stats.xp;
    this.grievousValue = stats.grievous;
    this.color = type === 'runner' ? '#c0392b' : type === 'tank' ? '#566573' : type === 'spitter' ? '#6c3483' : '#707b7c';
    
    this.faceSeed = Math.random() * Math.PI * 2;
    this.faceVariant = Math.floor(Math.random() * 3);

    this.armor = stats.armor * waveScale;
    this.mr = stats.mr * waveScale;
    this.hp = this.maxHp;
  }

  update(player) {
    // Daño por quemadura activa (Piroclasto)
    if (this.burnTimer > 0) {
      this.burnTimer--;
      if (this.burnTimer % 15 === 0) {
        const bDmg = Math.max(1, this.burnDps);
        this.hp -= bDmg;
        damageTexts.push(new DamageText(this.x, this.y, Math.round(bDmg), false, '#ff6600'));
        spawnFlameParticles(this.x, this.y, 2);
      }
    }

    if (this.frozenTimer > 0) {
      this.frozenTimer--;
      return;
    }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    // COMPORTAMIENTO SPITTER: Escupir ácido si está dentro del rango de 600px
    if (this.type === 'spitter') {
      this.spitCooldown--;
      if (dist <= 600 && this.spitCooldown <= 0) {
        this.spitCooldown = 180 + Math.random() * 60; // Cada ~3 a 4 segundos
        sounds.playSpit();
        const spitAngle = Math.atan2(dy, dx);
        acidProjectiles.push(new AcidProjectile(
          this.x, this.y,
          Math.cos(spitAngle) * 6.5,
          Math.sin(spitAngle) * 6.5,
          600,
          this.magicalDamage * 1.5,
          this.grievousValue
        ));
      }
    }

    let currentSpeed = this.speed;
    const totalRemaining = (totalZombiesToSpawn - zombiesSpawnedSoFar) + zombies.length;
    if (totalRemaining <= 15) {
      const speedFactor = 1 + (0.05 + ((15 - totalRemaining) / 15) * 0.10);
      currentSpeed *= speedFactor;
    }

    let moveVx = (dx / (dist || 1)) * currentSpeed;
    let moveVy = (dy / (dist || 1)) * currentSpeed;

    let collidingObs = null;
    for (let obs of obstacles) {
      const nextDist = Math.hypot(obs.x - (this.x + moveVx), obs.y - (this.y + moveVy));
      if (nextDist < obs.radius + this.radius) {
        collidingObs = obs;
        break;
      }
    }

    if (collidingObs) {
      if (this.attackCooldown <= 0) {
        this.attackCooldown = 10;
        const terrainDmg = 120 + (wave * 10);
        collidingObs.hp -= terrainDmg;
        damageTexts.push(new DamageText(collidingObs.x, collidingObs.y, `${Math.round(terrainDmg)}`, true, '#ff5500'));
      }
      const oDx = this.x - collidingObs.x;
      const oDy = this.y - collidingObs.y;
      const oDist = Math.hypot(oDx, oDy) || 1;
      this.x += (oDx / oDist) * 2.0;
      this.y += (oDy / oDist) * 2.0;
    } else {
      this.x += moveVx;
      this.y += moveVy;
    }

    // Repulsión ligera entre zombies
    for (let other of zombies) {
      if (other === this) continue;
      const zDist = Math.hypot(this.x - other.x, this.y - other.y);
      const minDist = this.radius + other.radius;
      if (zDist < minDist && zDist > 0) {
        const overlap = minDist - zDist;
        this.x += ((this.x - other.x) / zDist) * (overlap * 0.08);
        this.y += ((this.y - other.y) / zDist) * (overlap * 0.08);
      }
    }

    if (this.attackCooldown > 0) this.attackCooldown--;

    this.growlTimer--;
    if (this.growlTimer <= 0) {
      if (dist < 400) sounds.playZombieGrowl();
      this.growlTimer = Math.random() * 300 + 150;
    }
  }

  draw() {
    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;
    if (screenX < -50 || screenX > canvas.width + 50 || screenY < -50 || screenY > canvas.height + 50) return;

    const distanceToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
    const biteStart = 220;
    const biteFull = 70;
    const proximity = Math.max(0, Math.min(1, (biteStart - distanceToPlayer) / (biteStart - biteFull)));
    const jawPulse = 0.5 + 0.5 * Math.sin((Date.now() * 0.008) + this.faceSeed);
    const mouthOpen = Math.min(1, proximity * (0.88 + jawPulse * 0.12));

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(Math.atan2(player.y - this.y, player.x - this.x));

    const skin = this.frozenTimer > 0 ? '#00e5ff' : this.color;
    const dark = this.frozenTimer > 0 ? '#007f91' : '#211a1a';
    const light = this.frozenTimer > 0 ? '#8ff6ff' : '#c5b5aa';
    const faceR = this.radius;

    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.arc(0, 2, faceR + 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath(); ctx.arc(0, 0, faceR, 0, Math.PI * 2); ctx.fill();

    if (this.type === 'normal') {
      ctx.fillStyle = '#4a3030';
      ctx.beginPath(); ctx.arc(-faceR * 0.62, faceR * 0.34, faceR * 0.18, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#382323'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-faceR * 0.76, -faceR * 0.48); ctx.lineTo(-faceR * 0.35, -faceR * 0.66); ctx.stroke();
    } else if (this.type === 'runner') {
      ctx.strokeStyle = '#521616'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-faceR * 0.80, -faceR * 0.52); ctx.lineTo(-faceR * 0.30, -faceR * 0.82); ctx.stroke();
      ctx.fillStyle = '#6e2424';
      ctx.beginPath(); ctx.arc(faceR * 0.62, faceR * 0.52, faceR * 0.13, 0, Math.PI * 2); ctx.fill();
    } else if (this.type === 'tank') {
      ctx.strokeStyle = '#292323'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, faceR + 1, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#3b3030';
      ctx.beginPath(); ctx.arc(-faceR * 0.58, faceR * 0.48, faceR * 0.19, 0, Math.PI * 2); ctx.fill();
    } else if (this.type === 'spitter') {
      ctx.fillStyle = '#9acd32';
      ctx.beginPath(); ctx.arc(faceR * 0.56, faceR * 0.42, faceR * 0.14, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = '#120e0e';
    ctx.beginPath(); ctx.ellipse(-faceR * 0.34, -faceR * 0.23, faceR * 0.23, faceR * 0.17, -0.15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(faceR * 0.34, -faceR * 0.23, faceR * 0.23, faceR * 0.17, 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = this.frozenTimer > 0 ? '#ffffff' : (this.type === 'spitter' ? '#d8ff86' : '#d6d6d6');
    ctx.beginPath(); ctx.arc(-faceR * 0.34, -faceR * 0.23, Math.max(1.5, faceR * 0.075), 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(faceR * 0.34, -faceR * 0.23, Math.max(1.5, faceR * 0.075), 0, Math.PI * 2); ctx.fill();

    const mouthY = faceR * 0.42;
    const mouthWidth = faceR * (0.72 + proximity * 0.08);
    const mouthHeight = faceR * (0.10 + mouthOpen * 0.48);
    ctx.fillStyle = '#160b0b';
    ctx.beginPath();
    ctx.ellipse(0, mouthY + mouthOpen * faceR * 0.12, mouthWidth, Math.max(1.4, mouthHeight), 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.type === 'spitter') {
      ctx.fillStyle = '#39ff14';
      ctx.beginPath();
      ctx.arc(0, mouthY + mouthHeight * 0.4, 2 + mouthOpen * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Barra de Vida
    const barWidth = Math.max(26, this.radius * 1.65);
    const barHeight = 4;
    const barX = screenX - barWidth / 2;
    const barY = screenY - this.radius - 10;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
    const hpPercent = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = hpPercent > 0.5 ? '#2ecc71' : '#e74c3c';
    ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
  }
}

// ============================================================================
// PROYECTIL DE ÁCIDO DEL SPITTER Y CHARCOS TÓXICOS
// ============================================================================
class AcidProjectile {
  constructor(x, y, vx, vy, maxDist, damage, grievous) {
    this.x = x; this.y = y;
    this.startX = x; this.startY = y;
    this.vx = vx; this.vy = vy;
    this.maxDist = maxDist;
    this.damage = damage;
    this.grievous = grievous;
    this.radius = 6;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    if (Math.random() < 0.4) {
      particles.push(new GenericParticle(this.x, this.y, '#39ff14', 2.5, 15));
    }
  }

  draw() {
    const sx = this.x - camera.x;
    const sy = this.y - camera.y;
    ctx.save();
    ctx.fillStyle = '#39ff14';
    ctx.shadowColor = '#39ff14';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class AcidPuddle {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.radius = 24;
    this.life = 180; // 3 segundos
    this.maxLife = 180;
  }
  update() { this.life--; }
  draw() {
    const sx = this.x - camera.x;
    const sy = this.y - camera.y;
    ctx.save();
    ctx.globalAlpha = Math.max(0, (this.life / this.maxLife) * 0.75);
    ctx.fillStyle = '#39ff14';
    ctx.beginPath();
    ctx.arc(sx, sy, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#28b40e';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

// ============================================================================
// SISTEMA DE PARTÍCULAS Y EFECTOS
// ============================================================================
class GenericParticle {
  constructor(x, y, color, radius, life) {
    this.x = x; this.y = y;
    this.color = color;
    this.radius = radius;
    this.life = life;
    this.maxLife = life;
    this.vx = (Math.random() - 0.5) * 3;
    this.vy = (Math.random() - 0.5) * 3;
  }
  update() {
    this.x += this.vx; this.y += this.vy;
    this.life--;
  }
  draw() {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x - camera.x, this.y - camera.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function spawnFlameParticles(x, y, count = 3) {
  for (let i = 0; i < count; i++) {
    const colors = ['#ff3300', '#ff9900', '#ffcc00'];
    particles.push(new GenericParticle(x, y, colors[Math.floor(Math.random() * colors.length)], 3, 20));
  }
}

class FleshBit {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = (Math.random() - 0.5) * 4;
    this.radius = Math.random() * 2.5 + 1.5;
    this.life = Math.random() * 20 + 10;
    this.maxLife = this.life;
  }
  update() { this.x += this.vx; this.y += this.vy; this.life--; }
  draw() {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
    ctx.fillStyle = '#a80001';
    ctx.beginPath();
    ctx.arc(this.x - camera.x, this.y - camera.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class BloodSplatter {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.radius = Math.random() * 7 + 5;
    this.life = 140;
    this.maxLife = this.life;
  }
  update() { this.life--; }
  draw() {
    ctx.save();
    ctx.globalAlpha = Math.max(0, (this.life / this.maxLife) * 0.6);
    ctx.fillStyle = '#a80001';
    ctx.beginPath();
    ctx.arc(this.x - camera.x, this.y - camera.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Obstacle {
  constructor(x, y, type) {
    this.x = x; this.y = y; this.type = type;
    const waveScale = 1 + (wave - 1) * 0.0005;
    if (type === 'tree') {
      this.radius = 22;
      this.maxHp = 400 * waveScale;
      this.armor = 20 * waveScale;
      this.mr = 20 * waveScale;
      this.color = '#2d4d2d';
    } else {
      this.radius = 28;
      this.maxHp = 700 * waveScale;
      this.armor = 40 * waveScale;
      this.mr = 40 * waveScale;
      this.color = '#555566';
    }
    this.hp = this.maxHp;
  }

  draw() {
    const screenX = this.x - camera.x;
    const screenY = this.y - camera.y;
    if (screenX < -50 || screenX > canvas.width + 50 || screenY < -50 || screenY > canvas.height + 50) return;

    ctx.save();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = this.type === 'tree' ? '#1e331e' : '#333344';
    ctx.lineWidth = 3;
    ctx.stroke();

    if (this.hp < this.maxHp) {
      const barW = this.radius * 1.5;
      const barH = 4;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(screenX - barW / 2, screenY - this.radius - 8, barW, barH);
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(screenX - barW / 2, screenY - this.radius - 8, barW * (this.hp / this.maxHp), barH);
    }
    ctx.restore();
  }
}

class XPOrb {
  constructor(x, y, value) {
    this.x = x; this.y = y; this.value = value; this.radius = 5;
  }
  draw() {
    ctx.save();
    ctx.fillStyle = '#33ccff';
    ctx.shadowColor = '#33ccff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(this.x - camera.x, this.y - camera.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class DamageText {
  constructor(x, y, text, isCrit, color = '#ffffff') {
    this.x = x; this.y = y; this.text = text; this.isCrit = isCrit;
    this.color = isCrit ? '#ff3333' : color;
    this.life = 30; this.vy = -1.2;
  }
  update() { this.y += this.vy; this.life--; }
  draw() {
    ctx.save();
    ctx.font = this.isCrit ? 'bold 17px sans-serif' : 'bold 12px sans-serif';
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, this.x - camera.x, this.y - camera.y);
    ctx.restore();
  }
}

// ============================================================================
// VARIABLES DE ESTADO DEL JUEGO
// ============================================================================
let selectedHero = HEROES[0];
let selectedWeapon = WEAPONS[0];
let player = new Player(MAP_SIZE / 2, MAP_SIZE / 2, selectedHero);

let bullets = [], zombies = [], xpOrbs = [], damageTexts = [], obstacles = [];
let fleshBits = [], bloodSplatters = [], acidProjectiles = [], acidPuddles = [], particles = [];

let wave = 1, kills = 0;
let isGameRunning = false, isPaused = false;
let totalZombiesToSpawn = 0, zombiesSpawnedSoFar = 0;
let shootCooldown = 0;
let acquiredAugmentsList = [];
let biteFlashTimer = 0;
let screenShakeTimer = 0;
let smgBarrelSide = 1;

let autoAimEnabled = true;
let isMouseAiming = false;
let mousePos = { x: 0, y: 0 };

const camera = { x: 0, y: 0 };
const keys = {};
const joystick = { active: false, x: 0, y: 0 };
const aimJoystick = { active: false, x: 0, y: 0 };

// ============================================================================
// INICIALIZACIÓN Y GENERACIÓN DE ENTORNO
// ============================================================================
function initTerrain() {
  obstacles = [];
  for (let i = 0; i < 220; i++) {
    const type = Math.random() < 0.6 ? 'tree' : 'rock';
    obstacles.push(new Obstacle(
      Math.random() * (MAP_SIZE - 400) + 200,
      Math.random() * (MAP_SIZE - 400) + 200,
      type
    ));
  }
}
initTerrain();
initBloodPuddles();

function respawnObstacle(type) {
  let bestX = Math.random() * (MAP_SIZE - 400) + 200;
  let bestY = Math.random() * (MAP_SIZE - 400) + 200;
  let maxMinDist = 0;
  for (let attempt = 0; attempt < 6; attempt++) {
    const candX = Math.random() * (MAP_SIZE - 400) + 200;
    const candY = Math.random() * (MAP_SIZE - 400) + 200;
    let minDist = Infinity;
    for (let o of obstacles) {
      const d = Math.hypot(o.x - candX, o.y - candY);
      if (d < minDist) minDist = d;
    }
    if (minDist > maxMinDist) {
      maxMinDist = minDist;
      bestX = candX;
      bestY = candY;
    }
  }
  obstacles.push(new Obstacle(bestX, bestY, type));
}

function showScreen(screenId) {
  sounds.init();
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  if (screenId) document.getElementById(screenId).classList.remove('hidden');

  if (screenId === 'heroMenu') renderHeroMenu();
  if (screenId === 'weaponMenu') renderWeaponMenu();
  if (screenId === 'codexMenu') renderCodexMenu();
}

function renderHeroMenu() {
  const grid = document.getElementById('heroGrid');
  grid.innerHTML = '';
  HEROES.forEach(h => {
    const card = document.createElement('div');
    card.className = `card ${selectedHero.id === h.id ? 'selected' : ''}`;
    card.innerHTML = `<div><h3>${h.name}</h3></div><p>${h.desc}</p>`;
    card.onclick = () => { selectedHero = h; renderHeroMenu(); };
    grid.appendChild(card);
  });
}

function renderWeaponMenu() {
  const grid = document.getElementById('weaponGrid');
  grid.innerHTML = '';
  WEAPONS.forEach(w => {
    const card = document.createElement('div');
    const typeClass = w.type === 'physical' ? 'type-physical' : 'type-magical';
    card.className = `card ${typeClass} ${selectedWeapon.id === w.id ? 'selected' : ''}`;
    card.innerHTML = `
      <div>
        <h3>${w.name}</h3>
        <p style="font-weight:bold; color: ${w.type === 'physical' ? '#E88538' : '#c084fc'};">
          ${w.type === 'physical' ? 'Daño Físico' : 'Poder Mágico'}: +${w.damage}
        </p>
        <p style="color: #00ffcc; font-size: 0.8rem; margin-top:2px;">Alcance: ${w.baseRange}px</p>
      </div>
      <p>${w.description}</p>
    `;
    card.onclick = () => { selectedWeapon = w; renderWeaponMenu(); };
    grid.appendChild(card);
  });
}

function getClassByRarity(rarity) {
  if (rarity === 'Común') return 'rarity-comun';
  if (rarity === 'Raro') return 'rarity-raro';
  if (rarity === 'Épico') return 'rarity-epico';
  if (rarity === 'Legendario') return 'rarity-legendario';
  if (rarity === 'Infinito') return 'rarity-infinito';
  return 'rarity-comun';
}

function renderCodexMenu() {
  const list = document.getElementById('codexList');
  list.innerHTML = '';
  
  // Título Aumentos Únicos
  const hUnique = document.createElement('div');
  hUnique.innerHTML = '<h3 style="color:#00ffcc; margin: 8px 0 4px 0; text-align:left;">90 AUMENTOS ÚNICOS</h3>';
  list.appendChild(hUnique);

  AUGMENTS_DATABASE.forEach(a => {
    const item = document.createElement('div');
    const rClass = getClassByRarity(a.rarity);
    item.className = `codex-item ${rClass}`;
    item.innerHTML = `<span><strong>${a.name}</strong> (${a.rarity})</span><small style="color:#ccc;">${a.desc}</small>`;
    list.appendChild(item);
  });

  // Título Aumentos Infinitos
  const hInf = document.createElement('div');
  hInf.innerHTML = '<h3 style="color:#00ffcc; margin: 16px 0 4px 0; text-align:left;">10 AUMENTOS INFINITOS (POST-COMPLECIÓN)</h3>';
  list.appendChild(hInf);

  INFINITE_AUGMENTS_DATABASE.forEach(a => {
    const item = document.createElement('div');
    item.className = `codex-item rarity-infinito`;
    item.innerHTML = `<span><strong>${a.name}</strong> (Infinito)</span><small style="color:#ccc;">${a.desc}</small>`;
    list.appendChild(item);
  });
}

function startGame() {
  sounds.init();
  showScreen('');
  player = new Player(MAP_SIZE / 2, MAP_SIZE / 2, selectedHero);

  if (selectedWeapon.type === 'physical') {
    player.ad += selectedWeapon.damage;
  } else {
    player.ap += selectedWeapon.damage;
  }

  bullets = []; zombies = []; xpOrbs = []; damageTexts = [];
  fleshBits = []; bloodSplatters = []; acidProjectiles = []; acidPuddles = []; particles = [];
  
  wave = 1; kills = 0; acquiredAugmentsList = []; biteFlashTimer = 0; screenShakeTimer = 0;
  initTerrain();
  initBloodPuddles();
  startWave();
  isGameRunning = true;
  isPaused = false;
  requestAnimationFrame(gameLoop);
}

function gameOver() {
  isGameRunning = false;
  document.getElementById('gameOverStats').innerHTML = `Llegaste a la <strong>Oleada ${wave}</strong><br>Eliminaste <strong>${kills} Zombies</strong>`;
  showScreen('gameOverMenu');
}

function startWave() {
  totalZombiesToSpawn = 60 + (wave - 1) * 25;
  zombiesSpawnedSoFar = 0;
}

// SPAWNING MEJORADO: Genera zombies en un anillo cercano alrededor de la pantalla
function spawnZombieNearPlayer() {
  if (zombiesSpawnedSoFar >= totalZombiesToSpawn) return;

  const angle = Math.random() * Math.PI * 2;
  const spawnDist = Math.max(canvas.width, canvas.height) * 0.55 + 80 + Math.random() * 120;
  
  const zX = Math.max(100, Math.min(MAP_SIZE - 100, player.x + Math.cos(angle) * spawnDist));
  const zY = Math.max(100, Math.min(MAP_SIZE - 100, player.y + Math.sin(angle) * spawnDist));

  const types = ['normal', 'normal', 'runner', 'tank', 'spitter'];
  const type = types[Math.floor(Math.random() * types.length)];

  zombies.push(new Zombie(zX, zY, type));
  zombiesSpawnedSoFar++;
}

// ============================================================================
// SISTEMA DE DISPARO E IDENTIDAD VISUAL DE ARMAS
// ============================================================================
function shoot() {
  sounds.playShoot(selectedWeapon.id);
  const count = 1 + player.extraBullets + (selectedWeapon.pellets || 0);

  let baseDmg = selectedWeapon.damage;
  if (selectedWeapon.type === 'physical') {
    baseDmg *= (player.ad / 10);
  } else {
    baseDmg *= (player.ap / 10);
  }

  const maxDistance = selectedWeapon.baseRange * player.rangeMultiplier;
  
  for (let i = 0; i < count; i++) {
    let spread = (i - (count - 1) / 2) * 0.12;
    if (selectedWeapon.id === 'shotgun') spread = (i - (count - 1) / 2) * 0.16;

    const finalAngle = player.angle + spread;
    const isCrit = (Math.random() * 100) < player.critChance;
    const finalDamage = isCrit ? baseDmg * (1 + player.critDamage / 100) : baseDmg;

    let originX = player.x;
    let originY = player.y;

    // Subfusil dual: Disparos alternados entre cañón izquierdo y derecho
    if (selectedWeapon.id === 'smg') {
      smgBarrelSide = -smgBarrelSide;
      originX += Math.cos(player.angle + Math.PI / 2) * 6 * smgBarrelSide;
      originY += Math.sin(player.angle + Math.PI / 2) * 6 * smgBarrelSide;
    }

    bullets.push({
      id: Math.random(),
      weaponId: selectedWeapon.id,
      x: originX, y: originY,
      startX: originX, startY: originY,
      vx: Math.cos(finalAngle) * selectedWeapon.speed,
      vy: Math.sin(finalAngle) * selectedWeapon.speed,
      damage: finalDamage,
      oppositeDamage: finalDamage * 0.001,
      isCrit: isCrit,
      pierce: (selectedWeapon.pierce || 1) + player.extraPierce,
      maxDist: maxDistance,
      radius: selectedWeapon.id === 'fireball' ? 7 : (selectedWeapon.id === 'sniper' ? 5 : 4),
      type: selectedWeapon.type,
      hitEntities: new Set() // Previene daño repetido en proyectiles penetrantes
    });
  }

  if (selectedWeapon.id === 'sniper' || selectedWeapon.id === 'shotgun') {
    screenShakeTimer = 4;
  }
}

// ============================================================================
// BUCLE PRINCIPAL Y ACTUALIZACIÓN (BUGS DE ARRAYS CORREGIDOS)
// ============================================================================
function gameLoop() {
  if (!isGameRunning) return;
  if (!isPaused) {
    update();
    draw();
  }
  if (isGameRunning) {
    requestAnimationFrame(gameLoop);
  }
}

function update() {
  player.update(keys, joystick, aimJoystick);
  
  camera.x = player.x - canvas.width / 2;
  camera.y = player.y - canvas.height / 2;

  if (screenShakeTimer > 0) {
    camera.x += (Math.random() - 0.5) * 6;
    camera.y += (Math.random() - 0.5) * 6;
    screenShakeTimer--;
  }

  if (Math.random() < 0.25) spawnZombieNearPlayer();

  shootCooldown--;
  if (shootCooldown <= 0) {
    shoot();
    shootCooldown = Math.max(4, selectedWeapon.fireRate / player.attackSpeed);
  }

  // 1. ACTUALIZACIÓN SEGURA DE BALAS (Iteración Inversa)
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx;
    b.y += b.vy;

    const distTraveled = Math.hypot(b.x - b.startX, b.y - b.startY);
    if (distTraveled >= b.maxDist) {
      bullets.splice(i, 1);
      continue;
    }

    // Colisión con Obstáculos
    let hitObstacle = false;
    for (let obs of obstacles) {
      if (Math.hypot(obs.x - b.x, obs.y - b.y) < obs.radius + b.radius) {
        const effArmor = Math.max(0, obs.armor * (1 - player.physPen / 100));
        const effMr = Math.max(0, obs.mr * (1 - player.magPen / 100));
        const mainRes = b.type === 'physical' ? effArmor : effMr;
        const mainDmg = b.damage * (100 / (100 + mainRes));

        obs.hp -= mainDmg;
        damageTexts.push(new DamageText(obs.x, obs.y, `${Math.round(mainDmg)}`, b.isCrit, '#cccccc'));
        hitObstacle = true;
        break;
      }
    }
    if (hitObstacle) {
      bullets.splice(i, 1);
      continue;
    }

    // Colisión con Zombies
    for (let z of zombies) {
      if (b.hitEntities.has(z)) continue; // Evita multihits por pierce en frames consecutivos

      if (Math.hypot(z.x - b.x, z.y - b.y) < z.radius + b.radius) {
        b.hitEntities.add(z);

        const effArmor = Math.max(0, z.armor * (1 - player.physPen / 100));
        const effMr = Math.max(0, z.mr * (1 - player.magPen / 100));
        const mainRes = b.type === 'physical' ? effArmor : effMr;
        const mainDmg = b.damage * (100 / (100 + mainRes));

        z.hp -= mainDmg;

        // Partículas y Sangre
        for (let k = 0; k < 2; k++) fleshBits.push(new FleshBit(b.x, b.y));
        if (Math.random() < 0.35) bloodSplatters.push(new BloodSplatter(b.x, b.y));
        
        const dmgColor = b.type === 'physical' ? '#ff9900' : '#c084fc';
        damageTexts.push(new DamageText(z.x, z.y, Math.round(mainDmg), b.isCrit, dmgColor));

        // Curación / Robo de Vida
        let healAmount = 0;
        if (b.type === 'physical' && player.lifeSteal > 0) healAmount += mainDmg * (player.lifeSteal / 100);
        if (b.type === 'magical' && player.spellVamp > 0) healAmount += mainDmg * (player.spellVamp / 100);
        if (player.omnivamp > 0) healAmount += mainDmg * (player.omnivamp / 100);

        if (healAmount > 0) {
          healAmount *= (1 - player.grievousPercent);
          healAmount *= (1 + player.healPower / 100);
          player.hp = Math.min(player.maxHp, player.hp + healAmount);
          damageTexts.push(new DamageText(player.x, player.y, `+${Math.round(healAmount)}`, false, '#2ecc71'));
        }

        // Fuego / Piroclasto
        if (player.burnAura && b.type === 'magical') {
          z.burnTimer = 90;
          z.burnDps = Math.max(2, player.ap * 0.35);
        }

        // Explosión de Báculo de Fuego en Área
        if (b.weaponId === 'fireball') {
          sounds.playExplosion();
          screenShakeTimer = 3;
          spawnFlameParticles(b.x, b.y, 8);
          zombies.forEach(otherZ => {
            if (otherZ !== z && Math.hypot(otherZ.x - b.x, otherZ.y - b.y) < 75) {
              const aoeDmg = mainDmg * 0.7;
              otherZ.hp -= aoeDmg;
              damageTexts.push(new DamageText(otherZ.x, otherZ.y, Math.round(aoeDmg), false, '#ff5500'));
            }
          });
        }

        // Congelación / Cero Absoluto (Congelación en área)
        if (Math.random() * 100 < player.freezeChance * 100) {
          z.frozenTimer = 120;
          zombies.forEach(otherZ => {
            if (Math.hypot(otherZ.x - z.x, otherZ.y - z.y) < 110) {
              otherZ.frozenTimer = 120;
            }
          });
        }

        b.pierce--;
        if (b.pierce <= 0) {
          bullets.splice(i, 1);
          break;
        }
      }
    }
  }

  // 2. ACTUALIZACIÓN DE PROYECTILES DE ÁCIDO (Iteración Inversa)
  for (let i = acidProjectiles.length - 1; i >= 0; i--) {
    const ap = acidProjectiles[i];
    ap.update();

    // Colisión con el Jugador
    if (Math.hypot(player.x - ap.x, player.y - ap.y) < player.radius + ap.radius) {
      if (player.shieldActive) {
        player.shieldActive = false;
        sounds.playShieldDeflect();
        damageTexts.push(new DamageText(player.x, player.y, '¡ESCUDO!', true, '#00ffff'));
      } else {
        const effMr = Math.max(0, player.mr);
        const netDmg = Math.max(1, ap.damage * (100 / (100 + effMr)));
        player.hp -= netDmg;
        sounds.playPlayerHit();
        biteFlashTimer = 12;
        screenShakeTimer = 4;
        player.grievousTimer = 180;
        player.grievousPercent = Math.min(0.50, player.grievousPercent + ap.grievous);
        damageTexts.push(new DamageText(player.x, player.y, `-${Math.round(netDmg)}`, false, '#39ff14'));
        if (player.hp <= 0) {
          player.hp = 0;
          gameOver();
          return;
        }
      }
      acidPuddles.push(new AcidPuddle(ap.x, ap.y));
      acidProjectiles.splice(i, 1);
      continue;
    }

    // Fin de alcance
    if (Math.hypot(ap.x - ap.startX, ap.y - ap.startY) >= ap.maxDist) {
      acidPuddles.push(new AcidPuddle(ap.x, ap.y));
      acidProjectiles.splice(i, 1);
    }
  }

  // 3. ACTUALIZACIÓN DE CHARCOS DE ÁCIDO
  for (let i = acidPuddles.length - 1; i >= 0; i--) {
    const puddle = acidPuddles[i];
    puddle.update();
    if (Math.hypot(player.x - puddle.x, player.y - puddle.y) < player.radius + puddle.radius) {
      if (puddle.life % 20 === 0) {
        const effMr = Math.max(0, player.mr);
        const puddleDmg = Math.max(1, 4 * (100 / (100 + effMr)));
        player.hp -= puddleDmg;
        damageTexts.push(new DamageText(player.x, player.y, `-${Math.round(puddleDmg)}`, false, '#39ff14'));
        if (player.hp <= 0) {
          player.hp = 0;
          gameOver();
          return;
        }
      }
    }
    if (puddle.life <= 0) acidPuddles.splice(i, 1);
  }

  // 4. ACTUALIZACIÓN DE OBSTÁCULOS
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    if (obs.hp <= 0) {
      const type = obs.type;
      obstacles.splice(i, 1);
      respawnObstacle(type);
    }
  }

  // 5. ACTUALIZACIÓN DE ZOMBIES (Iteración Inversa)
  for (let i = zombies.length - 1; i >= 0; i--) {
    const z = zombies[i];
    z.update(player);

    if (z.hp <= 0 && !z.deadProcessed) {
      z.deadProcessed = true;
      kills++;
      xpOrbs.push(new XPOrb(z.x, z.y, z.xpValue * player.xpMultiplier));
      zombies.splice(i, 1);
      continue;
    }

    // Ataque cuerpo a cuerpo al jugador
    if (Math.hypot(player.x - z.x, player.y - z.y) < player.radius + z.radius) {
      if (player.shieldActive) {
        player.shieldActive = false;
        sounds.playShieldDeflect();
        damageTexts.push(new DamageText(player.x, player.y, '¡ESCUDO!', true, '#00ffff'));
      } else {
        const effectiveDodge = Math.min(0.40, player.dodgeChance);
        if (z.attackCooldown <= 0 && Math.random() > effectiveDodge) {
          const effArmor = Math.max(0, player.armor);
          const effMr = Math.max(0, player.mr);
          const physDmg = (z.physicalDamage * 0.5) * (100 / (100 + effArmor));
          const magDmg = (z.magicalDamage * 0.5) * (100 / (100 + effMr));
          const netDamage = Math.max(1, physDmg + magDmg);

          z.attackCooldown = Math.max(1, Math.round(60 / z.attackSpeed));
          player.hp -= netDamage;
          sounds.playPlayerHit();
          biteFlashTimer = 12;
          screenShakeTimer = 4;

          player.grievousTimer = 150;
          player.grievousPercent = Math.min(0.50, player.grievousPercent + z.grievousValue);

          if (player.thornsDamage > 0) {
            z.hp -= player.thornsDamage;
            damageTexts.push(new DamageText(z.x, z.y, `${player.thornsDamage}`, false, '#f4c28f'));
          }

          if (player.hp <= 0) {
            player.hp = 0;
            gameOver();
            return;
          }
        } else if (z.attackCooldown <= 0) {
          damageTexts.push(new DamageText(player.x, player.y, '¡ESQUIVADO!', true, '#7ee8fa'));
          z.attackCooldown = 30;
        }
      }
    }
  }

  // 6. ACTUALIZACIÓN DE ORBES DE XP
  for (let i = xpOrbs.length - 1; i >= 0; i--) {
    const orb = xpOrbs[i];
    const dist = Math.hypot(player.x - orb.x, player.y - orb.y);
    if (dist < player.pickupRadius || player.globalPickup) {
      orb.x += (player.x - orb.x) * 0.18;
      orb.y += (player.y - orb.y) * 0.18;
      if (dist < player.radius) {
        sounds.playXp();
        player.xp += orb.value;
        xpOrbs.splice(i, 1);

        if (player.xp >= player.nextLevelXp) {
          player.level++;
          player.xp -= player.nextLevelXp;
          player.nextLevelXp = Math.round(player.nextLevelXp * 1.35);
          triggerLevelUp();
        }
      }
    }
  }

  if (zombiesSpawnedSoFar >= totalZombiesToSpawn && zombies.length === 0) {
    wave++;
    startWave();
  }

  // Partículas y Textos de Daño
  for (let i = damageTexts.length - 1; i >= 0; i--) {
    damageTexts[i].update();
    if (damageTexts[i].life <= 0) damageTexts.splice(i, 1);
  }
  for (let i = fleshBits.length - 1; i >= 0; i--) {
    fleshBits[i].update();
    if (fleshBits[i].life <= 0) fleshBits.splice(i, 1);
  }
  for (let i = bloodSplatters.length - 1; i >= 0; i--) {
    bloodSplatters[i].update();
    if (bloodSplatters[i].life <= 0) bloodSplatters.splice(i, 1);
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    if (particles[i].life <= 0) particles.splice(i, 1);
  }

  if (biteFlashTimer > 0) biteFlashTimer--;
}

// ============================================================================
// SISTEMA DE RENDERIZADO VISUAL
// ============================================================================
function draw() {
  ctx.fillStyle = '#F1E9E1';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Cuadrícula y Terreno Pastel
  const tileSize = GRID_SIZE;
  const startTX = Math.floor(camera.x / tileSize) - 1;
  const endTX = Math.ceil((camera.x + canvas.width) / tileSize) + 1;
  const startTY = Math.floor(camera.y / tileSize) - 1;
  const endTY = Math.ceil((camera.y + canvas.height) / tileSize) + 1;

  for (let ty = startTY; ty < endTY; ty++) {
    for (let tx = startTX; tx < endTX; tx++) {
      if (tx < 0 || ty < 0 || tx * tileSize >= MAP_SIZE || ty * tileSize >= MAP_SIZE) continue;
      const idx = hashTile(tx, ty);
      ctx.fillStyle = TERRAIN_COLORS[idx];
      ctx.fillRect(tx * tileSize - camera.x, ty * tileSize - camera.y, tileSize, tileSize);
    }
  }

  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.9;
  const startX = -camera.x % tileSize;
  const startY = -camera.y % tileSize;
  ctx.beginPath();
  for (let x = startX; x < canvas.width; x += tileSize) {
    ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, canvas.height);
  }
  for (let y = startY; y < canvas.height; y += tileSize) {
    ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(canvas.width, Math.round(y) + 0.5);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Dibujar Charcos de Sangre y Ácido
  for (let puddle of bloodPuddles) drawBloodPuddle(puddle);
  for (let ap of acidPuddles) ap.draw();
  for (let bs of bloodSplatters) bs.draw();
  for (let obs of obstacles) obs.draw();
  for (let orb of xpOrbs) orb.draw();
  for (let fb of fleshBits) fb.draw();
  for (let p of particles) p.draw();

  // DIBUJO PERSONALIZADO DE BALAS SEGÚN EL ARMA (GAME FEEL)
  bullets.forEach(b => {
    ctx.save();
    const sx = b.x - camera.x;
    const sy = b.y - camera.y;
    ctx.translate(sx, sy);
    ctx.rotate(Math.atan2(b.vy, b.vx));

    if (b.weaponId === 'sniper') {
      // Rayo cinético blanco-celeste alargado
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00ffff'; ctx.shadowBlur = 10;
      ctx.fillRect(-14, -2.5, 28, 5);
    } else if (b.weaponId === 'shotgun') {
      // Perdigón naranja ardiente
      ctx.fillStyle = '#ff6600';
      ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill();
    } else if (b.weaponId === 'rifle') {
      // Bala dorada rápida
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(-7, -2, 14, 4);
    } else if (b.weaponId === 'smg') {
      // Chispa amarilla viva
      ctx.fillStyle = '#ffee33';
      ctx.fillRect(-4, -1.5, 8, 3);
    } else if (b.weaponId === 'wand') {
      // Estrella arcana de 4 puntas
      ctx.fillStyle = '#e879f9';
      ctx.shadowColor = '#e879f9'; ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(0, -6); ctx.lineTo(2, -2); ctx.lineTo(6, 0); ctx.lineTo(2, 2);
      ctx.lineTo(0, 6); ctx.lineTo(-2, 2); ctx.lineTo(-6, 0); ctx.lineTo(-2, -2);
      ctx.closePath(); ctx.fill();
    } else if (b.weaponId === 'fireball') {
      // Esfera ígnea con halo de fuego
      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 8);
      grad.addColorStop(0, '#ffff88');
      grad.addColorStop(0.6, '#ff4400');
      grad.addColorStop(1, 'rgba(255, 68, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
    } else if (b.weaponId === 'plasma') {
      // Esfera de plasma con anillo oscilante
      ctx.fillStyle = '#00e5ff';
      ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (b.weaponId === 'void') {
      // Vórtice del vacío morado oscuro
      ctx.fillStyle = '#7c3aed';
      ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, Math.PI * 2); ctx.fill();
    } else if (b.weaponId === 'laser') {
      // Láser brillante cian/eléctrico
      ctx.fillStyle = '#38bdf8';
      ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 10;
      ctx.fillRect(-16, -2, 32, 4);
    } else {
      // Pistola básica
      ctx.fillStyle = '#ff9900';
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  });

  for (let ap of acidProjectiles) ap.draw();
  for (let z of zombies) z.draw();
  player.draw();
  for (let dt of damageTexts) dt.draw();

  // Destello rojo de daño al jugador
  if (biteFlashTimer > 0) {
    ctx.save();
    const alpha = (biteFlashTimer / 12) * 0.65;
    const grad = ctx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.2,
      canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.7
    );
    grad.addColorStop(0, 'rgba(180, 0, 0, 0)');
    grad.addColorStop(1, `rgba(180, 0, 0, ${alpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  drawHUD();
  drawGrievousWoundsIcon();
  drawMinimap();
  drawCrosshair();
}

// ============================================================================
// RETÍCULA / CROSSHAIR PARA PC
// ============================================================================
function drawCrosshair() {
  if (!isGameRunning || isPaused || joystick.active) return;
  const cx = mousePos.x;
  const cy = mousePos.y;
  ctx.save();
  ctx.strokeStyle = '#00ffcc';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.moveTo(cx - 14, cy); ctx.lineTo(cx - 10, cy);
  ctx.moveTo(cx + 10, cy); ctx.lineTo(cx + 14, cy);
  ctx.moveTo(cx, cy - 14); ctx.lineTo(cx, cy - 10);
  ctx.moveTo(cx, cy + 10); ctx.lineTo(cx, cy + 14);
  ctx.stroke();
  ctx.restore();
}

// ============================================================================
// INDICADOR DE HERIDAS GRAVES (ESTILO RESIDENT EVIL / T-VIRUS)
// ============================================================================
function drawGrievousWoundsIcon() {
  if (player.grievousTimer <= 0) return;

  const centerX = canvas.width / 2;
  const centerY = 45;
  const radius = 22;

  ctx.save();
  ctx.translate(centerX, centerY);

  const time = Date.now() * 0.008;
  const pulse = Math.sin(time) * 1.5;

  ctx.fillStyle = '#050303';
  ctx.beginPath(); ctx.arc(0, 0, radius + 4, 0, Math.PI * 2); ctx.fill();
  
  ctx.strokeStyle = '#ff0000'; 
  ctx.lineWidth = 2.5; 
  ctx.stroke();

  const fleshGrad = ctx.createRadialGradient(0, -4, 2, 0, 2, radius);
  fleshGrad.addColorStop(0, '#5a4d41');
  fleshGrad.addColorStop(0.5, '#3b2f2f');
  fleshGrad.addColorStop(1, '#110808');
  ctx.fillStyle = fleshGrad;
  ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#020101';
  ctx.beginPath(); ctx.ellipse(-7, -4, 5, 6, -0.15, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(7, -4, 5, 6, 0.15, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#ff0000';
  ctx.beginPath(); ctx.arc(-7, -4, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(7, -4, 2, 0, Math.PI * 2); ctx.fill();

  const jawOpen = 3 + Math.abs(pulse) * 1.5;
  ctx.fillStyle = '#050000';
  ctx.beginPath();
  ctx.ellipse(0, 10, 9, jawOpen, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  ctx.save();
  ctx.font = '900 11px sans-serif';
  ctx.fillStyle = '#ff2222';
  ctx.shadowColor = '#ff0000';
  ctx.shadowBlur = 6;
  ctx.textAlign = 'center';
  ctx.fillText(`HERIDAS GRAVES (-${Math.round(player.grievousPercent * 100)}%)`, centerX, centerY + radius + 15);
  ctx.restore();
}

function drawMinimap() {
  const size = 100;
  const margin = 10;
  const scale = size / MAP_SIZE;

  ctx.save();
  ctx.fillStyle = 'rgba(10, 15, 10, 0.85)';
  ctx.fillRect(margin, margin, size, size);
  ctx.strokeStyle = '#33334d';
  ctx.lineWidth = 2;
  ctx.strokeRect(margin, margin, size, size);

  ctx.fillStyle = '#00ffcc';
  ctx.fillRect(margin + player.x * scale - 1.5, margin + player.y * scale - 1.5, 3, 3);

  ctx.fillStyle = '#ff3333';
  for (let z of zombies) {
    ctx.fillRect(margin + z.x * scale - 1, margin + z.y * scale - 1, 2, 2);
  }
  ctx.restore();
}

function drawHUD() {
  const boxWidth = 270;
  const boxHeight = 295;
  const startYPos = 120;
  
  ctx.fillStyle = 'rgba(15, 15, 22, 0.88)';
  ctx.fillRect(10, startYPos, boxWidth, boxHeight);
  ctx.strokeStyle = '#33334d'; 
  ctx.strokeRect(10, startYPos, boxWidth, boxHeight);

  let x = 20;
  let y = startYPos + 18;

  ctx.fillStyle = '#ffffff'; 
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`Oleada: ${wave} | Bajas: 💀 ${kills}`, x, y); y += 17;
  ctx.fillText(`Restantes: 🧟 ${(totalZombiesToSpawn - zombiesSpawnedSoFar) + zombies.length}`, x, y); y += 17;
  ctx.fillText(`Nivel: ${player.level} (${Math.round(player.xp)}/${player.nextLevelXp} XP)`, x, y); y += 20;

  const barWidth = 230; const barHeight = 14;
  ctx.fillStyle = '#222';
  ctx.fillRect(x, y, barWidth, barHeight);

  const hpRatio = Math.max(0, player.hp / player.maxHp);
  ctx.fillStyle = hpRatio > 0.4 ? '#ff3333' : '#cc0000';
  ctx.fillRect(x, y, barWidth * hpRatio, barHeight);

  ctx.strokeStyle = '#555';
  ctx.strokeRect(x, y, barWidth, barHeight);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px sans-serif';
  const hpText = `HP: ${Math.max(0, Math.round(player.hp))} / ${player.maxHp}`;
  ctx.fillText(hpText, x + barWidth / 2 - ctx.measureText(hpText).width / 2, y + 11);
  y += 24;

  ctx.font = 'bold 11px sans-serif';
  ctx.fillStyle = '#00ffcc'; ctx.fillText(`Héroe: ${player.hero.name}`, x, y); y += 16;
  ctx.fillStyle = '#ff9900'; ctx.fillText(`Daño Físico (AD): ${Math.round(player.ad)}`, x, y); y += 16;
  ctx.fillStyle = '#c084fc'; ctx.fillText(`Poder Mágico (AP): ${Math.round(player.ap)}`, x, y); y += 16;
  ctx.fillStyle = '#ff3333'; ctx.fillText(`Crítico: ${Math.round(player.critChance)}% (x${(1 + player.critDamage / 100).toFixed(2)})`, x, y); y += 16;
  ctx.fillStyle = '#00ffcc'; ctx.fillText(`Alcance: ${Math.round(selectedWeapon.baseRange * player.rangeMultiplier)}px`, x, y); y += 16;
  ctx.fillStyle = '#f4c28f'; ctx.fillText(`Armadura: ${Math.round(player.armor)}`, x, y); y += 16;
  ctx.fillStyle = '#38bdf8'; ctx.fillText(`Res. Mágica: ${Math.round(player.mr)}`, x, y); y += 16;

  ctx.fillStyle = '#ff9900'; ctx.fillText(`Pen. Física: ${Math.round(player.physPen)}%`, x, y);
  ctx.fillStyle = '#c084fc'; ctx.fillText(`Pen. Mágica: ${Math.round(player.magPen)}%`, x + 115, y); y += 16;

  ctx.fillStyle = '#ff0033'; ctx.fillText(`Robo Vida: ${Math.round(player.lifeSteal)}%`, x, y);
  ctx.fillStyle = '#ff66cc'; ctx.fillText(`Suc. Mágica: ${Math.round(player.spellVamp)}%`, x + 115, y); y += 16;

  ctx.fillStyle = '#2ecc71'; ctx.fillText(`Poder Curación: ${Math.round(player.healPower)}%`, x, y); y += 16;
  ctx.fillStyle = '#dddddd'; ctx.fillText(`Vel. Ataque: ${player.attackSpeed.toFixed(2)}x | Mov: ${player.moveSpeed.toFixed(1)}`, x, y);
}

function getRandomRarity() {
  const rand = Math.random() * 100;
  if (rand < 55) return 'Común';       
  if (rand < 85) return 'Raro';        
  if (rand < 96) return 'Épico';       
  return 'Legendario';                
}

// ============================================================================
// SUBIDA DE NIVEL Y MANEJO DE AUMENTOS (INCLUYE 10 AUMENTOS INFINITOS)
// ============================================================================
function triggerLevelUp() {
  sounds.playLevelUp();
  isPaused = true;
  const container = document.getElementById('augmentsContainer');
  container.innerHTML = '';

  const available = AUGMENTS_DATABASE.filter(a => !acquiredAugmentsList.some(item => item.id === a.id));
  const selectedChoices = [];

  for (let i = 0; i < 3; i++) {
    if (available.length > 0) {
      const targetRarity = getRandomRarity();
      let pool = available.filter(a => a.rarity === targetRarity && !selectedChoices.some(sc => sc.id === a.id));
      if (pool.length === 0) {
        pool = available.filter(a => !selectedChoices.some(sc => sc.id === a.id));
      }
      if (pool.length > 0) {
        const chosen = pool[Math.floor(Math.random() * pool.length)];
        selectedChoices.push(chosen);
      }
    }
    
    // Si no quedan aumentos únicos, rellenar con los 10 AUMENTOS INFINITOS
    if (selectedChoices.length <= i) {
      const infPool = INFINITE_AUGMENTS_DATABASE.filter(a => !selectedChoices.some(sc => sc.id === a.id));
      const chosenInf = infPool[Math.floor(Math.random() * infPool.length)] || INFINITE_AUGMENTS_DATABASE[0];
      selectedChoices.push(chosenInf);
    }
  }

  selectedChoices.forEach(aug => {
    const card = document.createElement('div');
    const rClass = getClassByRarity(aug.rarity);
    card.className = `augment-card ${rClass}`;
    card.style.borderLeft = `6px solid`;
    card.innerHTML = `<h3 class="${rClass}">${aug.name} (${aug.rarity})</h3><p style="color:#eee; font-size:0.9rem;">${aug.desc}</p>`;
    card.onclick = () => {
      aug.apply(player);
      if (aug.rarity !== 'Infinito') {
        acquiredAugmentsList.push(aug);
      }
      isPaused = false;
      showScreen('');
    };
    container.appendChild(card);
  });

  showScreen('levelUpMenu');
}

function togglePause() {
  if (!isGameRunning) return;
  isPaused = !isPaused;

  if (isPaused) {
    const list = document.getElementById('pausedAugmentsList');
    const rarityRank = { 'Legendario': 4, 'Épico': 3, 'Raro': 2, 'Común': 1, 'Infinito': 0 };
    const sortedAugments = [...acquiredAugmentsList].sort((a, b) => rarityRank[b.rarity] - rarityRank[a.rarity]);

    let html = `
      <h3 style="margin-bottom:12px; color:#00ffcc; font-size:1.15rem; border-bottom:1px solid #333; padding-bottom:5px;">DATOS DEL JUGADOR:</h3>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.85rem; color:#ccc; margin-bottom:15px; background:#181824; padding:10px; border-radius:6px;">
        <div>• <strong>AD:</strong> ${Math.round(player.ad)}</div>
        <div>• <strong>AP:</strong> ${Math.round(player.ap)}</div>
        <div>• <strong>Prob. Crítico:</strong> ${Math.round(player.critChance)}%</div>
        <div>• <strong>Daño Crítico:</strong> x${(1 + player.critDamage/100).toFixed(2)}</div>
        <div>• <strong>Alcance:</strong> ${Math.round(selectedWeapon.baseRange * player.rangeMultiplier)}px</div>
        <div>• <strong>Vel. Ataque:</strong> ${player.attackSpeed.toFixed(2)}x</div>
        <div>• <strong>Armadura:</strong> ${Math.round(player.armor)}</div>
        <div>• <strong>Res. Mágica:</strong> ${Math.round(player.mr)}</div>
        <div>• <strong>Pen. Física:</strong> ${Math.round(player.physPen)}%</div>
        <div>• <strong>Pen. Mágica:</strong> ${Math.round(player.magPen)}%</div>
        <div>• <strong>Robo Vida:</strong> ${Math.round(player.lifeSteal)}%</div>
        <div>• <strong>Suc. Mágica:</strong> ${Math.round(player.spellVamp)}%</div>
      </div>
      <h3 style="margin-bottom:10px; color:#00ffcc; font-size:1.1rem; border-bottom:1px solid #333; padding-bottom:5px;">AUMENTOS ADQUIRIDOS:</h3>
    `;

    if (sortedAugments.length === 0) {
      html += '<p style="color:#888; font-size:0.9rem;">Aún no has adquirido aumentos en esta partida.</p>';
    } else {
      sortedAugments.forEach(aug => {
        const rClass = getClassByRarity(aug.rarity);
        html += `
          <div style="margin-bottom:8px; background:#1a1a26; padding:8px 12px; border-radius:5px; border-left:4px solid;" class="${rClass}">
            <div style="font-size:0.95rem;"><strong>${aug.name}</strong> <span style="font-size:0.8rem; opacity:0.8;">(${aug.rarity})</span></div>
            <div style="font-size:0.8rem; color:#bbb; margin-top:2px;">${aug.desc}</div>
          </div>
        `;
      });
    }
    
    list.innerHTML = html;
    showScreen('pauseMenu');
  } else {
    showScreen('');
  }
}

function toggleAutoAim() {
  autoAimEnabled = !autoAimEnabled;
  const btn = document.getElementById('autoAimToggleBtn');
  if (btn) {
    if (autoAimEnabled) {
      btn.classList.add('active');
      btn.innerHTML = '🎯 AUTO ON';
    } else {
      btn.classList.remove('active');
      btn.innerHTML = '🎯 AUTO OFF';
    }
  }
}

function quitToMain() {
  isGameRunning = false; isPaused = false;
  showScreen('mainMenu');
}

// ============================================================================
// EVENTOS DE ENTRADA (TECLADO, RATÓN Y TÁCTIL)
// ============================================================================
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
});
window.addEventListener('keyup', e => keys[e.code] = false);

window.addEventListener('mousemove', e => {
  if (!isGameRunning || isPaused) return;
  isMouseAiming = true;
  mousePos.x = e.clientX;
  mousePos.y = e.clientY;
  player.angle = Math.atan2(e.clientY - canvas.height / 2, e.clientX - canvas.width / 2);
});

// Controles Táctiles con JoyStick Izquierdo (Mover) y Derecho (Apuntar)
const joyZone = document.getElementById('joystickZone');
const joyBase = document.getElementById('joystickBase');
const joyStick = document.getElementById('joystickStick');

const aimZone = document.getElementById('aimZone');
const aimBase = document.getElementById('aimBase');
const aimStick = document.getElementById('aimStick');

let joyTouchId = null;
let aimTouchId = null;
let joyCenter = { x: 0, y: 0 };
let aimCenter = { x: 0, y: 0 };

joyZone.addEventListener('touchstart', e => {
  sounds.init();
  isMouseAiming = false;
  const touch = e.changedTouches[0];
  joyTouchId = touch.identifier;
  joyCenter = { x: touch.clientX, y: touch.clientY };
  joyBase.style.left = `${touch.clientX}px`;
  joyBase.style.top = `${touch.clientY}px`;
  joyBase.style.display = 'block';
  joyStick.style.transform = `translate(-50%, -50%)`;
  joystick.active = true;
}, { passive: false });

joyZone.addEventListener('touchmove', e => {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];
    if (touch.identifier === joyTouchId) {
      const dx = touch.clientX - joyCenter.x;
      const dy = touch.clientY - joyCenter.y;
      const dist = Math.hypot(dx, dy);
      const maxR = 45;
      const clampDist = Math.min(dist, maxR);
      const ang = Math.atan2(dy, dx);
      
      joystick.x = (dx / (dist || 1)) * (clampDist / maxR);
      joystick.y = (dy / (dist || 1)) * (clampDist / maxR);

      joyStick.style.transform = `translate(calc(-50% + ${Math.cos(ang) * clampDist}px), calc(-50% + ${Math.sin(ang) * clampDist}px))`;
    }
  }
}, { passive: false });

function resetJoystick() {
  joystick.active = false;
  joystick.x = 0; joystick.y = 0;
  joyBase.style.display = 'none';
  joyTouchId = null;
}
joyZone.addEventListener('touchend', resetJoystick);
joyZone.addEventListener('touchcancel', resetJoystick);

aimZone.addEventListener('touchstart', e => {
  sounds.init();
  isMouseAiming = false;
  const touch = e.changedTouches[0];
  aimTouchId = touch.identifier;
  aimCenter = { x: touch.clientX, y: touch.clientY };
  aimBase.style.left = `${touch.clientX}px`;
  aimBase.style.top = `${touch.clientY}px`;
  aimBase.style.display = 'block';
  aimStick.style.transform = `translate(-50%, -50%)`;
  aimJoystick.active = true;
}, { passive: false });

aimZone.addEventListener('touchmove', e => {
  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];
    if (touch.identifier === aimTouchId) {
      const dx = touch.clientX - aimCenter.x;
      const dy = touch.clientY - aimCenter.y;
      const dist = Math.hypot(dx, dy);
      const maxR = 45;
      const clampDist = Math.min(dist, maxR);
      const ang = Math.atan2(dy, dx);

      aimJoystick.x = dx;
      aimJoystick.y = dy;
      player.angle = ang;

      aimStick.style.transform = `translate(calc(-50% + ${Math.cos(ang) * clampDist}px), calc(-50% + ${Math.sin(ang) * clampDist}px))`;
    }
  }
}, { passive: false });

function resetAimJoystick() {
  aimJoystick.active = false;
  aimJoystick.x = 0; aimJoystick.y = 0;
  aimBase.style.display = 'none';
  aimTouchId = null;
}
aimZone.addEventListener('touchend', resetAimJoystick);
aimZone.addEventListener('touchcancel', resetAimJoystick);
