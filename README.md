## Layout Synthesis

Program to generate room layouts

## Work completed:
-Implemented an OBJ loader for assets; used assets downloaded from Kenney Assets

-Implemented GUI to allow users to choose which objects to load into the scene (either a bedroom scene or kitchen scene)

-Implemented object selection using raycasting; allows users to choose which objects to modify (in terms of position, orientation, or grouping)

-Implemented a particle class to represent objects; particleGroup class to represent grouped objects

-Implemented a pairwise orientation constraint that rotates two objects (or groups) to face each other

-Implemented functions to randomize the room so that objects are placed randomly within the layout; checks for object and boundary collisions; constrains certain objects (such as large pieces of furniture) to be against walls; rotates objects to face away from walls

-Implemented vertical stacking constraint in which randomization of prop objects distributes them on top of the surfaces of larger pieces of furniture in the room

-Implemented animation using TweenJS

