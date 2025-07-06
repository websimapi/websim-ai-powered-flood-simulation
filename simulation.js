import * as tf from '@tensorflow/tfjs';

// This class simulates the behavior of a sophisticated AI model like FloodSformer.
// It uses TensorFlow.js tensors to perform calculations in a way that's analogous
// to how a real model would operate on input data.
class SimulatedFloodSformerModel {
    constructor(gridSize) {
        this.gridSize = gridSize;
        
        // Pre-calculate a kernel for averaging neighbor heights. This is a common
        // technique in image processing and fluid simulation.
        // This simulates a convolutional layer in a CNN.
        const kernel = [
            [0, 1, 0],
            [1, 1, 1],
            [0, 1, 0]
        ];
        // The divisor is the sum of the kernel weights, used for normalization.
        this.neighborKernel = tf.tensor2d(kernel, [3, 3]).expandDims(2).expandDims(3);
        this.neighborDivisor = tf.sum(kernel);
    }

    // The 'predict' method performs one step of the simulation, taking the
    // current state (water and terrain) and returning the next water state.
    // This is the "autoregressive decoding" mentioned in the prompt.
    predict(waterTensor, terrainTensor) {
        return tf.tidy(() => {
            const totalHeight = waterTensor.add(terrainTensor);
            const totalHeightPadded = totalHeight.pad([
                [1, 1],
                [1, 1]
            ], 1000); // Pad with a high value to act as a wall

            // Use convolution to get the sum of neighbor heights.
            // This is an efficient, parallel way to get neighbor information for every cell.
            const neighborHeightSum = tf.conv2d(totalHeightPadded.expandDims(0).expandDims(3), this.neighborKernel, 1, 'valid').squeeze();
            const avgNeighborHeight = neighborHeightSum.div(this.neighborDivisor);

            // Calculate the difference between the cell's height and its neighbors' average height.
            const heightDifference = totalHeight.sub(avgNeighborHeight);
            
            // Water flows based on the height difference. A 'flowRate' parameter
            // controls how quickly the water level equalizes.
            const flowRate = 0.1; 
            const waterFlow = heightDifference.mul(flowRate).relu(); // Only allow positive flow (out of the cell)
            
            // Clamp flow to not move more water than available in the cell
            const clampedFlow = tf.minimum(waterFlow, waterTensor);

            // Create a tensor representing the flow distributed outwards
            const flowOut = clampedFlow;
            const flowOutPadded = flowOut.pad([
                [1, 1],
                [1, 1]
            ], 0);

            // Reverse convolution (transpose) to distribute the outgoing flow to neighbors.
            const flowIn = tf.conv2d(flowOutPadded.expandDims(0).expandDims(3), this.neighborKernel, 1, 'valid').squeeze();
            const netFlow = flowIn.div(this.neighborDivisor).sub(flowOut);
            
            // Update water level
            const newWater = waterTensor.add(netFlow).relu(); // Ensure water level doesn't go below zero

            return newWater;
        });
    }
}

// Manages the overall simulation state and interaction with the "model".
export class FloodSimulation {
    constructor(gridSize) {
        this.gridSize = gridSize;
        this.rainfall = 0.0;
        this.model = new SimulatedFloodSformerModel(gridSize);
        this.initTensors();
    }

    initTensors() {
        tf.tidy(() => {
            if (this.water) this.water.dispose();
            if (this.terrain) this.terrain.dispose();
            
            // Generate procedural terrain using noise-like patterns
            const terrainData = new Float32Array(this.gridSize * this.gridSize);
            for (let i = 0; i < this.gridSize; i++) {
                for (let j = 0; j < this.gridSize; j++) {
                    const x = i / this.gridSize;
                    const y = j / this.gridSize;
                    // Simple procedural terrain with a valley
                    const distToCenter = Math.sqrt(Math.pow(x - 0.5, 2) + Math.pow(y - 0.5, 2));
                    const elevation = 1 - Math.pow(distToCenter, 0.5) + (Math.sin(x * 10) * Math.cos(y * 10)) * 0.1;
                    terrainData[i * this.gridSize + j] = Math.max(0, elevation * 5);
                }
            }
            this.terrain = tf.tensor2d(terrainData, [this.gridSize, this.gridSize]);

            // Initial water is zero everywhere
            this.water = tf.zeros([this.gridSize, this.gridSize]);
        });
    }
    
    reset() {
        this.initTensors();
        this.rainfall = 0.0;
        document.getElementById('rainfall').value = 0.0;
    }

    setRainfall(value) {
        this.rainfall = value;
    }

    triggerDamBreak() {
        tf.tidy(() => {
            const damBreakTensor = tf.buffer([this.gridSize, this.gridSize]);
            // Add a large amount of water at a specific point
            damBreakTensor.set(20, 10, 10);
            this.water = this.water.add(damBreakTensor.toTensor());
        });
    }

    async step() {
        const newWater = tf.tidy(() => {
            // Predict the next state using the "model"
            let nextWater = this.model.predict(this.water, this.terrain);

            // Add rainfall
            if (this.rainfall > 0) {
                nextWater = nextWater.add(tf.scalar(this.rainfall / 10.0)); // scale for simulation speed
            }
            return nextWater;
        });

        this.water.dispose();
        this.water = newWater;
        tf.keep(this.water);

        return await this.getWaterData();
    }

    async getWaterData() {
        return await this.water.data();
    }
    
    async getTerrainData() {
        return await this.terrain.data();
    }
}

