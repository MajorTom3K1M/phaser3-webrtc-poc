/* global Phaser remotePlayer */

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game-container",
  pixelArt: true,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
    },
  },
  scene: {
    preload: preload,
    create: create,
    update: update,
  },
};

const game = new Phaser.Game(config);
let joined = true;
let cursors;
let player;
let remotePlayer;
let showDebug = false;

function preload() {
  this.load.image(
    "tiles",
    "../assets/tilesets/tuxmon-sample-32px-extruded.png"
  );
  this.load.tilemapTiledJSON("map", "../assets/tilemaps/tuxemon-town.json");
  this.load.atlas(
    "atlas",
    "../assets/atlas/atlas.png",
    "../assets/atlas/atlas.json"
  );
}

function create() {
  const map = this.make.tilemap({ key: "map" });

  const tileset = map.addTilesetImage("tuxmon-sample-32px-extruded", "tiles");

  const belowLayer = map.createStaticLayer("Below Player", tileset, 0, 0);
  const worldLayer = map.createStaticLayer("World", tileset, 0, 0);
  const aboveLayer = map.createStaticLayer("Above Player", tileset, 0, 0);

  worldLayer.setCollisionByProperty({ collides: true });

  aboveLayer.setDepth(10);

  remotePlayer = [];
  const spawnPoint = map.findObject(
    "Objects",
    (obj) => obj.name === "Spawn Point"
  );

  player = this.physics.add
    .sprite(spawnPoint.x, spawnPoint.y, "atlas", "misa-front")
    .setSize(30, 40)
    .setOffset(0, 24);

  this.physics.add.collider(player, worldLayer);

  const anims = this.anims;
  anims.create({
    key: "misa-left-walk",
    frames: anims.generateFrameNames("atlas", {
      prefix: "misa-left-walk.",
      start: 0,
      end: 3,
      zeroPad: 3,
    }),
    frameRate: 10,
    repeat: -1,
  });
  anims.create({
    key: "misa-right-walk",
    frames: anims.generateFrameNames("atlas", {
      prefix: "misa-right-walk.",
      start: 0,
      end: 3,
      zeroPad: 3,
    }),
    frameRate: 10,
    repeat: -1,
  });
  anims.create({
    key: "misa-front-walk",
    frames: anims.generateFrameNames("atlas", {
      prefix: "misa-front-walk.",
      start: 0,
      end: 3,
      zeroPad: 3,
    }),
    frameRate: 10,
    repeat: -1,
  });
  anims.create({
    key: "misa-back-walk",
    frames: anims.generateFrameNames("atlas", {
      prefix: "misa-back-walk.",
      start: 0,
      end: 3,
      zeroPad: 3,
    }),
    frameRate: 10,
    repeat: -1,
  });

  const camera = this.cameras.main;
  camera.startFollow(player);
  camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

  cursors = this.input.keyboard.createCursorKeys();

  var gameObject = this;
  window.channel.onReceiveMessage = (event) =>
    onReceiveMessage(event, gameObject);
}

window.channel.onSendChannelStateChange = function (event, id) {
  if (window.channel.setChannel[id].readyState === "open") {
    window.channel.setChannel[id].send(
      JSON.stringify({
        type: "onJoin",
        from: window.channel.id,
        x: player.x,
        y: player.y,
      })
    );
  }

  if (window.channel.setChannel[id].readyState === "closed") {
    const data = { id };
    onLeave(data);
  }
};

function onReceiveMessage(event, gameObject) {
  const data = JSON.parse(event.data);
  switch (data.type) {
    case "onJoin":
      onJoin(data, gameObject);
      break;
    case "onMove":
      onMovePlayer(data);
      break;
    case "onLeave":
      onLeave(data);
      break;
    default:
      console.log("default : ", data);
      break;
  }
}

function onLeave(data) {
  const removePlayer = playerById(data.id);

  if (!removePlayer) {
    console.log("Player not found: ", data.id);
    return;
  }

  removePlayer.player.destroy();
  // Remove player from array
  remotePlayer.splice(remotePlayer.indexOf(removePlayer), 1);
}

function onJoin(data, gameObject) {
  remotePlayer.push(
    new RemotePlayer(data.from, gameObject, player, data.x, data.y)
  );
}

function onMovePlayer(data) {
  const movePlayer = playerById(data.id);
  if (!movePlayer) {
    console.log("Player not found: ", data.id);
    return;
  }
  movePlayer.move(data);
}

function update(time, delta) {
  const speed = 175;
  const prevVelocity = player.body.velocity.clone();

  player.body.setVelocity(0);

  for (var i = 0; i < remotePlayer.length; i++) {
    remotePlayer[i].update();
  }

  if (cursors.left.isDown) {
    player.body.setVelocityX(-speed);
  } else if (cursors.right.isDown) {
    player.body.setVelocityX(speed);
  }

  if (cursors.up.isDown) {
    player.body.setVelocityY(-speed);
  } else if (cursors.down.isDown) {
    player.body.setVelocityY(speed);
  }

  if (cursors.left.isDown) {
    player.anims.play("misa-left-walk", true);
  } else if (cursors.right.isDown) {
    player.anims.play("misa-right-walk", true);
  } else if (cursors.up.isDown) {
    player.anims.play("misa-back-walk", true);
  } else if (cursors.down.isDown) {
    player.anims.play("misa-front-walk", true);
  } else {
    player.anims.stop();
    if (prevVelocity.x < 0) player.setTexture("atlas", "misa-left");
    else if (prevVelocity.x > 0) player.setTexture("atlas", "misa-right");
    else if (prevVelocity.y < 0) player.setTexture("atlas", "misa-back");
    else if (prevVelocity.y > 0) player.setTexture("atlas", "misa-front");
  }

  player.body.velocity.normalize().scale(speed);

  window.channel.send({
    type: "onMove",
    id: window.channel.id,
    x: player.x,
    y: player.y,
    direction: {
      left: cursors.left.isDown,
      right: cursors.right.isDown,
      up: cursors.up.isDown,
      down: cursors.down.isDown,
    },
    velocity: prevVelocity,
  });
}

function playerById(id) {
  for (var i = 0; i < remotePlayer.length; i++) {
    if (remotePlayer[i].player.name === id) {
      return remotePlayer[i];
    }
  }

  return false;
}
