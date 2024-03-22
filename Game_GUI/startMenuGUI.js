import { AdvancedDynamicTexture, Button } from "@babylonjs/gui";
import { Mesh, Vector3 } from "@babylonjs/core";
import {
  overallScoreBoardDisplay,
  currentRollScoreBoardDisplay,
} from "./renderScoreBoard";
import { infoGUI } from "./infoGUI";
import { StartNewGame } from "../Game_Logic/newGameDataStructure";
import { createOwnPlane, createButton } from "./createButtonForGUI";
import config from "../config.json"


//positions of the new game, info and exit game respectively
const positions = [];
for (const { x, y, z } of config.button.positions) {
  const position = new Vector3(x, y, z);
  positions.push(position);
}


function createStartButton(scene) {
  let startButtonPositionCoordinates = positions[0];
  let startPlane = createOwnPlane(scene, config.button.height[0], config.button.width, startButtonPositionCoordinates);
  startPlane.billboardMode = Mesh.BILLBOARDMODE_ALL;
  let startButton = createButton("NEW GAME", config.button.colors[0]);
  let advancedTexture = AdvancedDynamicTexture.CreateForMesh(startPlane);
  advancedTexture.addControl(startButton);
  return [startButton, startPlane];
}

function createInfoButton(scene) {
  let infoButtonPositionCoordinates = positions[1];
  let infoPlane = createOwnPlane(scene, config.button.height[0], config.button.width, infoButtonPositionCoordinates);
  infoPlane.billboardMode = Mesh.BILLBOARDMODE_ALL;
  let infoButton = createButton("INFO", config.button.colors[1]);
  let advancedTexture = AdvancedDynamicTexture.CreateForMesh(infoPlane);
  advancedTexture.addControl(infoButton);
  return [infoButton, infoPlane];
}

function createExitButton(scene) {
  let exitButtonPositionCoordinates = positions[2];
  let exitPlane = createOwnPlane(scene, config.button.height[0], config.button.width, exitButtonPositionCoordinates);
  exitPlane.billboardMode = Mesh.BILLBOARDMODE_ALL;
  let exitButton = createButton("EXIT", config.button.colors[2]);
  let advancedTexture = AdvancedDynamicTexture.CreateForMesh(exitPlane);
  advancedTexture.addControl(exitButton);
  return [exitButton, exitPlane];
}

const handleStartGame = (startPlane, infoPlane, exitPlane, game) => {
  //dispose the menu GUI and enter the environment
  startPlane.dispose();
  infoPlane.dispose();
  exitPlane.dispose();
  //set the default for the scoreboard displays
  overallScoreBoardDisplay.updateText("Overall\nScore: 0");
  currentRollScoreBoardDisplay.updateText("Current\nScore: 0");
  overallScoreBoardDisplay.isVisible = true;
  currentRollScoreBoardDisplay.isVisible = true;
  const newGame = new StartNewGame(game.generalPins, config.game.players);
  newGame.isGameStarted = true;
  game.updateToNewGame(newGame); //resets the game object to new game
};

const handleExitGame = async(xr) => {
  // console.log(xr);
  await xr.baseExperience.exitXRAsync().then(() => {
    var customWindow = window.open("", "_self", "");
    customWindow.close();
  });
};

const handleInfo = (startPlane, infoPlane, exitPlane, scene, game) => {
  startPlane.dispose();
  infoPlane.dispose();
  exitPlane.dispose();
  infoGUI(scene, game);
};

export function startMenuGUI(scene, game, xr) {
  let [startGameButton, startPlane] = createStartButton(scene);
  let [infoButton, infoPlane] = createInfoButton(scene);
  let [exitGameButton, exitPlane] = createExitButton(scene);

  startGameButton.onPointerUpObservable.add(function () {
    handleStartGame(startPlane, infoPlane, exitPlane, game);
  });

  exitGameButton.onPointerUpObservable.add(function () {
    handleExitGame(xr);
  });

  infoButton.onPointerUpObservable.add(function () {
    handleInfo(startPlane, infoPlane, exitPlane, scene, game);
  });
  return { startGameButton, infoButton, exitGameButton};
}
