class Car {
    constructor(x, y, width, height, controlType, angle = 0, maxSpeed = 3, color = 'orange', useCarImg) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.polygon = [];

        this.speed = 0;
        this.acceleration = 0.2;
        this.maxSpeed = maxSpeed;
        this.friction = 0.05;
        this.angle = angle;

        this.color = color;
        this.damaged = false;

        this.fitness = 0;

        this.useBrain = controlType === 'AI';

        if (controlType !== 'DUMMY') {
            this.sensor = new Sensor(this);
            this.brain = new NeuralNetwork([this.sensor.rayCount, 6, 4]); // last layer has 4 outputs (forward, backward, left, right)
        }
        this.controls = new Controls(controlType);

        if (useCarImg) {
            this.img = new Image();
            this.img.src = 'resources/car.png'

            this.mask = document.createElement("canvas");
            this.mask.width = width;
            this.mask.height = height;

            const maskCtx = this.mask.getContext('2d');
            this.img.onload = () => {
                maskCtx.fillStyle = color;
                maskCtx.rect(0, 0, this.width, this.height);
                maskCtx.fill();

                maskCtx.globalCompositeOperation = 'destination-atop';
                maskCtx.drawImage(this.img, 0, 0, this.width, this.height);
            };
        }
    }

    load(info) {
        this.brain = info.brain;
        this.maxSpeed = info.maxSpeed;
        this.friction = info.friction;
        this.acceleration = info.acceleration;
        this.sensor.rayCount = info.sensor.rayCount;
        this.sensor.raySpread = info.sensor.raySpread;
        this.sensor.rayLength = info.sensor.rayLength;
        this.sensor.rayOffset = info.sensor.rayOffset;
    }

    update(roadBorders, traffic) {
        if (!this.damaged) {
            this.#move();
            this.fitness += this.speed;
            this.polygon = this.#createPolygon();
            this.damaged = this.#assessDamage(roadBorders, traffic);
        }
        if (this.sensor) {
            this.sensor.update(roadBorders, traffic);
            const offsets = this.sensor.readings.map(s => s == null ? 0 : 1 - s.offset).concat([this.speed / this.maxSpeed]);
            const outputs = NeuralNetwork.feedForward(offsets, this.brain);
            // console.log(outputs);

            if (this.useBrain) {
                this.controls.forward = outputs[0];
                this.controls.left = outputs[1];
                this.controls.right = outputs[2];
                this.controls.reverse = outputs[3];
            }
        }
    }

    #assessDamage(roadBorders, traffic) {
        if (this.polygon.length > 0) {
            for (const roadBorder of roadBorders) {
                if (polysIntersect(this.polygon, roadBorder))
                    return true;
            }
            for (const otherCar of traffic) {
                if (polysIntersect(this.polygon, otherCar.polygon))
                    return true;
            }
        }
        return false;
    }

    /** create the shape of the car*/
    #createPolygon() {
        const points = [];
        const rad = Math.hypot(this.width, this.height) / 2;
        const alpha = Math.atan2(this.width, this.height);

        points.push({
            x: this.x - Math.sin(this.angle - alpha) * rad,
            y: this.y - Math.cos(this.angle - alpha) * rad
        });
        points.push({
            x: this.x - Math.sin(this.angle + alpha) * rad,
            y: this.y - Math.cos(this.angle + alpha) * rad
        });
        points.push({
            x: this.x - Math.sin(Math.PI + this.angle - alpha) * rad,
            y: this.y - Math.cos(Math.PI + this.angle - alpha) * rad
        });
        points.push({
            x: this.x - Math.sin(Math.PI + this.angle + alpha) * rad,
            y: this.y - Math.cos(Math.PI + this.angle + alpha) * rad
        });
        return points;
    }

    #move() {
        const controls = this.controls;
        if (controls.forward)
            this.speed += this.acceleration;
        if (controls.reverse)
            this.speed -= this.acceleration;

        // limit to max speed
        if (this.speed > this.maxSpeed)
            this.speed = this.maxSpeed;
        else if (this.speed < -this.maxSpeed / 2)
            this.speed = -this.maxSpeed / 2;

        // friction
        if (this.speed > 0)
            this.speed -= this.friction;
        if (this.speed < 0)
            this.speed += this.friction;
        // full stop
        if (Math.abs(this.speed) < this.friction) this.speed = 0;

        // steer
        if (this.speed !== 0) {
            // if reverse flip controls
            const flip = this.speed > 0 ? 1 : -1;
            if (controls.left) {
                this.angle += 0.03 * flip;
            }
            if (controls.right) {
                this.angle -= 0.03 * flip;
            }
        }

        this.x -= Math.sin(this.angle) * this.speed;
        this.y -= Math.cos(this.angle) * this.speed;
    }

    draw(ctx, drawSensor) {
        if (this.sensor && drawSensor)
            this.sensor.draw(ctx);

        if (this.img) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(-this.angle);
            if (!this.damaged) {
                ctx.drawImage(this.mask, -this.width / 2, -this.height / 2, this.width, this.height);
                ctx.globalCompositeOperation = 'multiply';
            }
            ctx.drawImage(this.img, -this.width / 2, -this.height / 2, this.width, this.height);
            ctx.restore();
        } else {
            if (this.polygon.length > 0) {
                ctx.fillStyle = this.damaged ? 'red' : this.color;
                ctx.beginPath();
                ctx.moveTo(this.polygon[0].x, this.polygon[0].y);
                for (let i = 1; i < this.polygon.length; i++) {
                    const polygonEdge = this.polygon[i];
                    ctx.lineTo(polygonEdge.x, polygonEdge.y);
                }
                ctx.fill();
            }
        }
    }
}