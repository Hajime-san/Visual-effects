varying vec2 vUv;
varying vec4 vColor;

uniform float time;
uniform float speed;
uniform float currentFrame;
uniform float totalNum;
uniform float totalFrame;
uniform sampler2D texture;

void main() {

    vUv = uv;
    float frag = 1.0 / totalNum;
    float range = 2.0 + (-2.0 * -1.0);
    float pu = frag * position.x;

    float pv = 1.0 -fract(currentFrame/totalFrame);

    vec3 tPosition = texture2D(texture,vec2(pu, pv)).rgb;
    vec3 calcPos = vec3(tPosition.r * range, tPosition.g * range, tPosition.b * range);
    vec3 testPos = vec3(-2.0 + calcPos.r, -2.0 + calcPos.g, -2.0 + calcPos.b);


    vec3 tColor = texture2D(texture, vec2(pu, pv)).rgb;
    vColor = vec4(tColor, 1.0);


    gl_Position = projectionMatrix * modelViewMatrix * vec4(vec3(testPos.r, testPos.b, testPos.g) + position, 1.0 );

    //gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

}
