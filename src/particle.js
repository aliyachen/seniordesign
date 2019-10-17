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

	getPosition() {
		return this.obj.position;
	}

	calculateLimits(box) {
		var roomX = 2.5; // 5/2
		var xLimit = box.getSize().x / 2.0;
		console.log("does box x change: " + box.getSize().x);
		this.xMax = roomX - xLimit;
		this.xMin = (-1 * roomX) + xLimit;

		var roomZ = 1.5; // 3 / 2
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
			var randomSurface = Math.floor(Math.random() * (objects.length));
			if (this != objects[randomSurface] && objects[randomSurface].obj.userData.prop != true
				&& objects[randomSurface].obj.userData.name.indexOf("bed") == -1
				&& objects[randomSurface].obj.userData.name.indexOf("floor") == -1
				&& objects[randomSurface].obj.userData.name.indexOf("rug") == -1
				&& objects[randomSurface].obj.userData.name.indexOf("chair") == -1) {
				console.log(objects[randomSurface].obj.userData);
				var box = new THREE.Box3().setFromObject(objects[randomSurface].obj);
				var thisBox = new THREE.Box3().setFromObject(this.testObj);
				var pos = objects[randomSurface].obj.position;
				var xMax = pos.x + box.getSize().x / 2.0 - thisBox.getSize().x / 2.0;
				var xMin = pos.x - box.getSize().x / 2.0 + thisBox.getSize().x / 2.0;
				var zMax = pos.z + box.getSize().z / 2.0 - thisBox.getSize().z / 2.0;
				var zMin = pos.z - box.getSize().z / 2.0 + thisBox.getSize().z / 2.0;
				var x = Math.random() * (xMax - xMin) + xMin;
				var z = Math.random() * (zMax - zMin) + zMin;
				var y = objects[randomSurface].obj.position.y + box.getSize().y + 0.000000001;
				this.currentPosition = new THREE.Vector3(this.testObj.position.x, this.testObj.position.y, this.testObj.position.z);
				this.testObj.position.x = x;
				this.testObj.position.y = y;
				this.testObj.position.z = z;
				this.target = new THREE.Vector3(x, y, z);
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
		} else {
			var x = Math.random() * (this.xMax - this.xMin) + this.xMin;
			var z = Math.random() * (this.zMax - this.zMin) + this.zMin;
			//for objects that need to next to a wall, choose either x or z walls to be close to
			if (wall) {
				var wall = Math.random() < 0.5 ? x : z;
				if (wall == x) {
					if (x <= 0) {
						x = this.xMin;
					} else {
						x = this.xMax;
					}
				} else {
					if (z <= 0) {
						z = this.zMin;
					} else {
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
					console.log(vector);
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
		console.log("what si particle1: " + this.particle1 + " what is particle2: " + this.particle2);
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


		// //TEMPORARY NO CHECKING:
		// console.log("what is particle1type: " + this.particle1type);
		// if (this.particle1type == "object") {
		// 	this.particle1.target.sub(delta1);
		// } else { //if group, then go through each object in the group and subtract the distance
		// 	for (var i = 0; i < this.particle1.particlesList.length; i++) {
		// 		this.particle1.particlesList[i].target.sub(delta1);
		// 	}
		// }
		// if (this.particle2type == "object") {
		// 	this.particle2.target.add(delta1);
		// } else { //if group, then go through each object in the group and subtract the distance
		// 	for (var i = 0; i < this.particle2.particlesList.length; i++) {
		// 		this.particle2.particlesList[i].target.add(delta2);
		// 	}
		// }


		//COLLISION CHECKING:
		console.log("what is particle1type: " + this.particle1type);
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

		// //CHECK WALL + OBJECT COLLISIONS USING RAYCASTING
		// this.particle1.testObj.position.sub(delta1);
		// this.particle2.testObj.position.add(delta2);
		// console.log(this.particle1.obj);



		// this.checkRaycastCollision(delta1, this.particle1, "sub", scene);
		// this.checkRaycastCollision(delta2, this.particle2, "add", scene);
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
			console.log("pairwise1 intersected with " + intersects[0].object.parent.userData.name);
			console.log("current position1: " + particle.obj.position.x + ", "  + particle.obj.position.z);
			console.log("point of interseciton1?? " + intersects[0].point.x + ", " + intersects[0].point.z);
			var distanceToObstacle = this.getDelta(intersects[0].point, particle.obj.position);
			console.log("dstiacentoobstancel?? " + distanceToObstacle.x + ", " + distanceToObstacle.y + ", " + distanceToObstacle.z);
			console.log("delta1???? " + delta.x + ", " + delta.y + ", " + delta.z);
			delta = intersects[0].point;
			console.log(particle.obj.userData.name);
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
		if (particle.target.x > 2.5 - this.getBox(particle.obj).getSize().x / 2) {
			particle.target.x = 2.5 - this.getBox(particle.obj).getSize().x / 2
		}
		if (particle.target.x < -2.5 + this.getBox(particle.obj).getSize().x / 2) {
			particle.target.x = -2.5 + this.getBox(particle.obj).getSize().x / 2;
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


		// console.log("what is direction1??: " + direction1.x + ", " + direction1.y + ", " + direction1.z);
		// console.log("what is direction2??: " + direction2.x + ", " + direction2.y + ", " + direction2.z);
		// console.log("rotation1: " + rotation1.x + rotation1.y + rotation1.z);
		// console.log("rotation2L " + rotation2.x + rotation2.y + rotation2.z);


		var dot = direction1.dot(direction2);

		//check perpendicular (dot = 0)
		if (Math.abs(dot) <= Number.EPSILON){ //if perpendicular, just rotate one of them and recurse
			//console.log("perpendicular");
			if (this.particle1type == "object") {
				particle1obj.rotation.y = particle1obj.rotation.y + (90 * Math.PI / 180);
				this.particle1.targetRotation.y = particle1obj.rotation.y;
			} else if (this.particle1type == "group") {
				//set the testgroup rotation; make each particle in the actual group match the rotation/position of each testgroup particle
				particle1obj.rotation.y = particle1obj.rotation.y + (90 * Math.PI / 180);
				particle1obj.updateMatrixWorld();
				this.adjustGroup(this.particle1.particlesList, particle1obj);
				console.log("is rotation different: " + this.particle1.particlesList[0].obj.rotation.y + ", " + particle1obj.children[0].rotation.y)
			}
			return this.solve(false);

		} else if (Math.abs(dot - 1) <= Number.EPSILON) { //both facing the same way; dot = 1
			//console.log("what is direction1.z: " + direction1.z + "what is math.abs(direction1.z - 1): " + Math.abs(direction1.z - 1));
			if (Math.abs(direction1.z) > Number.EPSILON) { //z direction
				//console.log("facing same way z direction")
				this.adjustOrientation(direction1.z, position1.z, position2.z, particle1obj, particle2obj);
			} else if (Math.abs(direction1.x) > Number.EPSILON) { //x direction
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
						console.log("is rotation different: " + this.particle1.particlesList[0].obj.rotation.y + ", " + particle1obj.children[0].rotation.y)
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
						console.log("is rotation different: " + this.particle1.particlesList[0].obj.rotation.y + ", " + particle1obj.children[0].rotation.y)
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
			console.log("both facing +z");
			if (particle1pos > particle2pos) {
				//console.log("rotating particle 1 180");
				if (this.particle1type == "object") {
						this.particle1.targetRotation.y = particle1obj.rotation.y + (Math.PI); //rotate 180 degrees
					} else {
						particle1obj.rotation.y = particle1obj.rotation.y + (Math.PI); //rotate 180 degrees
						particle1obj.updateMatrixWorld();
						this.adjustGroup(this.particle1.particlesList, particle1obj);
						console.log("is rotation different: " + this.particle1.particlesList[0].obj.rotation.y + ", " + particle1obj.children[0].rotation.y)

					}
			} else {
				//console.log("rotating particle 2 180");
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
			console.log("both facing -z");
			if (particle1pos < particle2pos) {
				//console.log("rotating particle 1 180");
				if (this.particle1type == "object") {
						this.particle1.targetRotation.y = particle1obj.rotation.y + (Math.PI); //rotate 180 degrees
					} else {
						particle1obj.rotation.y = particle1obj.rotation.y + (Math.PI); //rotate 180 degrees
						particle1obj.updateMatrixWorld();
						this.adjustGroup(this.particle1.particlesList, particle1obj);
						console.log("is rotation different: " + this.particle1.particlesList[0].obj.rotation.y + ", " + particle1obj.children[0].rotation.y)
					}
			} else {
				//console.log("rotating particle 2 180");
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