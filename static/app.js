function sanitizeInput(inputElement) {
    // Remove any non-digit characters
    inputElement.value = inputElement.value.replace(',', '.');
    inputElement.value = inputElement.value.replace(/[^0-9.]/g, '');

    // // Replace commas with periods
    // console.log(inputElement.value);
    // inputElement.value = inputElement.value.replace(',', '.');
    // console.log(inputElement.value);

    var value = parseFloat(inputElement.value);
    // Ensure value is within the specified range
    if(inputElement.hasAttribute('min')){
        var minValue = parseFloat(inputElement.getAttribute('min'));
        value = Math.max(minValue, value);
    }
    if(inputElement.hasAttribute('max')){
        var maxValue = parseFloat(inputElement.getAttribute('max'));
        value = Math.min(maxValue, value);
    }

    if(inputElement.hasAttribute('step')){
        var step = parseFloat(inputElement.getAttribute('step'));
        value = Math.round(value / step) * step;
        inputElement.value = value.toFixed(Math.ceil(-Math.log10(step)));
    } else {
        inputElement.value = value
    }
}
const all_inputs = document.querySelectorAll('input[type="tel"]');
for(const inpElem of all_inputs){
    inpElem.addEventListener("change", function(){
        sanitizeInput(this);
        if(this.id == "c_init_inp"){
            sanitizeInput(document.getElementById("crefA_inp"))
        }
        if(this.id == "crefA_inp"){
            sanitizeInput(document.getElementById("c_init_inp"))
        }
        if(this.id == "T_init_inp"){
            sanitizeInput(document.getElementById("TrefA_inp"))
        }
        if(this.id == "TrefA_inp"){
            sanitizeInput(document.getElementById("T_init_inp"))
        }
    })
}


document.querySelector("#button_update").addEventListener("click", () => {
    const axParams = readAxParams();
    plotter.setNewAxRanges(axParams);
})

document.querySelector("#button_minimizer").addEventListener("click", () => {
    const axParams = readAxParams();
    plotter.setNewAxRanges(axParams);
    sender.parameters = readModelParams();
    sender.minimizer = readMinimizerParams();
    sender.points = plotter.getRealPoints();
    sender.optimizer().then(data => {
        plotter.setRealPoints(data.points);
        sp.replotMinimizer(
            data,
            sender.minimizer.crefA, sender.minimizer.crefB,
            sender.parameters.x1, sender.parameters.x2, sender.minimizer.TMax
        );
    });
})
document.getElementById('num_points_inp').addEventListener("change", () => {
    sender.parameters = readModelParams();
    sender.minimizer = readMinimizerParams();
    let new_points = [];
    for (let c = 0; c < sender.minimizer.num_points; c++) {
        new_points.push({ x: sender.parameters.x1 + (sender.parameters.x2 - sender.parameters.x1) / (sender.minimizer.num_points - 1) * c, y: sender.parameters.T_init })
    }
    plotter.setRealPoints(new_points);
    // sender.manual().then((data) => {
    //     sp.replot(
    //         data,
    //         sender.minimizer.crefA, sender.minimizer.crefB,
    //         sender.parameters.x1, sender.parameters.x2, sender.minimizer.TMax
    //     )
    // })
})

const c_init_inp = document.getElementById("c_init_inp");
const crefA_inp = document.getElementById("crefA_inp");
const T_init_inp = document.getElementById("T_init_inp");
const TrefA_inp = document.getElementById("TrefA_inp");

function duplicateInputs(input1, input2) {
    [input1, input2].forEach(input => {
        input.addEventListener('keyup', () => {
            input === input1 ? input2.value = input1.value : input1.value = input2.value;
        });
    });
}

duplicateInputs(c_init_inp, crefA_inp);
duplicateInputs(T_init_inp, TrefA_inp);

function readModelParams() {
    var parameterData = {
        F0: parseFloat(document.getElementById('F0_inp').value),
        c0: parseFloat(document.getElementById('c0_inp').value),
        F: parseFloat(document.getElementById('F_inp').value),
        T0: parseFloat(document.getElementById('T0_inp').value),
        r: parseFloat(document.getElementById('r_inp').value),
        k0: parseFloat(document.getElementById('k0_inp').value),
        EdivR: parseFloat(document.getElementById('EdivR_inp').value),
        U: parseFloat(document.getElementById('U_inp').value),
        rho: parseFloat(document.getElementById('rho_inp').value),
        Cp: parseFloat(document.getElementById('Cp_inp').value),
        dH: parseFloat(document.getElementById('dH_inp').value),
        V: parseFloat(document.getElementById('V_inp').value),
        c_init: parseFloat(document.getElementById('c_init_inp').value),
        T_init: parseFloat(document.getElementById('T_init_inp').value),
        x1: parseFloat(document.getElementById('x1').value),
        x2: parseFloat(document.getElementById('x2').value),
    };
    return parameterData;
}
function readMinimizerParams() {
    let parameterData = {
        Tc0A: parseFloat(document.getElementById('Tc0A_inp').value),
        TrefA: parseFloat(document.getElementById('TrefA_inp').value),
        crefA: parseFloat(document.getElementById('crefA_inp').value),
        Tc0B: parseFloat(document.getElementById('Tc0B_inp').value),
        TrefB: parseFloat(document.getElementById('TrefB_inp').value),
        crefB: parseFloat(document.getElementById('crefB_inp').value),
        TcMax: parseFloat(document.getElementById('TcMax_inp').value),
        TcMin: parseFloat(document.getElementById('TcMin_inp').value),
        TMax: parseFloat(document.getElementById('TMax_inp').value),
        TMin: parseFloat(document.getElementById('TMin_inp').value),
        num_points: Math.round(parseFloat(document.getElementById('num_points_inp').value)),
        hidden: 100,
    }
    return parameterData
}
function readAxParams() {
    var parameterData = {
        x1: parseFloat(document.getElementById('x1').value),
        x2: parseFloat(document.getElementById('x2').value),
        y1: parseFloat(document.getElementById('y1').value),
        y2: parseFloat(document.getElementById('y2').value),
    }
    return parameterData
}

class API {
    constructor(base_url) {
        this.base_url = base_url;
        this.points = null;
        this.parameters = null;
        this.minimizer = null;
    }
    manual() {
        return new Promise((resolve) => {
            fetch('/api', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ points: this.points, parameters: this.parameters })
            })
                .then(response => response.json())
                .then(data => resolve(data))
                .catch(error => console.error('Error:', error));
        })
    }
    optimizer() {
        return new Promise((resolve) => {
            fetch('/minimizer', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ parameters: this.parameters, minimizer: this.minimizer, points: this.points })
            })
                .then(response => response.json())
                .then(data => resolve(data))
        })
    }
}
const sender = new API(null);

class Interpolate {
    constructor(points) {
        this.points = points;
        this.points.sort((a, b) => a.x - b.x);
    }

    calculate(x) {
        for (let i = 0; i < this.points.length - 1; i++) {
            const x0 = this.points[i].x;
            const x1 = this.points[i + 1].x;
            const y0 = this.points[i].y;
            const y1 = this.points[i + 1].y;

            if (x0 <= x && x <= x1) {
                const t = (x - x0) / (x1 - x0);
                return y0 + t * (y1 - y0);
            }
        }
        
        return null;
    }
}

class Plotter {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = canvas.getContext('2d');
        this.points = [
            { x: 0, y: 100, dragging: false },
            { x: 80, y: 50, dragging: false },
            { x: 160, y: 150, dragging: false },
            { x: 240, y: 100, dragging: false },
            { x: 320, y: 50, dragging: false },
            { x: 400, y: 50, dragging: false }
        ];
        this.x1 = 0;
        this.x2 = 150;
        this.y1 = 200;
        this.y2 = 400;

        this.redrawTicks(10);

        const self = this;
        this.canvas.addEventListener('mousedown', function (e) {
            const rect = self.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            self.points.forEach(point => {
                if (Math.sqrt((point.x - x) ** 2 + (point.y - y) ** 2) < 10) {
                    point.dragging = true;
                }
            });
        });

        this.canvas.addEventListener('mousemove', function (e) {
            if (self.points.some(p => p.dragging)) {
                const rect = self.canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                self.points.forEach(point => {
                    if (point.dragging) {
                        // Allow only vertical movement for the first and last points
                        if (self.points.indexOf(point) === 0 || self.points.indexOf(point) === self.points.length - 1) {
                            point.y = y;
                        } else {
                            point.x = x;
                            point.y = y;
                        }
                    }
                });
                self.draw();
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            self.points.forEach(point => point.dragging = false);
            const realPointsCords = self.getRealPoints();
            document.querySelector(".points").innerHTML = JSON.stringify(realPointsCords).replaceAll("},{", "}<br>{");

            sender.points = realPointsCords;
            sender.parameters = readModelParams();
            sender.minimizer = readMinimizerParams();
            sender.manual().then(data => sp.replot(
                data,
                sender.minimizer.crefA, sender.minimizer.crefB,
                sender.parameters.x1, sender.parameters.x2, sender.minimizer.TMax
            ))
        });
    }
    getRealPoints() {
        return this.points.map((e) => {
            return {
                x: (this.x2 - this.x1) / this.canvas.width * e.x + this.x1,
                y: (this.y1 - this.y2) / this.canvas.height * e.y + this.y2
            }
        })
    }
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.beginPath();
        for (let i = 0; i < this.points.length; i++) {
            if (i === 0) {
                this.ctx.moveTo(this.points[i].x, this.points[i].y);
            } else {
                this.ctx.lineTo(this.points[i].x, this.points[i].y);
            }
            this.ctx.strokeRect(this.points[i].x - 5, this.points[i].y - 5, 10, 10); // Draw square around the point
        }
        this.ctx.stroke();
    }
    redrawTicks(number) {
        let old_ticks = document.querySelectorAll(".tick");
        for (const tick of old_ticks) {
            tick.remove();
        }
        for (let i = 0; i < number + 1; i++) {
            let tick = document.createElement("div");
            tick.classList.add("tick");
            tick.style.left = `${i * 100 / number}%`;
            document.querySelector(".axx").append(tick);

            let tick2 = document.createElement("div");
            tick2.classList.add("tick");
            tick2.style.top = `${i * 100 / number}%`;
            tick2.textContent = Math.round((this.y1 - this.y2) / 10 * i + this.y2);
            document.querySelector(".axy").append(tick2);
        }
    }
    setNewAxRanges(data) {
        this.x1 = data.x1;
        this.x2 = data.x2;
        this.y1 = data.y1;
        this.y2 = data.y2;
        this.redrawTicks(10);
    }
    setRealPoints(data) {
        this.points = data.map(e => {
            return {
                x: this.canvas.width / (this.x2 - this.x1) * (e.x - this.x1),
                y: this.canvas.height / (this.y1 - this.y2) * (e.y - this.y2),
                dragging: false
            }
        });
        this.draw();
    }
    approximate(){
        const interp1d = new Interpolate(this.points);
        const step = this.canvas.width/(this.points.length - 1);
        this.points = this.points.map((point, i)=>{
            return {
                x: i*step,
                y: interp1d.calculate(i*step),
                dragging: false
            }
        })
        this.draw();
    }
}


const plotter = new Plotter();
plotter.draw();



class SolutionPlotter {
    constructor() {
        this.ctxT = document.getElementById('tempChart');
        this.ctxC = document.getElementById('concChart');
        const self = this;

        this.chartC = new Chart(self.ctxC, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'Concentration Trajectory',
                        data: [],
                        borderColor: '#36a2eb',
                        pointRadius: 0
                    },
                    {
                        label: 'Optimal Concentration Trajectory',
                        data: [],
                        borderColor: '#36a2eb',
                        borderDash: [10, 5],
                        pointRadius: 0
                    },
                    {
                        label: 'Initial Concentration',
                        data: [],
                        borderColor: '#ff6384'
                    },
                    {
                        label: 'Reference Concentration',
                        data: [],
                        borderColor: '#4bc0c0'
                    }
                ]
            },
            options: {
                scales: {
                    x: {
                        type: 'linear',
                    },
                },
            }
        });

        this.chartT = new Chart(self.ctxT, {
            type: 'line',
            data: {
                datasets: [
                    {
                        label: 'Temperature',
                        data: [],
                        borderColor: '#36a2eb',
                        pointRadius: 0
                    },
                    {
                        label: 'Max Temperature',
                        data: [],
                        borderColor: '#ff6384',
                    },
                ]
            },
            options: {
                scales: {
                    x: {
                        type: 'linear',
                    },
                },
            }
        });
    }

    replot(d, c_init, c_ref, x1, x2, Tmax) {
        let c = [];
        let T = [];
        for (let i = 0; i < d.time.length; i++) {
            c.push({ x: d.time[i], y: d.concentration[i] });
            T.push({ x: d.time[i], y: d.temperature[i] });
        }
        // console.log(c, T);
        this.chartC.data.datasets[0].data = c;
        this.chartC.data.datasets[2].data = [{ x: x1, y: c_init }, { x: x2, y: c_init }];
        this.chartC.data.datasets[3].data = [{ x: x1, y: c_ref }, { x: x2, y: c_ref }];
        this.chartC.update();
        this.chartT.data.datasets[0].data = T;
        this.chartT.data.datasets[1].data = [{ x: x1, y: Tmax }, { x: x2, y: Tmax }]
        // this.chartT.data.datasets[1].data = T;
        this.chartT.update()
    }

    replotMinimizer(d, c_init, c_ref, x1, x2, Tmax) {
        let c = [];
        let T = [];
        for (let i = 0; i < d.time.length; i++) {
            c.push({ x: d.time[i], y: d.concentration[i] });
            T.push({ x: d.time[i], y: d.temperature[i] });
        }
        this.chartC.data.datasets[0].data = c;
        this.chartC.data.datasets[1].data = c;
        this.chartC.data.datasets[2].data = [{ x: x1, y: c_init }, { x: x2, y: c_init }];
        this.chartC.data.datasets[3].data = [{ x: x1, y: c_ref }, { x: x2, y: c_ref }];
        this.chartC.update();
        this.chartT.data.datasets[0].data = T;
        this.chartT.data.datasets[1].data = [{ x: x1, y: Tmax }, { x: x2, y: Tmax }]
        this.chartT.update()
    }
}

const sp = new SolutionPlotter();

// let chartc = new Chart(ctx2, {
//     type: 'line',
//     data: {
//         datasets: [{
//             label: 'Concentration',
//             data: []
//         }]
//     },
//     options: {
//         scales: {
//             x: {
//                 type: 'linear',
//             },
//         },
//     }
// });

// const ctx3 = document.getElementById('myChart2');

// let chartT = new Chart(ctx3, {
//     type: 'line',
//     data: {
//         datasets: [{
//             label: 'Temperature',
//             data: [],
//             borderColor: '#9BD0F5',
//         }]
//     },
//     options: {
//         scales: {
//             x: {
//                 type: 'linear',
//             },
//         },
//     }
// });