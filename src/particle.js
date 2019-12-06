import * as THREE from 'three'

class Particle {
	constructor(o, obj) {
		//each particle has position, orientation, mass, inverse mass
		this.orientation = new THREE.Vector3(0, 0, 1);
		this.targetRotation = new THREE.Vector3(0, 0, 0);
		this.obj = obj;
		var box = this.getBox();
		this.testObj = obj.clone();
		this.currentPosition = new THREE.Vector3(this.testObj.position.x, this.testObj.position.y, this.testObj.position.z);
		this.target = new THREE.Vector3(this.testObj.position.x, this.testObj.position.y, this.testObj.position.z);


		this.mass = (box.getSize().x * box.getSize().y * box.getSize().z);
		this.inverseMass = 1/this.mass;

		//max and min limits for its position within the room
		this.calculateLimits(box);
		this.defaultCheck();
	}

	getBox() {
		return new THREE.Box3().setFromObject(this.obj);
	}

	getTestBox() {
		return new THREE.Box3().setFromObject(this.testObj);
	}

	getPosition() {
		return this.obj.position;
	}

	updatePosition(direction, dist) {
		//this.calculateLimits(this.getTestBox());
		if (direction == "z") {
			var buffer = this.obj.position.z + dist;
			if (buffer <= this.zMax && buffer >= this.zMin) {
				this.currentPosition.z += dist;
				this.obj.position.z += dist;
				this.testObj.position.z += dist;
				this.target.z += dist;
			}
		} else if (direction == "x") {
			var buffer = this.obj.position.x + dist;
			if (buffer <= this.xMax && buffer >= this.xMin) {
				this.currentPosition.x += dist;
				this.obj.position.x += dist;
				this.testObj.position.x += dist;
				this.target.x += dist;
			}
		}
	}

	changePosition(x, z) {
		this.currentPosition.x = x;
		this.obj.position.x = x;
		this.testObj.position.x = x;

		this.currentPosition.z = z;
		this.obj.position.z = z;
		this.testObj.position.z = z;
	}

	changeY(y) {
		this.currentPosition.y = y;
		this.obj.position.y = y;
		this.testObj.position.y = y;

	}

	changeRotation(rot) {
		this.testObj.rotation.y = rot;
		this.targetRotation.y = rot;
		this.obj.rotation.y = rot;
	}

	calculateLimits(box) {
		var roomX = 2.0; // 4/2
		var roomZ = 1.5; // 3 / 2
		if (this.obj.userData.name.includes("tableRound") || this.obj.userData.name.includes("chair")) {
			roomX = 1.0;
			roomZ = 0.75;
		}
		var xLimit = box.getSize().x / 2.0;
		this.xMax = roomX - xLimit;
		this.xMin = (-1 * roomX) + xLimit;
		var zLimit = box.getSize().z / 2.0;
		this.zMax = roomZ - zLimit;
		this.zMin = (-1 * roomZ) + zLimit;
	}

	defaultCheck() {
		// make sure sitting on ground; check wall collisions
		// ground is at y = -0.5
		var box = new THREE.Box3().setFromObject(this.obj);
		var groundPosY = -0.5;
		var centerToBottom = box.getSize().y / 2;
		var centerToGround = Math.abs(groundPosY - box.getCenter().y);
		var moveDist = centerToGround - centerToBottom;
		if (groundPosY < box.getCenter().y) {
			this.obj.position.y -= moveDist;
			this.testObj.position.y -= moveDist;
		} else {
			this.obj.position.y += moveDist;
			this.testObj.position.y += moveDist;
		}

	}

	randomizePosition(objects, wall, prop) {
		//if prop, choose a surface for prop to sit on

		if (prop) {
			if (this.obj.position.x != 0 && this.obj.position.z != 0) {
				for (var i = 0; i < objects.length; i++) {
					if (objects[i].obj.userData.name == this.obj.userData.onTopOf) {
						
					}
				}
			}
			var randomSurface = Math.floor(Math.random() * (objects.length));
			var surface = objects[randomSurface];
			if (this != surface && surface.obj.userData.prop != true
				&& surface.obj.userData.name.indexOf("bed") == -1
				&& surface.obj.userData.name.indexOf("floor") == -1
				&& surface.obj.userData.name.indexOf("rug") == -1
				&& surface.obj.userData.name.indexOf("chair") == -1
				&& surface.obj.userData.name.indexOf("Upper") == -1
				&& surface.obj.userData.name.indexOf("Sink") == -1
				&& surface.obj.userData.name.indexOf("Stove") == -1
				&& surface.obj.userData.name.indexOf("trashcan") == -1
				&& surface.obj.userData.name.indexOf("Fridge") == -1) {
				var box = new THREE.Box3().setFromObject(surface.obj);
				var thisBox = new THREE.Box3().setFromObject(this.testObj);
				var pos = surface.obj.position;
				var xMax = pos.x + box.getSize().x / 2.0 - thisBox.getSize().x / 2.0;
				var xMin = pos.x - box.getSize().x / 2.0 + thisBox.getSize().x / 2.0;
				var zMax = pos.z + box.getSize().z / 2.0 - thisBox.getSize().z / 2.0;
				var zMin = pos.z - box.getSize().z / 2.0 + thisBox.getSize().z / 2.0;
				var x = Math.random() * (xMax - xMin) + xMin;
				var z = Math.random() * (zMax - zMin) + zMin;
				var y = surface.obj.position.y + box.getSize().y + 0.000000001;
				this.currentPosition = new THREE.Vector3(this.testObj.position.x, this.testObj.position.y, this.testObj.position.z);
				this.testObj.position.x = x;
				this.testObj.position.y = y;
				this.testObj.position.z = z;
				this.target = new THREE.Vector3(x, y, z);
				this.obj.userData.onTopOf = surface.obj.userData.name;

				for (var i = 0; i < objects.length; i++) {
					if (this != objects[i]) {
						if (this.checkObjCollision(objects[i])) {
							this.resetTestPosition();
							this.randomizePosition(objects, wall, prop);
						}
					}
				}
	
			} else {
				this.randomizePosition(objects, wall, prop);
			}
			return surface.obj.userData.id;
		} else {
			var x = Math.random() * (this.xMax - this.xMin) + this.xMin;
			var z = Math.random() * (this.zMax - this.zMin) + this.zMin;
			//for objects that need to next to a wall, choose either x or z walls to be close to
			this.testObj.rotation.y =  this.obj.rotation.y;
			this.targetRotation.y = this.testObj.rotation.y;
			if (wall) {
				var wall = Math.random() < 0.5 ? x : z;
				if (wall == x) {
					if (x <= 0) {
						//apply rotation to face outwards from wall
						this.testObj.rotation.y = 3 * Math.PI / 2; 
						this.targetRotation.y = this.testObj.rotation.y;

						//recalculate max and min
						this.calculateLimits(this.getTestBox());
						x = this.xMin;

						
					} else {
						//apply rotation to face outwards from wall
						this.testObj.rotation.y = Math.PI / 2; 
						this.targetRotation.y = this.testObj.rotation.y;

						//recalculate max and min
						this.calculateLimits(this.getTestBox());
						x = this.xMax;
					}
				} else {
					if (z <= 0) {
						//apply rotation to face outwards from wall
						this.testObj.rotation.y = Math.PI; 
						this.targetRotation.y = this.testObj.rotation.y;

						//recalculate max and min
						this.calculateLimits(this.getTestBox());
						z = this.zMin;
					} else {
						//apply rotation to face outwards from wall
						this.testObj.rotation.y = 0; 
						this.targetRotation.y = this.testObj.rotation.y;

						//recalculate max and min
						this.calculateLimits(this.getTestBox());
						z = this.zMax;
					}
				}
			} 

			this.currentPosition = new THREE.Vector3(this.testObj.position.x, this.testObj.position.y, this.testObj.position.z);
			this.testObj.position.x = x;
			this.testObj.position.z = z;
			this.target = new THREE.Vector3(x, this.testObj.position.y, z);
			for (var i = 0; i < objects.length; i++) {
				if (this != objects[i]) {
					if (this.checkObjCollision(objects[i])) {
						this.resetTestPosition();
						this.randomizePosition(objects, wall, prop);
					}
				}
			}

		}
	}


	resetTestPosition() {
		this.testObj.position.x = this.currentPosition.x;
		this.testObj.position.y = this.currentPosition.y;
		this.testObj.position.z = this.currentPosition.z;

		this.testObj.rotation.y = this.obj.rotation.y;
	}


	checkObjCollision(mesh2) {
		// use bounding spheres??
		var mesh1bbox = new THREE.Box3().setFromObject(this.testObj);
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


	checkObjCollisionRaycast() {
		//get vertices
		var particlevertices = new THREE.Vector3();
		this.obj.traverse(function(child) {
			if (child.isMesh) {
				const position = child.geometry.attributes.position;
				for (var i = 0; i < position.count; i++) {
					particlevertices.fromBufferAttribute(position, i);
					particlevertices.applyMatrix4(child.matrixWorld);
				}
			}
		});

		var ray = new THREE.Raycaster();
		for (var vertexIndex = 0; vertexIndex < particle1vertices.length; vertexIndex++) {
			var localVertex = particle1vertices[vertexIndex].clone();
			var globalVertex = this.obj.matrix.multiplyVector3(localVertex);
			var directionVector = globalVertex.subSelf(this.obj.position);

			ray.origin = this.obj.position;
			ray.direction = directionVector.clone().normalize();
			var collisionResults = ray.intersectObjects(scene.children, true);
			if (collisionResults.length > 0 && collisionResults[0].distance < directionVector.length()) {
				//collision occured
				return true
			}
		}
	}
}


class PairwiseDistanceConstraint {
	constructor(particle1, type1, particle2, type2, distance) {
		this.particle1 = particle1;
		this.particle1type = type1;
		this.particle2 = particle2;
		this.particle2type = type2;
		this.dist = distance;
	}

	getBox(obj) {
		return new THREE.Box3().setFromObject(obj);
	}

	solve(scene) {
		//p1 - p2
		var position1 = this.particle1.getPosition(); //either the obj position or the group's center
		var position2 = this.particle2.getPosition();
		var delta = this.getDelta(position1, position2);
		var diff = delta.length() - this.dist;
		delta.normalize();
		delta.multiplyScalar(diff/2);
		var delta1 = new THREE.Vector3(delta.x, delta.y, delta.z);
		var delta2 = new THREE.Vector3(delta.x, delta.y, delta.z);


		//COLLISION CHECKING:
		if (this.particle1type == "object") {
			this.checkRaycastCollision(delta1, this.particle1, "sub", scene);
		} else { //if group, then go through each object in the group and subtract the distance
			for (var i = 0; i < this.particle1.particlesList.length; i++) {
				this.checkRaycastCollision(delta1, this.particle1.particlesList[i], "sub", scene);
			}
		}
		if (this.particle2type == "object") {
			this.checkRaycastCollision(delta2, this.particle2, "add", scene);
		} else { //if group, then go through each object in the group and subtract the distances
			for (var i = 0; i < this.particle2.particlesList.length; i++) {
				this.checkRaycastCollision(delta2, this.particle2.particlesList[i], "add", scene);
			}
		}
	}

	getDelta(obj1, obj2) {
		var delta = new THREE.Vector3();
		var p1new = new THREE.Vector3(obj1.x, 0, obj1.z);
		var p2new = new THREE.Vector3(obj2.x, 0, obj2.z);
		delta.subVectors(p1new, p2new);
		return delta;
	}

	checkRaycastCollision(delta, particle, op, scene) {
		var raycaster = new THREE.Raycaster();
		var direction = new THREE.Vector3();
		var far = new THREE.Vector3();
		raycaster.set(particle.obj.position, direction.subVectors(particle.testObj.position, particle.obj.position).normalize());
		raycaster.far = far.subVectors(particle.testObj.position, particle.obj.position).length();
		var intersects = raycaster.intersectObjects(scene.children, true);

		if (intersects.length > 0) {
			var distanceToObstacle = this.getDelta(intersects[0].point, particle.obj.position);
			delta = intersects[0].point;
			particle.target = delta;
		} else {
			//not intersecting
			if (op == "add") {
				particle.target.add(delta);
			} else {
				particle.target.sub(delta);
			}
		}

		//check if out of bounds; don't use particle's xmax/xmin or zmax/zmin because could have rotated?
		if (particle.target.z > 1.5 - this.getBox(particle.obj).getSize().z / 2) {
			particle.target.z = 1.5 - this.getBox(particle.obj).getSize().z / 2;
		}
		if (particle.target.z < -1.5 + this.getBox(particle.obj).getSize().z / 2) {
			particle.target.z = -1.5 + this.getBox(particle.obj).getSize().z / 2;
		}
		if (particle.target.x > 2 - this.getBox(particle.obj).getSize().x / 2) {
			particle.target.x = 2 - this.getBox(particle.obj).getSize().x / 2
		}
		if (particle.target.x < -2 + this.getBox(particle.obj).getSize().x / 2) {
			particle.target.x = -2 + this.getBox(particle.obj).getSize().x / 2;
		}
		particle.resetTestPosition(particle.target);

	}

}

class PairwiseOrientationConstraint {
	constructor(particle1, type1, particle2, type2) {
		this.particle1 = particle1;
		this.particle1type = type1;
		this.particle2 = particle2;
		this.particle2type = type2;
	}
	solve(firstTime) {
		//reset rotation if 360
		var particle1obj;
		var particle2obj;
		var position1 = this.particle1.getPosition(); //either the obj position or the group's center
		var position2 = this.particle2.getPosition();
		if (this.particle1type == "object") {
			particle1obj = this.particle1.obj;
		} else if (this.particle1type == "group") {
			particle1obj = this.particle1.testGroup;
		}
		if (this.particle2type == "object") {
			particle2obj = this.particle2.obj;
		} else if (this.particle2type == "group") {
			particle2obj = this.particle2.testGroup;
		}

		//reset rotations to 0 if 360 
		if (Math.abs(particle1obj.rotation.y - (2 * Math.PI)) <= Number.EPSILON) {
			particle1obj.rotation.y = 0;
		}
		if (this.particle1type == "group") {
			for (var i = 0; i < this.particle1.particlesList.length; i++) {
				if (Math.abs(this.particle1.particlesList[i].obj.rotation.y - (2 * Math.PI)) <= Number.EPSILON) {
					this.particle1.particlesList[i].obj.rotation.y = 0;
				}
			}
		}
		if (Math.abs(particle2obj.rotation.y - (2 * Math.PI)) <= Number.EPSILON) {
			particle2obj.rotation.y = 0;
		}
		if (this.particle2type == "group") {
			for (var i = 0; i < this.particle2.particlesList.length; i++) {
				if (Math.abs(this.particle2.particlesList[i].obj.rotation.y - (2 * Math.PI)) <= Number.EPSILON) {
					this.particle2.particlesList[i].obj.rotation.y = 0;
				}
			}
		}
		var rotation1 = new THREE.Vector3(particle1obj.rotation.x, particle1obj.rotation.y, particle1obj.rotation.z);
		var rotation2 = new THREE.Vector3(particle2obj.rotation.x, particle2obj.rotation.y, particle2obj.rotation.z);


		var direction1 = new THREE.Vector3(0, 0, -1).applyQuaternion(particle1obj.quaternion).normalize();
		var direction2 = new THREE.Vector3(0, 0, -1).applyQuaternion(particle2obj.quaternion).normalize();


		var dot = direction1.dot(direction2);

		//check perpendicular (dot = 0)
		if (Math.abs(dot) <= Number.EPSILON){ //if perpendicular, just rotate one of them and recurse
			if (this.particle1type == "object") {
				particle1obj.rotation.y = particle1obj.rotation.y + (90 * Math.PI / 180);
				this.particle1.targetRotation.y = particle1obj.rotation.y;
			} else if (this.particle1type == "group") {
				//set the testgroup rotation; make each particle in the actual group match the rotation/position of each testgroup particle
				particle1obj.rotation.y = particle1obj.rotation.y + (90 * Math.PI / 180);
				particle1obj.updateMatrixWorld();
				this.adjustGroup(this.particle1.particlesList, particle1obj);
			}
			return this.solve(false);

		} else if (Math.abs(dot - 1) <= Number.EPSILON) { //both facing the same way; dot = 1
			if (Math.abs(direction1.z) > Number.EPSILON) { //z direction
				this.adjustOrientation(direction1.z, position1.z, position2.z, particle1obj, particle2obj);
				//console.log("facing same way x direction")
				this.adjustOrientation(direction1.x, position1.x, position2.x, particle1obj, particle2obj);
			}
			//recalculate position limits
			this.particle1.calculateLimits(this.particle1.getBox());
			this.particle2.calculateLimits(this.particle2.getBox());
			return true;
			
		} else if (Math.abs(dot + 1) <= Number.EPSILON) { //facing opposite; dot = -1
			if (((Math.abs(direction1.z - 1) <= Number.EPSILON) && (position1.z > position2.z)) ||
				((Math.abs(direction1.z + 1) <= Number.EPSILON) && (position1.z < position2.z)) ||
				((Math.abs(direction1.x - 1)<= Number.EPSILON) && (position1.x > position2.x)) ||
				((Math.abs(direction1.x + 1) <= Number.EPSILON) && (position1.x < position2.x))) {
					//facing away from each other
					if (this.particle1type == "object") {
						this.particle1.targetRotation.y = particle1obj.rotation.y + (Math.PI); //rotate 180 degrees
					} else {
						particle1obj.rotation.y = particle1obj.rotation.y + (Math.PI); //rotate 180 degrees
						particle1obj.updateMatrixWorld();
						this.adjustGroup(this.particle1.particlesList, particle1obj);
					}
					if (this.particle2type == "object") {
						this.particle2.targetRotation.y = particle2obj.rotation.y + (Math.PI); //rotate 180 degrees
					} else {
						particle2obj.rotation.y = particle2obj.rotation.y + (Math.PI); //rotate 180 degrees
						particle2obj.updateMatrixWorld();
						this.adjustGroup(this.particle2.particlesList, particle2obj);
					}
			}
			//if already facing each other and first time code is run, face on a different axis
			if (firstTime) {
				if (this.particle1type == "object") {
						this.particle1.targetRotation.y = particle1obj.rotation.y + (90 * Math.PI / 180); //rotate 90 degrees
					} else {
						particle1obj.rotation.y = particle1obj.rotation.y + (90 * Math.PI / 180); //rotate 90 degrees
						particle1obj.updateMatrixWorld();
						this.adjustGroup(this.particle1.particlesList, particle1obj);
					}
					if (this.particle2type == "object") {
						this.particle2.targetRotation.y = particle2obj.rotation.y + (90 * Math.PI / 180); //rotate 90 degrees
					} else {
						particle2obj.rotation.y = particle2obj.rotation.y + (90 * Math.PI / 180); //rotate 90 degree
						particle2obj.updateMatrixWorld();
						this.adjustGroup(this.particle2.particlesList, particle2obj);
					}

			}
			//recalculate position limits
			this.particle1.calculateLimits(this.particle1.getBox());
			this.particle2.calculateLimits(this.particle2.getBox());
			return true;
		}
		
	}

	adjustOrientation(direction, particle1pos, particle2pos, particle1obj, particle2obj) {
		if (Math.abs(direction - 1) <= Number.EPSILON) { //both facing in +z direction
			if (particle1pos > particle2pos) {
				if (this.particle1type == "object") {
						this.particle1.targetRotation.y = particle1obj.rotation.y + (Math.PI); //rotate 180 degrees
					} else {
						particle1obj.rotation.y = particle1obj.rotation.y + (Math.PI); //rotate 180 degrees
						particle1obj.updateMatrixWorld();
						this.adjustGroup(this.particle1.particlesList, particle1obj);

					}
			} else {
				if (this.particle2type == "object") {
						this.particle2.targetRotation.y = particle2obj.rotation.y + (Math.PI); //rotate 180 degrees
					} else {
						particle2obj.rotation.y = particle2obj.rotation.y + (Math.PI); //rotate 180 degrees
						particle2obj.updateMatrixWorld();
						this.adjustGroup(this.particle2.particlesList, particle2obj);
					}
			}
		} 
		else { //both facing in -z direction
			if (particle1pos < particle2pos) {
				if (this.particle1type == "object") {
						this.particle1.targetRotation.y = particle1obj.rotation.y + (Math.PI); //rotate 180 degrees
					} else {
						particle1obj.rotation.y = particle1obj.rotation.y + (Math.PI); //rotate 180 degrees
						particle1obj.updateMatrixWorld();
						this.adjustGroup(this.particle1.particlesList, particle1obj);					}
			} else {
				if (this.particle2type == "object") {
						this.particle2.targetRotation.y = particle2obj.rotation.y + (Math.PI); //rotate 180 degrees
					} else {
						particle2obj.rotation.y = particle2obj.rotation.y + (Math.PI); //rotate 180 degrees
						particle2obj.updateMatrixWorld();
						this.adjustGroup(this.particle2.particlesList, particle2obj);
					}
			}
		}
	}

	adjustGroup(particleList, particleobj) {
		for (var i = 0; i < particleList.length; i++) {
			particleList[i].target.x = particleobj.children[i].getWorldPosition().x;
			particleList[i].target.y = particleobj.children[i].getWorldPosition().y;
			particleList[i].target.z = particleobj.children[i].getWorldPosition().z;
			var quaternion = particleobj.children[i].getWorldQuaternion();
			var rotation = new THREE.Euler().setFromQuaternion(quaternion);
			particleList[i].targetRotation.y = rotation.y;	
		}
	}

}


function checkWallCollision(mesh1, dimensions) {
	
}

module.exports = {Particle, PairwiseDistanceConstraint, PairwiseOrientationConstraint}