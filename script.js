const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const MAP_SIZE = 6000;

    class SoundManager {
      constructor() { this.ctx = null; }
      init() {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx.state === 'suspended') this.ctx.resume();
      }
      playShoot() {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(280, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.08);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.08);
      }
      playZombieGrowl() {
        if (!this.ctx) return;
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
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.06);
        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.06);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.06);
      }
    }
    const sounds = new SoundManager();

    const HEROES = [
      { id: 'dog_brown', name: 'Perro Café', desc: 'Aura Ignis: Emite un pulso ardiente en área que daña a los enemigos cercanos.' },
      { id: 'dog_black', name: 'Perro Negro', desc: 'Maldición de Sombra: Mayor agilidad y un aura tenebrosa que inflige daño continuo.' },
      { id: 'cat', name: 'Gato Sigiloso', desc: 'Zarpazo Veloz: Lanza micro-cortes periódicos en un abanico frontal.' },
      { id: 'bear', name: 'Oso Robusto', desc: 'Fuerza Salvaje: Genera un pulso defensivo que frena e inflige daño a zombies.' },
      { id: 'bird', name: 'Ave Fénix', desc: 'Ráfaga de Viento: Lanza ondas de choque que empujan levemente a los zombies.' },
      { id: 'trex', name: 'T-Rex', desc: 'Mordisco Devastador: Un poderoso ataque a corta distancia en área.' }
    ];

    const WEAPONS = [
      { id: 'pistol', name: 'Pistola Básica', type: 'physical', damage: 4, fireRate: 24, speed: 11, baseRange: 450, description: 'Disparo único equilibrado con alcance medio.' },
      { id: 'shotgun', name: 'Escopeta', type: 'physical', damage: 3, fireRate: 48, speed: 9, pellets: 5, baseRange: 320, description: 'Ráfaga de perdigones a corta distancia.' },
      { id: 'rifle', name: 'Rifle Táctico', type: 'physical', damage: 3, fireRate: 9, speed: 13, baseRange: 520, description: 'Alta cadencia de fuego y alcance estándar.' },
      { id: 'sniper', name: 'Francotirador', type: 'physical', damage: 10, fireRate: 65, speed: 19, pierce: 3, baseRange: 900, description: 'Gran daño, penetración y alcance sobresaliente.' },
      { id: 'smg', name: 'Subfusil Dual', type: 'physical', damage: 2, fireRate: 5, speed: 10, baseRange: 380, description: 'Velocidad de disparo extrema con rango efectivo corto.' },
      { id: 'wand', name: 'Varita Mágica', type: 'magical', damage: 5, fireRate: 28, speed: 9, baseRange: 480, description: 'Proyectil mágico veloz de rango medio.' },
      { id: 'fireball', name: 'Báculo de Fuego', type: 'magical', damage: 8, fireRate: 45, speed: 8, baseRange: 420, description: 'Gran daño explosivo de alcance moderado.' },
      { id: 'plasma', name: 'Cañón de Plasma', type: 'magical', damage: 6, fireRate: 35, speed: 10, pierce: 2, baseRange: 550, description: 'Esfera de energía penetrante de buen rango.' },
      { id: 'void', name: 'Orbe del Vacío', type: 'magical', damage: 4, fireRate: 18, speed: 6, baseRange: 400, description: 'Cadencia constante de magia negra de corto alcance.' },
      { id: 'laser', name: 'Rayo Arcano', type: 'magical', damage: 10, fireRate: 50, speed: 22, baseRange: 800, description: 'Disparo veloz de gran precisión y largo alcance.' }
    ];

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
      { id: 'a43', name: 'Escudo de Fuerza', rarity: 'Épico', desc: 'Otorga un escudo regenerable que absorbe 1 impacto cada 15s.', apply: p => p.hasShieldAbility = true },
      { id: 'a44', name: 'Cargador Extendido', rarity: 'Épico', desc: 'Dispara 1 proyectil adicional en cada ataque.', apply: p => p.extraBullets += 1 },
      { id: 'a45', name: 'Gran Sabiduría', rarity: 'Épico', desc: 'Aumenta la XP ganada en un +25%.', apply: p => p.xpMultiplier += 0.25 },
      { id: 'a46', name: 'Perforador Total', rarity: 'Épico', desc: '+8% Pen. Física y +8% Pen. Mágica.', apply: p => { p.physPen += 8; p.magPen += 8; } },
      { id: 'a47', name: 'Piel Espinosa', rarity: 'Épico', desc: 'Devuelve 5 de daño físico a los enemigos que te golpean.', apply: p => p.thornsDamage += 5 },
      { id: 'a48', name: 'Piroclasto', rarity: 'Épico', desc: 'Tus ataques mágicos queman a los enemigos cercanos.', apply: p => p.burnAura = true },
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

        this.angle = 0; this.vx = 0; this.vy = 0;
        this.passiveTimer = 0;

        this.grievousTimer = 0;
        this.grievousPercent = 0;
      }

      update(keys, joystick) {
        let dx = 0, dy = 0;
        if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) dx += 1;

        if (joystick.active) { dx = joystick.x; dy = joystick.y; }

        const len = Math.hypot(dx, dy);
        if (len > 0) {
          const nextVx = (dx / len) * this.moveSpeed;
          const nextVy = (dy / len) * this.moveSpeed;
          
          let canMoveX = true, canMoveY = true;
          obstacles.forEach(obs => {
            if (Math.hypot(obs.x - (this.x + nextVx), obs.y - this.y) < obs.radius + this.radius) canMoveX = false;
            if (Math.hypot(obs.x - this.x, obs.y - (this.y + nextVy)) < obs.radius + this.radius) canMoveY = false;
          });

          if (canMoveX) this.x += nextVx;
          if (canMoveY) this.y += nextVy;
        }

        this.x = Math.max(this.radius, Math.min(MAP_SIZE - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(MAP_SIZE - this.radius, this.y));

        if (this.grievousTimer > 0) {
          this.grievousTimer--;
          if (this.grievousTimer <= 0) {
            this.grievousPercent = 0;
          }
        }

        if (this.hasShieldAbility && !this.shieldActive) {
          this.shieldTimer++;
          if (this.shieldTimer >= 600) {
            this.shieldActive = true;
            this.shieldTimer = 0;
          }
        }

        this.passiveTimer++;
        if (this.passiveTimer >= 45) {
          this.passiveTimer = 0;
          const passiveScaling = (this.ad * 0.5) + (this.ap * 0.5);

          if (this.hero.id === 'dog_brown' || this.hero.id === 'dog_black') {
            const auraRadius = 110;
            zombies.forEach(z => {
              if (Math.hypot(z.x - this.x, z.y - this.y) < auraRadius) {
                z.hp -= passiveScaling;
                damageTexts.push(new DamageText(z.x, z.y, Math.round(passiveScaling), false, '#ffaa00'));
                if (z.hp <= 0 && !z.deadProcessed) {
                  z.deadProcessed = true;
                  kills++;
                  xpOrbs.push(new XPOrb(z.x, z.y, z.xpValue * this.xpMultiplier));
                }
              }
            });
          } else if (this.hero.id === 'cat') {
            const range = 140;
            zombies.forEach(z => {
              if (Math.hypot(z.x - this.x, z.y - this.y) < range) {
                z.hp -= passiveScaling * 1.2;
                damageTexts.push(new DamageText(z.x, z.y, Math.round(passiveScaling * 1.2), false, '#00ffcc'));
                if (z.hp <= 0 && !z.deadProcessed) {
                  z.deadProcessed = true;
                  kills++;
                  xpOrbs.push(new XPOrb(z.x, z.y, z.xpValue * this.xpMultiplier));
                }
              }
            });
          } else if (this.hero.id === 'bear') {
            const range = 100;
            zombies.forEach(z => {
              if (Math.hypot(z.x - this.x, z.y - this.y) < range) {
                z.hp -= passiveScaling * 1.5;
                damageTexts.push(new DamageText(z.x, z.y, Math.round(passiveScaling * 1.5), false, '#e74c3c'));
                if (z.hp <= 0 && !z.deadProcessed) {
                  z.deadProcessed = true;
                  kills++;
                  xpOrbs.push(new XPOrb(z.x, z.y, z.xpValue * this.xpMultiplier));
                }
              }
            });
          } else if (this.hero.id === 'bird') {
            const range = 160;
            zombies.forEach(z => {
              if (Math.hypot(z.x - this.x, z.y - this.y) < range) {
                z.hp -= passiveScaling;
                const pushDx = z.x - this.x;
                const pushDy = z.y - this.y;
                const dist = Math.hypot(pushDx, pushDy) || 1;
                z.x += (pushDx / dist) * 15;
                z.y += (pushDy / dist) * 15;
                damageTexts.push(new DamageText(z.x, z.y, Math.round(passiveScaling), false, '#7ee8fa'));
                if (z.hp <= 0 && !z.deadProcessed) {
                  z.deadProcessed = true;
                  kills++;
                  xpOrbs.push(new XPOrb(z.x, z.y, z.xpValue * this.xpMultiplier));
                }
              }
            });
          } else if (this.hero.id === 'trex') {
            const range = 90;
            zombies.forEach(z => {
              if (Math.hypot(z.x - this.x, z.y - this.y) < range) {
                z.hp -= passiveScaling * 2.0;
                damageTexts.push(new DamageText(z.x, z.y, Math.round(passiveScaling * 2.0), true, '#ff3333'));
                if (z.hp <= 0 && !z.deadProcessed) {
                  z.deadProcessed = true;
                  kills++;
                  xpOrbs.push(new XPOrb(z.x, z.y, z.xpValue * this.xpMultiplier));
                }
              }
            });
          }
        }
      }

      draw() {
        const screenX = this.x - camera.x;
        const screenY = this.y - camera.y;

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
        } 
        else if (this.hero.id === 'dog_black') {
          ctx.fillStyle = '#111115'; ctx.beginPath(); ctx.arc(0, 0, this.radius, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.stroke();
          ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-8, -12, 6, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(-8, 12, 6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#00ffff'; ctx.beginPath(); ctx.arc(4, -5, 3, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(4, 5, 3, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ff0055'; ctx.beginPath(); ctx.arc(10, 0, 3, 0, Math.PI * 2); ctx.fill();
        } 
        else if (this.hero.id === 'cat') {
          ctx.fillStyle = '#f39c12'; ctx.beginPath(); ctx.arc(0, 0, this.radius - 1, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#d35400'; ctx.beginPath(); ctx.moveTo(-2, -14); ctx.lineTo(6, -8); ctx.lineTo(-6, -6); ctx.fill();
          ctx.beginPath(); ctx.moveTo(-2, 14); ctx.lineTo(6, 8); ctx.lineTo(-6, 6); ctx.fill();
          ctx.fillStyle = '#2ecc71'; ctx.beginPath(); ctx.arc(4, -4, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(4, 4, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(9, 0, 2, 0, Math.PI * 2); ctx.fill();
        } 
        else if (this.hero.id === 'bear') {
          ctx.fillStyle = '#5c4033'; ctx.beginPath(); ctx.arc(0, 0, this.radius + 3, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#3b281e'; ctx.beginPath(); ctx.arc(-6, -14, 7, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(-6, 14, 7, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(5, -5, 3, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(5, 5, 3, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#d2b48c'; ctx.beginPath(); ctx.arc(10, 0, 5, 0, Math.PI * 2); ctx.fill();
        } 
        else if (this.hero.id === 'bird') {
          ctx.fillStyle = '#3498db'; ctx.beginPath(); ctx.arc(0, 0, this.radius - 2, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#2980b9'; ctx.beginPath(); ctx.arc(-10, -8, 8, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(-10, 8, 8, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.moveTo(6, -5); ctx.lineTo(16, 0); ctx.lineTo(6, 5); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(3, -4, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(3, 4, 2.5, 0, Math.PI * 2); ctx.fill();
        } 
        else if (this.hero.id === 'trex') {
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

    class Zombie {
      constructor(x, y, type = 'normal') {
        this.x = x; this.y = y; this.type = type;
        this.frozenTimer = 0; this.growlTimer = Math.random() * 300;
        this.deadProcessed = false;

        this.attackCooldown = 0;

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
        if (this.frozenTimer > 0) {
          this.frozenTimer--;
          return;
        }

        let currentSpeed = this.speed;
        const totalRemaining = (totalZombiesToSpawn - zombiesSpawnedSoFar) + zombies.length;
        if (totalRemaining <= 15) {
          const speedFactor = 1 + (0.05 + ((15 - totalRemaining) / 15) * 0.10);
          currentSpeed *= speedFactor;
        }

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.hypot(dx, dy);

        let moveVx = (dx / (dist || 1)) * currentSpeed;
        let moveVy = (dy / (dist || 1)) * currentSpeed;

        let collidingObs = null;

        obstacles.forEach(obs => {
          const nextDist = Math.hypot(obs.x - (this.x + moveVx), obs.y - (this.y + moveVy));
          const curDist = Math.hypot(obs.x - this.x, obs.y - this.y);
          if (nextDist < obs.radius + this.radius || curDist < obs.radius + this.radius + 2) {
            collidingObs = obs;
          }
        });

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

        zombies.forEach(other => {
          if (other === this) return;
          const zDist = Math.hypot(this.x - other.x, this.y - other.y);
          const minDist = this.radius + other.radius;
          if (zDist < minDist && zDist > 0) {
            const overlap = minDist - zDist;
            const pushX = ((this.x - other.x) / zDist) * (overlap * 0.1);
            const pushY = ((this.y - other.y) / zDist) * (overlap * 0.1);
            this.x += pushX;
            this.y += pushY;
          }
        });

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
        ctx.beginPath();
        ctx.arc(0, 2, faceR + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = skin;
        ctx.beginPath();
        ctx.arc(0, 0, faceR, 0, Math.PI * 2);
        ctx.fill();

        if (this.type === 'normal') {
          ctx.fillStyle = '#4a3030';
          ctx.beginPath(); ctx.arc(-faceR * 0.62, faceR * 0.34, faceR * 0.18, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#382323'; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(-faceR * 0.76, -faceR * 0.48); ctx.lineTo(-faceR * 0.35, -faceR * 0.66); ctx.lineTo(-faceR * 0.22, -faceR * 0.43); ctx.stroke();
        } else if (this.type === 'runner') {
          ctx.strokeStyle = '#521616'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-faceR * 0.80, -faceR * 0.52); ctx.lineTo(-faceR * 0.30, -faceR * 0.82); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(faceR * 0.42, faceR * 0.02); ctx.lineTo(faceR * 0.82, -faceR * 0.24); ctx.stroke();
          ctx.fillStyle = '#6e2424';
          ctx.beginPath(); ctx.arc(faceR * 0.62, faceR * 0.52, faceR * 0.13, 0, Math.PI * 2); ctx.fill();
        } else if (this.type === 'tank') {
          ctx.strokeStyle = '#292323'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(0, 0, faceR + 1, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = '#3b3030';
          ctx.beginPath(); ctx.arc(-faceR * 0.58, faceR * 0.48, faceR * 0.19, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(faceR * 0.62, -faceR * 0.48, faceR * 0.14, 0, Math.PI * 2); ctx.fill();
        } else if (this.type === 'spitter') {
          ctx.fillStyle = '#9acd32';
          ctx.beginPath(); ctx.arc(faceR * 0.56, faceR * 0.42, faceR * 0.11, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#496b2d';
          ctx.beginPath(); ctx.arc(-faceR * 0.60, -faceR * 0.48, faceR * 0.16, 0, Math.PI * 2); ctx.fill();
        }

        ctx.fillStyle = '#120e0e';
        ctx.beginPath(); ctx.ellipse(-faceR * 0.34, -faceR * 0.23, faceR * 0.23, faceR * 0.17, -0.15, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(faceR * 0.34, -faceR * 0.23, faceR * 0.23, faceR * 0.17, 0.15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = this.frozenTimer > 0 ? '#ffffff' : (this.type === 'spitter' ? '#d8ff86' : '#d6d6d6');
        ctx.beginPath(); ctx.arc(-faceR * 0.34, -faceR * 0.23, Math.max(1.5, faceR * 0.075), 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(faceR * 0.34, -faceR * 0.23, Math.max(1.5, faceR * 0.075), 0, Math.PI * 2); ctx.fill();

        ctx.strokeStyle = dark; ctx.lineWidth = Math.max(1.5, faceR * 0.09); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-faceR * 0.10, -faceR * 0.02); ctx.lineTo(-faceR * 0.16, faceR * 0.25); ctx.lineTo(faceR * 0.02, faceR * 0.28); ctx.stroke();

        const mouthY = faceR * 0.42;
        const mouthWidth = faceR * (0.72 + proximity * 0.08);
        const mouthHeight = faceR * (0.10 + mouthOpen * 0.48);
        ctx.fillStyle = '#160b0b';
        ctx.beginPath();
        ctx.ellipse(0, mouthY + mouthOpen * faceR * 0.12, mouthWidth, Math.max(1.4, mouthHeight), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#321616'; ctx.lineWidth = Math.max(1.3, faceR * 0.07);
        ctx.beginPath(); ctx.arc(0, mouthY, mouthWidth, 0, Math.PI); ctx.stroke();

        if (mouthOpen > 0.10) {
          const toothRows = mouthOpen > 0.55 ? 2 : 1;
          const teeth = this.type === 'runner' ? 5 : this.type === 'tank' ? 4 : 6;
          ctx.fillStyle = light;
          for (let row = 0; row < toothRows; row++) {
            for (let i = 0; i < teeth; i++) {
              const tx = -mouthWidth * 0.72 + (i / Math.max(1, teeth - 1)) * mouthWidth * 1.44;
              const ty = mouthY + (row === 0 ? -mouthHeight * 0.42 : mouthHeight * 0.42);
              const tw = Math.max(1.4, faceR * 0.055);
              const th = Math.max(2, faceR * 0.13 * (0.6 + mouthOpen * 0.4));
              ctx.beginPath();
              if (row === 0) {
                ctx.moveTo(tx - tw, ty); ctx.lineTo(tx + tw, ty); ctx.lineTo(tx, ty + th); ctx.closePath();
              } else {
                ctx.moveTo(tx - tw, ty); ctx.lineTo(tx + tw, ty); ctx.lineTo(tx, ty - th); ctx.closePath();
              }
              ctx.fill();
            }
          }
        }

        if (this.type === 'spitter' && mouthOpen > 0.35) {
          ctx.fillStyle = '#7dbb42';
          ctx.beginPath();
          ctx.ellipse(faceR * 0.10, mouthY + mouthHeight * 0.25, faceR * 0.20, faceR * 0.09 + mouthOpen * 2, 0.15, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.strokeStyle = '#3a2727'; ctx.lineWidth = 1.2;
        if (this.faceVariant === 0) {
          ctx.beginPath(); ctx.moveTo(-faceR * 0.82, faceR * 0.08); ctx.lineTo(-faceR * 0.55, faceR * 0.02); ctx.stroke();
        } else if (this.faceVariant === 1) {
          ctx.beginPath(); ctx.moveTo(faceR * 0.55, -faceR * 0.02); ctx.lineTo(faceR * 0.82, faceR * 0.12); ctx.stroke();
        } else {
          ctx.beginPath(); ctx.moveTo(-faceR * 0.15, -faceR * 0.72); ctx.lineTo(faceR * 0.15, -faceR * 0.55); ctx.stroke();
        }

        ctx.restore();

        const barWidth = Math.max(26, this.radius * 1.65); const barHeight = 4;
        const barX = screenX - barWidth / 2;
        const barY = screenY - this.radius - 10;
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);
        const hpPercent = Math.max(0, this.hp / this.maxHp);
        ctx.fillStyle = hpPercent > 0.5 ? '#2ecc71' : '#e74c3c';
        ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
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
      update() {
        this.x += this.vx; this.y += this.vy;
        this.life--;
      }
      draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        ctx.fillStyle = '#8b0000';
        ctx.beginPath();
        ctx.arc(this.x - camera.x, this.y - camera.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    class BloodSplatter {
      constructor(x, y) {
        this.x = x; this.y = y;
        this.radius = Math.random() * 8 + 6;
        this.life = 180;
        this.maxLife = this.life;
      }
      update() { this.life--; }
      draw() {
        ctx.save();
        ctx.globalAlpha = Math.max(0, (this.life / this.maxLife) * 0.6);
        ctx.fillStyle = '#550000';
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
          ctx.fillRect(screenX - barW/2, screenY - this.radius - 8, barW, barH);
          ctx.fillStyle = '#2ecc71';
          ctx.fillRect(screenX - barW/2, screenY - this.radius - 8, barW * (this.hp / this.maxHp), barH);
        }

        ctx.restore();
      }
    }

    class XPOrb {
      constructor(x, y, value) { this.x = x; this.y = y; this.value = value; this.radius = 5; }
      draw() {
        ctx.save();
        ctx.fillStyle = '#33ccff';
        ctx.beginPath(); ctx.arc(this.x - camera.x, this.y - camera.y, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }

    class DamageText {
      constructor(x, y, text, isCrit, color = '#ffffff') {
        this.x = x; this.y = y; this.text = text; this.isCrit = isCrit;
        this.color = isCrit ? '#ff3333' : color; this.life = 30; this.vy = -1;
      }
      update() { this.y += this.vy; this.life--; }
      draw() {
        ctx.save();
        ctx.font = this.isCrit ? 'bold 18px sans-serif' : '12px sans-serif';
        ctx.fillStyle = this.color;
        ctx.fillText(this.text, this.x - camera.x, this.y - camera.y);
        ctx.restore();
      }
    }

    let selectedHero = HEROES[0];
    let selectedWeapon = WEAPONS[0];
    let player = new Player(MAP_SIZE / 2, MAP_SIZE / 2, selectedHero);
    let bullets = [], zombies = [], xpOrbs = [], damageTexts = [], obstacles = [];
    let fleshBits = [], bloodSplatters = [];
    let wave = 1, kills = 0;
    let isGameRunning = false, isPaused = false;
    let totalZombiesToSpawn = 0, zombiesSpawnedSoFar = 0;
    let shootCooldown = 0;
    let acquiredAugmentsList = [];
    let biteFlashTimer = 0;

    const camera = { x: 0, y: 0 };
    const keys = {};
    const joystick = { active: false, x: 0, y: 0 };

    function initTerrain() {
      obstacles = [];
      for (let i = 0; i < 250; i++) {
        const type = Math.random() < 0.6 ? 'tree' : 'rock';
        obstacles.push(new Obstacle(
          Math.random() * (MAP_SIZE - 400) + 200,
          Math.random() * (MAP_SIZE - 400) + 200,
          type
        ));
      }
    }
    initTerrain();

    function respawnObstacle(type) {
      let bestX = Math.random() * (MAP_SIZE - 400) + 200;
      let bestY = Math.random() * (MAP_SIZE - 400) + 200;
      let maxMinDist = 0;

      for (let attempt = 0; attempt < 8; attempt++) {
        const candX = Math.random() * (MAP_SIZE - 400) + 200;
        const candY = Math.random() * (MAP_SIZE - 400) + 200;

        let minDist = Infinity;
        obstacles.forEach(o => {
          const d = Math.hypot(o.x - candX, o.y - candY);
          if (d < minDist) minDist = d;
        });

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
        card.innerHTML = `
          <div>
            <h3>${h.name}</h3>
          </div>
          <p>${h.desc}</p>
        `;
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
            <p style="font-weight:bold; color: ${w.type === 'physical' ? '#E88538' : '#a855f7'};">
              ${w.type === 'physical' ? 'Daño Físico' : 'Poder Mágico'}: +${w.damage}
            </p>
            <p style="color: #00ffcc; font-size: 0.8rem; margin-top:2px;">Alcance Base: ${w.baseRange}px</p>
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
      return 'rarity-comun';
    }

    function renderCodexMenu() {
      const list = document.getElementById('codexList');
      list.innerHTML = '';
      AUGMENTS_DATABASE.forEach(a => {
        const item = document.createElement('div');
        const rClass = getClassByRarity(a.rarity);
        item.className = `codex-item ${rClass}`;
        item.innerHTML = `<span><strong>${a.name}</strong> (${a.rarity})</span><small style="color:#ccc;">${a.desc}</small>`;
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

      bullets = []; zombies = []; xpOrbs = []; damageTexts = []; fleshBits = []; bloodSplatters = [];
      wave = 1; kills = 0; acquiredAugmentsList = []; biteFlashTimer = 0;
      initTerrain();
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

    function spawnZombieInEdge() {
      if (zombiesSpawnedSoFar >= totalZombiesToSpawn) return;

      let zX, zY;
      const side = Math.floor(Math.random() * 4);
      const margin = 100;

      if (side === 0) { zX = Math.random() * MAP_SIZE; zY = margin; } 
      else if (side === 1) { zX = MAP_SIZE - margin; zY = Math.random() * MAP_SIZE; } 
      else if (side === 2) { zX = Math.random() * MAP_SIZE; zY = MAP_SIZE - margin; } 
      else { zX = margin; zY = Math.random() * MAP_SIZE; } 

      const types = ['normal', 'normal', 'runner', 'tank', 'spitter'];
      const type = types[Math.floor(Math.random() * types.length)];

      zombies.push(new Zombie(zX, zY, type));
      zombiesSpawnedSoFar++;
    }

    function shoot() {
      sounds.playShoot();
      const count = 1 + player.extraBullets + (selectedWeapon.pellets || 0);

      let baseDmg = selectedWeapon.damage;
      if (selectedWeapon.type === 'physical') {
        baseDmg *= (player.ad / 10);
      } else {
        baseDmg *= (player.ap / 10);
      }

      const maxDistance = selectedWeapon.baseRange * player.rangeMultiplier;
      
      for (let i = 0; i < count; i++) {
        const spread = (i - (count - 1) / 2) * 0.12;
        const finalAngle = player.angle + spread;

        const isCrit = (Math.random() * 100) < player.critChance;
        const finalDamage = isCrit ? baseDmg * (1 + player.critDamage / 100) : baseDmg;
        
        bullets.push({
          x: player.x, y: player.y,
          startX: player.x, startY: player.y,
          vx: Math.cos(finalAngle) * selectedWeapon.speed,
          vy: Math.sin(finalAngle) * selectedWeapon.speed,
          damage: finalDamage,
          oppositeDamage: finalDamage * 0.001,
          isCrit: isCrit,
          pierce: (selectedWeapon.pierce || 1) + player.extraPierce,
          maxDist: maxDistance,
          radius: 4, type: selectedWeapon.type
        });
      }
    }

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
      player.update(keys, joystick);
      
      camera.x = player.x - canvas.width / 2;
      camera.y = player.y - canvas.height / 2;

      if (Math.random() < 0.15) spawnZombieInEdge();

      shootCooldown--;
      if (shootCooldown <= 0) {
        shoot();
        shootCooldown = Math.max(4, selectedWeapon.fireRate / player.attackSpeed);
      }

      bullets.forEach((b, index) => {
        b.x += b.vx; b.y += b.vy;

        const distTraveled = Math.hypot(b.x - b.startX, b.y - b.startY);
        if (distTraveled >= b.maxDist) {
          bullets.splice(index, 1);
          return;
        }

        obstacles.forEach(obs => {
          if (Math.hypot(obs.x - b.x, obs.y - b.y) < obs.radius) {
            const mainRes = b.type === 'physical' ? obs.armor : obs.mr;
            const oppositeRes = b.type === 'physical' ? obs.mr : obs.armor;
            const mainDmg = b.damage * (100 / (100 + mainRes));
            const oppositeDmg = b.oppositeDamage * (100 / (100 + oppositeRes));
            const netDmg = mainDmg + oppositeDmg;
            obs.hp -= netDmg;
            damageTexts.push(new DamageText(obs.x, obs.y, `${Math.round(netDmg)}`, b.isCrit, '#cccccc'));

            bullets.splice(index, 1);
          }
        });

        zombies.forEach(z => {
          if (Math.hypot(z.x - b.x, z.y - b.y) < z.radius + b.radius) {
            const mainRes = b.type === 'physical' ? z.armor : z.mr;
            const oppositeRes = b.type === 'physical' ? z.mr : z.armor;
            const mainDmg = b.damage * (100 / (100 + mainRes));
            const oppositeDmg = b.oppositeDamage * (100 / (100 + oppositeRes));
            const netDmg = mainDmg + oppositeDmg;

            z.hp -= netDmg;

            for (let i = 0; i < 3; i++) fleshBits.push(new FleshBit(b.x, b.y));
            if (Math.random() < 0.4) bloodSplatters.push(new BloodSplatter(b.x, b.y));
            
            const dmgColor = b.type === 'physical' ? '#ff9900' : '#a855f7';
            damageTexts.push(new DamageText(z.x, z.y, Math.round(netDmg), b.isCrit, dmgColor));
            
            let healAmount = 0;
            if (b.type === 'physical' && player.lifeSteal > 0) healAmount += mainDmg * (player.lifeSteal / 100);
            if (b.type === 'magical' && player.spellVamp > 0) healAmount += mainDmg * (player.spellVamp / 100);
            if (player.omnivamp > 0) healAmount += netDmg * (player.omnivamp / 100);

            if (healAmount > 0) {
              const healMultiplier = 1 - player.grievousPercent;
              healAmount *= healMultiplier;

              healAmount *= (1 + player.healPower / 100);
              player.hp = Math.min(player.maxHp, player.hp + healAmount);
              damageTexts.push(new DamageText(player.x, player.y, `+${Math.round(healAmount)}`, false, '#2ecc71'));
            }

            if (Math.random() < player.freezeChance) z.frozenTimer = 120;
            
            b.pierce--;
            if (b.pierce <= 0) bullets.splice(index, 1);

            if (z.hp <= 0 && !z.deadProcessed) {
              z.deadProcessed = true;
              kills++;
              xpOrbs.push(new XPOrb(z.x, z.y, z.xpValue * player.xpMultiplier));
            }
          }
        });
      });

      obstacles.forEach((obs, idx) => {
        if (obs.hp <= 0) {
          const type = obs.type;
          obstacles.splice(idx, 1);
          respawnObstacle(type);
        }
      });

      zombies = zombies.filter(z => z.hp > 0);

      zombies.forEach(z => {
        z.update(player);
        if (Math.hypot(player.x - z.x, player.y - z.y) < player.radius + z.radius) {
          if (player.shieldActive) {
            player.shieldActive = false;
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
              
              biteFlashTimer = 12;

              player.grievousTimer = 150;
              player.grievousPercent = Math.min(0.50, player.grievousPercent + z.grievousValue);

              if (player.thornsDamage > 0) {
                z.hp -= player.thornsDamage;
                damageTexts.push(new DamageText(z.x, z.y, `${player.thornsDamage}`, false, '#f4c28f'));
                if (z.hp <= 0 && !z.deadProcessed) {
                  z.deadProcessed = true;
                  kills++;
                  xpOrbs.push(new XPOrb(z.x, z.y, z.xpValue * player.xpMultiplier));
                }
              }

              if (player.hp <= 0) {
                player.hp = 0;
                gameOver();
                return;
              }
            } else {
              damageTexts.push(new DamageText(player.x, player.y, '¡ESQUIVADO!', true, '#7ee8fa'));
            }
          }
        }
      });

      xpOrbs.forEach((orb, idx) => {
        const dist = Math.hypot(player.x - orb.x, player.y - orb.y);
        if (dist < player.pickupRadius || player.globalPickup) {
          orb.x += (player.x - orb.x) * 0.15;
          orb.y += (player.y - orb.y) * 0.15;
          if (dist < player.radius) {
            sounds.playXp();
            player.xp += orb.value;
            xpOrbs.splice(idx, 1);

            if (player.xp >= player.nextLevelXp) {
              player.level++;
              player.xp -= player.nextLevelXp;
              player.nextLevelXp = Math.round(player.nextLevelXp * 1.4);
              triggerLevelUp();
            }
          }
        }
      });

      if (zombiesSpawnedSoFar >= totalZombiesToSpawn && zombies.length === 0) {
        wave++;
        startWave();
      }

      damageTexts.forEach(dt => dt.update());
      damageTexts = damageTexts.filter(dt => dt.life > 0);

      fleshBits.forEach(fb => fb.update());
      fleshBits = fleshBits.filter(fb => fb.life > 0);

      bloodSplatters.forEach(bs => bs.update());
      bloodSplatters = bloodSplatters.filter(bs => bs.life > 0);

      if (biteFlashTimer > 0) biteFlashTimer--;
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#1a241a'; ctx.lineWidth = 1;
      const gridSize = 100;
      const startX = -camera.x % gridSize;
      const startY = -camera.y % gridSize;

      for (let x = startX; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = startY; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }

      bloodSplatters.forEach(bs => bs.draw());
      obstacles.forEach(obs => obs.draw());
      xpOrbs.forEach(orb => orb.draw());
      fleshBits.forEach(fb => fb.draw());

      bullets.forEach(b => {
        ctx.fillStyle = b.type === 'physical' ? '#ff9900' : '#a855f7';
        ctx.beginPath();
        ctx.arc(b.x - camera.x, b.y - camera.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      zombies.forEach(z => z.draw());
      player.draw();
      damageTexts.forEach(dt => dt.draw());

      if (biteFlashTimer > 0) {
        ctx.save();
        const alpha = (biteFlashTimer / 12) * 0.7;
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
    }

    // INDICADOR REALISTA Y ATERRADOR DE HERIDAS GRAVES (ESTILO RESIDENT EVIL / T-VIRUS)
    function drawGrievousWoundsIcon() {
      if (player.grievousTimer <= 0) return;

      const centerX = canvas.width / 2;
      const centerY = 45;
      const radius = 24;

      ctx.save();
      ctx.translate(centerX, centerY);

      // Animación pulsante del T-Virus
      const time = Date.now() * 0.008;
      const pulse = Math.sin(time) * 1.5;
      const jitterX = (Math.random() - 0.5) * 1.2;
      const jitterY = (Math.random() - 0.5) * 1.2;
      ctx.translate(jitterX, jitterY);

      // 1. Marco metálico desgastado con sombra abisal
      ctx.fillStyle = '#050303';
      ctx.beginPath(); ctx.arc(0, 0, radius + 5, 0, Math.PI * 2); ctx.fill();
      
      const frameGrad = ctx.createRadialGradient(0, 0, radius - 2, 0, 0, radius + 4);
      frameGrad.addColorStop(0, '#880000');
      frameGrad.addColorStop(0.7, '#330000');
      frameGrad.addColorStop(1, '#ff0000');
      ctx.strokeStyle = frameGrad; 
      ctx.lineWidth = 3; 
      ctx.stroke();

      // 2. Base de piel podrida, pútrida y descompuesta (Texturizado de gradiente)
      const fleshGrad = ctx.createRadialGradient(0, -5, 2, 0, 2, radius);
      fleshGrad.addColorStop(0, '#5a4d41');   // Gris hueso podrido
      fleshGrad.addColorStop(0.5, '#3b2f2f'); // Marrón gangrena
      fleshGrad.addColorStop(0.85, '#211515'); // Morado amoratado
      fleshGrad.addColorStop(1, '#110808');    // Bordes pútridos
      ctx.fillStyle = fleshGrad;
      ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();

      // 3. Hendiduras, cortes y suturas de necrosis
      ctx.strokeStyle = '#1a0000'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-radius * 0.7, -radius * 0.3); ctx.lineTo(-radius * 0.2, -radius * 0.8); ctx.stroke();
      ctx.strokeStyle = '#400000'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(radius * 0.3, radius * 0.2); ctx.lineTo(radius * 0.8, radius * 0.6); ctx.stroke();

      // Sangre seca coagulada
      ctx.fillStyle = '#300000';
      ctx.beginPath(); ctx.arc(-8, -10, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(10, 5, 4, 0, Math.PI * 2); ctx.fill();

      // 4. Cuencas de ojos cavernosas y negras
      ctx.fillStyle = '#020101';
      ctx.beginPath(); ctx.ellipse(-8, -4 + pulse * 0.3, 6, 8, -0.15, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(8, -4 - pulse * 0.3, 6, 8, 0.15, 0, Math.PI * 2); ctx.fill();

      // Globos oculares infectados (Amarillo pútrido con pupilas rasgadas rojas)
      ctx.fillStyle = '#b8a855';
      ctx.beginPath(); ctx.arc(-8, -4, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(8, -4, 3, 0, Math.PI * 2); ctx.fill();

      // Irritación e inyección de sangre
      ctx.strokeStyle = '#990000'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(-11, -4); ctx.lineTo(-8, -4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(11, -4); ctx.lineTo(8, -4); ctx.stroke();

      // Pupila rasgada de mutante
      ctx.fillStyle = '#ff0000';
      ctx.beginPath(); ctx.ellipse(-8, -4, 0.9, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(8, -4, 0.9, 2.5, 0, 0, Math.PI * 2); ctx.fill();

      // 5. Nariz destruida / Agujero de cartílago expuesto
      ctx.fillStyle = '#080202';
      ctx.beginPath(); ctx.moveTo(-2, 2); ctx.lineTo(0, -1); ctx.lineTo(2, 2); ctx.lineTo(0, 4); ctx.closePath(); ctx.fill();

      // 6. Mandíbula desencajada y lacerada (Splay de terror)
      const jawOpen = 4 + Math.abs(pulse) * 1.5;
      ctx.fillStyle = '#050000';
      ctx.beginPath();
      ctx.ellipse(0, 11 + jawOpen * 0.3, 11, jawOpen, 0, 0, Math.PI * 2);
      ctx.fill();

      // Dientes podridos, amarillos y afilados (Desordenados)
      ctx.fillStyle = '#d6cd98';
      const teethX = [-8, -5, -2, 1, 4, 7];
      teethX.forEach((tx, idx) => {
        const th = 2.5 + (idx % 2 === 0 ? 1.5 : 0);
        ctx.beginPath();
        ctx.moveTo(tx, 11 - jawOpen * 0.3);
        ctx.lineTo(tx + 1.8, 11 - jawOpen * 0.3);
        ctx.lineTo(tx + 0.9, 11 - jawOpen * 0.3 + th);
        ctx.closePath();
        ctx.fill();
      });

      // Dientes inferiores asomando
      ctx.fillStyle = '#aba272';
      [-6, -3, 0, 3, 6].forEach((tx, idx) => {
        const th = 2 + (idx % 2 !== 0 ? 1 : 0);
        ctx.beginPath();
        ctx.moveTo(tx, 11 + jawOpen * 0.5);
        ctx.lineTo(tx + 1.5, 11 + jawOpen * 0.5);
        ctx.lineTo(tx + 0.75, 11 + jawOpen * 0.5 - th);
        ctx.closePath();
        ctx.fill();
      });

      // Rastro de hilos de saliva sangrienta derramada de la boca
      ctx.strokeStyle = 'rgba(180, 0, 0, 0.75)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-4, 11 + jawOpen * 0.2); ctx.lineTo(-3, 20 + pulse); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(5, 11 + jawOpen * 0.2); ctx.lineTo(6, 21 - pulse); ctx.stroke();

      ctx.restore();

      // Texto de aviso estilizado con brillo tétrico
      ctx.save();
      ctx.font = '900 11px sans-serif';
      ctx.fillStyle = '#ff2222';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 6;
      ctx.textAlign = 'center';
      ctx.fillText(`HERIDAS GRAVES (-${Math.round(player.grievousPercent * 100)}%)`, centerX, centerY + radius + 16);
      ctx.restore();
    }

    function drawMinimap() {
      const size = 110;
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
      zombies.forEach(z => {
        ctx.fillRect(margin + z.x * scale - 1, margin + z.y * scale - 1, 2, 2);
      });

      ctx.restore();
    }

    function drawHUD() {
      const boxWidth = 280; 
      const boxHeight = 310;
      const startYPos = 130;
      
      ctx.fillStyle = 'rgba(15, 15, 20, 0.88)';
      ctx.fillRect(10, startYPos, boxWidth, boxHeight);
      ctx.strokeStyle = '#33334d'; 
      ctx.strokeRect(10, startYPos, boxWidth, boxHeight);

      let x = 20;
      let y = startYPos + 20;

      ctx.fillStyle = '#ffffff'; 
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`Oleada: ${wave} | Bajas: 💀 ${kills}`, x, y); y += 18;
      ctx.fillText(`Restantes: 🧟 ${(totalZombiesToSpawn - zombiesSpawnedSoFar) + zombies.length}`, x, y); y += 18;
      ctx.fillText(`Nivel: ${player.level} (${Math.round(player.xp)}/${player.nextLevelXp} XP)`, x, y); y += 22;

      const barWidth = 240; const barHeight = 16;
      ctx.fillStyle = '#222';
      ctx.fillRect(x, y, barWidth, barHeight);

      const hpRatio = Math.max(0, player.hp / player.maxHp);
      ctx.fillStyle = hpRatio > 0.4 ? '#ff3333' : '#cc0000';
      ctx.fillRect(x, y, barWidth * hpRatio, barHeight);

      ctx.strokeStyle = '#555';
      ctx.strokeRect(x, y, barWidth, barHeight);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      const hpText = `HP: ${Math.max(0, Math.round(player.hp))} / ${player.maxHp}`;
      ctx.fillText(hpText, x + barWidth / 2 - ctx.measureText(hpText).width / 2, y + 12);
      
      y += 26;

      ctx.font = 'bold 12px sans-serif';

      ctx.fillStyle = '#00ffcc'; ctx.fillText(`Héroe: ${player.hero.name}`, x, y); y += 18;
      ctx.fillStyle = '#ff9900'; ctx.fillText(`Daño Físico (AD): ${Math.round(player.ad)}`, x, y); y += 18;
      ctx.fillStyle = '#a855f7'; ctx.fillText(`Poder Mágico (AP): ${Math.round(player.ap)}`, x, y); y += 18;
      ctx.fillStyle = '#ff3333'; ctx.fillText(`Crítico: ${Math.round(player.critChance)}% (x${(1 + player.critDamage/100).toFixed(2)})`, x, y); y += 18;
      ctx.fillStyle = '#00ffcc'; ctx.fillText(`Alcance: ${Math.round(selectedWeapon.baseRange * player.rangeMultiplier)}px (+${Math.round((player.rangeMultiplier-1)*100)}%)`, x, y); y += 18;
      ctx.fillStyle = '#f4c28f'; ctx.fillText(`Armadura: ${Math.round(player.armor)}`, x, y); y += 18;
      ctx.fillStyle = '#33ffff'; ctx.fillText(`Res. Mágica: ${Math.round(player.mr)}`, x, y); y += 18;

      ctx.fillStyle = '#ff9900'; ctx.fillText(`Pen. Física: ${Math.round(player.physPen)}%`, x, y);
      ctx.fillStyle = '#a855f7'; ctx.fillText(`Pen. Mágica: ${Math.round(player.magPen)}%`, x + 120, y); y += 18;

      ctx.fillStyle = '#ff0033'; ctx.fillText(`Robo Vida: ${Math.round(player.lifeSteal)}%`, x, y);
      ctx.fillStyle = '#ff66cc'; ctx.fillText(`Suc. Mágica: ${Math.round(player.spellVamp)}%`, x + 120, y); y += 18;

      ctx.fillStyle = '#2ecc71'; ctx.fillText(`Poder Curación: ${Math.round(player.healPower)}%`, x, y); y += 18;

      ctx.fillStyle = '#dddddd';
      ctx.fillText(`Vel. Ataque: ${player.attackSpeed.toFixed(1)}x | Vel. Mov: ${player.moveSpeed.toFixed(1)}`, x, y);
    }

    function getRandomRarity() {
      const rand = Math.random() * 100;
      if (rand < 55) return 'Común';       
      if (rand < 85) return 'Raro';        
      if (rand < 96) return 'Épico';       
      return 'Legendario';                
    }

    function triggerLevelUp() {
      isPaused = true;
      const container = document.getElementById('augmentsContainer');
      container.innerHTML = '';

      const available = AUGMENTS_DATABASE.filter(a => !acquiredAugmentsList.some(item => item.id === a.id));
      const selectedChoices = [];

      for (let i = 0; i < 3; i++) {
        if (available.length === 0) break;

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

      selectedChoices.forEach(aug => {
        const card = document.createElement('div');
        const rClass = getClassByRarity(aug.rarity);
        card.className = `augment-card ${rClass}`;
        card.style.borderLeft = `6px solid`;
        card.innerHTML = `<h3 class="${rClass}">${aug.name} (${aug.rarity})</h3><p style="color:#eee; font-size:0.9rem;">${aug.desc}</p>`;
        card.onclick = () => {
          aug.apply(player);
          acquiredAugmentsList.push(aug);
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
        
        const rarityRank = { 'Legendario': 4, 'Épico': 3, 'Raro': 2, 'Común': 1 };
        const sortedAugments = [...acquiredAugmentsList].sort((a, b) => rarityRank[b.rarity] - rarityRank[a.rarity]);

        let html = `
          <h3 style="margin-bottom:12px; color:#00ffcc; font-size:1.2rem; border-bottom:1px solid #333; padding-bottom:5px;">DATOS DEL JUGADOR:</h3>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:0.85rem; color:#ccc; margin-bottom:15px; background:#181824; padding:10px; border-radius:6px;">
            <div>• <strong>AD:</strong> ${Math.round(player.ad)}</div>
            <div>• <strong>AP:</strong> ${Math.round(player.ap)}</div>
            <div>• <strong>Prob. Crítico:</strong> ${Math.round(player.critChance)}%</div>
            <div>• <strong>Daño Crítico:</strong> x${(1 + player.critDamage/100).toFixed(2)}</div>
            <div>• <strong>Alcance:</strong> ${Math.round(selectedWeapon.baseRange * player.rangeMultiplier)}px (+${Math.round((player.rangeMultiplier-1)*100)}%)</div>
            <div>• <strong>Vel. Ataque:</strong> ${player.attackSpeed.toFixed(1)}x</div>
            <div>• <strong>Armadura:</strong> ${Math.round(player.armor)}</div>
            <div>• <strong>Res. Mágica:</strong> ${Math.round(player.mr)}</div>
            <div>• <strong>Pen. Física:</strong> ${Math.round(player.physPen)}%</div>
            <div>• <strong>Pen. Mágica:</strong> ${Math.round(player.magPen)}%</div>
            <div>• <strong>Robo Vida:</strong> ${Math.round(player.lifeSteal)}%</div>
            <div>• <strong>Suc. Mágica:</strong> ${Math.round(player.spellVamp)}%</div>
          </div>
          <h3 style="margin-bottom:10px; color:#00ffcc; font-size:1.1rem; border-bottom:1px solid #333; padding-bottom:5px;">AUMENTOS ADQUIRIDOS (MAYOR A MENOR RAREZA):</h3>
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

    function quitToMain() {
      isGameRunning = false; isPaused = false;
      showScreen('mainMenu');
    }

    window.addEventListener('keydown', e => {
      keys[e.code] = true;
      if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
    });
    window.addEventListener('keyup', e => keys[e.code] = false);

    window.addEventListener('mousemove', e => {
      if (!isGameRunning || isPaused) return;
      player.angle = Math.atan2(e.clientY - canvas.height / 2, e.clientX - canvas.width / 2);
    });

    const joyZone = document.getElementById('joystickZone');
    joyZone.addEventListener('touchstart', e => {
      sounds.init();
      joystick.active = true;
      updateTouchJoystick(e.touches[0]);
    });
    joyZone.addEventListener('touchmove', e => {
      if (joystick.active) updateTouchJoystick(e.touches[0]);
    });
    joyZone.addEventListener('touchend', () => {
      joystick.active = false;
      joystick.x = 0; joystick.y = 0;
    });

    function updateTouchJoystick(touch) {
      const rect = joyZone.getBoundingClientRect();
      const dx = touch.clientX - (rect.left + rect.width / 2);
      const dy = touch.clientY - (rect.top + rect.height / 2);
      const dist = Math.hypot(dx, dy);

      joystick.x = dx / (dist || 1);
      joystick.y = dy / (dist || 1);
      player.angle = Math.atan2(dy, dx);
    }