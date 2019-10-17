

// const THREE = require('three');
import * as THREE from 'three'
window.THREE = require('three');
const OrbitControls = require('three-orbit-controls')(THREE)
import Stats from 'stats-js'
import DAT from 'dat-gui'

import { OutlinePass } from "three-outlinepass"
// var EffectComposer = require('three-effectcomposer')(THREE)
// var CopyShader = require('three-copyshader');

import EffectComposer, {RenderPass, ShaderPass, CopyShader } from 'three-effectcomposer-es6'
var fxaa = require('three-shader-fxaa')

var scene;
var camera;
var selectedObjects = {};
var selectedObjectsToOutline = [];
var composer, outlinePass, effectFXAA;

//ANIMATION
var startTime;
var duration = 2000;  


// when the scene is done initializing, the function passed as `callback` will be executed
// then, every frame, the function passed as `update` will be executed
function init(callback, update) {
  var stats = new Stats();
  stats.setMode(1);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.body.appendChild(stats.domElement);

  //raycaster
  document.addEventListener('mousedown', onDocumentMouseDown, false);
  


  var gui = new DAT.GUI();
  var t = 0;

  var framework = {
    gui: gui,
    stats: stats,
    t: t
  };

  // run this function after the window loads
  window.addEventListener('load', function() {

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera( 45, window.innerWidth/window.innerHeight, 0.1, 1000 );

    var canvas = document.querySelector('#c');
    var renderer = new THREE.WebGLRenderer( { canvas } );
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x020202, 0);

    var controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableZoom = true;
    controls.target.set(0, 0, 0);
    controls.rotateSpeed = 0.3;
    controls.zoomSpeed = 1.0;
    controls.panSpeed = 2.0;


    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera))


    // var effectFXAA = new EffectComposer.ShaderPass(fxaa());
    // effectFXAA.uniforms[ 'resolution' ].value.set(1 / window.innerWidth, 1 /window.innerHeight );
    // composer.addPass( effectFXAA );
    // effectFXAA.renderToScreen = true;
    // composer.addPass(effectFXAA);



    outlinePass = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera );
    var params = {
      edgeStrength: Number(0),
      edgeGlow: Number(0),
      edgeThickness: Number(0),
      pulsePeriod: Number(0),
      usePatternTexture : false
    }
    outlinePass.edgeStrength = params.edgeStrength;
    outlinePass.edgeGlow = params.edgeGlow;
    outlinePass.visibleEdgeColor.set(0xFFFFFF);
    outlinePass.hiddenEdgeColor.set(0xFFFFFF);
    outlinePass.selectedObjects = selectedObjectsToOutline;
    composer.addPass( outlinePass );

    var outputPass = new ShaderPass( CopyShader );
    outputPass.renderToScreen = true;
    composer.addPass( outputPass );

    

    // resize the canvas when the window changes
    window.addEventListener('resize', function() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
     //effectFXAA.uniforms[ 'resolution' ].value.set(1 / window.innerWidth, 1 / window.innerHeight );
      composer.setSize(window.innerWidth, window.innerHeight);
    });

    // assign THREE.js objects to the object we will return
    framework.scene = scene;
    framework.camera = camera;
    framework.renderer = renderer;
    framework.selectedObjects = selectedObjects;

    // begin the animation loop
    (function tick(currentTime) {
      stats.begin();

      if(!startTime) startTime = currentTime;
      t = (currentTime - startTime) / duration;
      framework.scene.updateMatrixWorld();

      update(framework, t); // perform any requested updates
      //renderer.render(scene, camera); // render the scene
      composer.render();
      stats.end();
      requestAnimationFrame(tick); // register to call this again when the browser renders a new frame
    })();

    // we will pass the scene, gui, renderer, camera, etc... to the callback function
    return callback(framework);
  });
}

//raycast
function onDocumentMouseDown( event ) {
  // event.preventDefault();
  var mouse = new THREE.Vector3();
  mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

  var raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  var intersects = raycaster.intersectObjects(scene.children, true);
  if (intersects.length > 0) {
    var obj = intersects[0].object;
    if (obj.parent.userData.clickable != undefined) {
      if (obj.parent.userData.selected == false) {
        obj.material.color.set( 0xff0000 );
        obj.parent.userData.selected = true;
        //add to selectedObjects list
        selectedObjects[obj.parent.userData.id] = obj;
        console.log(obj.parent);
        console.log("userid of selected group ob??: " + obj.parent.userData.group);
        console.log("is it selected tho: " + obj.parent.userData.selected);
        updateSelected();

        //select all objects in the group
        if (obj.parent.userData.group != undefined) {
          scene.traverse(function(node) {
            if (node instanceof THREE.Mesh && node.parent.userData.clickable != undefined) {
              if (node.parent.userData.group != undefined) {
                if (node != obj && node.parent.userData.group == obj.parent.userData.group) {
                   // console.log("node childre??" + node.material);
                    node.parent.userData.selected = true;

                    //DON'T ADD TO SELECTEDOBJECTS; ADD TO DIFFERENTA RRAY COLORED OBJECTS??
                   // selectedObjects[node.parent.userData.id] = node;
                   
                    console.log("group node id??: " + node.parent.userData.group);
                    updateSelected();

                    node.material.color.set(0xff0000);
                }
              }
            }
          });
        }
        //console.log("group????: " + obj.parent.userData.group);
      } else {
        obj.material.color.set(0xFFFFFF);
        obj.parent.userData.selected = false;
        delete selectedObjects[obj.parent.userData.id];
        updateSelected();

        //deselect all objects in the group
        //select all objects in the group
        if (obj.parent.userData.group != undefined) {
          scene.traverse(function(node) {
            if (node instanceof THREE.Mesh) {
              if (node.parent.userData.group != undefined) {
                if (node != obj && node.parent.userData.group == obj.parent.userData.group) {
                    //node.material.color.set(0xFFFFFF);
                    node.parent.userData.selected = false;
                    delete selectedObjects[node.parent.userData.id];
                    updateSelected();
                }
              }
            }
          });
        }

      }
    }
  }
}

function updateSelected() {
  selectedObjectsToOutline = [];
  Object.keys(selectedObjects).forEach(function(key) {
    selectedObjectsToOutline.push(selectedObjects[key]);
    console.log("WHATIS THIS: " + selectedObjects[key])
  })
  outlinePass.selectedObjects = selectedObjectsToOutline;
  console.log("outline??: " + outlinePass.selectedObjects.length);
}

export function clearSelectedObjects() {

  Object.keys(selectedObjects).forEach(function(key) {
    selectedObjects[key].parent.userData.selected = false;
    selectedObjects[key].material.color.set(0xFFFFFF);
  })
  selectedObjects = {};
  console.log("cleared");
}

export function getPairwiseObjects() {
  var objectsList = [];
  if (Object.keys(selectedObjects).length >= 2) {
    objectsList.push(Object.keys(selectedObjects)[0]);
    objectsList.push(Object.keys(selectedObjects)[1]);
  }
  return objectsList;
}

export function getAllSelected() {
  var objectsList = Object.keys(selectedObjects);
  return objectsList;
}

export default {
  init: init
}

export const PI = 3.14159265
export const e = 2.7181718