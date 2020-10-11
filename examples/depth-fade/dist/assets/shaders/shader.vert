varying vec2 vUv;
varying vec3 vViewPosition;
varying vec3 vNormal;
varying float partZ;

varying vec4 vUvProj;

vec4 ComputeNonStereoScreenPos(vec4 pos) {
    vec4 o = pos * 0.5;
    o.xy = vec2(o.x, o.y * 1.0) + o.w;
    o.zw = pos.zw;
    return o;
}

void main() {

    vec4 worldPosition = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

    vec4 screenPosition = ComputeNonStereoScreenPos(worldPosition);

    partZ = worldPosition.z;

    screenPosition.z = worldPosition.z;

    vUvProj = screenPosition;

    gl_Position = worldPosition;

    vUv = uv;

    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
    vViewPosition = - mvPosition.xyz;

    vNormal = normalMatrix * normal;
}
