/* global scene */

var RemotePlayer = function (index, game, player, startX, startY, thisPlayer) {
  var x = startX;
  var y = startY;

  this.speed = 175;
  this.game = game;
  this.player = player;
  this.direction = {
    left: false,
    right: false,
    up: false,
    down: false,
  };
  this.prevVelocity = { x: 0, y: 0 };
  this.position = { x: startX, y: startY };

  this.player = game.physics.add
    .sprite(x, y, "atlas", "misa-front")
    .setSize(30, 40)
    .setOffset(0, 24);
  this.player.name = index;
  this.lastPosition = { x: x, y: y };
};

RemotePlayer.prototype.move = function (data) {
  this.position = { x: data.x, y: data.y };
  this.prevVelocity = data.velocity;
  this.direction = data.direction;
};

RemotePlayer.prototype.update = function () {
  if (this.direction.left || this.direction.right) {
    this.player.x = this.position.x;
  }

  if (this.direction.up || this.direction.down) {
    this.player.y = this.position.y;
  }

  if (this.direction.left) {
    this.player.anims.play("misa-left-walk", true);
  } else if (this.direction.right) {
    this.player.anims.play("misa-right-walk", true);
  } else if (this.direction.up) {
    this.player.anims.play("misa-back-walk", true);
  } else if (this.direction.down) {
    this.player.anims.play("misa-front-walk", true);
  } else {
    this.player.anims.stop();
    if (this.prevVelocity.x < 0) this.player.setTexture("atlas", "misa-left");
    else if (this.prevVelocity.x > 0)
      this.player.setTexture("atlas", "misa-right");
    else if (this.prevVelocity.y < 0)
      this.player.setTexture("atlas", "misa-back");
    else if (this.prevVelocity.y > 0)
      this.player.setTexture("atlas", "misa-front");
  }
};

window.RemotePlayer = RemotePlayer;
