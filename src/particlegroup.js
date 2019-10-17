import * as THREE from 'three'

var {Particle, PairwiseDistanceConstraint} = require('./particle')

class ParticleGroup {
	constructor(particlesList, id, scene) {
		this.scene = scene;
		this.id = id;
		this.particlesList = particlesList;	
		this.bb = this.calculateGroup();
		this.position = this.bb.getCenter();
		this.currentPosition = new THREE.Vector3(this.position.x, this.position.y, this.position.z);
		this.calculateLimits(this.bb);

	}
	calculateGroup() {
		//add objects to a group, calculate bounding box of this group
		var group = new THREE.Object3D();
		var objects = [];
		for (var i = 0; i < this.particlesList.length; i++) {
			group.add(this.particlesList[i].obj.clone());
			objects.push(this.particlesList[i].obj.clone());
		}

		var bb = new THREE.Box3().setFromObject(group);
		var groupCenter = bb.getCenter();
		var posDiffs = []; //get differences between objects in the group and group center
		for (var i = 0; i < group.children.length; i++) {
			var diff = group.children[i].position.sub(bb.getCenter());
			objects[i].position.x = diff.x;
			objects[i].position.z = diff.z;
		}

		group = new THREE.Object3D();
		for (var i = 0; i < objects.length; i++) {
			group.add(objects[i]);
		}
		group.position.x += bb.getCenter().x;
		group.position.z += bb.getCenter().z;

		this.testGroup = group;
		this.scene.add(this.testGroup);

		var sphere = new THREE.SphereGeometry(0.1, 10, 10);
		var mat = new THREE.MeshLambertMaterial({color: 0x808080});
		var sp = new THREE.Mesh(sphere, mat);
		sp.position.x = this.testGroup.position.x;
		sp.position.y = this.testGroup.position.y;
		sp.position.z = this.testGroup.position.z;
		this.scene.add(sp);




		return bb;
	}
	getBox() {
		var bb = new THREE.Box3().setFromObject(this.testGroup);
		return bb;
	}

	getPosition() { 
		var bb = new THREE.Box3().setFromObject(this.testGroup);
		return bb.getCenter();
	}

	calculateLimits(box) {
		var center = box.getCenter();

		var roomX = 2.5; // 5/2
		var xLimit = box.getSize().x / 2.0;
		this.xMax = roomX - xLimit;
		this.xMin = (-1 * roomX) + xLimit ;


		var roomZ = 1.5; // 3 / 2
		var zLimit = box.getSize().z / 2.0;
		this.zMax = roomZ - zLimit;
		this.zMin = (-1 * roomZ) + zLimit;
	}

	randomizePosition(objects) {
		var x = Math.random() * (this.xMax - this.xMin) + this.xMin;
		var z = Math.random() * (this.zMax - this.zMin) + this.zMin;
		this.currentPosition = new THREE.Vector3(this.testGroup.position.x, this.testGroup.position.y, this.testGroup.position.z);

		var xDiff = x - this.currentPosition.x;
		var zDiff = z - this.currentPosition.z;

		this.testGroup.position.x = x;
		this.testGroup.position.z = z;

		this.target = new THREE.Vector3(x, this.testGroup.position.y, z);

		console.log("xDiff, zdiff: " + xDiff + ", " + zDiff);
		for (var i = 0; i < this.particlesList.length; i++) {

			this.particlesList[i].currentPosition = new THREE.Vector3(this.particlesList[i].testObj.position.x, 
				this.particlesList[i].testObj.position.y, this.particlesList[i].testObj.position.z);

			this.particlesList[i].testObj.position.x = this.particlesList[i].currentPosition.x + xDiff;
			this.particlesList[i].testObj.position.z = this.particlesList[i].currentPosition.z + zDiff;

			this.particlesList[i].target = new THREE.Vector3(this.particlesList[i].testObj.position.x, 
				this.particlesList[i].testObj.position.y, this.particlesList[i].testObj.position.z);
		}

		// update bounding box
		for (var i = 0; i < objects.length; i++) {
			if (this != objects[i]) {
				if (this.checkObjCollision(objects[i])) {
					this.resetTestPosition();
					this.randomizePosition(objects);
				}

			}
		}

	}

	resetTestPosition() {
		this.testGroup.position.x = this.currentPosition.x;
		this.testGroup.position.y = this.currentPosition.y;
		this.testGroup.position.z = this.currentPosition.z;
		for (var i = 0; i < this.particlesList.length; i++) {
			this.particlesList[i].testObj.position.x = this.particlesList[i].currentPosition.x;
			this.particlesList[i].testObj.position.y = this.particlesList[i].currentPosition.y;
			this.particlesList[i].testObj.position.z = this.particlesList[i].currentPosition.z;
		}
	}


	checkObjCollision(mesh2) {
		// use bounding spheres??
		var mesh1bbox = new THREE.Box3().setFromObject(this.testGroup);
		var mesh2bbox;
		if (mesh2.testObj != undefined) { //single obj, not a group
			mesh2bbox = new THREE.Box3().setFromObject(mesh2.testObj);
		} else { //test agains group
			mesh2bbox = new THREE.Box3().setFromObject(mesh2.testGroup);
		}
		if (mesh1bbox.intersectsBox(mesh2bbox)) {
			return true;
		}
		return false;
	}


}

module.exports = {ParticleGroup}