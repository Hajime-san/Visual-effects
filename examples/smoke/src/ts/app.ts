import * as THREE from '../../../../node_modules/three';

let camera: THREE.PerspectiveCamera,
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    geometry: THREE.BoxGeometry,
    material: THREE.MeshNormalMaterial,
    mesh: THREE.Mesh;

const init = () => {
  const container = document.getElementById('canvas');
	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 10 );
	camera.position.z = 1;

	scene = new THREE.Scene();

	geometry = new THREE.BoxGeometry( 0.2, 0.2, 0.2 );
	material = new THREE.MeshNormalMaterial();

	mesh = new THREE.Mesh( geometry, material );
	scene.add( mesh );

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setClearColor( 0x000000 );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  container.appendChild( renderer.domElement );

  window.addEventListener( 'resize', onWindowResize, false );
}

const animate = () => {

	requestAnimationFrame( animate );

	mesh.rotation.x += 0.01;
	mesh.rotation.y += 0.02;

	renderer.render( scene, camera );

}

const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}

document.addEventListener('DOMContentLoaded',()=>{
  init();
  animate();
})
