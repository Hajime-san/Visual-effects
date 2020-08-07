varying vec3 vViewPosition;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec4 projectionUv;
varying vec2 vUv;

uniform mat4 textureMatrix;

void main() {

	vUv = uv;
	projectionUv = textureMatrix * vec4( position, 1.0 );

    vPosition = position;

    vNormal = normalMatrix * normal;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = mvPosition.xyz;

	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

}
