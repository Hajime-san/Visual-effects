attribute vec2 uv2;

varying vec2 vUv1;
varying vec2 vUv2;
varying vec3 vViewPosition;
varying vec3 vNormal;
varying vec3 vPosition;

uniform vec3 scale;

vec4 quat_from_axis_angle(vec3 axis, float angle) {
  vec4 qr;
  float half_angle = (angle * 0.5) * 3.14159 / 180.0;
  qr.x = axis.x * sin(half_angle);
  qr.y = axis.y * sin(half_angle);
  qr.z = axis.z * sin(half_angle);
  qr.w = cos(half_angle);
  return qr;
}

vec4 quat_conj(vec4 q) {
  return vec4(-q.x, -q.y, -q.z, q.w);
}

vec4 quat_mult(vec4 q1, vec4 q2) {
  vec4 qr;
  qr.x = (q1.w * q2.x) + (q1.x * q2.w) + (q1.y * q2.z) - (q1.z * q2.y);
  qr.y = (q1.w * q2.y) - (q1.x * q2.z) + (q1.y * q2.w) + (q1.z * q2.x);
  qr.z = (q1.w * q2.z) + (q1.x * q2.y) - (q1.y * q2.x) + (q1.z * q2.w);
  qr.w = (q1.w * q2.w) - (q1.x * q2.x) - (q1.y * q2.y) - (q1.z * q2.z);
  return qr;
}

vec3 rotate_vertex_position(vec3 position, vec3 axis, float angle) {
  vec4 q = quat_from_axis_angle(axis, angle);
  vec3 v = position.xyz;
  return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}

void main() {

    // send uv
    vUv1 = vec2( uv.x, 1.0 - uv.y );
    vUv2 = vec2( uv2.x, 1.0 - uv2.y );

    float rotation = 0.0;

    // scaled position
    vec3 alignedPosition = vec3(position.x * scale.x, position.y * scale.y, position.z * scale.z);

    // rotate only z axis
    vec3 axisAngle = vec3(0.0, 0.0, 1.0);

    vec3 pos = rotate_vertex_position( alignedPosition, axisAngle, 70.0);

    vec4 finalPosition;

    finalPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
    finalPosition.xyz += pos.xyz;
    finalPosition = projectionMatrix * finalPosition;

    gl_Position = finalPosition;

    vPosition = finalPosition.xyz;

    vNormal = normalMatrix * normal;
    vec4 mvPosition = finalPosition;
    vViewPosition = mvPosition.xyz;

}
