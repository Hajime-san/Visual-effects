varying vec2 vUv;
varying vec3 vViewPosition;
varying vec3 vNormal;
varying float myDepth;

uniform mat4 textureMatrix;
varying vec4 vUvProj;

vec4 ComputeNonStereoScreenPos(vec4 pos)
{
    vec4 o = pos * 0.5;
    o.xy = vec2(o.x, o.y * 1.0) + o.w;
    o.zw = pos.zw;
    return o;
}



void main() {

    vec4 o = ComputeNonStereoScreenPos(projectionMatrix * vec4( position, 1.0 ));

    float depth = - o.z;

    myDepth = depth;

    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

    vUvProj = textureMatrix * vec4( position, 1.0 );
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
    vViewPosition = - mvPosition.xyz;

    vNormal = normalMatrix * normal;
}
