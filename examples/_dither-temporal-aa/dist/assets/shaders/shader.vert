varying vec2 vUv;
varying vec3 vViewPosition;
varying vec3 vNormal;

void main() {

    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
    vViewPosition = - mvPosition.xyz;

    vNormal = normalMatrix * normal;
}
