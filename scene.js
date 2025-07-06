import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';

import waterVertexShader from './water_vertex.glsl';
import waterFragmentShader from './water_fragment.glsl';

export class SceneManager {
    constructor(canvas, gridSize) {
        this.canvas = canvas;
        this.gridSize = gridSize;
        this.clock = new THREE.Clock();

        this.init();
        this.setupEventListeners();
    }

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);
        this.scene.fog = new THREE.Fog(0x87ceeb, 100, 400);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(50, 50, 50);

        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        directionalLight.position.set(50, 100, 25);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

        // Terrain and Water Meshes
        this.createTerrainMesh();
        this.createWaterMesh();
    }
    
    createTerrainMesh() {
        const geometry = new THREE.PlaneGeometry(100, 100, this.gridSize - 1, this.gridSize - 1);
        geometry.rotateX(-Math.PI / 2);
        
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x664422,
            side: THREE.DoubleSide,
            wireframe: false
         });

        this.terrainMesh = new THREE.Mesh(geometry, material);
        this.terrainMesh.receiveShadow = true;
        this.scene.add(this.terrainMesh);
    }

    createWaterMesh() {
        const geometry = new THREE.PlaneGeometry(100, 100, this.gridSize - 1, this.gridSize - 1);
        geometry.rotateX(-Math.PI / 2);

        this.waterUniforms = {
            uTime: { value: 0.0 },
            uBigWavesElevation: { value: 0.2 },
            uBigWavesFrequency: { value: new THREE.Vector2(4, 2) },
            uBigWavesSpeed: { value: 0.75 },
            uSmallWavesElevation: { value: 0.15 },
            uSmallWavesFrequency: { value: 3.0 },
            uSmallWavesSpeed: { value: 0.2 },
            uSmallWavesIterations: { value: 4.0 },
            uColorOffset: { value: 0.08 },
            uColorMultiplier: { value: 5.0 },
            uWaterColor: { value: new THREE.Color(0x005a9e) },
            uDepthColor: { value: new THREE.Color(0x001e3f) },
        };

        const material = new THREE.ShaderMaterial({
            vertexShader: waterVertexShader,
            fragmentShader: waterFragmentShader,
            uniforms: this.waterUniforms,
            transparent: true,
            blending: THREE.NormalBlending,
        });

        this.waterMesh = new THREE.Mesh(geometry, material);
        this.waterMesh.castShadow = false;
        this.scene.add(this.waterMesh);
    }

    setTerrain(terrainData) {
        const positions = this.terrainMesh.geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const y = terrainData[i];
            positions.setY(i, y);
        }
        positions.needsUpdate = true;
        this.terrainMesh.geometry.computeVertexNormals();
        
        // Also set initial position for water mesh vertices
        this.updateWater(new Float32Array(this.gridSize * this.gridSize).fill(0));
    }
    
    updateWater(waterData) {
        if (!this.terrainMesh || !this.waterMesh) return;
        
        const terrainPositions = this.terrainMesh.geometry.attributes.position;
        const waterPositions = this.waterMesh.geometry.attributes.position;
        
        for (let i = 0; i < waterPositions.count; i++) {
            const terrainHeight = terrainPositions.getY(i);
            const waterHeight = waterData[i];
            waterPositions.setY(i, terrainHeight + waterHeight);
        }
        waterPositions.needsUpdate = true;
        this.waterMesh.geometry.computeVertexNormals();
    }


    setupEventListeners() {
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    render(time) {
        this.controls.update();
        this.waterUniforms.uTime.value = this.clock.getElapsedTime();
        this.renderer.render(this.scene, this.camera);
    }
}

