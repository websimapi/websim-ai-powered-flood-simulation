import * as THREE from 'three';
import * as tf from '@tensorflow/tfjs';
import { SceneManager } from './scene.js';
import { FloodSimulation } from './simulation.js';

async function main() {
    const canvas = document.querySelector('#c');
    const infoEl = document.getElementById('info');

    infoEl.textContent = 'Initializing TensorFlow.js backend...';
    await tf.ready();
    infoEl.textContent = 'Backend ready. Setting up simulation...';

    const gridSize = 128;
    
    const sceneManager = new SceneManager(canvas, gridSize);
    const simulation = new FloodSimulation(gridSize);
    
    // UI Elements
    const rainfallSlider = document.getElementById('rainfall');
    const damBreakButton = document.getElementById('damBreak');
    const resetButton = document.getElementById('reset');

    rainfallSlider.addEventListener('input', (e) => {
        simulation.setRainfall(parseFloat(e.target.value));
    });
    
    damBreakButton.addEventListener('click', () => {
        simulation.triggerDamBreak();
    });

    resetButton.addEventListener('click', () => {
        simulation.reset();
    });

    // Initial scene setup from simulation data
    const initialTerrain = await simulation.getTerrainData();
    const initialWater = await simulation.getWaterData();
    sceneManager.setTerrain(initialTerrain);
    sceneManager.updateWater(initialWater);

    infoEl.textContent = 'Simulation running. Interact with the scene!';

    let lastTime = 0;
    const simulationInterval = 100; // ms

    function animate(time) {
        requestAnimationFrame(animate);

        const deltaTime = time - lastTime;
        
        // Run simulation at a fixed tick rate
        if(deltaTime > simulationInterval) {
            lastTime = time - (deltaTime % simulationInterval);
            
            // This is our main simulation loop
            simulation.step().then(waterData => {
                 sceneManager.updateWater(waterData);
            });
        }
        
        sceneManager.render(time);
    }

    animate(0);
}

main().catch(err => console.error(err));

