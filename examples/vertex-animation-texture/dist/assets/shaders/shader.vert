varying vec2 vUv;
varying vec4 vColor;

attribute float _id;
uniform float time;
uniform float boudingBoxMax;
uniform float boundingBoxMin;
uniform float currentFrame;
uniform float indicesLength;
uniform float totalFrame;
uniform sampler2D animationTexture;
uniform sampler2D normalTexture;

void main() {

    vUv = uv;
    float normalizedFrame = currentFrame / totalFrame;
    float vertices = 1.0 / indicesLength;
    float range = boudingBoxMax + abs(boundingBoxMin);

    float pu = vertices * _id;
    float pv = 1.0 - fract(currentFrame / totalFrame);

    vec3 getPosition = texture2D(animationTexture, vec2(pu, pv)).rgb;
    vec3 offsetPosition = abs(boundingBoxMin) + getPosition / range;

    vec3 color = texture2D(normalTexture, vec2(pu, pv)).rgb;
    if(normalizedFrame > 0.5) {
        vColor = vec4(color - 0.5, 0.8);
    } else {
        vColor = vec4(color, 1.0);
    }

    gl_Position = projectionMatrix * modelViewMatrix * vec4(vec3(offsetPosition.r, offsetPosition.b, offsetPosition.g) + position, 1.0 );
}
