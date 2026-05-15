let chart = null;

// Функция показывает ошибку у конкретного поля ввода
function setError(inputId, message) {

    const input = document.getElementById(inputId);
    const wrapper = input.closest(".input-wrapper");
    const errorBox = wrapper.querySelector(".field-error");

    input.classList.add("input-error");
    wrapper.classList.add("error");

    if (errorBox) errorBox.textContent = message;
}

// очищает одно поле ввода
function clearError(input) {

    const wrapper = input.closest(".input-wrapper");
    const errorBox = wrapper.querySelector(".field-error");

    input.classList.remove("input-error");
    wrapper.classList.remove("error");

    if (errorBox) errorBox.textContent = "";
}

// очищает все ошибки поля ввода
function clearAllErrors() {

    document.querySelectorAll(".input-wrapper").forEach(w => {
        w.classList.remove("error");
        const err = w.querySelector(".field-error");
        if (err) err.textContent = "";
    });

    document.querySelectorAll("input").forEach(i => {
        i.classList.remove("input-error");
    });
}

// убирает лишние нули у числа
function format(num) {

    if (num === null || num === undefined || !isFinite(num)) return "-";

    // убираем лишние нули
    let rounded = Number(num.toFixed(6));

    // убираем ".0"
    return rounded % 1 === 0 ? rounded.toString() : rounded.toString();
}


// округление числа до 6 знаков
function clean(num) {
    if (!isFinite(num)) return null;
    return Math.round(num * 1e6) / 1e6;
}

// проверка числового ввода
function validateNumber(value, id, allowNegative = true, allowZero = true) {

    if (value === "" || value === null || value === undefined) {
        setError(id, "Заполните поле ввода");
        return null;
    }

    let num = parseFloat(value.replace(",", ".")); // 0,1 и 0.1 - одно и тоже

    if (isNaN(num)) {
        setError(id, "Некорректное значение");
        return null;
    }

    // ❌ запрет отрицательных
    if (!allowNegative && num < 0) {
        setError(id, "Введи число больше 0");
        return null;
    }

    // ❌ запрет нуля
    if (!allowZero && num <= 0) {
        setError(id, "Введи число больше 0");
        return null;
    }

    return num;
}

// вычисление f(x, y)
function f(expr, x, y) {
    return math.evaluate(expr, { x, y });
}

// проверка введённой функции
function validateFunction(expr) {

    if (!expr || expr.trim() === "") {
        setError("func", "Заполните поле ввода");
        return null;
    }

    if (/[а-яА-ЯёЁ]/.test(expr)) {
        setError("func", "Русские буквы недопустимы");
        return null;
    }

    if (/[+\-*/.]$/.test(expr)) {
        setError("func", "Некорректная функция");
        return null;
    }

    return expr;
}

// создаёт функцию "точного" решения через линейное приближение
function exactSolution(expr, x0, y0) {

    try {
        const node = math.parse(expr);
        const compiled = node.compile();

        return (x) => {
            let k1 = compiled.evaluate({ x, y: y0 });
            return y0 + (x - x0) * k1;
        };

    } catch {
        return null;
    }
}


// (Метод Эйлера)
function solve() {

    clearAllErrors(); // очистка ошибок

    const expr = validateFunction(
        document.getElementById("func").value.trim()
    );

    const x0 = validateNumber(document.getElementById("x0").value, "x0", true, true);
    const y0 = validateNumber(document.getElementById("y0").value, "y0", true, true);
    const h = validateNumber(document.getElementById("h").value, "h", false, false);
    const steps = validateNumber(document.getElementById("steps").value, "steps", false, false);

    if (!expr || x0 === null || y0 === null || h === null || steps === null) {
        return;
    }

    let x = x0;
    let y = y0;
    let lastX = x;
    let lastY = y;

    let xValues = [];
    let yEuler = [];
    let yExact = [];

    let table = document.getElementById("table");
    let results = document.getElementById("results");

    results.classList.add("hidden");

    // Точное решение
    let hx = h / 50;
    let xe = x0;
    let ye = y0;

    let exactMap = new Map();

    for (let i = 0; i <= steps * 50; i++) {

        exactMap.set(parseFloat(xe.toFixed(6)), ye);

        ye = ye + hx * f(expr, xe, ye);
        xe = xe + hx;
    }

    // Формирование таблицы
    let html = `
        <table>
            <tr>
                <th>n</th>
                <th>x</th>
                <th>y (Эйлер)</th>
                <th>Точное решение</th>
                <th>Погрешность</th>
            </tr>
    `;

    for (let i = 0; i <= steps; i++) {

        let xKey = parseFloat(x.toFixed(6));
        let exactY = exactMap.get(xKey);

        if (exactY === undefined || exactY === null || isNaN(exactY)) {
            exactY = y;
        }

        let error = Math.abs(exactY - y);

        html += `
            <tr>
                <td>${i}</td>
                <td>${format(x)}</td>
                <td>${format(y)}</td>
                <td>${format(exactY)}</td>
                <td>${format(error)}</td>
            </tr>
        `;

        xValues.push(Number(format(x)));
        yEuler.push(Number(format(y)));
        yExact.push(Number(format(exactY)));

        let fy = f(expr, x, y);

        y = y + h * fy;
        x = x + h;

        lastX = x;
        lastY = y;
    }

    html += "</table>";

    table.innerHTML = html;
    results.classList.remove("hidden");
    document.querySelector(".calc").classList.add("compact");
    document.getElementById("solution-block")
        .classList.remove("hidden");

    drawChart(xValues, yEuler, yExact);
    eulerExplanation(expr, x0, y0, h, steps, x, y);
    
    table.innerHTML += `
        <div style="
            margin-top: 25px;
            font-size: 22px;
            font-weight: 800;
            padding: 10px;
            background: #f3f6ea;
            border-radius: 10px;
        ">
            Ответ: y(${format(lastX)}) ≈ ${format(lastY)}
        </div>
    `;
}

// Построение графика
function drawChart(xValues, yEuler, yExact) {

    const ctx = document.getElementById("graph");

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: xValues.map(x => Number(x.toFixed(5))),
            datasets: [
                {
                    label: "Метод Эйлера",
                    data: yEuler,
                    borderColor: "#68705B",
                    backgroundColor: "#68705B",
                    pointBackgroundColor: "#68705B",
                    pointBorderColor: "#68705B",
                    borderWidth: 3,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: false,
                    tension: 0.3
                },
                {
                    label: "Точное решение",
                    data: yExact,
                    borderColor: "#B07D62",
                    backgroundColor: "#B07D62",
                    pointBackgroundColor: "#B07D62",
                    pointBorderColor: "#B07D62",
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: false,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: "index",
                intersect: false
            }
        }
    });
}

function eulerExplanation(expr, x0, y0, h, steps, lastX, lastY) {

    const box = document.getElementById("euler-solution");
    
    let html = "";
    
    html += `
    <div class="solution-title">
        РЕШЕНИЕ МЕТОДОМ ЭЙЛЕРА
    </div>
    `;
    
    html += "<br>";
    html += "<b>1. Дано:</b><br>";
    html += "y' = " + expr + "<br>";
    html += "x₀ = " + x0 + ", y₀ = " + y0 + "<br>";
    html += "h = " + h + "<br>";
    html += "шагов = " + steps + "<br><br>";

    html += "<b>2. Формула метода Эйлера:</b><br>";
    html += "yₙ₊₁ = yₙ + h · f(xₙ, yₙ)<br><br>";

    html += `
    <div class="step-start">
        <b>3. Решение по шагам:</b><br><br>
    </div>
    `;

    let x = x0;
    let y = y0;

    for (let i = 1; i <= steps; i++) {

        let fval = math.evaluate(expr, { x, y });
        let yNext = y + h * fval;
        let xNext = x + h;

        html += `<div class="step">`;
        html += "<b>Шаг " + i + ":</b><br>";

        html += "f(" + format(x) + ", " + format(y) + ") = " + format(fval) + "<br>";

        html += "y = " + format(y) + " + " + h + " · " + format(fval) +
                " = " + format(yNext) + "<br>";

        html += "x = " + format(x) + " + " + h +
        " = " + format(xNext) + "<br><br>";

        html += "</div>";

        y = yNext;
        x = xNext;
    }

    html += "<b>4. Подстановка:</b><br>";

    html += "Берём результат последнего шага и подставляем в формулу f(x, y):<br>";

    html += "x = " + format(lastX) + "<br>";
    html += "y = " + format(lastY) + "<br><br>";

    html += `
    <div class="answer">
        Ответ:<br>
        y(${format(lastX)}) ≈ ${format(lastY)}
    </div>
    `;

    box.innerHTML = html;
}

// Сброс
function resetAll() {

    document.querySelectorAll("input").forEach(i => i.value = "");

    document.getElementById("table").innerHTML = "";
    document.getElementById("results").classList.add("hidden");
    document.querySelector(".calc").classList.remove("compact");
    document.getElementById("solution-block")
        .classList.add("hidden");

    if (chart) chart.destroy();
}

// Обработка ввода
document.querySelectorAll("input").forEach(input => {

    input.addEventListener("input", () => {
        clearError(input);
    });

    input.addEventListener("focus", () => {
        clearError(input);
    });
});