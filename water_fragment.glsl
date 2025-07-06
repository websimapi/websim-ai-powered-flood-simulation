uniform float uTime;
uniform vec3 uWaterColor;
uniform vec3 uDepthColor;
uniform float uColorOffset;
uniform float uColorMultiplier;

varying float vElevation;

void main() {
    float mixStrength = (vElevation + uColorOffset) * uColorMultiplier;
    vec3 color = mix(uDepthColor, uWaterColor, mixStrength);

    gl_FragColor = vec4(color, 0.75);
}

