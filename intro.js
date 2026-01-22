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
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Mobile touch controls
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.joystickActive = false;
        this.joystickX = 0;
        this.joystickY = 0;
        
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
        this.camera.position.set(0, 1.6, 12);

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
        this.createDirectionalArrows();
        this.create3DSign();
        this.createUIOverlay();

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

    createDirectionalArrows() {
        // Create arrow path leading to the light
        this.arrows = [];
        const arrowCount = 5;
        
        for (let i = 0; i < arrowCount; i++) {
            const arrowGroup = new THREE.Group();
            
            // Arrow shape
            const arrowShape = new THREE.Shape();
            arrowShape.moveTo(0, 0.5);
            arrowShape.lineTo(0.3, 0);
            arrowShape.lineTo(0.1, 0);
            arrowShape.lineTo(0.1, -0.5);
            arrowShape.lineTo(-0.1, -0.5);
            arrowShape.lineTo(-0.1, 0);
            arrowShape.lineTo(-0.3, 0);
            arrowShape.lineTo(0, 0.5);
            
            const arrowGeometry = new THREE.ShapeGeometry(arrowShape);
            const arrowMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide
            });
            
            const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
            arrow.rotation.x = -Math.PI / 2;
            arrow.rotation.z = Math.PI;
            arrowGroup.add(arrow);
            
            // Position arrows along the path
            const t = i / arrowCount;
            arrowGroup.position.set(0, 0.1, 10 - (t * 22));
            arrowGroup.scale.setScalar(0.8);
            
            this.scene.add(arrowGroup);
            this.arrows.push({ mesh: arrowGroup, baseOpacity: 0.6, offset: i * 0.5 });
        }
    }

    create3DSign() {
        // Create floating sign with instruction text
        const signGroup = new THREE.Group();
        
        // Sign background
        const signGeometry = new THREE.PlaneGeometry(6, 1.5);
        const signMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        const signBg = new THREE.Mesh(signGeometry, signMaterial);
        signGroup.add(signBg);
        
        // Sign border
        const borderGeometry = new THREE.EdgesGeometry(signGeometry);
        const borderMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });
        const border = new THREE.LineSegments(borderGeometry, borderMaterial);
        signGroup.add(border);
        
        // Position sign
        signGroup.position.set(0, 2.5, 8);
        this.instructionSign = signGroup;
        this.scene.add(signGroup);
    }

    createUIOverlay() {
        // Create HTML overlay for instructions
        const overlay = document.createElement('div');
        overlay.id = 'game-ui-overlay';
        overlay.innerHTML = `
            <div class="instruction-text" id="instruction-text">
                <span class="key-prompt">${this.isMobile ? 'PUSH FORWARD' : 'PRESS W'}</span>
                <span class="instruction-label">to move forward</span>
            </div>
            <div class="enter-light-text" id="enter-light-text">
                ENTER THE LIGHT
            </div>
            <div class="direction-indicator" id="direction-indicator">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 19V5M5 12l7-7 7 7"/>
                </svg>
            </div>
        `;
        this.container.appendChild(overlay);
    }

    setupControls() {
        const blocker = document.getElementById('intro-blocker');
        const instructions = document.getElementById('intro-instructions');

        // Start function for both mobile and desktop
        const startExperience = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (this.isMobile) {
                blocker.style.display = 'none';
                this.isLocked = true;
                this.setupMobileControls();
            } else {
                this.container.requestPointerLock();
            }
        };

        if (this.isMobile) {
            // Mobile: Tap to start - use both touch and click for compatibility
            instructions.addEventListener('touchend', startExperience, { passive: false });
            instructions.addEventListener('click', startExperience);
        } else {
            // Desktop: Pointer lock
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

            // Mouse look
            document.addEventListener('mousemove', (event) => this.onMouseMove(event));
        }

        // Keyboard controls (works on both)
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
        document.addEventListener('keyup', (event) => this.onKeyUp(event));

        // Skip intro link
        const skipLink = document.getElementById('skip-intro');
        if (skipLink) {
            const skipHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.enterLight();
            };
            skipLink.addEventListener('click', skipHandler);
            skipLink.addEventListener('touchend', skipHandler, { passive: false });
        }
    }

    setupMobileControls() {
        // Create mobile UI
        this.createMobileUI();

        // Touch look controls (right side of screen)
        this.container.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        this.container.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        this.container.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
    }

    createMobileUI() {
        // Create forward button (simpler than joystick since only forward is allowed)
        const forwardBtn = document.createElement('div');
        forwardBtn.id = 'mobile-forward-btn';
        forwardBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 19V5M5 12l7-7 7 7"/>
            </svg>
            <span>HOLD TO WALK</span>
        `;
        this.container.appendChild(forwardBtn);

        // Create enter button (shown when near light)
        const enterBtn = document.createElement('div');
        enterBtn.id = 'mobile-enter-btn';
        enterBtn.innerHTML = '<span>TAP TO ENTER</span>';
        enterBtn.style.display = 'none';
        enterBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.enterLight();
        }, { passive: false });
        enterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.enterLight();
        });
        this.container.appendChild(enterBtn);

        // Forward button controls
        forwardBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.joystickActive = true;
            this.joystickY = -1; // Forward
            forwardBtn.classList.add('active');
        }, { passive: false });

        forwardBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.joystickActive = false;
            this.joystickY = 0;
            forwardBtn.classList.remove('active');
        }, { passive: false });

        forwardBtn.addEventListener('touchcancel', (e) => {
            this.joystickActive = false;
            this.joystickY = 0;
            forwardBtn.classList.remove('active');
        }, { passive: false });
    }

    updateJoystick(e, base, stick) {
        const rect = base.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const touch = e.touches[0];
        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;
        
        // Limit to circle
        const maxDist = rect.width / 2 - 20;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
        }
        
        stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        
        // Normalize to -1 to 1
        this.joystickX = dx / maxDist;
        this.joystickY = dy / maxDist;
    }

    onTouchStart(e) {
        if (e.target.closest('#mobile-joystick')) return;
        
        const touch = e.touches[0];
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
    }

    onTouchMove(e) {
        if (e.target.closest('#mobile-joystick')) return;
        if (!this.isLocked) return;
        
        e.preventDefault();
        
        const touch = e.touches[0];
        const dx = touch.clientX - this.touchStartX;
        const dy = touch.clientY - this.touchStartY;
        
        // Rotate camera
        this.camera.rotation.y -= dx * 0.003;
        this.camera.rotation.x -= dy * 0.003;
        
        // Clamp vertical rotation
        this.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotation.x));
        
        this.touchStartX = touch.clientX;
        this.touchStartY = touch.clientY;
    }

    onTouchEnd(e) {
        // Nothing needed here
    }

    onKeyDown(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveForward = true;
                break;
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.moveForward = false;
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
        
        // Update UI hint (old)
        const hint = document.getElementById('intro-hint');
        if (hint) hint.style.display = 'none';
        
        // Update "Enter the Light" text
        const enterLightText = document.getElementById('enter-light-text');
        const instructionText = document.getElementById('instruction-text');
        
        if (enterLightText) {
            if (distance < 10) {
                enterLightText.classList.add('visible');
                if (instructionText) instructionText.classList.add('fade-out');
            } else {
                enterLightText.classList.remove('visible');
                if (instructionText) instructionText.classList.remove('fade-out');
            }
        }

        // Mobile enter button
        if (this.isMobile) {
            const enterBtn = document.getElementById('mobile-enter-btn');
            if (enterBtn) {
                if (distance < 8) {
                    enterBtn.style.display = 'flex';
                } else {
                    enterBtn.style.display = 'none';
                }
            }
        }

        // Auto-enter when very close
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

            // Only forward movement allowed
            if (this.isMobile && this.joystickActive) {
                // On mobile, only use forward component (negative Y on joystick)
                this.direction.z = Math.max(0, -this.joystickY);
                this.direction.x = 0;
            } else {
                this.direction.z = Number(this.moveForward);
                this.direction.x = 0;
            }
            
            if (this.direction.length() > 0) {
                this.direction.normalize();
            }

            const speed = 3;
            if (Math.abs(this.direction.z) > 0.1) {
                this.velocity.z -= this.direction.z * speed * delta * 50;
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

        // Animate directional arrows (pulsing wave effect)
        if (this.arrows) {
            this.arrows.forEach((arrow, index) => {
                const wave = Math.sin(time * 0.003 - arrow.offset) * 0.5 + 0.5;
                arrow.mesh.children[0].material.opacity = arrow.baseOpacity * wave;
                arrow.mesh.position.y = 0.1 + wave * 0.1;
            });
        }

        // Make instruction sign face camera
        if (this.instructionSign) {
            this.instructionSign.lookAt(this.camera.position);
        }

        // Check if near the light
        this.checkProximityToLight();

        this.prevTime = time;
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new IntroExperience();
});
