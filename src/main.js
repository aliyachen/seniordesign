
import * as THREE from 'three'
import OBJLoader from 'three-obj-loader'
OBJLoader(THREE);


import Framework from './framework'
import Noise from './noise'
import {other} from './noise'
import {clearSelectedObjects, getPairwiseObjects, getAllSelected} from './framework'
var {Particle, PairwiseDistanceConstraint, PairwiseOrientationConstraint} = require('./particle')
var {ParticleGroup} = require('./particleGroup')
var TWEEN = require('@tweenjs/tween.js');


var selectionModal;
var objLoader;
var allObjects = {};
var objNames = [];
var clearObjects = false;
var groupCount = 0;
var allGroups = {};
var allGroupedParticles = {};
var kitchenCabinetLower = [];
var kitchenCabinetUpper = [];
var kitchenCabinetUpperCornerId = -1;
var kitchenCabinetLowerCornerRoundId = -1;
var kitchenCabinetLowerCornerInnerId = -1;

var allProps = [];


function promisifyLoader(loader, onProgress) {
  function promiseLoader(url) {
    return new Promise(function(resolve, reject) {
      loader.load(url, resolve, onProgress, reject);
    });
  }
  return {
    originalLoader: loader,
    load: promiseLoader,
  };
}

function getParticlesAndGroupsInScene() {
  var allParticles = [];
  Object.keys(allObjects).forEach(function(key) {
    allParticles.push(allObjects[key]);
  })
  Object.keys(allGroups).forEach(function(key) {
    allParticles.push(allGroups[key]);
  })
  return allParticles;
}

function getAllParticles() {
  var allParticles = [];
  Object.keys(allObjects).forEach(function(key) {
    allParticles.push(allObjects[key]);
  })
   Object.keys(allGroups).forEach(function(key) {
    for (var i = 0; i < allGroups[key].particlesList.length; i++) {
      allParticles.push(allGroups[key].particlesList[i]);
    }
  })
  return allParticles;
}


//shuffle array
function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

function randomizeCabinets(scene) {
  //delete group
  if (kitchenCabinetLower.length + kitchenCabinetUpper.length > 1) {
    var groupNum;
    if (kitchenCabinetLower[0] in allGroupedParticles) {
      groupNum = allGroupedParticles[kitchenCabinetLower[0]].obj.userData.group;
    } else  if (kitchenCabinetUpper[0] in allGroupedParticles) {
      groupNum = allGroupedParticles[kitchenCabinetUpper[0]].obj.userData.group;
    }
    Object.keys(allGroupedParticles).forEach(function(key) {
      if (allGroupedParticles[key].obj.userData.group == groupNum) {
        var id = allGroupedParticles[key].obj.userData.id;
        allObjects[id] = allGroupedParticles[key];
        allObjects[id].obj.userData.group = -1;
      }
    })

    //delete from all grouped particles
    for (var i = 0; i < kitchenCabinetLower.length; i++) {
      if (kitchenCabinetLower[i] in allGroupedParticles) {
        delete allGroupedParticles[kitchenCabinetLower[i]];
      }
    }
    for (var i = 0; i < kitchenCabinetUpper.length; i++) {
      if (kitchenCabinetUpper[i] in allGroupedParticles) {
        delete allGroupedParticles[kitchenCabinetUpper[i]];
      }
    }
    //delete from allgroups
    delete allGroups[groupNum];
    
  }

  shuffleArray(kitchenCabinetLower);
  var front = 0;
  if (kitchenCabinetLowerCornerRoundId >= 0) { //if we loaded the lower corner
    //randomly determine if corner cabinet should be first or last; first remove it
    var index = kitchenCabinetLower.indexOf(kitchenCabinetLowerCornerRoundId);
    if (index > -1) {
      kitchenCabinetLower.splice(index, 1);
    }
    if (Math.floor(Math.random() * 2) == 0) {
      front = 1;
      kitchenCabinetLower.unshift(kitchenCabinetLowerCornerRoundId);
    } else {
      front = 2;
      kitchenCabinetLower.push(kitchenCabinetLowerCornerRoundId);
    }
  }
  if (kitchenCabinetLowerCornerInnerId >= 0) {
    var index = kitchenCabinetLower.indexOf(kitchenCabinetLowerCornerInnerId);
    if (index > -1) {
      kitchenCabinetLower.splice(index, 1);
    }
    if (front == 0) { //we didn't have a round corner, so choose either front or back to put the inner corner at
      if (Math.floor(Math.random() * 2) == 0) {
        kitchenCabinetLower.unshift(kitchenCabinetLowerCornerInnerId);
      } else {
        kitchenCabinetLower.push(kitchenCabinetLowerCornerInnerId);

      }
    } else if (front == 1) { //round corner was put first
      kitchenCabinetLower.push(kitchenCabinetLowerCornerInnerId);
    } else if (front == 2) { //round corner was last
      kitchenCabinetLower.unshift(kitchenCabinetLowerCornerInnerId);
    }
  }
  shuffleArray(kitchenCabinetUpper);
  var frontUp = 0;
  if (kitchenCabinetUpperCornerId >= 0) { //if we loaded the lower corner
    //randomly determine if corner cabinet should be first or last; first remove it
    var index = kitchenCabinetUpper.indexOf(kitchenCabinetUpperCornerId);
    if (index > -1) {
      kitchenCabinetUpper.splice(index, 1);
    }
    if (Math.floor(Math.random() * 2) == 0) {
      frontUp = 1;
      kitchenCabinetUpper.unshift(kitchenCabinetUpperCornerId);
    } else {
      frontUp = 2;
      kitchenCabinetUpper.push(kitchenCabinetUpperCornerId);
    }
  }

  //reposition lower; first recenter to origin
  if (kitchenCabinetLower.length > 0) {
    var size = allObjects[kitchenCabinetLower[0]].getBox().getSize().x;
    for (var i = 0; i < kitchenCabinetLower.length; i++) {
      if (kitchenCabinetLower.length > 5) {
        allObjects[kitchenCabinetLower[i]].changePosition(-size, 0)
      } else {
        allObjects[kitchenCabinetLower[i]].changePosition(0, 0);
      }
    }
    var dist = 0;
    for (var i = 1; i < kitchenCabinetLower.length; i++) {
      //usually the object's longer side is parallel to the wall
      var add = Math.max(allObjects[kitchenCabinetLower[i-1]].getBox().getSize().x/2,allObjects[kitchenCabinetLower[i-1]].getBox().getSize().z/2);
      var currBuffer = Math.max(allObjects[kitchenCabinetLower[i]].getBox().getSize().x/2,allObjects[kitchenCabinetLower[i]].getBox().getSize().z/2)
      dist += add + currBuffer;
      allObjects[kitchenCabinetLower[i]].currentPosition.x += dist;
      allObjects[kitchenCabinetLower[i]].obj.position.x += dist;
      allObjects[kitchenCabinetLower[i]].testObj.position.x += dist;
      allObjects[kitchenCabinetLower[i]].target.x += dist;
    }
  }
  //reposition upper; first recenter to origin, all upper cabinets move higher up
  if (kitchenCabinetUpper.length > 0) {
    var size = allObjects[kitchenCabinetUpper[0]].getBox().getSize().x;
    for (var i = 0; i < kitchenCabinetUpper.length; i++) {
      if (kitchenCabinetUpper.length > 5) {
        allObjects[kitchenCabinetUpper[i]].changePosition(-size, 0)
        allObjects[kitchenCabinetUpper[i]].changeY(0.5);
      } else {
        allObjects[kitchenCabinetUpper[i]].changePosition(0, 0);
        allObjects[kitchenCabinetUpper[i]].changeY(0.5);
      }
    }
    var dist = 0;
    for (var i = 1; i < kitchenCabinetUpper.length; i++) {
      //usually the object's longer side is parallel to the wall
      var add = Math.max(allObjects[kitchenCabinetUpper[i-1]].getBox().getSize().x/2,allObjects[kitchenCabinetUpper[i-1]].getBox().getSize().z/2);
      var currBuffer = Math.max(allObjects[kitchenCabinetUpper[i]].getBox().getSize().x/2,allObjects[kitchenCabinetUpper[i]].getBox().getSize().z/2)
      dist += add + currBuffer;
      allObjects[kitchenCabinetUpper[i]].currentPosition.x += dist;
      allObjects[kitchenCabinetUpper[i]].obj.position.x += dist;
      allObjects[kitchenCabinetUpper[i]].testObj.position.x += dist;
      allObjects[kitchenCabinetUpper[i]].target.x += dist;
    }
  }


  //grouping
  var particlesInGroup = [];
  if (kitchenCabinetLower.length + kitchenCabinetUpper.length > 1) {
    for (var i = 0; i < kitchenCabinetLower.length; i++) {
      allObjects[kitchenCabinetLower[i]].obj.userData.group = groupCount;
      particlesInGroup.push(allObjects[kitchenCabinetLower[i]]);
      allGroupedParticles[kitchenCabinetLower[i]] = allObjects[kitchenCabinetLower[i]]; 
      //delete from allobjects list because it's now in a group
      if (kitchenCabinetLower[i] in allObjects) {
        delete allObjects[kitchenCabinetLower[i]];
      }
    }
    for (var i = 0; i < kitchenCabinetUpper.length; i++) {
      allObjects[kitchenCabinetUpper[i]].obj.userData.group = groupCount;
      particlesInGroup.push(allObjects[kitchenCabinetUpper[i]]);
      allGroupedParticles[kitchenCabinetUpper[i]] = allObjects[kitchenCabinetUpper[i]]; 
      //delete from allobjects list because it's now in a group
      if (kitchenCabinetUpper[i] in allObjects) {
        delete allObjects[kitchenCabinetUpper[i]];
      }
    }
    var particleGroup = new ParticleGroup(particlesInGroup, groupCount, scene);
    particleGroup.upperCabinetIndex = kitchenCabinetLower.length;
    allGroups[groupCount] = particleGroup;
    groupCount++;

    particleGroup.movePosition(0, 0);

  }
  randomizeLarge();

  
}

function randomizeLarge() {

  var allParticlesAndGroups = getParticlesAndGroupsInScene();

    //groups
  Object.keys(allGroups).forEach(function(key) {
    allGroups[key].randomizePosition(allParticlesAndGroups);
    for (var i = 0; i < allGroups[key].particlesList.length; i++) {
      var current = allGroups[key].particlesList[i].obj.position;
      var target = allGroups[key].particlesList[i].target;
      var obj = allGroups[key].particlesList[i].obj;
      var tween = new TWEEN.Tween(current).to(target, 1500);
      tween.easing(TWEEN.Easing.Elastic.InOut);
      tween.onUpdate(function() {
        obj.position.x = current.x;
        obj.position.z = current.z;
      })
      var tween1 = new TWEEN.Tween(allGroups[key].particlesList[i].obj.rotation).to({y: allGroups[key].particlesList[i].targetRotation.y}, 1000);
      var particle = allGroups[key].particlesList[i];
      tween1.onComplete(function() {
        particle.obj.rotation.y = particle.targetRotation.y;
        particle.testObj.rotation.y = particle.obj.rotation.y;
      });
      tween.chain(tween1);
      tween.start();
    }
  })


  allProps = [];

  var i = 0;
  Object.keys(allObjects).forEach(function(key) {
    //objects not in group      
    var particle = allObjects[key];
    if (particle.obj.userData.prop) {
      allProps.push(particle);
    } else {
      particle.randomizePosition(allParticlesAndGroups, particle.obj.userData.wall, particle.obj.userData.prop);
      var current = allObjects[key].obj.position;
      var target = allObjects[key].target;

      var tween = new TWEEN.Tween(current).to(target, 1500);
      tween.easing(TWEEN.Easing.Elastic.InOut);
      tween.onUpdate(function() {
        allObjects[key].obj.position.x = current.x;          
        allObjects[key].obj.position.z = current.z;
      });

      var tween1 = new TWEEN.Tween(allObjects[key].obj.rotation).to({y: allObjects[key].targetRotation.y}, 1000);
      tween1.onComplete(function() {
         allObjects[key].obj.rotation.y = allObjects[key].targetRotation.y;
        allObjects[key].testObj.rotation.y = allObjects[key].obj.rotation.y;
      });
      tween.chain(tween1);
      tween.start();

      //randomize props on completion of tween animation
      if (i == 0) {
        tween1.onComplete(function() {
          randomizeProps();
        })
      }
      i++;
    }
    
  })

}

function randomizeProps() {
   //props
    var allParticles = getAllParticles();
    for (var i = 0; i < allProps.length; i++) {        
      var surfaceId = allProps[i].randomizePosition(allParticles, allProps[i].obj.userData.wall, allProps[i].obj.userData.prop);
      var current = allProps[i].obj.position;
      var target = allProps[i].target;
      var tween = new TWEEN.Tween(current).to(target, 1500);
      var obj = allProps[i].obj;
      var prop = allProps[i];
      tween.easing(TWEEN.Easing.Elastic.InOut);
      tween.onUpdate(function() {
        prop.obj.position.x = current.x;
        prop.obj.position.y = current.y;
        prop.obj.position.z = current.z;
      })
      tween.start();
    }
}

// called after the scene loads
function onLoad(framework) {
  var scene = framework.scene;
  var camera = framework.camera;
  var renderer = framework.renderer;
  var composer = framework.composer;
  var gui = framework.gui;
  var stats = framework.stats;

  // set camera position
  camera.position.set(5, 1, 5);
  camera.lookAt(new THREE.Vector3(0,0,0));
  scene.add(camera);

  // //axes helper (x = red, y = green, z = blue)
  // var axesHelper = new THREE.AxesHelper(5);
  // scene.add(axesHelper);

  //LIGHTS
  var ambient = new THREE.AmbientLight( 0x444444 );
  scene.add( ambient );

  var directionalLight = new THREE.DirectionalLight( 0xffeedd );
  directionalLight.position.set( 0, 0, 1 ).normalize();
  scene.add( directionalLight );

  var material = new THREE.MeshLambertMaterial({color: 0x808080});
  var material2 = new THREE.MeshLambertMaterial({color: 0xFFFFFF});

  // edit params and listen to changes like this
  // more information here: https://workshop.chromeexperiments.com/examples/gui/#1--Basic-Usage
  gui.add(camera, 'fov', 0, 180).onChange(function(newVal) {
    camera.updateProjectionMatrix();
  });

  //add ground plane
  var groundGeo = new THREE.PlaneGeometry(4, 3, 3);
  var ground = new THREE.Mesh(groundGeo, material);
  ground.rotateX(-Math.PI / 2);
  ground.translateZ(-0.5);
  scene.add(ground);

  //add walls
  var rightWallGeo = new THREE.PlaneGeometry(4, 1, 3);
  var rightWall = new THREE.Mesh(rightWallGeo, material);
  rightWall.translateZ(-1.5);
  scene.add(rightWall);
  var leftWallGeo = new THREE.PlaneGeometry(3, 1, 3);
  var leftWall = new THREE.Mesh(leftWallGeo, material);
  leftWall.translateX(-2);
  leftWall.rotateY(Math.PI / 2);
  scene.add(leftWall);
  var rightWallGeo1 = new THREE.PlaneGeometry(4, 1, 3);
  var rightWall1 = new THREE.Mesh(rightWallGeo1, material);
  rightWall1.translateZ(1.5);
  scene.add(rightWall1);
  var leftWallGeo1 = new THREE.PlaneGeometry(3, 1, 3);
  var leftWall1 = new THREE.Mesh(leftWallGeo1, material);
  leftWall1.translateX(2);
  leftWall1.rotateY(Math.PI / 2);
  scene.add(leftWall1);

  var pairwiseDistanceModal = document.getElementById("distanceInputBox")
  selectionModal = document.getElementById("selectionModal");
  var closeSelectionButton = document.getElementById("closeSelection");
  closeSelectionButton.onclick = function() {
    selectionModal.style.display = "none";
  };
  var closeDistanceButton = document.getElementById("closeDistance");
  closeDistanceButton.onclick = function() {
    pairwiseDistanceModal.style.display = "none";
  }


  var listBox1 = document.theForm.menu1;
  var listBox2 = document.theForm.menu2;
  var btnRight = document.getElementById("btnRight");
  btnRight.addEventListener("click", function(e) {
    var list1length = listBox1.length;
    for (var i = 0; i < listBox1.length; i++) {
      if (listBox1.options[i].selected == true) {
        var list2length = listBox2.length;
        listBox2.options[list2length] = new Option(listBox1.options[i].text);
      }
    }

    for (var i = (list1length - 1); i >= 0; i--) {
      if(listBox1.options[i].selected == true) {
        listBox1.options[i] = null;
      }
    }
  })

  var btnAllRight = document.getElementById("btnAllRight");
  btnAllRight.addEventListener("click", function(e) {
    var list1length = listBox1.length;
    for (var i = 0; i < listBox1.length; i++) {
      var list2length = listBox2.length;
      listBox2.options[list2length] = new Option(listBox1.options[i].text);
    }
    for (var i = (list1length - 1); i >= 0; i--) {
      listBox1.options[i] = null;
    }
  })

  var btnLeft = document.getElementById("btnLeft");
  btnLeft.addEventListener("click", function(e) {
    var list2length = listBox2.length;
    for (var i = 0; i < listBox2.length; i++) {
      if (listBox2.options[i].selected == true) {
        var list1length = listBox1.length;
        listBox1.options[list1length] = new Option(listBox2.options[i].text);
      }
    }

    for (var i = (list2length - 1); i >= 0; i--) {
      if(listBox2.options[i].selected == true) {
        listBox2.options[i] = null;
      }
    }
  })

  var btnAllLeft = document.getElementById("btnAllLeft");
  btnAllLeft.addEventListener("click", function(e) {
    var list2length = listBox2.length;
    for (var i = 0; i < listBox2.length; i++) {
      var list1length = listBox1.length;
      listBox1.options[list1length] = new Option(listBox2.options[i].text);
    }
    for (var i = (list2length - 1); i >= 0; i--) {
      listBox2.options[i] = null;
    }
  })

  const OBJPromiseLoader = promisifyLoader(new THREE.OBJLoader());
  const objectPromises = [];
  const objects = new THREE.Group();
  var objNameCount = 0;
  const onLoad = (function(loadedObj) {
    loadedObj.userData.clickable = true;
    loadedObj.userData.selected = false;
    //user id is 1 + the greatest userid in the current objects list
    if (Object.keys(allObjects).length == 0) {
      loadedObj.userData.id = 0;
    } else {
      var max = Math.max.apply(null, Object.keys(allObjects));
      loadedObj.userData.id = allObjects[max].obj.userData.id + 1;
    }
    if (loadedObj.children[0].name.indexOf(":") != -1) {
      loadedObj.userData.name = loadedObj.children[0].name.substr(0, loadedObj.children[0].name.indexOf(':'));
    } else {
      loadedObj.userData.name = loadedObj.children[0].name;
    }
    //check if object should be near a wall 
    if (loadedObj.userData.name.includes("bed") || loadedObj.userData.name.includes("desk")
      || loadedObj.userData.name.includes("bookcase") || loadedObj.userData.name.includes("floor_lamp_round") 
      || loadedObj.userData.name.includes("Fridge") || loadedObj.userData.name.includes("trashcan")) {
      loadedObj.userData.wall = true;
    } else {
      loadedObj.userData.wall = false;
    }

    //props
    if (loadedObj.userData.name.includes("laptop") || loadedObj.userData.name.includes("radio") || loadedObj.userData.name.includes("table_lamp_round")
    || loadedObj.userData.name.includes("CoffeeMachine") || loadedObj.userData.name.includes("toaster") || loadedObj.userData.name.includes("Blender")
    || loadedObj.userData.name.includes("Microwave")) {
      loadedObj.userData.prop = true;
    } else {
      loadedObj.userData.prop = false;
    }

    //kitchencabinet
    if (loadedObj.userData.name.includes('kitchenCabinet')) {
      loadedObj.userData.wall = true;
      if (loadedObj.userData.name.includes('Upper')) {
        loadedObj.userData.cabinet = 'upper';
        if (!loadedObj.userData.name.includes('Corner')) {
          kitchenCabinetUpper.push(loadedObj.userData.id);
        } else {
          kitchenCabinetUpperCornerId = loadedObj.userData.id;
        }
      } else {
        loadedObj.userData.cabinet = 'lower';
        if (!loadedObj.userData.name.includes('Corner')) {
          kitchenCabinetLower.push(loadedObj.userData.id);
        } else {
          if (loadedObj.userData.name.includes('Round')) {
            kitchenCabinetLowerCornerRoundId = loadedObj.userData.id;
          } else if (loadedObj.userData.name.includes('Inner')) {
            kitchenCabinetLowerCornerInnerId = loadedObj.userData.id;
          }
        }
      }
    }
    else if (loadedObj.userData.name.includes('kitchenSink') || loadedObj.userData.name.includes('kitchenStove')) {
      loadedObj.userData.wall = true;
      kitchenCabinetLower.push(loadedObj.userData.id);
    }

    var particle = new Particle(0, loadedObj);
    objects.add(loadedObj);
    allObjects[loadedObj.userData.id] = particle;
    // //bounding box
    // var box = new THREE.BoxHelper(loadedObj, 0xffff00);
    // scene.add(box);
  })

  const onError = ((err) => {console.error(err); } );

  //load selected objects 
  var btnAddObjects = document.getElementById("addObjects");
  btnAddObjects.addEventListener("click", function(e) {
    for (var i = 0; i < listBox2.length; i++) {
      var objName = listBox2.options[i].text;
      var objPath = "./obj_files/" + objName.toLowerCase() + ".obj";
      var objPromise = OBJPromiseLoader.load(objPath).then(onLoad).catch(onError);
    }

    selectionModal.style.display = "none";
  })

  Promise.all(objectPromises).then(() => {
    scene.add(objects);
  })


  //add "select object" option to gui
  var selectObjects = { add:function(){ 
    var select = document.getElementById("objectSelect");
    select.options.length = 0;
    var selected = document.getElementById('objectsSelected');
    selected.options.length = 0;
    var options = ['Table', 'Chair', 'Coffee_Table', 'Single_Bed', 'Desk', 'Bed_Drawer', 'Bookcase_Closed_Wide', 'Floor_Lamp_Round', 
    'Rug_Rounded', 'Laptop_Prop', 'Radio_Prop', 'Table_Lamp_Round_Prop']
    options.forEach(function(element, key) {
      select[key] = new Option(element, key);
    })
    selectionModal.style.display = "block";

  }};
  gui.add(selectObjects,'add').name("Select Objects");


  //add "select object" option to gui
  var selectKitchen = { add:function(){ 
    var select = document.getElementById("objectSelect");
    select.options.length = 0;
    var selected = document.getElementById('objectsSelected');
    selected.options.length = 0;
    var options = ['Chair', 'Kitchen_Blender_Prop', 'Kitchen_Cabinet', 'Kitchen_Cabinet_Corner_Inner',
    'Kitchen_Cabinet_Corner_Round', 'Kitchen_Cabinet_Upper', 'Kitchen_Cabinet_Upper_Corner', 'Kitchen_Cabinet_Upper_Double',
    'Kitchen_Cabinet_Upper_Low', 'Kitchen_Coffee_Machine_Prop', 'Kitchen_Fridge_Large', 'Kitchen_Microwave_Prop', 'Kitchen_Sink', 'Kitchen_Stove',
    'Table_Round', 'Toaster_Prop', 'Trashcan'];
    options.forEach(function(element, key) {
      select[key] = new Option(element, key);
    })
    selectionModal.style.display = "block";

  }};
  gui.add(selectKitchen,'add').name("Select Kitchen");


  var randomize = {add:function() {
     //randomizeLarge();
     randomizeCabinets(scene);
  }}
  gui.add(randomize,'add').name("randomize positions");

  ///apply pairwise distance constraint
  var btnApplyPairwise = document.getElementById("applyDistance");
  btnApplyPairwise.addEventListener("click", function(e) {
    var x = document.getElementById("distanceInput").value;
    var objectsList = getAllSelected()
    if (objectsList.length >= 2) {
      var result = getPair(objectsList);
      var a = result[0];
      var atype = result[1];
      var b = result[2];
      var btype = result[3];
      var pairwise = new PairwiseDistanceConstraint(a, atype, b, btype, x);

      pairwise.solve(scene);

      if (atype == "object") {
        var current1 = a.obj.position;
        var tween1 = new TWEEN.Tween(current1).to(a.target, 2000);
        tween1.easing(TWEEN.Easing.Elastic.InOut);
        tween1.onUpdate(function() {
          a.obj.position.x = current1.x;
          a.testObj.position.x = current1.x;
          a.obj.position.z = current1.z;
          a.testObj.position.z = current2.z;
        });
        tween1.start();
      } else if (atype == "group") {
        for (var i = 0; i < a.particlesList.length; i++) {
          var current = a.particlesList[i].obj.position;
          var target = a.particlesList[i].target;
          var obj = a.particlesList[i].obj;
          var tween = new TWEEN.Tween(current).to(target, 2000);
          tween.easing(TWEEN.Easing.Elastic.InOut);
          tween.onUpdate(function() {
            obj.position.x = current.x;
            obj.position.z = current.z;
          })
          tween.start();
        }
      }

      if (btype == "object") {
        var current2 = b.obj.position;
        var tween2 = new TWEEN.Tween(current2).to(b.target, 2000);
        tween2.easing(TWEEN.Easing.Elastic.InOut);
        tween2.onUpdate(function() {
          b.obj.position.x = current2.x;
          b.testObj.position.x = current2.x;
          b.obj.position.z = current2.z;
          b.testObj.position.z = current2.z;
        });
        tween2.start();
      } else if (btype == "group") {
        for (var i = 0; i < b.particlesList.length; i++) {
          var current = b.particlesList[i].obj.position;
          var target = b.particlesList[i].target;
          var obj = b.particlesList[i].obj;
          var tween = new TWEEN.Tween(current).to(target, 2000);
          tween.easing(TWEEN.Easing.Elastic.InOut);
          tween.onUpdate(function() {
            obj.position.x = current.x;
            obj.position.z = current.z;
          })
          tween.start();
        }
      }
    }

    distanceInputBox.style.display = "none";
  })
  //modal for pairwise distance constraint
  var solvePairwise = { add:function() {
    distanceInputBox.style.display = "block";
  }}

  gui.add(solvePairwise,'add').name("Pairwise");

  //pairwise orientation
  var solveOrientation = {add:function() {
    var objectsList = getAllSelected();
    if (objectsList.length >= 2) {

      var result = getPair(objectsList);
      var a = result[0];
      var atype = result[1];
      var b = result[2];
      var btype = result[3];

      var pairwise = new PairwiseOrientationConstraint(a, atype, b, btype);
      var solved = pairwise.solve(true);
        if (atype == "object") {
          var tween1 = new TWEEN.Tween(a.obj.rotation).to({y: a.targetRotation.y}, 1000);
          tween1.start().onComplete(function() {
            a.testObj.rotation.y = a.obj.rotation.y;
          });
        } else if (atype == "group") {
          for (var i = 0; i < a.particlesList.length; i++) {
            var aparticle = a.particlesList[i];
            var aObj = a.particlesList[i].obj;
            var aTestObj = a.particlesList[i].testObj;
            var current1 = aObj.position;
            var tween1 = new TWEEN.Tween(current1).to(a.particlesList[i].target, 2000);
            tween1.easing(TWEEN.Easing.Elastic.InOut);
            tween1.onUpdate(function() {
              aObj.position.x = current1.x;
              aTestObj.position.x = current1.x;
              aObj.position.z = current1.z;
              aTestObj.position.z = current1.z;
            });
            tween1.start().onComplete(function() {
              var tween2= new TWEEN.Tween(aObj.rotation).to({y: aparticle.targetRotation.y}, 1000);
              tween2.start().onComplete(function() {
                aTestObj.rotation.y = aObj.rotation.y;
              })
            });
            
          }
        }

        if (btype == "object") {
          var tween1 = new TWEEN.Tween(b.obj.rotation).to({y: b.targetRotation.y}, 1000);
          tween1.start().onComplete(function() {
            b.testObj.rotation.y = b.obj.rotation.y;
          });
        } else if (btype == "group") {
          for (var i = 0; i < b.particlesList.length; i++) {
            var bparticle = b.particlesList[i];
            var bObj = b.particlesList[i].obj;
            var bTestObj = b.particlesList[i].testObj;
            var current1 = bObj.position;
            var tween1 = new TWEEN.Tween(current1).to(b.particlesList[i].target, 2000);
            tween1.easing(TWEEN.Easing.Elastic.InOut);
            tween1.onUpdate(function() {
              bObj.position.x = current1.x;
              bTestObj.position.x = current1.x;
              bObj.position.z = current1.z;
              bTestObj.position.z = current1.z;
            });
            tween1.start().onComplete(function() {
              var tween2 = new TWEEN.Tween(bObj.rotation).to({y: bparticle.targetRotation.y}, 1000);
              tween2.start().onComplete(function() {
                bTestObj.rotation.y = bObj.rotation.y;
              })
            });
          }
        }

    }
  }}

  gui.add(solveOrientation, "add").name("Orientation");

  //grouping
  var group = {add:function() {
    var objectsList = getAllSelected(); //RETURNS ALL THE IDS
    var particlesInGroup = [];
    if (objectsList.length > 1) {
      for (var i = 0; i < objectsList.length; i++) {
        allObjects[objectsList[i]].obj.userData.group = groupCount;
        particlesInGroup.push(allObjects[objectsList[i]]);
        allGroupedParticles[objectsList[i]] = allObjects[objectsList[i]]; 
        //delete from allobjects list because it's now in a group
        if (objectsList[i] in allObjects) {
          delete allObjects[objectsList[i]];
        }
      }
    }


    var particleGroup = new ParticleGroup(particlesInGroup, groupCount, scene);
    // var boxhelper = new THREE.BoxHelper(particleGroup.testGroup, 0xffff00);
    // scene.add(boxhelper);
    allGroups[groupCount] = particleGroup;

    groupCount++;

    //apply distance constraint to objects in the group


  }}
  gui.add(group, 'add').name("Group Selected");

  //clear selection
  var clear = {add:function() {
    scene.traverse(function(node) {
      if (node instanceof THREE.Mesh) {
        if (node.parent.userData.clickable != undefined) {
          node.parent.userData.selected = false;
        }
      }
    });
    clearObjects = true;
  }};
  gui.add(clear,'add').name("Clear Selection");

}

function getPair(objectsList) {
  //get first object
  var a;
  var atype;
  var b;
  var btype;
  var aGroup;
  if (objectsList[0] in allObjects) {
    a = allObjects[objectsList[0]];
    atype = "object"
  } else {
    //if the id of the first object in the returned list isn't in objectslist, then must be an object that's part of a group
    //get the object from the list of objects in groups, then get the particlegroup that contains all the objects in the group
    var groupedObject = allGroupedParticles[objectsList[0]];
    aGroup = groupedObject.obj.userData.group;
    a = allGroups[aGroup];
    atype = "group"
  } 

  for (var i = 1; i < objectsList.length; i++) { 
    //all other selected objects will either be another object, an object in the same group as a, or an object in a different group than a
    //break if it's another object or an object in a different group than a
    if (objectsList[i] in allObjects) {
      b = allObjects[objectsList[i]];
      btype = "object";
      break;
    } else {
      var groupedObject = allGroupedParticles[objectsList[i]];
      if (atype == "group") {
        if (groupedObject.obj.userData.group != aGroup) {
          b = allGroups[groupedObject.obj.userData.group];
          btype = "group";
          break;
        }
      } else if (atype == "object") {
        b = allGroups[groupedObject.obj.userData.group];
        btype = "group";
        break;
      }
    }
  }

  var returnList = [a, atype, b, btype];
  return returnList;
}


// called on frame updates
function onUpdate(framework, t) {
  // console.log(`the time is ${new Date()}`);
  if (clearObjects) {
    clearSelectedObjects();
    clearObjects = false;
  }
  TWEEN.update();
}

//arrow key to adjust position
document.addEventListener("keydown", onDocumentKeyDown, false);
function onDocumentKeyDown(event) {
  var keyCode = event.which;
  var selectedObjectsIDs = getAllSelected();//get user ids of all selected objects
  //check allObjects and allGroupedParticles
  for (var i = 0; i < selectedObjectsIDs.length; i++) {
    var id = selectedObjectsIDs[i];
    if (id in allObjects) {
      var obj = allObjects[id];
    } else if (id in allGroupedParticles) {
      var obj = allGroupedParticles[id]
    }

     if (keyCode == 49) { //up
        obj.updatePosition("z", 0.1);
    } else if (keyCode == 50) { //down
        obj.updatePosition("z", -0.1);
    } else if (keyCode == 51) { //left
        obj.updatePosition("x", 0.1);
    } else if (keyCode == 52) { //right
        obj.updatePosition("x", -0.1);
    }

  }
}

Framework.init(onLoad, onUpdate);
