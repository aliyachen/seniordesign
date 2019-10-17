
// const THREE = global.THREE = require('three'); // older modules are imported like this. You shouldn't have to worry about this much
// require('./obj_files/pot.gltf')

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
  console.log(Object.keys(allObjects).length);
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

  //axes helper (x = red, y = green, z = blue)
  // var axesHelper = new THREE.AxesHelper(5);
  // scene.add(axesHelper);

  //LIGHTS
  var ambient = new THREE.AmbientLight( 0x444444 );
  scene.add( ambient );

  var directionalLight = new THREE.DirectionalLight( 0xffeedd );
  directionalLight.position.set( 0, 0, 1 ).normalize();
  scene.add( directionalLight );


  // initialize a simple box and material
  // var box = new THREE.BoxGeometry(1, 1, 1);

  // var adamMaterial = new THREE.ShaderMaterial({
  //   uniforms: {
  //     image: { // Check the Three.JS documentation for the different allowed types and values
  //       type: "t", 
  //       value: THREE.ImageUtils.loadTexture('./adam.jpg')
  //     }
  //   },
  //   vertexShader: require('./shaders/adam-vert.glsl'),
  //   fragmentShader: require('./shaders/adam-frag.glsl')
  // });
  // var adamCube = new THREE.Mesh(box, material);

  var material = new THREE.MeshLambertMaterial({color: 0x808080});
  var material2 = new THREE.MeshLambertMaterial({color: 0xFFFFFF});

  // edit params and listen to changes like this
  // more information here: https://workshop.chromeexperiments.com/examples/gui/#1--Basic-Usage
  gui.add(camera, 'fov', 0, 180).onChange(function(newVal) {
    camera.updateProjectionMatrix();
  });

  //add ground plane
  var groundGeo = new THREE.PlaneGeometry(5, 3, 3);
  var ground = new THREE.Mesh(groundGeo, material);
  ground.rotateX(-Math.PI / 2);
  ground.translateZ(-0.5);
  scene.add(ground);

  //add walls
  var rightWallGeo = new THREE.PlaneGeometry(5, 1, 3);
  var rightWall = new THREE.Mesh(rightWallGeo, material);
  rightWall.translateZ(-1.5);
  scene.add(rightWall);
  var leftWallGeo = new THREE.PlaneGeometry(3, 1, 3);
  var leftWall = new THREE.Mesh(leftWallGeo, material);
  leftWall.translateX(-2.5);
  leftWall.rotateY(Math.PI / 2);
  scene.add(leftWall);
  var rightWallGeo1 = new THREE.PlaneGeometry(5, 1, 3);
  var rightWall1 = new THREE.Mesh(rightWallGeo1, material);
  rightWall1.translateZ(1.5);
  scene.add(rightWall1);
  var leftWallGeo1 = new THREE.PlaneGeometry(3, 1, 3);
  var leftWall1 = new THREE.Mesh(leftWallGeo1, material);
  leftWall1.translateX(2.5);
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
    console.log(loadedObj);
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
    console.log("what is name: " + loadedObj.userData.name);
    //check if object should be near a wall 
    if (loadedObj.userData.name.indexOf("bed") != -1 || loadedObj.userData.name.indexOf("desk") != -1
      || loadedObj.userData.name.indexOf("bookcase") != -1 || loadedObj.userData.name.indexOf("floor_lamp_round") != -1) {
      loadedObj.userData.wall = true;
    } else {
      loadedObj.userData.wall = false;
    }

    if (loadedObj.userData.name.indexOf("laptop") != -1 || loadedObj.userData.name.indexOf("radio") != -1 || loadedObj.userData.name.indexOf("table_lamp_round") != -1) {
      loadedObj.userData.prop = true;
    } else {
      loadedObj.userData.prop = false;
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
      var objPath = "./obj_files2/" + objName.toLowerCase() + ".obj";
      var objPromise = OBJPromiseLoader.load(objPath).then(onLoad).catch(onError);
    }

    selectionModal.style.display = "none";
  })

  Promise.all(objectPromises).then(() => {
    scene.add(objects);
  })

  //add "select object" option to gui
  var selectObjects = { add:function(){ 
    selectionModal.style.display = "block";

  }};
  gui.add(selectObjects,'add').name("Select Objects");


  // //select props
  // var selectProps = { add:function() {
  //   document.theForm.menu1.options.length = 0;
  //   document.theForm.menu1.options[0] = new Option("Laptop_Prop", 0, false, false);
  //   document.theForm.menu1.options[1] = new Option("Radio_Prop", 0, false, false);
  //   document.theForm.menu1.options[2] = new Option("Table_Lamp_Round_Prop", 0, false, false);
  //   selectionModal.style.display = "block";
  // }}
  // gui.add(selectProps,'add').name("Select Props");


  //TESTING
  var randomize = {add:function() {
    var allParticlesAndGroups = getParticlesAndGroupsInScene();

    allProps = [];


    Object.keys(allObjects).forEach(function(key) {
      //objects not in group      
      var particle = allObjects[key];
      if (particle.obj.userData.prop) {
        allProps.push(particle);
      } else {
        particle.randomizePosition(allParticlesAndGroups, particle.obj.userData.wall, particle.obj.userData.prop);
        var current = allObjects[key].obj.position;
        var target = allObjects[key].target;
        var tween = new TWEEN.Tween(current).to(target, 2000);
        tween.easing(TWEEN.Easing.Elastic.InOut);
        tween.onUpdate(function() {
          allObjects[key].obj.position.x = current.x;
          allObjects[key].obj.position.z = current.z;
        });
        tween.start();
      }
      
    })
    //groups
    Object.keys(allGroups).forEach(function(key) {
      allGroups[key].randomizePosition(allParticlesAndGroups);
      console.log("particleslist should be 2: " + allGroups[key].particlesList.length);
      for (var i = 0; i < allGroups[key].particlesList.length; i++) {
        var current = allGroups[key].particlesList[i].obj.position;
        var target = allGroups[key].particlesList[i].target;
        console.log("grouping curr: " + current.x + ", " + current.y + ", " + current.z)
        console.log("grouping target: " + target.x + ", " + target.y + ", " + target.z);
        var obj = allGroups[key].particlesList[i].obj;
        // allGroups[key].particlesList[i].obj.position.x = target.x;
        // allGroups[key].particlesList[i].obj.position.z = target.z;
        var tween = new TWEEN.Tween(current).to(target, 2000);
        tween.easing(TWEEN.Easing.Elastic.InOut);
        tween.onUpdate(function() {
          obj.position.x = current.x;
          obj.position.z = current.z;
        })
        tween.start();
      }
    })

  }}
  gui.add(randomize,'add').name("randomize positions");

  var randomizeProps = {add:function() {
     //props
    var allParticles = getAllParticles();
    for (var i = 0; i < allProps.length; i++) {        
      allProps[i].randomizePosition(allParticles, allProps[i].obj.userData.wall, allProps[i].obj.userData.prop);
      var current = allProps[i].obj.position;
      var target = allProps[i].target;
      var tween = new TWEEN.Tween(current).to(target, 2000);
      var obj = allProps[i].obj;
      tween.easing(TWEEN.Easing.Elastic.InOut);
      tween.onUpdate(function() {
        obj.position.x = current.x;
        obj.position.y = current.y;
        obj.position.z = current.z;
      })
      tween.start();
    }
  }}
  gui.add(randomizeProps, 'add').name("randomize props")

  ///apply pairwise distance constraint
  var btnApplyPairwise = document.getElementById("applyDistance");
  btnApplyPairwise.addEventListener("click", function(e) {
    var x = document.getElementById("distanceInput").value;
    var objectsList = getAllSelected()
    console.log(objectsList);
    if (objectsList.length >= 2) {
      //IF OBJ IS IN A GROUP, THEN IT'S NOT IN THE ALLOBJECTSLIST; a and b are either single objects or groups
      
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


      // var a = allObjects[objectsList[0]]; //particle
      // var b = allObjects[objectsList[1]];

      var pairwise = new PairwiseOrientationConstraint(a, atype, b, btype);
      var solved = pairwise.solve(true);

      // if (solved == false) {
      //   //if not solved, we only mmove tween 1;
      //   // console.log("does a have rotation: " + a.obj.rotation.x + ", " + a.obj.rotation.y + ", " + a.obj.rotation.z);
      //   // console.log("a target rotation: " + a.targetRotation.x + ", " + a.targetRotation.y + ", " + a.targetRotation.z);
      //   var tween;
      //   if atype == "object" {
      //     tween = new TWEEN.Tween(a.obj.rotation).to({y: a.targetRotation.y}, 1000).start();
      //   } else {
      //     tween = new TWEEN.Tween()
      //   }
        
      //   tween.onComplete(function() {
      //     // console.log("perpendicular so solve again");
      //     pairwise.solve(false);
      //     var tween1 = new TWEEN.Tween(a.obj.rotation).to({y: a.targetRotation.y}, 1000);
      //     tween1.start().onComplete(function() {
      //       a.testObj.rotation.y = a.obj.rotation.y;
      //     });
      //     var tween2 = new TWEEN.Tween(b.obj.rotation).to({y: b.targetRotation.y}, 1000);
      //     tween2.start().onComplete(function() {
      //       b.testObj.rotation.y = b.obj.rotation.y;
      //     });
      //   })
      // } else {
        if (atype == "object") {
          var tween1 = new TWEEN.Tween(a.obj.rotation).to({y: a.targetRotation.y}, 1000);
          tween1.start().onComplete(function() {
            a.testObj.rotation.y = a.obj.rotation.y;
          });
        } else if (atype == "group") {
          console.log("length of list: " + a.particlesList.length);
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
            console.log("lenght of blist: " + b.particlesList.length);
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

        // var tween2 = new TWEEN.Tween(b.obj.rotation).to({y: b.targetRotation.y}, 1000);
        // tween2.start().onComplete(function() {
        //   b.testObj.rotation.y = b.obj.rotation.y;
        // });

        // console.log("is solved?: " + solved);

      

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
        delete allObjects[objectsList[i]];
      }
    }


    // //if group, make objects in group one apart from each other
    // for (var i = 0; i < particlesInGroup.length; i++) {
    //   for (var j = i + 1; j < particlesInGroup.length; j++) {
    //         var pairwise = new PairwiseDistanceConstraint(particlesInGroup[i], "object", particlesInGroup[j], "object", 1  );
    //         pairwise.solve(scene);
    //   }
    // }
    // for (var i = 0; i < particlesInGroup.length; i++) {
    //   var a = particlesInGroup[i];
    //   var current1 = a.obj.position;
    //   var tween1 = new TWEEN.Tween(current1).to(a.target, 2000);
    //   tween1.easing(TWEEN.Easing.Elastic.InOut);
    //   tween1.onUpdate(function() {
    //     a.obj.position.x = current1.x;
    //     a.obj.position.z = current1.z;
    //   });
    //   tween1.start();
    // }

    var particleGroup = new ParticleGroup(particlesInGroup, groupCount, scene);
    console.log("group position: " + particleGroup.testGroup.position.x + ", " + particleGroup.testGroup.position.y + ", " + 
      particleGroup.testGroup.position.z);
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
    console.log("groupedObjecta: " + groupedObject.obj.userData.group);
    aGroup = groupedObject.obj.userData.group;
    console.log("what is allGroups: " + Object.keys(allGroups));
    a = allGroups[aGroup];
    atype = "group"
  } 

  for (var i = 1; i < objectsList.length; i++) { 
    //all other selected objects will either be another object, an object in the same group as a, or an object in a different group than a
    //break if it's another object or an object in a different group than a
    if (objectsList[i] in allObjects) {
      console.log("b is an object")
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

        console.log("groupedObjectb: " + groupedObject.obj.userData.group);
        console.log("what is allGroups: " + Object.keys(allGroups));
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

// when the scene is done initializing, it will call onLoad, then on frame updates, call onUpdate
Framework.init(onLoad, onUpdate);

// console.log('hello world');

// console.log(Noise.generateNoise());

// Noise.whatever()

// console.log(other())\
