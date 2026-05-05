// Phaser final project
// Escape Earth
// Fullscreen responsive config

"use strict";

let config = {
    parent: "phaser-game",
    type: Phaser.AUTO,

    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: window.innerWidth,
        height: window.innerHeight
    },

    render: {
        pixelArt: true
    },

    backgroundColor: "#000000",

    scene: [EscapeEarth]
};

const game = new Phaser.Game(config);