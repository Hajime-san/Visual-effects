attribute vec2 uv2;

varying vec2 vUv1;
varying vec2 vUv2;
varying vec3 vViewPosition;
varying vec3 vNormal;
varying vec3 vPosition;


void main() {

    vUv1 = vec2( uv.x, 1.0 - uv.y );
    vUv2 = vec2( uv2.x, 1.0 - uv2.y );

    vPosition = position;

    vNormal = normalMatrix * normal;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = mvPosition.xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

}
