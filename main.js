import {
  Engine,
  Scene,
  HavokPlugin,
  Vector3,
  UniversalCamera,
  SceneLoader,
  PointerEventTypes,
  KeyboardEventTypes,
} from "@babylonjs/core";
import "@babylonjs/loaders";
import { startMenuGUI } from "./Game_GUI/startMenuGUI";
import { rollCollisionHandler } from "./Game_Logic/gameCollisionHandler";
import {
  pointerDown,
  pointerUp,
  pointerMove,
  ballMovement,
} from "./Game_Logic/ballMovementHandler";
import {
  toggleTeleportation,
  angleToAim,
  ballShoot,
} from "./Game_Logic/motionControllerBallMovement";
import { createEnvironment } from "./Game_Environment/environment";
import {
  createLights,
  createGameMusic,
  createRollSound,
} from "./Game_Environment/lightsAndMusic";

import { createAnimations } from "./Game_Environment/animation";
import { createBowlingLane } from "./Game_Environment/bowlingLane";
import { createAim } from "./Game_Logic/aim";
import {
  createBowlingBall,
  createBowlingPins,
} from "./Game_Environment/bowlingBallAndPins";
import { renderScoreBoard } from "./Game_GUI/renderScoreBoard";
import { StartNewGame } from "./Game_Logic/newGameDataStructure";
import config from "./config.json";

const canvas = document.getElementById("renderCanvas");
const engine = new Engine(canvas);

async function createScene() {
  const scene = new Scene(engine);

  const havokInstance = await HavokPhysics();
  const havokPlugin = new HavokPlugin(true, havokInstance);
  scene.enablePhysics(
    new Vector3(config.gravity.x, config.gravity.y, config.gravity.z),
    havokPlugin
  );

  const camera = new UniversalCamera(
    "camera",
    new Vector3(
      config.camera.position.x,
      config.camera.position.y,
      config.camera.position.z
    )
  );
  camera.setTarget(Vector3.Zero());
  camera.inputs.clear();
  camera.attachControl();

  const bowlingPinResult = await SceneLoader.ImportMeshAsync(
    "",
    "Models/",
    "bowling_pin.glb"
  );

  const bowlingBallResult = await SceneLoader.ImportMeshAsync(
    "",
    "Models/",
    "bowling_ball.glb"
  );

  const aim = createAim();
  aim.isVisible = false;
  let [bowling_ball, bowlingAggregate] = createBowlingBall(bowlingBallResult);
  aim.parent = bowling_ball;
  const ground = createEnvironment(scene);
  const xr = await scene.createDefaultXRExperienceAsync({
    floorMeshes: [ground],
  });
  xr.teleportation.addFloorMesh(ground);
  createLights();
  createGameMusic(scene);
  const lane = createBowlingLane();

  let setPins = createBowlingPins(bowlingPinResult);

  let ballMovementObjects = { bowling_ball, bowlingAggregate, setPins };
  let startingPoint;
  let currentMesh;

  const getPointerPosition = () => {
    const pickinfo = scene.pick(scene.pointerX, scene.pointerY, (mesh) => {
      return mesh == lane;
    });
    if (pickinfo.hit) {
      return pickinfo.pickedPoint;
    }
    return null;
  };

  scene.onPointerObservable.add((pointerInfo) => {
    if (game.isGameStarted === true) {
      if (pointerInfo.event.pointerType === "xr") return;
      switch (pointerInfo.type) {
        case PointerEventTypes.POINTERDOWN:
          if (
            pointerInfo.pickInfo.hit &&
            pointerInfo.pickInfo.pickedMesh == bowling_ball
          ) {
            aim.isVisible = true;
            [currentMesh, startingPoint] = pointerDown(
              pointerInfo.pickInfo.pickedMesh,
              getPointerPosition
            );
          }
          break;
        case PointerEventTypes.POINTERUP:
          aim.isVisible = false;
          [startingPoint, currentMesh] = pointerUp(
            startingPoint,
            aim,
            game,
            ballMovementObjects,
            bowlingPinResult,
            createBowlingPins,
            scene,
            xr
          );
          break;
        case PointerEventTypes.POINTERMOVE:
          startingPoint = pointerMove(
            startingPoint,
            ballMovementObjects,
            aim,
            currentMesh,
            getPointerPosition
          );
          break;
      }
    }
  });

  // Create a new instance of StartGame with generalPins
  let game = new StartNewGame(setPins, config.game.players);
  // createAnimations(camera, scene, game);
  startMenuGUI(scene, game, xr);
  createRollSound();
  renderScoreBoard(scene);

  havokPlugin.onCollisionEndedObservable.add((ev) =>
    rollCollisionHandler(ev, scene, window, game)
  );

  scene.onKeyboardObservable.add((kbInfo) => {
    switch (kbInfo.type) {
      case KeyboardEventTypes.KEYDOWN:
        ballMovement(bowling_ball, kbInfo.event.key);
    }
  });

  //seperately add xr controller event handling
  xr.input.onControllerAddedObservable.add((controller) => {
    controller.onMotionControllerInitObservable.add((motionController) => {
      const allComponents = motionController
        .getComponentIds()
        .map((componentId) => {
          return motionController.getComponent(componentId);
        });
      const [trigger, squeeze, thumbStick, toggleTeleportButton] =
        allComponents;
      let aimToBallControl = false;
      //a-button && x-button: enables or disables teleportation feature
      toggleTeleportButton.onButtonStateChangedObservable.add(() => {
        if (toggleTeleportButton.pressed) toggleTeleportation(xr);
      });
      //squeeze: change thumbstick to control ball or aim
      squeeze.onButtonStateChangedObservable.add(() => {
        if (
          squeeze.value > config.motionController.squeezeThreshold &&
          game.isGameStarted
        ) {
          aimToBallControl = !aimToBallControl;
        }
      });
      //thumbstick: controls ball position and aim angle
      thumbStick.onAxisValueChangedObservable.add((value) => {
        if (game.isGameStarted && !game.ballIsRolled) {
          aim.isVisible = true;
          angleToAim(aimToBallControl, value, ballMovementObjects, aim);
        }
      });
      //trigger: shoot, squeeze: change control from aim to ball
      trigger.onButtonStateChangedObservable.add(() => {
        if (game.isGameStarted && !game.ballIsRolled && trigger.pressed) {
          aim.isVisible = false;
          aimToBallControl = false;
          ballShoot(
            aim,
            game,
            ballMovementObjects,
            bowlingPinResult,
            scene,
            thumbStick,
            xr
          );
        }
      });
    });
  });
  return scene;
}

createScene().then((scene) => {
  engine.runRenderLoop(function () {
    if (scene) {
      scene.render();
    }
  });
});
window.addEventListener("resize", function () {
  engine.resize();
});
