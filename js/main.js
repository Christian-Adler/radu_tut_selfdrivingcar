const carCanvas = window.document.getElementById('carCanvas');
carCanvas.width = 200;

const networkCanvas = window.document.getElementById('networkCanvas');
networkCanvas.width = 300;

const carCtx = carCanvas.getContext('2d');
const networkCtx = networkCanvas.getContext('2d');

const road = new Road(carCanvas.width / 2, carCanvas.width * 0.9, 3);

// const car = new Car(road.getLaneCenter(1), 100, 30, 50, "KEYS", 3, "blue");
// const car = new Car(road.getLaneCenter(1), 100, 30, 50, "AI", 3, "blue");
const cars = generateCars(100);

const traffic = [new Car(road.getLaneCenter(1), -100, 30, 50, "DUMMY", 2)];

animate();

function generateCars(N) {
    const cars = [];
    for (let i = 0; i < N; i++) {
        cars.push(new Car(road.getLaneCenter(1), 100, 30, 50, "AI", 3, "blue"));
    }
    return cars;
}

function animate(time) {
    for (const c of traffic) {
        c.update(road.borders, []);
    }
    for (const car of cars) {
        car.update(road.borders, traffic);
    }

    const carsMinY = Math.min(...cars.map(c => c.y));
    const bestCar = cars.find(c => c.y === carsMinY);

    carCanvas.height = window.innerHeight;
    networkCanvas.height = window.innerHeight;

    carCtx.save();
    carCtx.translate(0, -bestCar.y + carCanvas.height * 0.7);

    road.draw(carCtx);

    for (const c of traffic) {
        c.draw(carCtx);
    }

    carCtx.globalAlpha = 0.2;
    for (const car of cars) {
        car.draw(carCtx);
    }
    carCtx.globalAlpha = 1;
    bestCar.draw(carCtx, true)
    carCtx.restore();

    networkCtx.lineDashOffset = -time / 50;
    Visualizer.drawNetwork(networkCtx, bestCar.brain);

    requestAnimationFrame(animate);
}