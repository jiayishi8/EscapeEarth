

class EscapeEarth extends Phaser.Scene {
    constructor() {
        super("escapeEarthScene");

        this.my = {
            sprite: {},
            groups: {}
        };
    }

    preload() {
        this.load.setPath("./assets/");

        // Platformer character atlas.
        // These frame names do NOT include .png in the XML.
        this.load.atlasXML(
            "AlienAssets",
            "spritesheet-characters-default.png",
            "spritesheet-characters-default.xml"
        );

        // Enemy atlas.
        // These frame names also do NOT include .png.
        this.load.atlasXML(
            "EnemyAssets",
            "spritesheet-enemies-default.png",
            "spritesheet-enemies-default.xml"
        );

        // Jumper atlas.
        // These frame names DO include .png, like cloud.png and lighting_yellow.png.
        this.load.atlasXML(
            "JumperAssets",
            "spritesheet_jumper.png",
            "spritesheet_jumper.xml"
        );

        // UI / tile atlas.
        // The heart frame is named heart, not heart.png.
        this.load.atlasXML(
            "TileAssets",
            "spritesheet-tiles-default.png",
            "spritesheet-tiles-default.xml"
        );

        // Space shooter atlas.
        // This contains spaceStation_###.png, spaceMissiles_###.png,
        // spaceParts_###.png, and spaceEffects_###.png.
        this.load.atlasXML(
            "SpaceShooterAssets",
            "spaceShooter2_spritesheet.png",
            "spaceShooter2_spritesheet.xml"
        );
    }

    create() {
        this.createAnimations();

        this.keys = this.input.keyboard.addKeys({
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D,
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            space: Phaser.Input.Keyboard.KeyCodes.SPACE,
            restart: Phaser.Input.Keyboard.KeyCodes.R
        });

        this.cursors = this.input.keyboard.createCursorKeys();

        this.scale.on("resize", this.handleResize, this);

        this.highScore = 0;

        this.init_game();
    }

    createAnimations() {
        if (!this.anims.exists("bee_flap")) {
            this.anims.create({
                key: "bee_flap",
                frames: [
                    { key: "EnemyAssets", frame: "bee_a" },
                    { key: "EnemyAssets", frame: "bee_b" }
                ],
                frameRate: 8,
                repeat: -1
            });
        }
    }

    init_game() {
        this.clearAllObjects();


        this.gameState = "title";

        this.score = 0;
        this.lives = 3;
        this.levelIndex = 0;
        this.levelStartTime = 0;
        this.nextPlayerShotTime = 0;
        this.invincibleUntil = 0;

        this.enemies = [];
        this.playerShots = [];
        this.enemyShots = [];
        this.stars = [];
        this.uiObjects = [];
        this.titleObjects = [];
        this.transitionObjects = [];

        this.levels = [
            {
                name: "LEVEL 1: LOWER ATMOSPHERE",
                backgroundTop: 0x6fc8ff,
                backgroundBottom: 0xd8f3ff,
                timeBonusThreshold: 30,
                timeBonusPoints: 500,
                enemyHealthBonus: 0,
                spawns: [
                    { time: 0, type: "bee", x: 0.20 },
                    { time: 900, type: "cloud", x: 0.72 },
                    { time: 1800, type: "bee", x: 0.45 },
                    { time: 3000, type: "bee", x: 0.82 },
                    { time: 4200, type: "cloud", x: 0.30 }
                ]
            },
            {
                name: "LEVEL 2: STORM LAYER",
                backgroundTop: 0x445c88,
                backgroundBottom: 0x9db7d5,
                timeBonusThreshold: 35,
                timeBonusPoints: 750,
                enemyHealthBonus: 2,
                spawns: [
                    { time: 0, type: "cloud", x: 0.20 },
                    { time: 700, type: "bee", x: 0.65 },
                    { time: 1600, type: "cloud", x: 0.78 },
                    { time: 2600, type: "satellite", x: 0.40 },
                    { time: 3900, type: "bee", x: 0.12 },
                    { time: 5000, type: "cloud", x: 0.55 }
                ]
            },
            {
                name: "LEVEL 3: ORBIT ESCAPE",
                backgroundTop: 0x02020f,
                backgroundBottom: 0x16183f,
                timeBonusThreshold: 45,
                timeBonusPoints: 1000,
                enemyHealthBonus: 4,
                spawns: [
                    { time: 0, type: "satellite", x: 0.20 },
                    { time: 800, type: "satellite", x: 0.75 },
                    { time: 1700, type: "cloud", x: 0.50 },
                    { time: 2700, type: "bee", x: 0.35 },
                    { time: 3900, type: "satellite", x: 0.60 },
                    { time: 6200, type: "boss", x: 0.50 }
                ]
            }
        ];

        this.createStarfield();
        this.showTitleScreen();
    }

    clearAllObjects() {
        this.time.removeAllEvents();
        let lists = [
            this.enemies,
            this.playerShots,
            this.enemyShots,
            this.stars,
            this.uiObjects,
            this.titleObjects,
            this.transitionObjects
        ];

        for (let list of lists) {
            if (!list) {
                continue;
            }

            for (let obj of list) {
                if (obj && obj.destroy) {
                    obj.destroy();
                }
            }
        }

        if (this.player && this.player.destroy) {
            this.player.destroy();
        }

        if (this.background && this.background.destroy) {
            this.background.destroy();
        }

        if (this.spaceship && this.spaceship.destroy) {
            this.spaceship.destroy();
        }
    }

    showTitleScreen() {
        this.gameState = "title";

        let w = this.scale.width;
        let h = this.scale.height;

        this.background = this.add.rectangle(0, 0, w, h, 0x02020f).setOrigin(0, 0);
        this.background.setDepth(-10);

        for (let star of this.stars) {
            star.setDepth(-5);
        }

        let title = this.add.text(w / 2, h * 0.20, "ESCAPE EARTH", {
            fontFamily: "Arial",
            fontSize: "56px",
            color: "#ffffff",
            align: "center"
        }).setOrigin(0.5);

        let story = this.add.text(
            w / 2,
            h * 0.36,
            "You are an alien fleeing Earth after stealing its resources.\nSurvive bees, storm clouds, satellites, and reach your spaceship.",
            {
                fontFamily: "Arial",
                fontSize: "22px",
                color: "#dbeafe",
                align: "center",
                wordWrap: { width: Math.min(760, w * 0.85) }
            }
        ).setOrigin(0.5);

        let controls = this.add.text(
            w / 2,
            h * 0.58,
            "A / D or Arrow Keys: Move\nW / S or Up / Down: Small vertical movement\nYour side weapons fire automatically\nPress SPACE to start",
            {
                fontFamily: "Arial",
                fontSize: "24px",
                color: "#fff4a3",
                align: "center"
            }
        ).setOrigin(0.5);

        let credits = this.add.text(
            w / 2,
            h * 0.84,
            "Credits to Kenny for all the art assets! Game for CMPM120.",
            {
                fontFamily: "Arial",
                fontSize: "18px",
                color: "#bbbbbb",
                align: "center"
            }
        ).setOrigin(0.5);

        this.titleObjects.push(title, story, controls, credits);
    }

    startNewRun() {
        this.clearAllObjects();

        this.gameState = "playing";
        this.score = 0;
        this.lives = 3;
        this.levelIndex = 0;
        this.nextPlayerShotTime = 0;
        this.invincibleUntil = 0;

        this.enemies = [];
        this.playerShots = [];
        this.enemyShots = [];
        this.stars = [];
        this.uiObjects = [];
        this.titleObjects = [];
        this.transitionObjects = [];

        this.createStarfield();
        this.createPlayer();
        this.createUI();
        this.startLevel(0);
    }

    createPlayer() {
        let w = this.scale.width;
        let h = this.scale.height;

        this.player = this.add.sprite(
            w / 2,
            h * 0.82,
            "AlienAssets",
            "character_purple_idle"
        );

        this.player.setScale(1.2);
        this.playerSpeed = 360;
    }

    createUI() {
        this.scoreText = this.add.text(20, 18, "Score: 0", {
            fontFamily: "Arial",
            fontSize: "24px",
            color: "#ffffff"
        });

        this.levelText = this.add.text(20, 50, "Level 1", {
            fontFamily: "Arial",
            fontSize: "20px",
            color: "#dbeafe"
        });

        this.highScoreText = this.add.text(20, 78, "High Score: 0", {
            fontFamily: "Arial",
            fontSize: "18px",
            color: "#ffe08a"
        });

        this.healthLabel = this.add.text(20, 108, "Life:", {
            fontFamily: "Arial",
            fontSize: "20px",
            color: "#ffffff"
        });

        this.heartIcons = [];

        for (let i = 0; i < 3; i++) {
            let heart = this.add.sprite(85 + i * 34, 121, "TileAssets", "heart");
            heart.setScale(0.8);
            this.heartIcons.push(heart);
        }

        this.uiObjects.push(
            this.scoreText,
            this.levelText,
            this.highScoreText,
            this.healthLabel,
            ...this.heartIcons
        );
    }

    createStarfield() {
        let w = this.scale.width;
        let h = this.scale.height;

        for (let i = 0; i < 90; i++) {
            let size = Phaser.Math.Between(1, 3);
            let star = this.add.rectangle(
                Phaser.Math.Between(0, w),
                Phaser.Math.Between(0, h),
                size,
                size,
                0xffffff,
                Phaser.Math.FloatBetween(0.35, 1)
            );

            star.speed = Phaser.Math.Between(40, 150);
            star.setDepth(-5);
            this.stars.push(star);
        }
    }

    startLevel(index) {
        this.levelIndex = index;

        if (this.levelIndex >= this.levels.length) {
            this.winGame();
            return;
        }

        this.gameState = "playing";

        this.clearLevelObjects();

        let level = this.levels[this.levelIndex];

        this.levelStartTime = this.time.now;
        this.spawnIndex = 0;
        this.levelCompleteWaiting = false;

        this.createBackground(level);

        if (this.player) {
            this.player.x = this.scale.width / 2;
            this.player.y = this.scale.height * 0.82;
            this.player.visible = true;
        }

        this.updateUI();

        let levelIntro = this.add.text(
            this.scale.width / 2,
            this.scale.height * 0.28,
            level.name,
            {
                fontFamily: "Arial",
                fontSize: "34px",
                color: "#ffffff",
                backgroundColor: "#00000099",
                padding: { x: 18, y: 10 }
            }
        ).setOrigin(0.5);

        this.transitionObjects.push(levelIntro);

        this.time.delayedCall(1400, () => {
            if (levelIntro && levelIntro.destroy) {
                levelIntro.destroy();
            }
        });
    }

    createBackground(level) {
        if (this.background && this.background.destroy) {
            this.background.destroy();
        }

        this.background = this.add.graphics();
        this.background.fillGradientStyle(
            level.backgroundTop,
            level.backgroundTop,
            level.backgroundBottom,
            level.backgroundBottom,
            1
        );
        this.background.fillRect(0, 0, this.scale.width, this.scale.height);
        this.background.setDepth(-10);

        for (let star of this.stars) {
            star.setDepth(-5);
        }
    }

    clearLevelObjects() {
        for (let enemy of this.enemies) {
            enemy.destroy();

            if (enemy.healthText) {
                enemy.healthText.destroy();
            }
        }

        for (let shot of this.playerShots) {
            shot.destroy();
        }

        for (let shot of this.enemyShots) {
            shot.destroy();
        }

        for (let obj of this.transitionObjects) {
            obj.destroy();
        }

        this.enemies = [];
        this.playerShots = [];
        this.enemyShots = [];
        this.transitionObjects = [];
    }

    update(time, delta) {
        this.updateStarfield(delta);

        if (this.gameState === "title") {
            if (Phaser.Input.Keyboard.JustDown(this.keys.space)) {
                this.startNewRun();
            }
            return;
        }

        if (this.gameState === "gameOver" || this.gameState === "win") {
            if (Phaser.Input.Keyboard.JustDown(this.keys.restart)) {
                this.startNewRun();
            }
            return;
        }

        if (this.gameState !== "playing") {
            return;
        }

        this.updatePlayer(delta, time);
        this.updatePlayerShots(delta);
        this.updateEnemies(delta, time);
        this.updateEnemyShots(delta);
        this.spawnEnemies(time);
        this.checkCollisions(time);
        this.checkLevelEnd();
        this.updateUI();
    }

    updateStarfield(delta) {
        if (!this.stars) {
            return;
        }

        let h = this.scale.height;
        let w = this.scale.width;

        for (let star of this.stars) {
            star.y += star.speed * delta / 1000;

            if (star.y > h + 5) {
                star.y = -5;
                star.x = Phaser.Math.Between(0, w);
            }
        }
    }

    updatePlayer(delta, time) {
        let dt = delta / 1000;

        let moveX = 0;
        let moveY = 0;

        if (this.keys.left.isDown || this.cursors.left.isDown) {
            moveX -= 1;
        }

        if (this.keys.right.isDown || this.cursors.right.isDown) {
            moveX += 1;
        }

        if (this.keys.up.isDown || this.cursors.up.isDown) {
            moveY -= 1;
        }

        if (this.keys.down.isDown || this.cursors.down.isDown) {
            moveY += 1;
        }

        this.player.x += moveX * this.playerSpeed * dt;
        this.player.y += moveY * this.playerSpeed * 0.6 * dt;

        let margin = 35;
        this.player.x = Phaser.Math.Clamp(this.player.x, margin, this.scale.width - margin);
        this.player.y = Phaser.Math.Clamp(this.player.y, this.scale.height * 0.55, this.scale.height - margin);

        if (moveX < 0) {
            this.player.flipX = true;
        } else if (moveX > 0) {
            this.player.flipX = false;
        }

        if (time > this.nextPlayerShotTime) {
            this.firePlayerWeapons();
            this.nextPlayerShotTime = time + 320;
        }

        if (time < this.invincibleUntil) {
            this.player.alpha = 0.45 + Math.sin(time * 0.03) * 0.25;
        } else {
            this.player.alpha = 1;
        }
    }

    firePlayerWeapons() {
        let leftShot = this.add.sprite(
            this.player.x - 22,
            this.player.y - 18,
            "SpaceShooterAssets",
            "spaceMissiles_027.png"
        );

        let rightShot = this.add.sprite(
            this.player.x + 22,
            this.player.y - 18,
            "SpaceShooterAssets",
            "spaceMissiles_027.png"
        );

        leftShot.damage = 1;
        rightShot.damage = 1;

        leftShot.speed = 650;
        rightShot.speed = 650;

        leftShot.setScale(0.8);
        rightShot.setScale(0.8);

        this.playerShots.push(leftShot, rightShot);

        this.safePlaySound("playerShoot", { volume: 0.25 });
    }

    updatePlayerShots(delta) {
        let dt = delta / 1000;

        for (let shot of this.playerShots) {
            shot.y -= shot.speed * dt;

            if (shot.y < -40) {
                shot.dead = true;
            }
        }

        this.cleanupList(this.playerShots);
    }

    spawnEnemies(time) {
        let level = this.levels[this.levelIndex];
        let elapsed = time - this.levelStartTime;

        while (
            this.spawnIndex < level.spawns.length &&
            elapsed >= level.spawns[this.spawnIndex].time
        ) {
            let spawn = level.spawns[this.spawnIndex];
            this.createEnemy(spawn.type, spawn.x);
            this.spawnIndex++;
        }
    }

    createEnemy(type, xRatio) {
        let level = this.levels[this.levelIndex];
        let x = this.scale.width * xRatio;
        let y = -70;

        let atlasKey = "EnemyAssets";
        let frameKey = "bee_a";

        if (type === "cloud") {
            atlasKey = "JumperAssets";
            frameKey = "cloud.png";
        } else if (type === "satellite") {
            atlasKey = "SpaceShooterAssets";
            frameKey = "spaceStation_018.png";
        } else if (type === "boss") {
            atlasKey = "SpaceShooterAssets";
            frameKey = "spaceStation_021.png";
            y = -120;
        }

        let enemy = this.add.sprite(x, y, atlasKey, frameKey);

        if (type === "bee") {
            enemy.play("bee_flap");
        }

        enemy.enemyType = type;
        enemy.baseX = x;
        enemy.spawnTime = this.time.now;
        enemy.nextShotTime = this.time.now + Phaser.Math.Between(600, 1300);
        enemy.dead = false;

        if (type === "bee") {
            enemy.hp = 2 + level.enemyHealthBonus;
            enemy.maxHp = enemy.hp;
            enemy.scoreValue = 80;
            enemy.speed = 90;
            enemy.fireDelay = 2800;
            enemy.shotType = "sting";
            enemy.path = "sine";
            enemy.setScale(1.1);
        } else if (type === "cloud") {
            enemy.hp = 4 + level.enemyHealthBonus;
            enemy.maxHp = enemy.hp;
            enemy.scoreValue = 130;
            enemy.speed = 55;
            enemy.fireDelay = 2800;
            enemy.shotType = "lightning";
            enemy.path = "drift";
            enemy.setScale(1.1);
        } else if (type === "satellite") {
            enemy.hp = 5 + level.enemyHealthBonus;
            enemy.maxHp = enemy.hp;
            enemy.scoreValue = 180;
            enemy.speed = 75;
            enemy.fireDelay = 2800;
            enemy.shotType = "laser";
            enemy.path = "wideSine";
            enemy.setScale(1.0);
        } else if (type === "boss") {
            enemy.hp = 45;
            enemy.maxHp = 45;
            enemy.scoreValue = 1200;
            enemy.speed = 45;
            enemy.fireDelay = 2800;
            enemy.shotType = "laser";
            enemy.path = "boss";
            enemy.phase = 1;
            enemy.setScale(1.1);
        }

        enemy.healthText = this.add.text(enemy.x, enemy.y - 38, enemy.hp + "/" + enemy.maxHp, {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#ffffff",
            backgroundColor: "#00000088",
            padding: { x: 4, y: 2 }
        }).setOrigin(0.5);

        this.enemies.push(enemy);
    }

    updateEnemies(delta, time) {
        let dt = delta / 1000;

        for (let enemy of this.enemies) {
            let age = time - enemy.spawnTime;

            if (enemy.enemyType === "boss") {
                let targetY = this.scale.height * 0.18;

                if (enemy.y < targetY) {
                    enemy.y += enemy.speed * dt;
                }

                enemy.x = this.scale.width / 2 + Math.sin(age * 0.0018) * this.scale.width * 0.26;

                if (enemy.hp <= enemy.maxHp / 2) {
                    enemy.phase = 2;
                    enemy.fireDelay = 430;
                }
            } else {
                enemy.y += enemy.speed * dt;

                if (enemy.path === "sine") {
                    enemy.x = enemy.baseX + Math.sin(age * 0.004) * 90;
                } else if (enemy.path === "drift") {
                    enemy.x = enemy.baseX + Math.cos(age * 0.002) * 65;
                } else if (enemy.path === "wideSine") {
                    enemy.x = enemy.baseX + Math.sin(age * 0.003) * 150;
                }
            }

            if (enemy.healthText) {
                enemy.healthText.x = enemy.x;
                enemy.healthText.y = enemy.y - 42;
                enemy.healthText.setText(enemy.hp + "/" + enemy.maxHp);
            }

            if (time > enemy.nextShotTime) {
                this.fireEnemyShot(enemy);
                enemy.nextShotTime = time + enemy.fireDelay;
            }

            if (enemy.y > this.scale.height + 120) {
                enemy.dead = true;
            }
        }

        this.cleanupList(this.enemies);
    }

    fireEnemyShot(enemy) {
        if (enemy.enemyType === "boss" && enemy.phase === 2) {
            this.createEnemyShot(enemy.x - 40, enemy.y + 30, -80, 280, enemy.shotType);
            this.createEnemyShot(enemy.x, enemy.y + 35, 0, 320, enemy.shotType);
            this.createEnemyShot(enemy.x + 40, enemy.y + 30, 80, 280, enemy.shotType);
        } else {
            let speed = 260;

            if (enemy.enemyType === "satellite") {
                speed = 320;
            }

            // Simple downward bullet.
            // vx = 0 means it does not move left/right.
            // vy = speed means it moves downward.
            this.createEnemyShot(
                enemy.x,
                enemy.y + 25,
                0,
                speed,
                enemy.shotType
            );
        }

        this.safePlaySound("enemyShoot", { volume: 0.2 });
    }

    createEnemyShot(x, y, vx, vy, type) {
        let atlasKey = "SpaceShooterAssets";
        let frameKey = "spaceParts_057.png";

        if (type === "lightning") {
            atlasKey = "JumperAssets";
            frameKey = "lighting_yellow.png";
        } else if (type === "laser") {
            atlasKey = "SpaceShooterAssets";
            frameKey = "spaceEffects_002.png";
        }

        let shot = this.add.sprite(x, y, atlasKey, frameKey);

        shot.vx = vx;
        shot.vy = vy;
        shot.dead = false;
        shot.enemyShotType = type;

        if (type === "sting") {
            shot.setScale(0.8);
        } else if (type === "lightning") {
            shot.setScale(0.9);
        } else if (type === "laser") {
            shot.setScale(0.8);
        }

        this.enemyShots.push(shot);
    }

    updateEnemyShots(delta) {
        let dt = delta / 1000;

        for (let shot of this.enemyShots) {
            shot.x += shot.vx * dt;
            shot.y += shot.vy * dt;

            if (
                shot.y > this.scale.height + 60 ||
                shot.y < -80 ||
                shot.x < -80 ||
                shot.x > this.scale.width + 80
            ) {
                shot.dead = true;
            }
        }

        this.cleanupList(this.enemyShots);
    }

    checkCollisions(time) {
        for (let shot of this.playerShots) {
            if (shot.dead) {
                continue;
            }

            for (let enemy of this.enemies) {
                if (enemy.dead) {
                    continue;
                }

                if (this.spriteOverlap(shot, enemy)) {
                    shot.dead = true;
                    enemy.hp -= shot.damage;

                    if (enemy.hp <= 0) {
                        this.killEnemy(enemy);
                    }

                    break;
                }
            }
        }

        for (let shot of this.enemyShots) {
            if (shot.dead) {
                continue;
            }

            if (time < this.invincibleUntil) {
                continue;
            }

            if (this.spriteOverlap(shot, this.player)) {
                shot.dead = true;
                this.damagePlayer(time);
            }
        }

        for (let enemy of this.enemies) {
            if (enemy.dead) {
                continue;
            }

            if (time < this.invincibleUntil) {
                continue;
            }

            if (this.spriteOverlap(enemy, this.player)) {
                enemy.dead = true;
                this.damagePlayer(time);
            }
        }

        this.cleanupList(this.playerShots);
        this.cleanupList(this.enemyShots);
        this.cleanupList(this.enemies);
    }

    spriteOverlap(a, b) {
        if (!a || !b || !a.getBounds || !b.getBounds) {
            return false;
        }

        return Phaser.Geom.Intersects.RectangleToRectangle(a.getBounds(), b.getBounds());
    }

    killEnemy(enemy) {
        enemy.dead = true;
        this.score += enemy.scoreValue;

        if (enemy.healthText) {
            enemy.healthText.destroy();
        }

        this.safePlaySound("enemyDie", { volume: 0.35 });
    }

    damagePlayer(time) {
        this.lives -= 1;
        this.invincibleUntil = time + 1200;

        this.safePlaySound("hurt", { volume: 0.45 });

        if (this.lives <= 0) {
            this.gameOver();
        }
    }

    checkLevelEnd() {
        let level = this.levels[this.levelIndex];
        let allSpawned = this.spawnIndex >= level.spawns.length;
        let noEnemiesLeft = this.enemies.length === 0;

        if (allSpawned && noEnemiesLeft && !this.levelCompleteWaiting) {
            this.levelCompleteWaiting = true;

            let seconds = (this.time.now - this.levelStartTime) / 1000;

            if (seconds <= level.timeBonusThreshold) {
                this.score += level.timeBonusPoints;

                let bonusText = this.add.text(
                    this.scale.width / 2,
                    this.scale.height * 0.42,
                    "Speed Bonus +" + level.timeBonusPoints,
                    {
                        fontFamily: "Arial",
                        fontSize: "30px",
                        color: "#fff4a3",
                        backgroundColor: "#00000099",
                        padding: { x: 18, y: 10 }
                    }
                ).setOrigin(0.5);

                this.transitionObjects.push(bonusText);
            }

            this.time.delayedCall(1500, () => {
                this.showLevelTransition();
            });
        }
    }

    showLevelTransition() {
        this.gameState = "transition";

        for (let shot of this.playerShots) {
            shot.destroy();
        }

        for (let shot of this.enemyShots) {
            shot.destroy();
        }

        this.playerShots = [];
        this.enemyShots = [];

        let w = this.scale.width;
        let h = this.scale.height;

        let transitionText = this.add.text(
            w / 2,
            h * 0.40,
            "Altitude rising...\nEscaping to the next layer!",
            {
                fontFamily: "Arial",
                fontSize: "34px",
                color: "#ffffff",
                align: "center",
                backgroundColor: "#000000aa",
                padding: { x: 20, y: 14 }
            }
        ).setOrigin(0.5);

        this.transitionObjects.push(transitionText);

        this.time.delayedCall(2000, () => {
            for (let obj of this.transitionObjects) {
                if (obj && obj.destroy) {
                    obj.destroy();
                }
            }

            this.transitionObjects = [];
            this.startLevel(this.levelIndex + 1);
        });
    }

    gameOver() {
        this.gameState = "gameOver";

        this.highScore = Math.max(this.highScore, this.score);

        let w = this.scale.width;
        let h = this.scale.height;

        let panel = this.add.rectangle(w / 2, h / 2, Math.min(650, w * 0.86), 280, 0x000000, 0.82);

        let text = this.add.text(
            w / 2,
            h / 2,
            "GAME OVER\nEarth kept you trapped.\n\nScore: " + this.score + "\nHigh Score: " + this.highScore + "\n\nPress R to reset",
            {
                fontFamily: "Arial",
                fontSize: "32px",
                color: "#ffffff",
                align: "center"
            }
        ).setOrigin(0.5);

        this.transitionObjects.push(panel, text);

        this.safePlaySound("lose", { volume: 0.6 });
    }

    winGame() {
        this.gameState = "win";

        this.highScore = Math.max(this.highScore, this.score);

        let w = this.scale.width;
        let h = this.scale.height;

        this.spaceship = this.add.sprite(
            w / 2,
            h * 0.24,
            "SpaceShooterAssets",
            "spaceStation_001.png"
        );
        this.spaceship.setScale(1.4);

        let panel = this.add.rectangle(w / 2, h / 2, Math.min(720, w * 0.88), 300, 0x000000, 0.82);

        let text = this.add.text(
            w / 2,
            h / 2,
            "YOU ESCAPED EARTH!\nYou reached your spaceship safely.\n\nFinal Score: " + this.score + "\nHigh Score: " + this.highScore + "\n\nPress R to play again",
            {
                fontFamily: "Arial",
                fontSize: "31px",
                color: "#ffffff",
                align: "center"
            }
        ).setOrigin(0.5);

        this.transitionObjects.push(panel, text, this.spaceship);

        this.safePlaySound("win", { volume: 0.6 });
    }

    updateUI() {
        if (!this.scoreText) {
            return;
        }

        this.scoreText.setText("Score: " + this.score);

        if (this.levels[this.levelIndex]) {
            this.levelText.setText(this.levels[this.levelIndex].name);
        } else {
            this.levelText.setText("Escaped!");
        }

        this.highScoreText.setText("High Score: " + this.highScore);

        for (let i = 0; i < this.heartIcons.length; i++) {
            this.heartIcons[i].visible = i < this.lives;
        }
    }

    cleanupList(list) {
        for (let obj of list) {
            if (obj.dead) {
                if (obj.healthText) {
                    obj.healthText.destroy();
                }

                if (obj.destroy) {
                    obj.destroy();
                }
            }
        }

        for (let i = list.length - 1; i >= 0; i--) {
            if (list[i].dead) {
                list.splice(i, 1);
            }
        }
    }

    safePlaySound(key, config) {
        if (this.cache.audio.exists(key)) {
            this.sound.play(key, config);
        }
    }

    handleResize() {
        if (this.gameState === "playing" && this.levels && this.levels[this.levelIndex]) {
            this.createBackground(this.levels[this.levelIndex]);
        }

        if (this.player) {
            this.player.x = Phaser.Math.Clamp(this.player.x, 35, this.scale.width - 35);
            this.player.y = Phaser.Math.Clamp(this.player.y, this.scale.height * 0.55, this.scale.height - 35);
        }
    }
}