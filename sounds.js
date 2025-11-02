/**
 * RetroSounds - Sistema de audio para PAC-MAN
 * Usa los sonidos originales del arcade
 */

class RetroSounds {
  constructor() {
    this.muted = false;
    this.sounds = {};
    this.musicLoops = {};
    this.currentSiren = null;
    this.sirenLevel = 0;
    this.lastDotSound = 0;
    this.lastDeathSound = 0;

    // Contexto de audio para mejor control
    this.audioContext = null;
    this.gainNode = null;

    // Precargar todos los sonidos
    this.soundFiles = {
      // Sonidos de efectos
      credit: "pmsounds/credit.wav",
      start: "pmsounds/start.wav",
      death_0: "pmsounds/death_0.wav",
      death_1: "pmsounds/death_1.wav",
      eat_dot_0: "pmsounds/eat_dot_0.wav",
      eat_dot_1: "pmsounds/eat_dot_1.wav",
      eat_fruit: "pmsounds/eat_fruit.wav",
      eat_ghost: "pmsounds/eat_ghost.wav",
      extend: "pmsounds/extend.wav",
      intermission: "pmsounds/intermission.wav",

      // Música de fondo (sirenas)
      siren0: "pmsounds/siren0.wav",
      siren0_loop: "pmsounds/siren0_firstloop.wav",
      siren1: "pmsounds/siren1.wav",
      siren1_loop: "pmsounds/siren1_firstloop.wav",
      siren2: "pmsounds/siren2.wav",
      siren2_loop: "pmsounds/siren2_firstloop.wav",
      siren3: "pmsounds/siren3.wav",
      siren3_loop: "pmsounds/siren3_firstloop.wav",

      // Sonidos de power mode
      eyes: "pmsounds/eyes.wav",
      eyes_loop: "pmsounds/eyes_firstloop.wav",
      fright: "pmsounds/fright.wav",
      fright_loop: "pmsounds/fright_firstloop.wav",
    };
  }

  /**
   * Inicializar el sistema de audio
   */
  async init() {
    try {
      // Crear contexto de audio
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);

      // Precargar todos los sonidos
      await this.preloadSounds();

      console.log("✅ Sistema de audio inicializado correctamente");
      return true;
    } catch (error) {
      console.error("❌ Error al inicializar audio:", error);
      return false;
    }
  }

  /**
   * Precargar todos los archivos de sonido
   */
  async preloadSounds() {
    const loadPromises = Object.entries(this.soundFiles).map(
      async ([key, path]) => {
        try {
          const audio = new Audio(path);
          audio.preload = "auto";

          // Configurar loops para música de fondo
          if (
            key.includes("loop") ||
            key.includes("siren") ||
            key.includes("fright") ||
            key.includes("eyes")
          ) {
            audio.loop = key.includes("loop");
          }

          this.sounds[key] = audio;

          // Esperar a que el audio esté listo
          return new Promise((resolve) => {
            audio.addEventListener("canplaythrough", () => resolve(), {
              once: true,
            });
            audio.addEventListener(
              "error",
              () => {
                console.warn(`⚠️ No se pudo cargar: ${path}`);
                resolve();
              },
              { once: true }
            );
          });
        } catch (error) {
          console.warn(`⚠️ Error cargando ${path}:`, error);
        }
      }
    );

    await Promise.all(loadPromises);
  }

  /**
   * Reproducir un sonido de efecto
   */
  playSound(soundKey, volume = 1.0) {
    if (this.muted || !this.sounds[soundKey]) return;

    try {
      const sound = this.sounds[soundKey].cloneNode();
      sound.volume = volume;
      sound
        .play()
        .catch((e) => console.warn(`No se pudo reproducir ${soundKey}:`, e));
    } catch (error) {
      console.warn(`Error reproduciendo ${soundKey}:`, error);
    }
  }

  /**
   * Sonido de crédito/inicio de juego
   */
  playCredit() {
    this.playSound("credit", 0.7);
  }

  /**
   * Sonido de START (intro antes de comenzar el juego)
   * Este es el sonido SUBLIME que te prepara para la acción
   */
  playStart() {
    this.stopAllMusic();
    this.playSound("start", 0.6);
  }

  /**
   * Sonido de muerte de Pac-Man (alterna entre death_0 y death_1)
   */
  pacmanDeath() {
    this.stopAllMusic();
    const deathSound = this.lastDeathSound === 0 ? "death_0" : "death_1";
    this.lastDeathSound = 1 - this.lastDeathSound;
    this.playSound(deathSound, 0.8);
  }

  /**
   * Sonido wakka wakka (alterna entre eat_dot_0 y eat_dot_1)
   */
  pacmanWakka() {
    const dotSound = this.lastDotSound === 0 ? "eat_dot_0" : "eat_dot_1";
    this.lastDotSound = 1 - this.lastDotSound;
    this.playSound(dotSound, 0.4);
  }

  /**
   * Sonido de comer power pellet
   */
  pacmanPowerPellet() {
    this.playSound("eat_fruit", 0.6);
  }

  /**
   * Sonido de comer fantasma
   */
  pacmanEatGhost() {
    this.playSound("eat_ghost", 0.7);
  }

  /**
   * Sonido de vida extra
   */
  extendLife() {
    this.playSound("extend", 0.7);
  }

  /**
   * Música de intermisión (entre niveles)
   */
  playIntermission() {
    this.stopAllMusic();
    this.playSound("intermission", 0.5);
  }

  /**
   * Reproducir música de fondo (sirena)
   * El nivel determina la velocidad: 0=lento, 3=rápido
   */
  playBackgroundMusic(level = 0) {
    if (this.muted) return;

    // Determinar qué sirena usar basado en el nivel o progreso
    this.sirenLevel = Math.min(3, Math.max(0, level));
    const sirenKey = `siren${this.sirenLevel}`;
    const sirenLoopKey = `siren${this.sirenLevel}_loop`;

    this.stopAllMusic();

    try {
      // Reproducir la primera parte
      const siren = this.sounds[sirenKey];
      if (siren) {
        siren.volume = 0.3;
        siren.loop = false;

        // Cuando termine la primera parte, reproducir el loop
        siren.addEventListener(
          "ended",
          () => {
            if (!this.muted && this.sounds[sirenLoopKey]) {
              this.currentSiren = this.sounds[sirenLoopKey];
              this.currentSiren.volume = 0.3;
              this.currentSiren.loop = true;
              this.currentSiren
                .play()
                .catch((e) => console.warn("Error en siren loop:", e));
            }
          },
          { once: true }
        );

        this.currentSiren = siren;
        siren.play().catch((e) => console.warn("Error en siren:", e));
      }
    } catch (error) {
      console.warn("Error reproduciendo música de fondo:", error);
    }
  }

  /**
   * Música de power mode (cuando Pac-Man puede comer fantasmas)
   */
  playPowerMusic() {
    if (this.muted) return;

    this.stopAllMusic();

    try {
      const fright = this.sounds["fright"];
      if (fright) {
        fright.volume = 0.4;
        fright.loop = false;

        fright.addEventListener(
          "ended",
          () => {
            if (!this.muted && this.sounds["fright_loop"]) {
              this.currentSiren = this.sounds["fright_loop"];
              this.currentSiren.volume = 0.4;
              this.currentSiren.loop = true;
              this.currentSiren
                .play()
                .catch((e) => console.warn("Error en fright loop:", e));
            }
          },
          { once: true }
        );

        this.currentSiren = fright;
        fright.play().catch((e) => console.warn("Error en fright:", e));
      }
    } catch (error) {
      console.warn("Error reproduciendo power music:", error);
    }
  }

  /**
   * Música cuando los fantasmas están volviendo a la base (solo ojos)
   */
  playEyesMusic() {
    if (this.muted) return;

    this.stopAllMusic();

    try {
      const eyes = this.sounds["eyes"];
      if (eyes) {
        eyes.volume = 0.3;
        eyes.loop = false;

        eyes.addEventListener(
          "ended",
          () => {
            if (!this.muted && this.sounds["eyes_loop"]) {
              this.currentSiren = this.sounds["eyes_loop"];
              this.currentSiren.volume = 0.3;
              this.currentSiren.loop = true;
              this.currentSiren
                .play()
                .catch((e) => console.warn("Error en eyes loop:", e));
            }
          },
          { once: true }
        );

        this.currentSiren = eyes;
        eyes.play().catch((e) => console.warn("Error en eyes:", e));
      }
    } catch (error) {
      console.warn("Error reproduciendo eyes music:", error);
    }
  }

  /**
   * Detener música de fondo
   */
  stopBackgroundMusic() {
    if (this.currentSiren) {
      this.currentSiren.pause();
      this.currentSiren.currentTime = 0;
      this.currentSiren = null;
    }
  }

  /**
   * Detener música de power mode
   */
  stopPowerMusic() {
    this.stopBackgroundMusic();
  }

  /**
   * Detener toda la música
   */
  stopAllMusic() {
    // Detener la sirena actual
    if (this.currentSiren) {
      this.currentSiren.pause();
      this.currentSiren.currentTime = 0;
    }

    // Detener todas las sirenas y loops por si acaso
    ["siren0", "siren1", "siren2", "siren3", "fright", "eyes"].forEach(
      (base) => {
        [base, `${base}_loop`].forEach((key) => {
          if (this.sounds[key]) {
            this.sounds[key].pause();
            this.sounds[key].currentTime = 0;
          }
        });
      }
    );

    this.currentSiren = null;
  }

  /**
   * Sonido de victoria
   */
  victory() {
    this.stopAllMusic();
    this.playIntermission();
  }

  /**
   * Sonido de game over
   */
  gameOver() {
    this.stopAllMusic();
    // El sonido de muerte ya se reproduce cuando pierde la última vida
  }

  /**
   * Toggle mute
   */
  toggleMute() {
    this.muted = !this.muted;

    if (this.muted) {
      this.stopAllMusic();
      // Silenciar todos los sonidos
      if (this.gainNode) {
        this.gainNode.gain.value = 0;
      }
    } else {
      if (this.gainNode) {
        this.gainNode.gain.value = 1;
      }
    }

    return this.muted;
  }

  /**
   * Ajustar velocidad de la música según el progreso del nivel
   */
  updateMusicSpeed(dotsRemaining, totalDots) {
    const progress = 1 - dotsRemaining / totalDots;

    // Cambiar de sirena según el progreso
    let newLevel = 0;
    if (progress > 0.75) newLevel = 3;
    else if (progress > 0.5) newLevel = 2;
    else if (progress > 0.25) newLevel = 1;

    // Solo cambiar si es diferente
    if (newLevel !== this.sirenLevel && !this.muted) {
      this.playBackgroundMusic(newLevel);
    }
  }

  /**
   * Click de botón (puede usar el sonido de crédito a bajo volumen)
   */
  buttonClick() {
    this.playSound("credit", 0.2);
  }
}
