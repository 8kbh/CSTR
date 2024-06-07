from flask import Flask, request, jsonify

import numpy as np
from scipy.interpolate import interp1d
from scipy.integrate import solve_ivp
from scipy.optimize import minimize


def solve(params):
    p = params["parameters"]
    points = params["points"]

    x = [point["x"] for point in points]
    y = [point["y"] for point in points]
    TcFun = interp1d(x, y)

    def model(t, y):
        c, T = y
        Tc = TcFun(t)
        dc_dt = p["F0"] * (p["c0"] - c) / p["V"] - p["k0"] * c * np.exp(-p["EdivR"] / T)
        dT_dt = (p["F0"] * (p["T0"] - T) / p["V"] - p["dH"] / (p["rho"] * p["Cp"]) * p["k0"] * c * np.exp(-p["EdivR"] / T)
                 + 2 * p["U"] / (p["r"] * p["rho"] * p["Cp"]) * (Tc - T))
        return [dc_dt, dT_dt]

    t_span = (p["x1"], p["x2"])
    y0 = [p["c_init"], p["T_init"]]
    solution = solve_ivp(model, t_span, y0, method='Radau', max_step=1, first_step=1)
    concentration, temperature = solution.y

    return {
        "time": solution.t.tolist(),
        "concentration": concentration.tolist(),
        "temperature": temperature.tolist()
    }


def findOptimal(params):
    p = params["parameters"]
    m = params["minimizer"]
    points = params["points"]
    xpoints = np.array([point["x"] for point in points])
    ypoints = np.array([point["y"] for point in points])

    def solve(*args):
        # Tс и t (y и x) - точки через которые будет проходить оптимальная кривая охлаждающей температуры
        y = args
        x = xpoints

        TcFun = interp1d(x, y)

        def model(t, y):
            c, T = y
            Tc = TcFun(t)
            dc_dt = p["F0"] * (p["c0"] - c) / p["V"] - p["k0"] * c * np.exp(-p["EdivR"] / T)
            dT_dt = (p["F0"] * (p["T0"] - T) / p["V"] - p["dH"] / (p["rho"] * p["Cp"]) * p["k0"] * c * np.exp(-p["EdivR"] / T)
                     + 2 * p["U"] / (p["r"] * p["rho"] * p["Cp"]) * (Tc - T))
            return [dc_dt, dT_dt]

        t_span = (p["x1"], p["x2"])
        y0 = [p["c_init"], p["T_init"]]
        solution = solve_ivp(model, t_span, y0, method='Radau', max_step=1, first_step=1)
        concentration, temperature = solution.y

        cFun = interp1d(solution.t.tolist(), concentration.tolist())
        Tfun = interp1d(solution.t.tolist(), temperature.tolist())
        t = np.linspace(p["x1"], p["x2"], m["hidden"])

        return {
            "time": t,
            "concentration": cFun(t),
            "temperature": Tfun(t),
            "cooling": TcFun(t)
        }

    def costFn(y):
        solution = solve(*y)
        cost = (
            (sum(solution["temperature"] > m["TMax"])+sum(solution["temperature"] < m["TMin"])+1) *
            (
                np.sum((m["crefB"]-solution["concentration"])**2) +
                np.sum((m["TrefB"]-solution["temperature"])**2) +
                np.sum((m["Tc0B"]-solution["cooling"])**2)
            ) / 1e7
        )
        cost = round(cost, 10)
        print(cost)
        return cost

    result = minimize(
        costFn,
        ypoints,
        # (m["TcMax"]-m["TcMin"])*np.random.rand(m["num_points"]) + m["TcMin"],
        # np.array([m["Tc0A"]]*m["num_points"]),
        # np.array([m["TcMax"]]*m["num_points"])*0.8,
        bounds=[(m["TcMin"], m["TcMax"])]*m["num_points"]
    )

    res = solve(*result.x)
    return {
        "points": [
            {"x": x, "y": result.x[i]} for i, x in enumerate(xpoints)
        ],
        "time": res["time"].tolist(),
        "concentration": res["concentration"].tolist(),
        "temperature": res["temperature"].tolist(),
    }


app = Flask(__name__)


@app.route('/api', methods=['POST'])
def receive_json():
    data = request.get_json()
    return jsonify(solve(data))


@app.route('/minimizer', methods=['POST'])
def receive_json_minimizer():
    data = request.get_json()
    resp = findOptimal(data)
    return jsonify(resp)


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8000)
