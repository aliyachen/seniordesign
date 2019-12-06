import * as THREE from 'three'

var {Particle, PairwiseDistanceConstraint} = require('./particle')

class ParticleGroup {
	constructor(particlesList, id, scene) {
		this.scene = scene;
		this.id = id;
		this.particlesList = particlesList;	
		this.idParticleMap = {};
		this.bb = this.calculateGroup();
		this.position = this.bb.getCenter();
		this.targetRotation = new THREE.Vector3(0, 0, 0);
		this.currentPosition = new THREE.Vector3(this.position.x, this.position.y, this.position.z);
		this.calculateLimits(this.bb);
		this.upperCabinetIndex = 0;

	}
	calculateGroup() {
		//add objects to a group, calculate bounding box of this group
		var group = new THREE.Object3D();
		var objects = [];
		this.wall = false;
		for (var i = 0; i < this.particlesList.length; i++) {
			this.idParticleMap[this.particlesList[i].obj.userData.id] = this.particlesList[i];
			group.add(this.particlesList[i].obj.clone());
			objects.push(this.particlesList[i].obj.clone());
			if (this.particlesList[i].obj.userData.wall) {
				this.wall = true;
			}
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
		//this.scene.add(this.testGroup);

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

	movePosition(x, z) {
		this.testGroup.position.x = x;
		this.testGroup.position.z = z;
		for (var i = 0; i < this.testGroup.children.length; i++) {
			var id = this.testGroup.children[i].userData.id;
			var particle = this.idParticleMap[id];
			var px = this.testGroup.children[i].getWorldPosition().x;
			var pz = this.testGroup.children[i].getWorldPosition().z;
			particle.changePosition(px, pz);
		}
	}

	calculateLimits(box) {
		var center = box.getCenter();

		var roomX = 2.0; // 4/2
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

		if (this.wall) {
			var wall = Math.random() < 0.5 ? x : z;
			if (wall == x) {
				if (x <= 0) {
					//apply rotation to face outwards from wall
					this.testGroup.rotation.y = 3 * Math.PI / 2; 
					this.targetRotation.y = this.testGroup.rotation.y;

					//recalculate max and min
					this.calculateLimits(this.getBox());
					x = this.xMin;

						
				} else {
					//apply rotation to face outwards from wall
					this.testGroup.rotation.y = Math.PI / 2; 
					this.targetRotation.y = this.testGroup.rotation.y;

					//recalculate max and min
					this.calculateLimits(this.getBox());
					x = this.xMax;
				}
			} else {
				if (z <= 0) {
					//apply rotation to face outwards from wall
					this.testGroup.rotation.y = Math.PI; 
					this.targetRotation.y = this.testGroup.rotation.y;

					//recalculate max and min
					this.calculateLimits(this.getBox());
					z = this.zMin;
				} else {
					//apply rotation to face outwards from wall
					this.testGroup.rotation.y = 0; 
					this.targetRotation.y = this.testGroup.rotation.y;

					//recalculate max and min
					this.calculateLimits(this.getBox());
					z = this.zMax;
				}
			}
		} 


		this.currentPosition = new THREE.Vector3(this.testGroup.position.x, this.testGroup.position.y, this.testGroup.position.z);

		this.testGroup.position.x = x;
		this.testGroup.position.z = z;

		for (var i = 0; i < this.testGroup.children.length; i++) {
			var id = this.testGroup.children[i].userData.id;
			var particle = this.idParticleMap[id];
			particle.currentPosition = new THREE.Vector3(particle.testObj.position.x, particle.testObj.position.y, 
				particle.testObj.position.z);
			particle.testObj.position.x = this.testGroup.children[i].getWorldPosition().x;
			particle.testObj.position.z = this.testGroup.children[i].getWorldPosition().z;
			particle.target = new THREE.Vector3(particle.testObj.position.x, particle.testObj.position.y, particle.testObj.position.z);

			particle.testObj.rotation.y = this.testGroup.rotation.y;
			particle.targetRotation.y = this.testGroup.rotation.y;
			//if round corner first, rotate; if inner corner last, rotate
			if ((i == 0 && this.testGroup.children[i].userData.name == 'kitchenCabinetCornerRound') ||
				(i == this.testGroup.children.length - 1 && this.testGroup.children[i].userData.name == 'kitchenCabinetCornerInner') ||
				(i == this.upperCabinetIndex && this.testGroup.children[i].userData.name == 'kitchenCabinetUpperCorner')) { 
				particle.testObj.rotation.y += Math.PI / 2;
				particle.targetRotation.y += Math.PI / 2;
			}

		}

		// update bounding box
		for (var i = 0; i < objects.length; i++) {
			if (this != objects[i]) {
				if (this.checkObjCollision(objects[i])) {
					this.resetTestPosition(objects);
				}

			}
		}

	}

	resetTestPosition(objects) {
		this.testGroup.position.x = this.currentPosition.x;
		this.testGroup.position.y = this.currentPosition.y;
		this.testGroup.position.z = this.currentPosition.z;
		for (var i = 0; i < this.particlesList.length; i++) {
			this.particlesList[i].testObj.position.x = this.particlesList[i].currentPosition.x;
			this.particlesList[i].testObj.position.y = this.particlesList[i].currentPosition.y;
			this.particlesList[i].testObj.position.z = this.particlesList[i].currentPosition.z;

			this.particlesList[i].testObj.rotation.y = this.particlesList[i].obj.rotation.y;
		}

		this.testGroup.rotation.y = 0;
		this.calculateLimits(this.getBox());

		this.randomizePosition(objects);
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