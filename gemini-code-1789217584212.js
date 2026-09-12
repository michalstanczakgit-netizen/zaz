// --- Game State & Constants ---
let scene, camera, renderer;
let gameState = 'START'; // START, PLAY, LEVELUP, GAMEOVER
let lastTime = performance.now();

// Player Stats
let player = {
    mesh: null,
    hp: 100,
    maxHp: 100,
    dmg: 25,
    speed: 15,
    xp: 0,
    maxXp: 100,
    level: 1,
    floor: 1,
    radius: 1
};

// Controls
const keys = { w: false, a: false, s: false, d: false, space: false };
const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

// Entities
let enemies = [];
let items = [];
let levelGroup;
let stairsMesh;

const TILE_SIZE = 4;
const MAP_SIZE = 40;
let mapGrid = []; 

// --- Initialization ---
function init() {
    const container = document.getElementById('game-container');
    
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 20, 60);

    // Camera setup (Top-down angled)
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Create Player
    const pGeo = new THREE.CapsuleGeometry(1, 1, 4, 8);
    const pMat = new THREE.MeshStandardMaterial({ color: 0x0984e3, roughness: 0.5 });
    player.mesh = new THREE.Mesh(pGeo, pMat);
    player.mesh.position.y = 1;
    player.mesh.castShadow = true;
    scene.add(player.mesh);

    // Event Listeners
    window.addEventListener('resize', onWindowResize);
    window.addEventListener('keydown', (e) => handleKey(e.key, true));
    window.addEventListener('keyup', (e) => handleKey(e.key, false));
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', (e) => { if (e.button === 0 && gameState === 'PLAY') attack(); });

    // UI Listeners
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', resetGame);
    document.querySelectorAll('.upgrade-btn').forEach(btn => {
        btn.addEventListener('click', (e) => applyUpgrade(e.target.dataset.type));
    });

    requestAnimationFrame(gameLoop);
}

// --- Input Handling ---
function handleKey(key, isDown) {
    const k = key.toLowerCase();
    if (k === 'w' || k === 'arrowup') keys.w = isDown;
    if (k === 'a' || k === 'arrowleft') keys.a = isDown;
    if (k === 's' || k === 'arrowdown') keys.s = isDown;
    if (k === 'd' || k === 'arrowright') keys.d = isDown;
    if (k === ' ') {
        keys.space = isDown;
        if (isDown && gameState === 'PLAY') attack();
    }
}

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Map Generation ---
function generateMap() {
    if (levelGroup) scene.remove(levelGroup);
    levelGroup = new THREE.Group();
    scene.add(levelGroup);
    
    enemies.forEach(e => scene.remove(e.mesh));
    items.forEach(i => scene.remove(i.mesh));
    if (stairsMesh) scene.remove(stairsMesh);
    
    enemies = [];
    items = [];
    
    // Init empty grid (0 = wall, 1 = floor)
    mapGrid = Array(MAP_SIZE).fill(0).map(() => Array(MAP_SIZE).fill(0));
    const rooms = [];
    const numRooms = 6 + Math.floor(Math.random() * 4);

    for (let i = 0; i < numRooms; i++) {
        let w = 4 + Math.floor(Math.random() * 4);
        let h = 4 + Math.floor(Math.random() * 4);
        let x = 2 + Math.floor(Math.random() * (MAP_SIZE - w - 4));
        let y = 2 + Math.floor(Math.random() * (MAP_SIZE - h - 4));
        
        let room = { x, y, w, h, cx: Math.floor(x + w/2), cy: Math.floor(y + h/2) };
        
        // Carve room
        for (let r = y; r < y + h; r++) {
            for (let c = x; c < x + w; c++) {
                mapGrid[r][c] = 1;
            }
        }
        
        // Connect to previous room
        if (rooms.length > 0) {
            let prev = rooms[rooms.length - 1];
            carveCorridor(prev.cx, prev.cy, room.cx, room.cy);
        }
        rooms.push(room);
    }

    // Build 3D Map
    const floorGeo = new THREE.BoxGeometry(TILE_SIZE, 0.5, TILE_SIZE);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const wallGeo = new THREE.BoxGeometry(TILE_SIZE, TILE_SIZE, TILE_SIZE);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2d3436 });

    for (let r = 0; r < MAP_SIZE; r++) {
        for (let c = 0; c < MAP_SIZE; c++) {
            let px = (c - MAP_SIZE/2) * TILE_SIZE;
            let pz = (r - MAP_SIZE/2) * TILE_SIZE;
            
            if (mapGrid[r][c] === 1) {
                let f = new THREE.Mesh(floorGeo, floorMat);
                f.position.set(px, 0, pz);
                f.receiveShadow = true;
                levelGroup.add(f);
            } else {
                let w = new THREE.Mesh(wallGeo, wallMat);
                w.position.set(px, TILE_SIZE/2, pz);
                w.castShadow = true;
                w.receiveShadow = true;
                levelGroup.add(w);
            }
        }
    }

    // Place Player in first room
    player.mesh.position.set(
        (rooms[0].cx - MAP_SIZE/2) * TILE_SIZE, 
        1, 
        (rooms[0].cy - MAP_SIZE/2) * TILE_SIZE
    );

    // Place Stairs in last room
    const stairGeo = new THREE.BoxGeometry(2, 0.2, 2);
    const stairMat = new THREE.MeshStandardMaterial({ color: 0x00cec9, emissive: 0x00cec9, emissiveIntensity: 0.5 });
    stairsMesh = new THREE.Mesh(stairGeo, stairMat);
    stairsMesh.position.set((rooms[rooms.length-1].cx - MAP_SIZE/2) * TILE_SIZE, 0.5, (rooms[rooms.length-1].cy - MAP_SIZE/2) * TILE_SIZE);
    scene.add(stairsMesh);

    // Spawn Enemies and Items in other rooms
    for (let i = 1; i < rooms.length; i++) {
        let px = (rooms[i].cx - MAP_SIZE/2) * TILE_SIZE;
        let pz = (rooms[i].cy - MAP_SIZE/2) * TILE_SIZE;
        
        // Enemy
        if (Math.random() > 0.2) spawnEnemy(px, pz);
        
        // Item
        if (Math.random() > 0.6) spawnItem(px + 2, pz - 2);
    }
}

function carveCorridor(x1, y1, x2, y2) {
    let x = x1; let y = y1;
    while (x !== x2) { mapGrid[y][x] = 1; x += Math.sign(x2 - x); }
    while (y !== y2) { mapGrid[y][x] = 1; y += Math.sign(y2 - y); }
}

function spawnEnemy(x, z) {
    const geo = new THREE.BoxGeometry(1.5, 2, 1.5);
    const mat = new THREE.MeshStandardMaterial({ color: 0xd63031 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 1, z);
    mesh.castShadow = true;
    scene.add(mesh);
    
    enemies.push({
        mesh, hp: 30 + (player.floor * 10), dmg: 5 + player.floor * 2, speed: 6 + Math.random()*2, radius: 1, attackCooldown: 0
    });
}

function spawnItem(x, z) {
    const types = ['heal', 'dmg', 'speed'];
    const type = types[Math.floor(Math.random() * types.length)];
    const colors = { heal: 0x00b894, dmg: 0xd63031, speed: 0xfdccb6 };
    
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: colors[type] });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.5, z);
    scene.add(mesh);
    
    items.push({ mesh, type, radius: 1 });
}

// --- Gameplay Mechanics ---
function attack() {
    // Attack animation (visual only - quick box)
    const atkGeo = new THREE.BoxGeometry(3, 1, 2);
    const atkMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
    const slash = new THREE.Mesh(atkGeo, atkMat);
    slash.position.copy(player.mesh.position);
    slash.rotation.copy(player.mesh.rotation);
    slash.translateZ(-2); // Move in front of player
    scene.add(slash);
    
    setTimeout(() => scene.remove(slash), 100);

    // Damage calculation (Cone/distance based)
    const pPos = player.mesh.position;
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        let d = pPos.distanceTo(e.mesh.position);
        if (d < 4) {
            e.hp -= player.dmg;
            if (e.hp <= 0) {
                scene.remove(e.mesh);
                enemies.splice(i, 1);
                gainXp(20 + player.floor * 5);
            } else {
                // Knockback
                let dir = e.mesh.position.clone().sub(pPos).normalize();
                e.mesh.position.add(dir.multiplyScalar(1));
            }
        }
    }
}

function gainXp(amount) {
    player.xp += amount;
    if (player.xp >= player.maxXp) {
        player.xp -= player.maxXp;
        player.maxXp = Math.floor(player.maxXp * 1.5);
        player.level++;
        gameState = 'LEVELUP';
        document.getElementById('levelup-screen').classList.remove('hidden');
    }
    updateHUD();
}

function applyUpgrade(type) {
    if (type === 'hp') { player.maxHp += 20; player.hp = player.maxHp; }
    if (type === 'dmg') player.dmg += 10;
    if (type === 'spd') player.speed += 2;
    
    document.getElementById('levelup-screen').classList.add('hidden');
    gameState = 'PLAY';
    updateHUD();
}

function checkCollisions(pos, radius) {
    let r = Math.floor(pos.z / TILE_SIZE + MAP_SIZE/2);
    let c = Math.floor(pos.x / TILE_SIZE + MAP_SIZE/2);
    if (r < 0 || r >= MAP_SIZE || c < 0 || c >= MAP_SIZE) return true;
    return mapGrid[r][c] === 0;
}

// --- Main Loop ---
function update(dt) {
    if (gameState !== 'PLAY') return;

    // Player Rotation (Mouse Aim)
    raycaster.setFromCamera(mouse, camera);
    raycaster.ray.intersectPlane(floorPlane, mouse);
    let target = new THREE.Vector3(raycaster.ray.origin.x + raycaster.ray.direction.x * (raycaster.ray.origin.y / -raycaster.ray.direction.y), 1, raycaster.ray.origin.z + raycaster.ray.direction.z * (raycaster.ray.origin.y / -raycaster.ray.direction.y));
    player.mesh.lookAt(target);

    // Player Movement
    let move = new THREE.Vector3();
    if (keys.w) move.z -= 1;
    if (keys.s) move.z += 1;
    if (keys.a) move.x -= 1;
    if (keys.d) move.x += 1;
    
    if (move.length() > 0) {
        move.normalize().multiplyScalar(player.speed * dt);
        let nextPos = player.mesh.position.clone().add(move);
        if (!checkCollisions(nextPos, player.radius)) {
            player.mesh.position.copy(nextPos);
        }
    }

    // Camera follow
    camera.position.x = player.mesh.position.x;
    camera.position.z = player.mesh.position.z + 15;
    camera.position.y = 20;
    camera.lookAt(player.mesh.position);

    // Enemy AI
    enemies.forEach(e => {
        if (e.attackCooldown > 0) e.attackCooldown -= dt;
        
        let dist = e.mesh.position.distanceTo(player.mesh.position);
        if (dist < 15 && dist > 1.5) {
            // Chase
            let dir = player.mesh.position.clone().sub(e.mesh.position).normalize();
            let nextPos = e.mesh.position.clone().add(dir.multiplyScalar(e.speed * dt));
            if (!checkCollisions(nextPos, e.radius)) {
                e.mesh.position.copy(nextPos);
            }
            e.mesh.lookAt(player.mesh.position);
        } else if (dist <= 1.5 && e.attackCooldown <= 0) {
            // Attack
            player.hp -= e.dmg;
            e.attackCooldown = 1.0;
            updateHUD();
            if (player.hp <= 0) gameOver();
        }
    });

    // Item Collection
    for (let i = items.length - 1; i >= 0; i--) {
        let item = items[i];
        item.mesh.rotation.y += dt;
        if (player.mesh.position.distanceTo(item.mesh.position) < 2) {
            if (item.type === 'heal') player.hp = Math.min(player.maxHp, player.hp + 30);
            if (item.type === 'dmg') player.dmg += 5;
            if (item.type === 'speed') player.speed += 1;
            scene.remove(item.mesh);
            items.splice(i, 1);
            updateHUD();
        }
    }

    // Stairs / Next Level
    if (stairsMesh && player.mesh.position.distanceTo(stairsMesh.position) < 2) {
        player.floor++;
        updateHUD();
        generateMap();
    }
}

function gameLoop(time) {
    let dt = (time - lastTime) / 1000;
    lastTime = time;
    
    update(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(gameLoop);
}

// --- Game State Management ---
function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    generateMap();
    updateHUD();
    gameState = 'PLAY';
}

function resetGame() {
    player = { mesh: player.mesh, hp: 100, maxHp: 100, dmg: 25, speed: 15, xp: 0, maxXp: 100, level: 1, floor: 1, radius: 1 };
    document.getElementById('gameover-screen').classList.add('hidden');
    generateMap();
    updateHUD();
    gameState = 'PLAY';
}

function gameOver() {
    gameState = 'GAMEOVER';
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('gameover-screen').classList.remove('hidden');
    document.getElementById('final-floor').innerText = player.floor;
    document.getElementById('final-level').innerText = player.level;
}

function updateHUD() {
    document.getElementById('hp-val').innerText = Math.max(0, Math.floor(player.hp));
    document.getElementById('max-hp-val').innerText = player.maxHp;
    document.getElementById('lvl-val').innerText = player.level;
    document.getElementById('floor-val').innerText = player.floor;
    document.getElementById('dmg-val').innerText = player.dmg;
    document.getElementById('spd-val').innerText = player.speed;
    document.getElementById('xp-bar').style.width = `${(player.xp / player.maxXp) * 100}%`;
}

// Run init on load
init();