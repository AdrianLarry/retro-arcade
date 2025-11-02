// ============================================
// SPACE CADET PINBALL - FASE 1
// Motor de Físicas + Bola + Muros
// ============================================

console.log("📦 juego.js cargado");

// Esperar a que Matter.js esté disponible
if (typeof Matter === "undefined") {
  console.error("❌ Matter.js no está disponible al cargar juego.js");
}

// Aliases de Matter.js para escribir menos (se crearán cuando Matter esté listo)
let Engine, Render, Runner, World, Bodies, Body, Events;

// ============================================
// CONFIGURACIÓN DEL JUEGO
// ============================================
const CONFIG = {
  width: 600,
  height: 800,
  ballRadius: 10,
  gravity: 1.2, // Gravedad del flipper (más alta = más rápido)
  wallThickness: 20,

  // Configuración de flippers
  flipper: {
    width: 100,
    height: 20,
    leftX: 180,
    rightX: 420,
    y: 720,
    maxAngle: Math.PI / 4, // 45 grados máximo
    returnSpeed: 0.15, // Velocidad de retorno
    hitSpeed: 0.3, // Velocidad al golpear
  },

  // Configuración del lanzador
  plunger: {
    x: 570,
    y: 700,
    width: 20,
    height: 80,
    maxPull: 100, // Cuánto se puede jalar
    force: 0.08, // Fuerza del lanzamiento
  },
};

// ============================================
// VARIABLES GLOBALES
// ============================================
let engine;
let world;
let render;
let runner;
let ball;
let score = 0;
let ballCount = 3;
let multiplier = 1;

// Flippers
let leftFlipper;
let rightFlipper;
let leftFlipperConstraint;
let rightFlipperConstraint;

// Controles
let keys = {
  left: false,
  right: false,
  launch: false,
};

// Sensor de pérdida
let drainSensor;

// Lanzador (plunger)
let plunger;
let plungerConstraint;
let ballLaunched = false;

// ============================================
// INICIALIZACIÓN DEL MOTOR
// ============================================
function init() {
  console.log("🚀 Iniciando init()...");

  // Crear los aliases de Matter.js
  ({ Engine, Render, Runner, World, Bodies, Body, Events } = Matter);
  console.log("✅ Aliases de Matter.js creados");

  // Crear el motor de físicas
  engine = Engine.create();
  world = engine.world;
  console.log("✅ Motor creado");

  // Configurar la gravedad (apunta hacia abajo)
  world.gravity.y = CONFIG.gravity;

  // Crear el renderizador
  const canvas = document.getElementById("game-canvas");
  render = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
      width: CONFIG.width,
      height: CONFIG.height,
      wireframes: false, // Queremos ver colores, no solo líneas
      background: "#0a0a1a", // Fondo azul oscuro espacial
      pixelRatio: window.devicePixelRatio || 1, // Para pantallas retina
    },
  });

  // Iniciar el renderizador
  Render.run(render);

  // Crear el runner (el loop del juego)
  runner = Runner.create();
  Runner.run(runner, engine);

  // Crear los elementos del juego
  createWalls();
  createFlippers();
  createDrainSensor();
  createPlunger();
  createBall();

  // Configurar controles
  setupControls();
  setupTouchControls();

  // Configurar el loop del juego
  setupGameLoop();

  // Ocultar loading y mostrar juego
  document.getElementById("loading").style.display = "none";
  document.getElementById("game-container").style.display = "flex";

  console.log("🚀 Motor de físicas inicializado");
  console.log("🎮 Gravedad:", world.gravity.y);
}

// ============================================
// CREAR LOS MUROS DEL FLIPPER
// ============================================
function createWalls() {
  const wallOptions = {
    isStatic: true, // Los muros no se mueven
    render: {
      fillStyle: "#1a4d2e", // Verde oscuro
      strokeStyle: "#00ff00", // Borde verde brillante
      lineWidth: 2,
    },
    friction: 0.1,
    restitution: 0.5, // Rebote moderado
  };

  // Muro SUPERIOR
  const topWall = Bodies.rectangle(
    CONFIG.width / 2,
    -10,
    CONFIG.width,
    CONFIG.wallThickness,
    wallOptions
  );

  // Muro IZQUIERDO
  const leftWall = Bodies.rectangle(
    -10,
    CONFIG.height / 2,
    CONFIG.wallThickness,
    CONFIG.height,
    wallOptions
  );

  // Muro DERECHO
  const rightWall = Bodies.rectangle(
    CONFIG.width + 10,
    CONFIG.height / 2,
    CONFIG.wallThickness,
    CONFIG.height,
    wallOptions
  );

  // Muro INFERIOR (solo los laterales, dejamos el centro abierto para "perder")
  const bottomLeftWall = Bodies.rectangle(
    100,
    CONFIG.height + 5,
    200,
    CONFIG.wallThickness,
    wallOptions
  );

  const bottomRightWall = Bodies.rectangle(
    CONFIG.width - 100,
    CONFIG.height + 5,
    200,
    CONFIG.wallThickness,
    wallOptions
  );

  // Paredes inclinadas (simulando la forma del flipper)
  // Pared inclinada IZQUIERDA
  const leftAngleWall = Bodies.trapezoid(
    80,
    CONFIG.height - 100,
    60,
    200,
    0.3,
    {
      ...wallOptions,
      angle: Math.PI / 8, // Inclinación
    }
  );

  // Pared inclinada DERECHA
  const rightAngleWall = Bodies.trapezoid(
    CONFIG.width - 80,
    CONFIG.height - 100,
    60,
    200,
    0.3,
    {
      ...wallOptions,
      angle: -Math.PI / 8, // Inclinación opuesta
    }
  );

  // Agregar todos los muros al mundo
  World.add(world, [
    topWall,
    leftWall,
    rightWall,
    bottomLeftWall,
    bottomRightWall,
    leftAngleWall,
    rightAngleWall,
  ]);

  console.log("🧱 Muros creados");
}

// ============================================
// CREAR LOS FLIPPERS
// ============================================
function createFlippers() {
  const { width, height, leftX, rightX, y, maxAngle } = CONFIG.flipper;

  // Opciones visuales de los flippers
  const flipperOptions = {
    chamfer: { radius: 8 },
    render: {
      fillStyle: "#ff3333",
      strokeStyle: "#ff6666",
      lineWidth: 3,
    },
    friction: 0.1,
    density: 0.001,
    restitution: 1.2, // Rebote alto para "patear" la bola
  };

  // FLIPPER IZQUIERDO
  // Crear el flipper (rectángulo)
  leftFlipper = Bodies.rectangle(
    leftX + width / 2,
    y,
    width,
    height,
    flipperOptions
  );

  // Crear el "ancla" estática (el pivote desde donde gira)
  const leftAnchor = Bodies.circle(leftX, y, 5, {
    isStatic: true,
    render: {
      fillStyle: "#00ff00",
      strokeStyle: "#00ff00",
    },
  });

  // Crear la "bisagra" (constraint) que une el flipper con el ancla
  leftFlipperConstraint = Matter.Constraint.create({
    bodyA: leftAnchor,
    bodyB: leftFlipper,
    pointA: { x: 0, y: 0 },
    pointB: { x: -width / 2, y: 0 }, // Pivote en el extremo izquierdo
    length: 0,
    stiffness: 1,
  });

  // FLIPPER DERECHO
  rightFlipper = Bodies.rectangle(
    rightX - width / 2,
    y,
    width,
    height,
    flipperOptions
  );

  const rightAnchor = Bodies.circle(rightX, y, 5, {
    isStatic: true,
    render: {
      fillStyle: "#00ff00",
      strokeStyle: "#00ff00",
    },
  });

  rightFlipperConstraint = Matter.Constraint.create({
    bodyA: rightAnchor,
    bodyB: rightFlipper,
    pointA: { x: 0, y: 0 },
    pointB: { x: width / 2, y: 0 }, // Pivote en el extremo derecho
    length: 0,
    stiffness: 1,
  });

  // Agregar todo al mundo
  World.add(world, [
    leftFlipper,
    rightFlipper,
    leftAnchor,
    rightAnchor,
    leftFlipperConstraint,
    rightFlipperConstraint,
  ]);

  console.log("🎯 Flippers creados");
}

// ============================================
// CREAR SENSOR DE PÉRDIDA (DRAIN)
// ============================================
function createDrainSensor() {
  // Sensor invisible en la parte inferior central
  drainSensor = Bodies.rectangle(
    CONFIG.width / 2,
    CONFIG.height + 30,
    200, // Ancho del canal de pérdida
    20,
    {
      isStatic: true,
      isSensor: true, // NO afecta físicas, solo detecta colisiones
      render: {
        fillStyle: "#ff0000",
        opacity: 0.3,
      },
    }
  );

  World.add(world, drainSensor);
  console.log("💀 Sensor de pérdida creado");
}

// ============================================
// CREAR LANZADOR (PLUNGER)
// ============================================
function createPlunger() {
  const { x, y, width, height } = CONFIG.plunger;

  // Crear el émbolo
  plunger = Bodies.rectangle(x, y, width, height, {
    render: {
      fillStyle: "#ffaa00",
      strokeStyle: "#ffcc44",
      lineWidth: 3,
    },
    friction: 0,
    restitution: 0,
    density: 0.001,
  });

  // Crear el ancla (punto fijo donde se "engancha" el resorte)
  const plungerAnchor = Bodies.rectangle(x, y + 80, width, 10, {
    isStatic: true,
    render: {
      fillStyle: "#666666",
    },
  });

  // Crear el resorte (constraint con stiffness alta)
  plungerConstraint = Matter.Constraint.create({
    bodyA: plungerAnchor,
    bodyB: plunger,
    length: 0,
    stiffness: 0.05, // Resorte fuerte
  });

  World.add(world, [plunger, plungerAnchor, plungerConstraint]);
  console.log("🚀 Lanzador creado");
}

// ============================================
// CREAR LA BOLA
// ============================================
function createBall() {
  // Posición inicial (arriba a la derecha, donde está el lanzador)
  const startX = CONFIG.width - 50;
  const startY = CONFIG.height - 150;

  ball = Bodies.circle(startX, startY, CONFIG.ballRadius, {
    restitution: 0.8, // Buen rebote (80%)
    friction: 0.005, // Muy poca fricción (se desliza)
    frictionAir: 0.01, // Resistencia del aire mínima
    density: 0.004, // Densidad (afecta el peso)
    render: {
      fillStyle: "#c0c0c0", // Color plateado
      strokeStyle: "#ffffff",
      lineWidth: 2,
    },
  });

  // Hacer que la bola empiece QUIETA (sin caer)
  Body.setStatic(ball, true);

  World.add(world, ball);
  console.log("⚪ Bola creada en posición:", startX, startY, "(en reposo)");
}

// ============================================
// ACTUALIZAR MARCADOR
// ============================================
function updateScoreboard() {
  // Actualizar puntaje (con ceros a la izquierda)
  document.getElementById("score-display").textContent = score
    .toString()
    .padStart(7, "0");

  // Actualizar bolas restantes
  document.getElementById("ball-count").textContent = ballCount;

  // Actualizar multiplicador
  document.getElementById("multiplier").textContent = "x" + multiplier;
}

// ============================================
// LOOP DEL JUEGO
// ============================================
function setupGameLoop() {
  // Actualizar flippers y verificar pérdida de bola
  Events.on(engine, "afterUpdate", function () {
    // Actualizar flippers cada frame
    updateFlippers();

    // Actualizar lanzador cada frame
    updatePlunger();

    // Verificar si la bola se cayó (backup por si el sensor falla)
    if (ball.position.y > CONFIG.height + 100) {
      console.log("💀 ¡Bola perdida! (fuera de límites)");
      resetBall();
    }
  });

  // Detectar colisiones
  Events.on(engine, "collisionStart", function (event) {
    const pairs = event.pairs;

    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];

      // Verificar si la bola tocó el sensor de pérdida
      if (
        (pair.bodyA === ball && pair.bodyB === drainSensor) ||
        (pair.bodyA === drainSensor && pair.bodyB === ball)
      ) {
        console.log("💀 ¡Bola en el drain!");
        setTimeout(() => resetBall(), 500); // Delay para que se vea caer
      }

      // Verificar si la bola tocó un flipper (para sonido después)
      if (
        (pair.bodyA === ball &&
          (pair.bodyB === leftFlipper || pair.bodyB === rightFlipper)) ||
        ((pair.bodyA === leftFlipper || pair.bodyA === rightFlipper) &&
          pair.bodyB === ball)
      ) {
        console.log("🎯 ¡Flipper hit!");
        // Aquí reproduciremos el sonido después
      }
    }
  });

  // Mostrar FPS en consola (cada segundo) - DEBUG
  let lastFPSLog = 0;
  Events.on(engine, "afterUpdate", function () {
    if (engine.timing.timestamp - lastFPSLog > 1000) {
      const fps = Math.round(1000 / engine.timing.delta);
      console.log("⚡ FPS:", fps);
      lastFPSLog = engine.timing.timestamp;
    }
  });

  console.log("🔄 Game loop configurado");
}

// ============================================
// CONTROLES DE TECLADO
// ============================================
function setupControls() {
  // Detectar teclas presionadas
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      keys.left = true;
    }
    if (e.key === "ArrowRight") {
      keys.right = true;
    }
    if (e.key === "ArrowDown") {
      keys.launch = true;
    }
    if (e.key === " ") {
      // Espacio para nudge
      nudgeTable();
    }
    if (e.key === "r" || e.key === "R") {
      restartGame();
    }
  });

  // Detectar teclas soltadas
  document.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft") {
      keys.left = false;
    }
    if (e.key === "ArrowRight") {
      keys.right = false;
    }
    if (e.key === "ArrowDown") {
      keys.launch = false;
    }
  });

  console.log("⌨️ Controles de teclado configurados");
}

// ============================================
// CONTROLES TÁCTILES (MOBILE)
// ============================================
function setupTouchControls() {
  // Crear botones táctiles
  const touchContainer = document.createElement("div");
  touchContainer.id = "touch-controls";
  touchContainer.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 0;
        right: 0;
        display: flex;
        justify-content: space-around;
        padding: 0 20px;
        z-index: 1000;
        display: none;  /* Mostrar solo en mobile */
    `;

  // Botón izquierdo
  const leftButton = document.createElement("button");
  leftButton.innerHTML = "◀ LEFT";
  leftButton.style.cssText = `
        padding: 20px 40px;
        font-size: 18px;
        font-family: 'Press Start 2P', cursive;
        background: linear-gradient(180deg, #ff3333 0%, #cc0000 100%);
        color: white;
        border: 3px solid #ff6666;
        border-radius: 10px;
        cursor: pointer;
        user-select: none;
        box-shadow: 0 0 20px rgba(255, 0, 0, 0.5);
    `;

  // Botón derecho
  const rightButton = document.createElement("button");
  rightButton.innerHTML = "RIGHT ▶";
  rightButton.style.cssText = leftButton.style.cssText;

  // Eventos táctiles para botón izquierdo
  leftButton.addEventListener("touchstart", (e) => {
    e.preventDefault();
    keys.left = true;
    leftButton.style.transform = "scale(0.95)";
  });
  leftButton.addEventListener("touchend", (e) => {
    e.preventDefault();
    keys.left = false;
    leftButton.style.transform = "scale(1)";
  });

  // Eventos táctiles para botón derecho
  rightButton.addEventListener("touchstart", (e) => {
    e.preventDefault();
    keys.right = true;
    rightButton.style.transform = "scale(0.95)";
  });
  rightButton.addEventListener("touchend", (e) => {
    e.preventDefault();
    keys.right = false;
    rightButton.style.transform = "scale(1)";
  });

  // También permitir mouse (para probar en desktop)
  leftButton.addEventListener("mousedown", () => (keys.left = true));
  leftButton.addEventListener("mouseup", () => (keys.left = false));
  rightButton.addEventListener("mousedown", () => (keys.right = true));
  rightButton.addEventListener("mouseup", () => (keys.right = false));

  touchContainer.appendChild(leftButton);
  touchContainer.appendChild(rightButton);
  document.body.appendChild(touchContainer);

  // MOSTRAR SIEMPRE los botones (útil para probar y para desktop también)
  touchContainer.style.display = "flex";

  console.log("📱 Controles táctiles configurados");
}

// ============================================
// ACTUALIZAR FLIPPERS (CADA FRAME)
// ============================================
function updateFlippers() {
  const { maxAngle, returnSpeed, hitSpeed } = CONFIG.flipper;

  // FLIPPER IZQUIERDO
  if (keys.left) {
    // Activar: rotar hacia arriba (ángulo negativo)
    Body.setAngularVelocity(leftFlipper, -hitSpeed);

    // Limitar rotación máxima
    if (leftFlipper.angle < -maxAngle) {
      Body.setAngle(leftFlipper, -maxAngle);
      Body.setAngularVelocity(leftFlipper, 0);
    }
  } else {
    // Desactivar: volver a posición inicial suavemente
    if (leftFlipper.angle < 0) {
      Body.setAngularVelocity(leftFlipper, returnSpeed);
    } else {
      Body.setAngle(leftFlipper, 0);
      Body.setAngularVelocity(leftFlipper, 0);
    }
  }

  // FLIPPER DERECHO
  if (keys.right) {
    // Activar: rotar hacia arriba (ángulo positivo)
    Body.setAngularVelocity(rightFlipper, hitSpeed);

    // Limitar rotación máxima
    if (rightFlipper.angle > maxAngle) {
      Body.setAngle(rightFlipper, maxAngle);
      Body.setAngularVelocity(rightFlipper, 0);
    }
  } else {
    // Desactivar: volver a posición inicial suavemente
    if (rightFlipper.angle > 0) {
      Body.setAngularVelocity(rightFlipper, -returnSpeed);
    } else {
      Body.setAngle(rightFlipper, 0);
      Body.setAngularVelocity(rightFlipper, 0);
    }
  }
}

// ============================================
// ACTUALIZAR LANZADOR (CADA FRAME)
// ============================================
function updatePlunger() {
  const { maxPull, force } = CONFIG.plunger;

  // Si la bola ya fue lanzada, no hacer nada
  if (ballLaunched) return;

  if (keys.launch) {
    // Jalar el émbolo hacia abajo
    Body.setPosition(plunger, {
      x: plunger.position.x,
      y: plunger.position.y + 2, // Jalar gradualmente
    });

    // Limitar cuánto se puede jalar
    if (plunger.position.y > CONFIG.plunger.y + maxPull) {
      Body.setPosition(plunger, {
        x: plunger.position.x,
        y: CONFIG.plunger.y + maxPull,
      });
    }
  } else {
    // Al soltar, el resorte empuja el émbolo (y la bola si está cerca)
    if (plunger.position.y > CONFIG.plunger.y + 5) {
      launchBall();
    }
  }
}

// ============================================
// LANZAR LA BOLA
// ============================================
function launchBall() {
  // Hacer la bola dinámica (que caiga)
  Body.setStatic(ball, false);

  // Aplicar fuerza hacia arriba
  Body.applyForce(ball, ball.position, {
    x: -0.01, // Ligero empuje a la izquierda
    y: -CONFIG.plunger.force, // Fuerza hacia arriba
  });

  ballLaunched = true;
  console.log("🚀 ¡Bola lanzada!");
}

// ============================================
// NUDGE (SACUDIR LA MESA)
// ============================================
function nudgeTable() {
  // Aplicar una pequeña fuerza aleatoria a la bola
  const nudgeForce = 0.002;
  Body.applyForce(ball, ball.position, {
    x: (Math.random() - 0.5) * nudgeForce,
    y: -nudgeForce,
  });
  console.log("🔨 Nudge!");
}

// ============================================
// REINICIAR JUEGO
// ============================================
function restartGame() {
  score = 0;
  ballCount = 3;
  multiplier = 1;
  updateScoreboard();
  resetBall();
  console.log("🔄 Juego reiniciado");
}

// ============================================
// REINICIAR LA BOLA
// ============================================
function resetBall() {
  ballCount--;
  updateScoreboard();

  if (ballCount <= 0) {
    console.log("🎮 GAME OVER");
    // Aquí implementaremos el game over después
    ballCount = 3; // Temporal: reiniciamos
    score = 0;
  }

  // Reposicionar la bola
  Body.setPosition(ball, {
    x: CONFIG.width - 50,
    y: CONFIG.height - 150,
  });

  // Hacer la bola estática de nuevo (esperando lanzamiento)
  Body.setStatic(ball, true);

  // Detener su movimiento
  Body.setVelocity(ball, { x: 0, y: 0 });
  Body.setAngularVelocity(ball, 0);

  // Resetear flag de lanzamiento
  ballLaunched = false;

  // Resetear posición del lanzador
  Body.setPosition(plunger, {
    x: CONFIG.plunger.x,
    y: CONFIG.plunger.y,
  });

  console.log("🔄 Bola reseteada - Presiona ↓ para lanzar");
}

// ============================================
// INICIAR EL JUEGO CUANDO CARGA LA PÁGINA
// ============================================
window.addEventListener("load", function () {
  console.log("🎮 Iniciando Space Cadet Pinball...");

  // Verificar que Matter.js esté cargado
  if (typeof Matter === "undefined") {
    console.error("❌ Matter.js no se cargó correctamente");
    document.getElementById("loading").innerHTML =
      'ERROR: Matter.js failed to load<br><span style="font-size: 8px;">Check console</span>';
    return;
  }

  console.log("✅ Matter.js cargado correctamente");

  // Pequeño delay para asegurar que todo esté listo
  setTimeout(() => {
    init();
    updateScoreboard();
  }, 100);
});
