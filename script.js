// noinspection DuplicatedCode, JSUnusedGlobalSymbols

/*** @type {HTMLCanvasElement} */
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
let __uuid = 0;
/*** @type {Entity[]} */
let entities = [];
let key_down = null;
let points = [];
const CURVED_CONNECTIONS = false;

const entity_def = {
    "color": "#000000",
    "radius": 10,
    "collisionEnabled": true,
    "ropeTension": 17,
    "ropeMaxTension": 50,
    "gravity": 0.5,
    "gravityMomentum": 0.01,
    "killer": false
};

ctx.drawLine = (x1, y1, x2, y2) => {
    ctx.beginPath();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.closePath();
};

ctx.drawCurveLine = (x1, y1, x2, y2) => {
    ctx.beginPath();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(x1, y2, x2, y2, x2, y2);
    ctx.stroke();
    ctx.closePath();
};

class V2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    /**
     * @param {number | V2} x
     * @param {number} y
     * @returns {V2}
     */
    add(x, y) {
        if (x instanceof V2) {
            y = x.y;
            x = x.x;
        }
        return new V2(this.x + x, this.y + y);
    }

    /**
     * @param {number | V2} x
     * @param {number} y
     * @returns {V2}
     */
    subtract(x, y) {
        if (x instanceof V2) {
            y = x.y;
            x = x.x;
        }
        return new V2(this.x - x, this.y - y);
    }

    /**
     * @param {number | V2} x
     * @param {number} y
     * @returns {V2}
     */
    multiply(x, y) {
        if (x instanceof V2) {
            y = x.y;
            x = x.x;
        }
        return new V2(this.x * x, this.y * y);
    }

    /**
     * @param {number | V2} x
     * @param {number} y
     * @returns {V2}
     */
    divide(x, y) {
        if (x instanceof V2) {
            y = x.y;
            x = x.x;
        }
        return new V2(this.x / x, this.y / y);
    }

    /*** @returns {V2} */
    floor() {
        return new V2(Math.floor(this.x), Math.floor(this.y));
    }

    /*** @returns {V2} */
    round() {
        return new V2(Math.round(this.x), Math.round(this.y));
    }

    /*** @returns {V2} */
    abs() {
        return new V2(Math.abs(this.x), Math.abs(this.y));
    }

    /**
     * @param {V2} v2
     * @returns {V2}
     */
    set_position(v2) {
        this.x = v2.x;
        this.y = v2.y;
        return this;
    }

    /**
     * @param {V2} v2
     * @returns {number}
     */
    distance(v2) {
        return Math.sqrt(Math.pow(v2.x - this.x, 2) + Math.pow(v2.y - this.y, 2));
    }

    /**
     * @param {number} radians - As radians
     * @returns {V2}
     */
    direction_reversed(radians) {
        return this.direction(radians).multiply(-1, -1);
    }

    /**
     * @param {number} radians - As radians
     * @returns {V2}
     */
    direction(radians) {
        return new V2(Math.sin(radians), Math.cos(radians));
    }

    /**
     * @param {V2} v2
     * @returns {number} - As radians
     */
    look_at(v2) {
        return Math.atan2(v2.x - this.x, v2.y - this.y);
    }

    motion_to(v2) {
        return this.direction(this.look_at(v2));
    }

    motion_reversed_to(v2) {
        return this.direction_reversed(this.look_at(v2));
    }
}

class Entity extends V2 {
    /**
     * @param {number} x
     * @param {number} y
     * @param {{color: string?, radius: number?, collisionEnabled: boolean?, ropeTension: (number | false)?, ropeMaxTension: (number | false)?, gravity: (number | false)?, gravityMomentum: (number | false)?, killer: boolean?}?} options
     */
    constructor(x, y, options) {
        super(x, y);
        if (!options) options = {};
        Object.keys(entity_def).forEach(key => Object.keys(options).includes(key) ? null : options[key] = entity_def[key]);
        /*** @type {{color: string, radius: number, collisionEnabled: boolean, ropeTension: number | false, ropeMaxTension: number | false, gravity: number | false, gravityMomentum: number | false, killer: boolean}} */
        this.options = options;
        this.alive = true;
        this.uuid = __uuid++;
        this.ticks = 0;
        entities.push(this);
        /*** @type {Entity[]} */
        this.connected = [];
        this.fall_momentum = 0;
    }

    /*** @returns {number} */
    getRadius() {
        return this.options.radius;
    }

    /**
     * @param {number} radius
     * @returns {Entity}
     */
    setRadius(radius) {
        this.options.radius = radius;
        return this;
    }

    /*** @returns {string} */
    getColor() {
        return this.options.color;
    }

    /**
     * @param {string} color
     * @returns {Entity}
     */
    setColor(color) {
        this.options.color = color;
        return this;
    }

    /**
     * @param {Entity} entity
     * @returns {boolean}
     */
    collides(entity) {
        return this.getMiddle().distance(entity.getMiddle()) < ((entity.getRadius() + this.getRadius()) / 2);
    }

    /**
     * @param {Entity} entity
     * @returns {Entity}
     */
    connect(entity) {
        this.connected.push(entity);
        entity.connected.push(this);
        return this;
    }

    /*** @returns {Entity} */
    checkConnections() {
        this.connected = this.connected.filter(entity => entity.alive && entity !== this);
        return this;
    }

    /*** @returns {Entity[]} */
    getCollisions() {
        return entities
            .filter(entity => entity.alive && entity !== this && this.collides(entity));
    }

    /*** @returns {V2} */
    getMiddle() {
        return this.add(this.getRadius() / 2, this.getRadius() / 2);
    }

    /*** @returns {number} */
    updateGravity() {
        if (this.options.gravity === undefined) return 0;
        return this.y += (this.options.gravity || 0) + (this.fall_momentum += (this.options.gravityMomentum || 0));
    }

    /*** @returns {Entity} */
    resetFallMomentum() {
        this.fall_momentum = 0;
        return this;
    }

    /**
     * @param {number?} amount
     * @returns {Entity}
     */
    decreaseFallMomentum(amount = 1) {
        this.fall_momentum -= amount;
        if (this.fall_momentum < 0) this.fall_momentum = 0;
        return this;
    }

    updateRopeTension() {
        if (this.options.ropeTension === false) return false;
        const rope = this.connected
            .filter(i => i.distance(this) > this.options.ropeTension)
            .sort((a, b) => b.distance(this) - a.distance(this))[0];
        if (rope) {
            const motion = this.getMiddle().motion_to(rope.getMiddle());
            this.set_position(this.add(motion.x, motion.y));
            this.decreaseFallMomentum(0.5);
        } else return false;
        return true;
    }

    updateMaxRopeTension() {
        if (this.options.ropeMaxTension === false) return false;
        const rope = this.connected
            .filter(i => i.distance(this) > this.options.ropeMaxTension)
            .sort((a, b) => b.distance(this) - a.distance(this))[0];
        if (rope) {
            const motion = this.getMiddle().motion_to(rope).multiply(this.distance(rope.getMiddle()) - this.options.ropeTension, this.distance(rope.getMiddle()) - this.options.ropeTension);
            this.set_position(this.add(motion.x, motion.y));
            this.decreaseFallMomentum(0.5);
        } else return false;
        return true;
    }

    updateCollisions() {
        if (!this.options.collisionEnabled) return false;
        const collision = this.getCollisions()[0];
        if (collision) {
            const motion = this.getMiddle().motion_reversed_to(collision.getMiddle()).multiply(2, 2);
            this.set_position(this.add(motion.x, motion.y));
            this.decreaseFallMomentum(0.1);
        }
    }

    update() {
        this.ticks++;
        this.checkConnections();
        if (this.options.killer && this.getCollisions().some(i => !i.options.killer)) this.getCollisions().filter(i => !i.options.killer).forEach(i => i.kill());
        if (!this.updateMaxRopeTension() && !this.updateRopeTension() && !this.updateCollisions()) {
            this.updateGravity();
        }
    }

    /*** @returns {Entity} */
    kill() {
        this.alive = false;
        return this;
    }
}

function toJSON(stringify = false) {
    return stringify ? JSON.stringify(entities.map(entity => ({...entity}))) : entities.map(entity => ({...entity}));
}

function fromJSON(json) {
    entities = json.map(j => {
        const entity = new Entity(j.x, j.y, j.options);
        Object.keys(j).forEach(key => entity[key] = j[key]);
        return entity;
    });
}

const mouse = new V2();
addEventListener("mousemove", ev => mouse.set_position(new V2(ev.clientX, ev.clientY)));
let _fps = 0;
let fps = 0;
let __fps;

function render() {
    _fps++;
    if (!__fps) __fps = Date.now() + 1000;
    if (__fps < Date.now()) {
        __fps = Date.now() + 1000;
        fps = _fps;
        _fps = 0;
        document.getElementById("fps").innerHTML = fps;
    }
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    entities.filter(entity => entity.alive).forEach(entity => entity.update());
    entities.filter(entity => entity.alive).forEach(entity => {
        if (entity.x < 0) {
            entity.x = 0;
            entity.resetFallMomentum();
        }
        if (entity.x > canvas.width - (entity.getRadius() / 2)) {
            entity.x = canvas.width - (entity.getRadius() / 2);
            entity.resetFallMomentum();
        }
        if (entity.y < 0) {
            entity.y = 0;
            entity.resetFallMomentum();
        }
        if (entity.y > canvas.height - (entity.getRadius() / 2)) {
            entity.y = canvas.height - (entity.getRadius() / 2);
            entity.resetFallMomentum();
        }
        ctx.fillStyle = entity.getColor();
        const circle = new Path2D();
        circle.arc(entity.x, entity.y, entity.getRadius() / 2, 0, Math.PI * 2);
        ctx.fill(circle);
        entity.connected.forEach(entity2 => ctx[CURVED_CONNECTIONS ? "drawCurveLine" : "drawLine"](entity.x, entity.y, entity2.x, entity2.y));
    });
    setTimeout(render);
}

render();

addEventListener("mousedown", ev => {
    key_down = new V2(ev.clientX, ev.clientY);
    points = [];
});

addEventListener("keydown", ev => {
    if (key_down) {
        let entity;
        switch (ev.key) {
            case " ":
                entity = new Entity(mouse.x, mouse.y, {
                    ropeTension: false, ropeMaxTension: false, gravity: undefined, color: "rgb(0, 255, 0)"
                });
                break;
            case "z":
            case "Z":
                entity = new Entity(mouse.x, mouse.y, {
                    ropeTension: false, ropeMaxTension: false, gravity: undefined, color: "rgb(255, 0, 255)", g: true
                });
                break;
            case "x":
            case "X":
                entity = new Entity(mouse.x, mouse.y, {
                    ropeTension: false, ropeMaxTension: false, gravity: undefined, collisionEnabled: false,
                    color: "rgb(255, 255, 0)", g: true
                });
                break;
            case "c":
            case "C":
                entity = new Entity(mouse.x, mouse.y, {
                    ropeTension: false, ropeMaxTension: false, gravity: undefined, killer: true, color: "rgb(255, 0, 0)"
                });
                break;
            default:
                return;
        }
        if (points[points.length - 1]) entity.connect(points[points.length - 1]);
        points.push(entity);
    } else {
        switch (ev.key) {
            case " ":
                new Entity(mouse.x, mouse.y, {
                    color: "rgb(0, 255, 0)"
                });
                break;
            case "z":
            case "Z":
                new Entity(mouse.x, mouse.y, {
                    gravity: undefined, color: "rgb(255, 0, 255)"
                });
                break;
            case "x":
            case "X":
                new Entity(mouse.x, mouse.y, {
                    gravity: undefined, collisionEnabled: false, color: "rgb(255, 255, 0)"
                });
                break;
            case "c":
            case "C":
                new Entity(mouse.x, mouse.y, {
                    killer: true, color: "rgb(255, 0, 0)"
                });
                break;
            default:
                return;
        }
    }
});

addEventListener("mouseup", ev => {
    if (key_down) {
        if ((ev.clientX === key_down.x && ev.clientY === key_down.y) || points.length < 1) {
            new Entity(ev.clientX, ev.clientY, {
                color: "rgb(0, 255, 0)"
            });
            key_down = null;
            points = [];
        } else {
            points.forEach(i => {
                if (!i.options.g) {
                    i.options.ropeTension = entity_def.ropeTension;
                    i.options.ropeMaxTension = entity_def.ropeMaxTension;
                    i.options.gravity = entity_def.gravity;
                } else delete i.options.g;
            });
            key_down = null;
            points = [];
        }
    }
});