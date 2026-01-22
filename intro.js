// Three.js Intro - PS2 Style Walk to the Light
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/postprocessing/ShaderPass.js';

// PS2 Style Post-Processing Shader
const PS2Shader = {
    uniforms: {
        'tDiffuse': { value: null },
        'time': { value: 0 },
        'resolution': { value: new THREE.Vector2(320, 240) }, // PS2-like resolution
        'sepiaAmount': { value: 0.7 },
        'noiseAmount': { value: 0.08 },
        'scanlineAmount': { value: 0.15 },
        'vignetteAmount': { value: 0.4 },
        'ditherAmount': { value: 0.03 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float time;
        uniform vec2 resolution;
        uniform float sepiaAmount;
        uniform float noiseAmount;
        uniform float scanlineAmount;
        uniform float vignetteAmount;
        uniform float ditherAmount;
        varying vec2 vUv;
        
        // Pseudo-random noise
        float rand(vec2 co) {
            return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
        }
        
        // Dithering pattern (PS2 style)
        float dither4x4(vec2 position, float brightness) {
            int x = int(mod(position.x, 4.0));
            int y = int(mod(position.y, 4.0));
            int index = x + y * 4;
            float limit = 0.0;
            
            if (index == 0) limit = 0.0625;
            else if (index == 1) limit = 0.5625;
            else if (index == 2) limit = 0.1875;
            else if (index == 3) limit = 0.6875;
            else if (index == 4) limit = 0.8125;
            else if (index == 5) limit = 0.3125;
            else if (index == 6) limit = 0.9375;
            else if (index == 7) limit = 0.4375;
            else if (index == 8) limit = 0.25;
            else if (index == 9) limit = 0.75;
            else if (index == 10) limit = 0.125;
            else if (index == 11) limit = 0.625;
            else if (index == 12) limit = 1.0;
            else if (index == 13) limit = 0.5;
            else if (index == 14) limit = 0.875;
            else limit = 0.375;
            
            return brightness < limit ? 0.0 : 1.0;
        }
        
        void main() {
            // Pixelate UV coordinates (low resolution effect)
            vec2 pixelatedUV = floor(vUv * resolution) / resolution;
            
            // Sample texture with slight chromatic aberration
            float aberration = 0.002;
            vec4 color;
            color.r = texture2D(tDiffuse, pixelatedUV + vec2(aberration, 0.0)).r;
            color.g = texture2D(tDiffuse, pixelatedUV).g;
            color.b = texture2D(tDiffuse, pixelatedUV - vec2(aberration, 0.0)).b;
            color.a = 1.0;
            
            // Sepia tone (warm PS2 browns)
            vec3 sepia;
            sepia.r = dot(color.rgb, vec3(0.393, 0.769, 0.189));
            sepia.g = dot(color.rgb, vec3(0.349, 0.686, 0.168));
            sepia.b = dot(color.rgb, vec3(0.272, 0.534, 0.131));
            color.rgb = mix(color.rgb, sepia, sepiaAmount);
            
            // Warm color push (more orange/brown)
            color.rgb *= vec3(1.1, 0.95, 0.8);
            
            // Add film grain noise
            float noise = rand(pixelatedUV + time * 0.01) * noiseAmount;
            color.rgb += noise - noiseAmount * 0.5;
            
            // Scanlines
            float scanline = sin(vUv.y * resolution.y * 3.14159) * 0.5 + 0.5;
            color.rgb -= scanline * scanlineAmount;
            
            // Vignette
            vec2 center = vUv - 0.5;
            float vignette = 1.0 - dot(center, center) * vignetteAmount * 2.0;
            color.rgb *= vignette;
            
            // Dithering (optional subtle effect)
            vec2 ditherCoord = vUv * resolution;
            float dither = (rand(ditherCoord + time) - 0.5) * ditherAmount;
            color.rgb += dither;
            
            // Color quantization (limited color palette like PS2)
            color.rgb = floor(color.rgb * 32.0) / 32.0;
            
            // Slight color bleeding/bloom on bright areas
            float brightness = dot(color.rgb, vec3(0.299, 0.587, 0.114));
            if (brightness > 0.7) {
                color.rgb += vec3(0.05, 0.03, 0.01);
            }
            
            gl_FragColor = color;
        }
    `
};

class IntroExperience {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.canvas = null;
        this.composer = null;
        this.ps2Pass = null;
        this.light = null;
        this.lightOrb = null;
        this.particles = null;
        this.towers = [];
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.prevTime = performance.now();
        this.isLocked = false;
        this.hasEntered = false;
        this.controlsSetup = false;
        
        // Improved mobile detection
        this.isMobile = this.detectMobile();
        
        // Mobile touch controls
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.lastTouchX = 0;
        this.lastTouchY = 0;
        this.joystickActive = false;
        this.joystickX = 0;
        this.joystickY = 0;
        this.lookTouchId = null;
        this.joystickTouchId = null;
        
        // PS2 vertex wobble
        this.wobbleTime = 0;
        
        this.init();
    }

    detectMobile() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isSmallScreen = window.innerWidth <= 768;
        
        return mobileRegex.test(userAgent) || (isTouchDevice && isSmallScreen);
    }

    init() {
        this.container = document.getElementById('intro-container');
        if (!this.container) {
            console.error('Intro container not found');
            return;
        }
        
        // Scene with dark void
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0805); // Dark sepia
        this.scene.fog = new THREE.FogExp2(0x0a0805, 0.04);

        // Camera
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 1.6, 15);

        // Renderer with lower resolution for PS2 feel
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: false, // No antialiasing for that crispy PS2 look
            alpha: false,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(1); // Force pixel ratio of 1 for pixelated look
        
        this.canvas = this.renderer.domElement;
        this.canvas.id = 'intro-canvas';
        this.container.appendChild(this.canvas);

        // Setup post-processing
        this.setupPostProcessing();

        // Create PS2-style environment
        this.createPS2Ground();
        this.createPS2Towers();
        this.createLightPortal();
        this.createPS2Particles();
        this.createAmbientLights();
        this.createUIOverlay();

        // Controls
        this.setupControls();

        // Events
        window.addEventListener('resize', () => this.onResize());
        
        this.container.addEventListener('touchmove', (e) => {
            if (this.isLocked) e.preventDefault();
        }, { passive: false });
        
        this.animate();
        
        console.log('PS2 Intro initialized. Mobile:', this.isMobile);
    }

    setupPostProcessing() {
        this.composer = new EffectComposer(this.renderer);
        
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);
        
        this.ps2Pass = new ShaderPass(PS2Shader);
        this.ps2Pass.uniforms.resolution.value.set(
            Math.floor(window.innerWidth / 3),
            Math.floor(window.innerHeight / 3)
        );
        this.composer.addPass(this.ps2Pass);
    }

    createPS2Ground() {
        // Low-poly ground plane
        const groundGeometry = new THREE.PlaneGeometry(200, 200, 20, 20);
        
        // Add vertex displacement for uneven ground
        const positions = groundGeometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 2] += (Math.random() - 0.5) * 0.3; // Subtle height variation
        }
        groundGeometry.computeVertexNormals();
        
        const groundMaterial = new THREE.MeshLambertMaterial({
            color: 0x1a1510,
            flatShading: true // Low-poly look
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0;
        this.scene.add(ground);

        // Simple grid lines (PS2 boot screen style)
        const gridMaterial = new THREE.LineBasicMaterial({ 
            color: 0x3a3020,
            transparent: true,
            opacity: 0.4
        });
        
        for (let i = -50; i <= 50; i += 5) {
            const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(i, 0.02, -50),
                new THREE.Vector3(i, 0.02, 50)
            ]);
            const line = new THREE.Line(lineGeometry, gridMaterial);
            this.scene.add(line);
            
            const lineGeometry2 = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-50, 0.02, i),
                new THREE.Vector3(50, 0.02, i)
            ]);
            const line2 = new THREE.Line(lineGeometry2, gridMaterial);
            this.scene.add(line2);
        }
    }

    createPS2Towers() {
        // Iconic PS2 memory card towers
        const towerCount = 40;
        const towerMaterial = new THREE.MeshLambertMaterial({
            color: 0x4a4030,
            flatShading: true
        });
        
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xd4a056,
            transparent: true,
            opacity: 0.6
        });

        for (let i = 0; i < towerCount; i++) {
            // Random position around the scene, but create a path to the light
            const angle = (i / towerCount) * Math.PI * 2;
            const radius = 8 + Math.random() * 25;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius - 5;
            
            // Varying heights like PS2 boot screen
            const height = 1 + Math.random() * 8;
            const width = 0.3 + Math.random() * 0.4;
            
            // Low-poly box tower
            const towerGeometry = new THREE.BoxGeometry(width, height, width, 1, 1, 1);
            const tower = new THREE.Mesh(towerGeometry, towerMaterial.clone());
            tower.position.set(x, height / 2, z);
            
            // Store for animation
            tower.userData = {
                baseY: height / 2,
                phase: Math.random() * Math.PI * 2,
                speed: 0.5 + Math.random() * 0.5
            };
            
            this.scene.add(tower);
            this.towers.push(tower);
            
            // Small glowing top (like PS2 tower tips)
            if (Math.random() > 0.5) {
                const tipGeometry = new THREE.BoxGeometry(width * 0.6, 0.2, width * 0.6);
                const tip = new THREE.Mesh(tipGeometry, glowMaterial.clone());
                tip.position.set(x, height + 0.1, z);
                this.scene.add(tip);
            }
        }
    }

    createLightPortal() {
        // The target light portal (warm sepia glow)
        const orbGroup = new THREE.Group();
        
        // Core - low poly icosahedron for that PS2 vibe
        const coreGeometry = new THREE.IcosahedronGeometry(1.2, 1);
        const coreMaterial = new THREE.MeshBasicMaterial({
            color: 0xf5d496, // Warm golden
            transparent: true,
            opacity: 0.9
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        orbGroup.add(core);

        // Outer glow
        const glowGeometry = new THREE.IcosahedronGeometry(2, 1);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xd4a056, // Sepia gold
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        orbGroup.add(glow);

        // Rotating rings (low poly)
        const ringGeometry = new THREE.TorusGeometry(2.5, 0.08, 6, 12);
        const ringMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xd4a056,
            transparent: true,
            opacity: 0.7
        });
        const ring1 = new THREE.Mesh(ringGeometry, ringMaterial);
        ring1.rotation.x = Math.PI / 2;
        orbGroup.add(ring1);

        const ring2 = new THREE.Mesh(ringGeometry, ringMaterial);
        ring2.rotation.y = Math.PI / 2;
        orbGroup.add(ring2);

        // Point light (warm color)
        const pointLight = new THREE.PointLight(0xd4a056, 80, 40);
        orbGroup.add(pointLight);

        orbGroup.position.set(0, 2.5, -20);
        this.lightOrb = orbGroup;
        this.scene.add(orbGroup);

        this.orbCore = core;
        this.orbGlow = glow;
        this.orbRings = [ring1, ring2];
    }

    createPS2Particles() {
        // Floating dust particles (PS2 boot screen style)
        const particleCount = 500;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 60;
            positions[i * 3 + 1] = Math.random() * 20;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // Simple square particles
        const material = new THREE.PointsMaterial({
            color: 0xd4a056,
            size: 0.15,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    createAmbientLights() {
        // Warm ambient (sepia tones)
        const ambient = new THREE.AmbientLight(0x2a2015, 0.6);
        this.scene.add(ambient);

        // Directional with warm color
        const directional = new THREE.DirectionalLight(0xd4a056, 0.4);
        directional.position.set(5, 10, 5);
        this.scene.add(directional);
        
        // Back light for depth
        const backLight = new THREE.DirectionalLight(0x3a3020, 0.2);
        backLight.position.set(-5, 5, -10);
        this.scene.add(backLight);
    }

    createUIOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'game-ui-overlay';
        overlay.innerHTML = `
            <div class="instruction-text" id="instruction-text">
                <span class="key-prompt">${this.isMobile ? 'USE JOYSTICK' : 'WASD'}</span>
                <span class="instruction-label">to move</span>
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

        if (!blocker || !instructions) {
            console.error('Blocker or instructions not found');
            return;
        }

        if (!this.isMobile) {
            instructions.addEventListener('click', () => {
                if (this.canvas.requestPointerLock) {
                    this.canvas.requestPointerLock();
                } else if (this.canvas.mozRequestPointerLock) {
                    this.canvas.mozRequestPointerLock();
                } else if (this.canvas.webkitRequestPointerLock) {
                    this.canvas.webkitRequestPointerLock();
                }
            });

            const onPointerLockChange = () => {
                const isLocked = document.pointerLockElement === this.canvas || 
                                 document.mozPointerLockElement === this.canvas ||
                                 document.webkitPointerLockElement === this.canvas;
                
                if (isLocked) {
                    this.isLocked = true;
                    blocker.style.display = 'none';
                } else {
                    this.isLocked = false;
                    if (!this.hasEntered) {
                        blocker.style.display = 'flex';
                        const clickText = instructions.querySelector('.click-text');
                        if (clickText) clickText.textContent = 'Click to Continue';
                        this.moveForward = false;
                        this.moveBackward = false;
                        this.moveLeft = false;
                        this.moveRight = false;
                        this.velocity.set(0, 0, 0);
                    }
                }
            };

            document.addEventListener('pointerlockchange', onPointerLockChange);
            document.addEventListener('mozpointerlockchange', onPointerLockChange);
            document.addEventListener('webkitpointerlockchange', onPointerLockChange);
            document.addEventListener('mousemove', (event) => this.onMouseMove(event));
        } else {
            this.setupMobileStartButton(blocker, instructions);
        }

        document.addEventListener('keydown', (event) => this.onKeyDown(event));
        document.addEventListener('keyup', (event) => this.onKeyUp(event));

        const skipLink = document.getElementById('skip-intro');
        if (skipLink) {
            const skipHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.enterLight();
            };
            skipLink.addEventListener('click', skipHandler);
            skipLink.addEventListener('touchstart', skipHandler, { passive: false });
        }
    }

    setupMobileStartButton(blocker, instructions) {
        const startButton = instructions.querySelector('.click-text');
        
        const startHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('Mobile start triggered');
            blocker.style.display = 'none';
            this.isLocked = true;
            
            if (!this.controlsSetup) {
                this.setupMobileControls();
                this.controlsSetup = true;
            }
        };
        
        if (startButton) {
            startButton.addEventListener('touchend', startHandler, { passive: false });
            startButton.addEventListener('click', startHandler);
        }
        
        instructions.addEventListener('touchend', (e) => {
            if (e.target.closest('#skip-intro') || e.target.closest('.skip-intro-link')) {
                return;
            }
            startHandler(e);
        }, { passive: false });
        
        instructions.addEventListener('click', (e) => {
            if (e.target.closest('#skip-intro') || e.target.closest('.skip-intro-link')) {
                return;
            }
            startHandler(e);
        });
        
        const skipLink = instructions.querySelector('#skip-intro');
        if (skipLink) {
            const skipHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.enterLight();
            };
            skipLink.addEventListener('touchend', skipHandler, { passive: false });
            skipLink.addEventListener('click', skipHandler);
        }
    }

    setupMobileControls() {
        console.log('Setting up mobile controls');
        this.createMobileUI();

        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });
        this.canvas.addEventListener('touchcancel', (e) => this.onTouchEnd(e), { passive: false });
    }

    createMobileUI() {
        if (document.getElementById('mobile-joystick')) {
            document.getElementById('mobile-joystick').style.display = 'block';
            return;
        }
        
        const joystickContainer = document.createElement('div');
        joystickContainer.id = 'mobile-joystick';
        joystickContainer.innerHTML = `
            <div class="joystick-base" id="joystick-base">
                <div class="joystick-stick" id="joystick-stick"></div>
            </div>
        `;
        joystickContainer.style.display = 'block';
        this.container.appendChild(joystickContainer);

        const enterBtn = document.createElement('div');
        enterBtn.id = 'mobile-enter-btn';
        enterBtn.innerHTML = '<span>TAP TO ENTER</span>';
        enterBtn.style.display = 'none';
        
        const enterHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.enterLight();
        };
        
        enterBtn.addEventListener('touchend', enterHandler, { passive: false });
        enterBtn.addEventListener('click', enterHandler);
        this.container.appendChild(enterBtn);

        const joystickBase = document.getElementById('joystick-base');
        const joystickStick = document.getElementById('joystick-stick');
        
        if (!joystickBase || !joystickStick) {
            console.error('Joystick elements not found');
            return;
        }

        joystickBase.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.joystickActive = true;
            this.joystickTouchId = e.touches[0].identifier;
            this.updateJoystick(e.touches[0], joystickBase, joystickStick);
        }, { passive: false });

        joystickBase.addEventListener('touchmove', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.joystickActive) {
                for (let i = 0; i < e.touches.length; i++) {
                    if (e.touches[i].identifier === this.joystickTouchId) {
                        this.updateJoystick(e.touches[i], joystickBase, joystickStick);
                        break;
                    }
                }
            }
        }, { passive: false });

        const joystickEndHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            let joystickTouchEnded = true;
            if (e.touches) {
                for (let i = 0; i < e.touches.length; i++) {
                    if (e.touches[i].identifier === this.joystickTouchId) {
                        joystickTouchEnded = false;
                        break;
                    }
                }
            }
            
            if (joystickTouchEnded) {
                this.joystickActive = false;
                this.joystickTouchId = null;
                this.joystickX = 0;
                this.joystickY = 0;
                joystickStick.style.transform = 'translate(-50%, -50%)';
            }
        };

        joystickBase.addEventListener('touchend', joystickEndHandler, { passive: false });
        joystickBase.addEventListener('touchcancel', joystickEndHandler, { passive: false });
        
        console.log('Mobile UI created');
    }

    updateJoystick(touch, base, stick) {
        const rect = base.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;
        
        const maxDist = rect.width / 2 - 20;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
        }
        
        stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        
        this.joystickX = dx / maxDist;
        this.joystickY = dy / maxDist;
    }

    onTouchStart(e) {
        if (e.target.closest('#mobile-joystick') || e.target.closest('#mobile-enter-btn')) {
            return;
        }
        
        if (!this.isLocked) return;
        
        const touch = e.touches[0];
        
        if (touch.clientX > window.innerWidth / 2) {
            this.lookTouchId = touch.identifier;
            this.lastTouchX = touch.clientX;
            this.lastTouchY = touch.clientY;
        }
    }

    onTouchMove(e) {
        if (!this.isLocked) return;
        
        if (this.lookTouchId !== null) {
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                if (touch.identifier === this.lookTouchId) {
                    e.preventDefault();
                    
                    const dx = touch.clientX - this.lastTouchX;
                    const dy = touch.clientY - this.lastTouchY;
                    
                    const sensitivity = 0.004;
                    this.camera.rotation.y -= dx * sensitivity;
                    this.camera.rotation.x -= dy * sensitivity;
                    
                    this.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotation.x));
                    
                    this.lastTouchX = touch.clientX;
                    this.lastTouchY = touch.clientY;
                    break;
                }
            }
        }
    }

    onTouchEnd(e) {
        if (this.lookTouchId !== null) {
            let lookTouchEnded = true;
            if (e.touches) {
                for (let i = 0; i < e.touches.length; i++) {
                    if (e.touches[i].identifier === this.lookTouchId) {
                        lookTouchEnded = false;
                        break;
                    }
                }
            }
            
            if (lookTouchEnded) {
                this.lookTouchId = null;
            }
        }
    }

    onKeyDown(event) {
        if (!this.isLocked && !this.isMobile) return;
        
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

        const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        this.camera.rotation.y -= movementX * 0.002;
        this.camera.rotation.x -= movementY * 0.002;

        this.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotation.x));
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
        
        // Update PS2 shader resolution
        if (this.ps2Pass) {
            this.ps2Pass.uniforms.resolution.value.set(
                Math.floor(window.innerWidth / 3),
                Math.floor(window.innerHeight / 3)
            );
        }
        
        const wasMobile = this.isMobile;
        this.isMobile = this.detectMobile();
        
        if (wasMobile !== this.isMobile) {
            console.log('Device type changed. Mobile:', this.isMobile);
        }
    }

    checkProximityToLight() {
        if (!this.lightOrb) return;
        
        const distance = this.camera.position.distanceTo(this.lightOrb.position);
        
        const enterLightText = document.getElementById('enter-light-text');
        const instructionText = document.getElementById('instruction-text');
        
        if (enterLightText) {
            if (distance < 12) {
                enterLightText.classList.add('visible');
                if (instructionText) instructionText.classList.add('fade-out');
            } else {
                enterLightText.classList.remove('visible');
                if (instructionText) instructionText.classList.remove('fade-out');
            }
        }

        if (this.isMobile) {
            const enterBtn = document.getElementById('mobile-enter-btn');
            if (enterBtn) {
                if (distance < 10) {
                    enterBtn.style.display = 'flex';
                } else {
                    enterBtn.style.display = 'none';
                }
            }
        }

        if (distance < 5 && !this.hasEntered) {
            this.enterLight();
        }
    }

    enterLight() {
        if (this.hasEntered) return;
        
        this.hasEntered = true;
        console.log('Entering light - transitioning to portfolio');
        
        if (document.exitPointerLock) {
            document.exitPointerLock();
        }
        
        const introContainer = document.getElementById('intro-container');
        const mainContent = document.getElementById('main-content');
        
        if (!introContainer || !mainContent) {
            console.error('Container elements not found for transition');
            return;
        }
        
        introContainer.style.transition = 'opacity 1.5s ease-out';
        introContainer.style.opacity = '0';
        
        setTimeout(() => {
            introContainer.style.display = 'none';
            mainContent.style.display = 'block';
            mainContent.style.opacity = '0';
            
            requestAnimationFrame(() => {
                mainContent.style.transition = 'opacity 1s ease-in';
                mainContent.style.opacity = '1';
            });
            
            window.scrollTo(0, 0);
        }, 1500);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const time = performance.now();
        const delta = Math.min((time - this.prevTime) / 1000, 0.1);
        
        this.wobbleTime += delta;

        // Update PS2 shader time
        if (this.ps2Pass) {
            this.ps2Pass.uniforms.time.value = time * 0.001;
        }

        // Movement
        if (this.isLocked || this.isMobile) {
            this.velocity.x -= this.velocity.x * 10.0 * delta;
            this.velocity.z -= this.velocity.z * 10.0 * delta;

            if (this.isMobile && this.joystickActive) {
                this.direction.z = -this.joystickY;
                this.direction.x = this.joystickX;
            } else {
                this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
                this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
            }
            
            if (this.direction.length() > 0) {
                this.direction.normalize();
            }

            const speed = 3;
            if (Math.abs(this.direction.z) > 0.1) {
                this.velocity.z -= this.direction.z * speed * delta * 50;
            }
            if (Math.abs(this.direction.x) > 0.1) {
                this.velocity.x -= this.direction.x * speed * delta * 50;
            }

            const forward = new THREE.Vector3();
            this.camera.getWorldDirection(forward);
            forward.y = 0;
            forward.normalize();

            const right = new THREE.Vector3();
            right.crossVectors(forward, new THREE.Vector3(0, 1, 0));

            this.camera.position.add(forward.multiplyScalar(-this.velocity.z * delta));
            this.camera.position.add(right.multiplyScalar(-this.velocity.x * delta));

            this.camera.position.y = 1.6;
        }

        // Animate light orb
        if (this.lightOrb) {
            this.lightOrb.position.y = 2.5 + Math.sin(time * 0.001) * 0.4;
            this.orbRings[0].rotation.z += 0.008;
            this.orbRings[1].rotation.x += 0.008;
            
            const pulse = Math.sin(time * 0.003) * 0.15 + 1;
            this.orbCore.scale.setScalar(pulse);
            this.orbGlow.scale.setScalar(pulse * 1.3);
        }

        // Animate towers (subtle PS2-style vertex wobble)
        this.towers.forEach((tower, index) => {
            const wobble = Math.sin(this.wobbleTime * tower.userData.speed + tower.userData.phase) * 0.05;
            tower.position.y = tower.userData.baseY + wobble;
        });

        // Animate particles
        if (this.particles) {
            this.particles.rotation.y += 0.0003;
            const positions = this.particles.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] += Math.sin(time * 0.0005 + positions[i]) * 0.003;
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
        }

        this.checkProximityToLight();

        this.prevTime = time;
        
        // Use composer for PS2 post-processing
        this.composer.render();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        new IntroExperience();
    }, 100);
});
