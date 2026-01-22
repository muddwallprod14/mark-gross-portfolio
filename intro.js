// Three.js Intro - Walk to the Light
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

class IntroExperience {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.light = null;
        this.lightOrb = null;
        this.particles = null;
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.prevTime = performance.now();
        this.isLocked = false;
        this.hasEntered = false;
        
        this.init();
    }

    init() {
        // Create container
        this.container = document.getElementById('intro-container');
        
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        this.scene.fog = new THREE.FogExp2(0x000000, 0.05);

        // Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 1.6, 20);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1;
        this.container.appendChild(this.renderer.domElement);

        // Create environment
        this.createGround();
        this.createLightOrb();
        this.createParticles();
        this.createAmbientLights();
        this.createGridLines();

        // Controls
        this.setupControls();

        // Events
        window.addEventListener('resize', () => this.onResize());
        
        // Start animation
        this.animate();
    }

    createGround() {
        // Ground plane with grid
        const groundGeometry = new THREE.PlaneGeometry(200, 200, 50, 50);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x0a0a0a,
            metalness: 0.8,
            roughness: 0.4,
            wireframe: false
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0;
        this.scene.add(ground);

        // Reflective ground
        const mirrorGeometry = new THREE.PlaneGeometry(200, 200);
        const mirrorMaterial = new THREE.MeshStandardMaterial({
            color: 0x050510,
            metalness: 1,
            roughness: 0.1,
            envMapIntensity: 0.5
        });
        const mirror = new THREE.Mesh(mirrorGeometry, mirrorMaterial);
        mirror.rotation.x = -Math.PI / 2;
        mirror.position.y = -0.01;
        this.scene.add(mirror);
    }

    createGridLines() {
        // Neon grid lines
        const gridHelper = new THREE.GridHelper(200, 100, 0x00ffff, 0x001a1a);
        gridHelper.position.y = 0.01;
        gridHelper.material.opacity = 0.3;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);
    }

    createLightOrb() {
        // The target light orb/portal
        const orbGroup = new THREE.Group();
        
        // Core sphere
        const coreGeometry = new THREE.SphereGeometry(1, 32, 32);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 1
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        orbGroup.add(core);

        // Outer glow
        const glowGeometry = new THREE.SphereGeometry(1.5, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        orbGroup.add(glow);

        // Outer ring
        const ringGeometry = new THREE.TorusGeometry(2.5, 0.05, 16, 100);
        const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const ring1 = new THREE.Mesh(ringGeometry, ringMaterial);
        ring1.rotation.x = Math.PI / 2;
        orbGroup.add(ring1);

        const ring2 = new THREE.Mesh(ringGeometry, ringMaterial);
        ring2.rotation.y = Math.PI / 2;
        orbGroup.add(ring2);

        // Point light
        const pointLight = new THREE.PointLight(0x00ffff, 100, 50);
        orbGroup.add(pointLight);

        orbGroup.position.set(0, 2, -15);
        this.lightOrb = orbGroup;
        this.scene.add(orbGroup);

        // Store references for animation
        this.orbCore = core;
        this.orbGlow = glow;
        this.orbRings = [ring1, ring2];
    }

    createParticles() {
        const particleCount = 2000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 1] = Math.random() * 30;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 100;

            // Cyan-ish colors
            colors[i * 3] = 0;
            colors[i * 3 + 1] = Math.random() * 0.5 + 0.5;
            colors[i * 3 + 2] = Math.random() * 0.5 + 0.5;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    createAmbientLights() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0x111122, 0.5);
        this.scene.add(ambient);

        // Directional light
        const directional = new THREE.DirectionalLight(0x00aaff, 0.3);
        directional.position.set(0, 10, 0);
        this.scene.add(directional);
    }

    setupControls() {
        const blocker = document.getElementById('intro-blocker');
        const instructions = document.getElementById('intro-instructions');

        // Click to start
        instructions.addEventListener('click', () => {
            this.container.requestPointerLock();
        });

        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement === this.container) {
                this.isLocked = true;
                blocker.style.display = 'none';
            } else {
                this.isLocked = false;
                if (!this.hasEntered) {
                    blocker.style.display = 'flex';
                }
            }
        });

        // Keyboard controls
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
        document.addEventListener('keyup', (event) => this.onKeyUp(event));

        // Mouse look
        document.addEventListener('mousemove', (event) => this.onMouseMove(event));
    }

    onKeyDown(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveForward = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.moveLeft = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.moveBackward = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.moveRight = true;
                break;
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveForward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.moveLeft = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.moveBackward = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.moveRight = false;
                break;
        }
    }

    onMouseMove(event) {
        if (!this.isLocked) return;

        const movementX = event.movementX || 0;
        const movementY = event.movementY || 0;

        // Rotate camera
        this.camera.rotation.y -= movementX * 0.002;
        this.camera.rotation.x -= movementY * 0.002;

        // Clamp vertical rotation
        this.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotation.x));
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    checkProximityToLight() {
        const distance = this.camera.position.distanceTo(this.lightOrb.position);
        
        // Update UI hint
        const hint = document.getElementById('intro-hint');
        if (distance < 20) {
            hint.style.opacity = 1 - (distance - 5) / 15;
        } else {
            hint.style.opacity = 0;
        }

        // Enter the light
        if (distance < 4 && !this.hasEntered) {
            this.enterLight();
        }
    }

    enterLight() {
        this.hasEntered = true;
        document.exitPointerLock();
        
        // Fade out intro
        const introContainer = document.getElementById('intro-container');
        const mainContent = document.getElementById('main-content');
        
        introContainer.style.transition = 'opacity 1.5s ease-out';
        introContainer.style.opacity = '0';
        
        // Show main content
        setTimeout(() => {
            introContainer.style.display = 'none';
            mainContent.style.display = 'block';
            mainContent.style.opacity = '0';
            
            requestAnimationFrame(() => {
                mainContent.style.transition = 'opacity 1s ease-in';
                mainContent.style.opacity = '1';
            });
            
            // Scroll to top
            window.scrollTo(0, 0);
        }, 1500);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const time = performance.now();
        const delta = (time - this.prevTime) / 1000;

        // Movement
        if (this.isLocked) {
            this.velocity.x -= this.velocity.x * 10.0 * delta;
            this.velocity.z -= this.velocity.z * 10.0 * delta;

            this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
            this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
            this.direction.normalize();

            const speed = 8;
            if (this.moveForward || this.moveBackward) {
                this.velocity.z -= this.direction.z * speed * delta * 50;
            }
            if (this.moveLeft || this.moveRight) {
                this.velocity.x -= this.direction.x * speed * delta * 50;
            }

            // Apply movement in camera direction
            const forward = new THREE.Vector3();
            this.camera.getWorldDirection(forward);
            forward.y = 0;
            forward.normalize();

            const right = new THREE.Vector3();
            right.crossVectors(forward, new THREE.Vector3(0, 1, 0));

            this.camera.position.add(forward.multiplyScalar(-this.velocity.z * delta));
            this.camera.position.add(right.multiplyScalar(-this.velocity.x * delta));

            // Keep camera at eye level
            this.camera.position.y = 1.6;
        }

        // Animate light orb
        if (this.lightOrb) {
            this.lightOrb.position.y = 2 + Math.sin(time * 0.001) * 0.3;
            this.orbRings[0].rotation.z += 0.01;
            this.orbRings[1].rotation.x += 0.01;
            
            // Pulse effect
            const pulse = Math.sin(time * 0.003) * 0.2 + 1;
            this.orbCore.scale.setScalar(pulse);
            this.orbGlow.scale.setScalar(pulse * 1.2);
        }

        // Animate particles
        if (this.particles) {
            this.particles.rotation.y += 0.0002;
            const positions = this.particles.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] += Math.sin(time * 0.001 + positions[i]) * 0.002;
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
        }

        // Check if near the light
        this.checkProximityToLight();

        this.prevTime = time;
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if intro should be shown (not on mobile for performance)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // Skip intro on mobile
        document.getElementById('intro-container').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
    } else {
        new IntroExperience();
    }
});
