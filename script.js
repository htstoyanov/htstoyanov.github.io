// init
M.AutoInit();
var tabs = document.getElementById('tabs');
tabs = M.Tabs.init(tabs, {});
document.addEventListener('DOMContentLoaded', function() {
    var elems = document.querySelectorAll('.collapsible');
    var instances = M.Collapsible.init(elems, {});
});
// State
let results;
let stack;
let chartColors = {};
//let chartColors = {
//    red: 'rgb(255, 99, 132)',
//    orange: 'rgb(255, 159, 64)',
//    yellow: 'rgb(255, 205, 86)',
//    green: 'rgb(75, 192, 192)',
//    blue: 'rgb(54, 162, 235)',
//    purple: 'rgb(153, 102, 255)',
//    grey: 'rgb(201, 203, 207)'
//};
const allRaces = ["Nra" ,"Asi" ,"Blk" ,"His" ,"Ind" ,"Pac" ,"Unk" ,"Wht", "Two"];
const allMajors = [
    "Bioengineering",
    "Chemical Engineering",
    "Civil Engineering",
    "Computer Science",
    "Electrical Engineering",
    "Energy Resources Engineering",
    "Engineering",
    "Environmental Engineering",
    "Environmental Systems Engineering",
    "Individually Designed Major",
    "Management Science and Engineering",
    "Materials Science and Engineering",
    "Mechanical Engineering"];
let races = new Set(allRaces);
let genders = new Set(["M", "F"]);
let showMajors = new Set(allMajors);

var ctx = document.getElementById('myChart').getContext('2d');
var chart = new Chart(ctx, {
    // The type of chart we want to create
    type: 'line',

    // The data for our dataset
    data: {},

    // Configuration options go here
    options: {
        responsive: true,
        scales: {
            xAxes: [{
                scaleLabel: {
                    display: true,
                    labelString: 'Year'
                }
            }],
            yAxes: [{
                ticks: {
                    beginAtZero: true
                },
                //stacked: true,
                scaleLabel: {
                    display: true,
                    labelString: '# Undergraduate degrees'
                }
            }]
        },
        legend: {
            display: false,
            position: 'bottom',
        },
        tooltips: {
            position: 'average',
            mode: 'index',
            intersect: false,
        },
    },
});
// Define a plugin to provide data labels
Chart.plugins.register({
    afterDatasetsDraw: function(chart) {
        var ctx = chart.ctx;
        if (chart.data.datasets.length > 5) {
            return;
        }

        chart.data.datasets.forEach(function(dataset, i) {
            var meta = chart.getDatasetMeta(i);
            if (!meta.hidden) {
                meta.data.forEach(function(element, index) {
                    // Draw the text in black, with the specified font
                    ctx.fillStyle = 'rgb(0, 0, 0)';

                    var fontSize = 16;
                    var fontStyle = 'normal';
                    var fontFamily = 'Helvetica Neue';
                    ctx.font = Chart.helpers.fontString(fontSize, fontStyle, fontFamily);

                    // Just naively convert to string for now
                    var dataString = dataset.data[index].toString();

                    // Make sure alignment settings are correct
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    var padding = 5;
                    var position = element.tooltipPosition();
                    ctx.fillText(dataString, position.x, position.y - (fontSize / 2) - padding);
                });
            }
        });
    }
});

function aggYearMajor(results) {
    const years = new Set();
    const majors = new Set();
    const yearMajor = new Map();
    let aggregator = document.getElementById('aggregate').elements["agg"].value;
    results.forEach(([major, year, race, gender, count]) => {
        if (!races.has(race) || !genders.has(gender) || !showMajors.has(major)) {
            return;
        }
        years.add(year);
        const indicator =
            aggregator === 'major' ? major :
            (aggregator === 'gender' ? gender :
            (aggregator === 'race' ? race :
            major+","+gender));
        majors.add(indicator);
        let m = yearMajor.get(year);
        if (m === undefined) m = new Map();
        let agg = m.get(indicator);
        if (agg === undefined) agg = 0;
        agg += count;
        m.set(indicator, agg);
        yearMajor.set(year, m);
    });
    return {
        years: [...years.values()].sort(),
        majors: [...majors.values()].sort(),
        yearMajor,
        }; 
}

function complete(data) {
    results = data;
    refresh();
}

function toggleAllRaces(cb) {
    allRaces.forEach(r => {
        const el = document.getElementById(r);
        if (el !== null) {
            el.checked = cb.checked;
        }
    });
    if (cb.checked) {
        races = new Set(allRaces);
    } else {
        races = new Set();
    }
    refresh();
}
function toggleAllMajors(cb) {
    allMajors.forEach(r => {
        const el = document.getElementById(r);
        if (el !== null) {
            el.checked = cb.checked;
        }
    });
    if (cb.checked) {
        showMajors = new Set(allMajors);
    } else {
        showMajors = new Set();
    }
    refresh();
}

function raceSelect(cb) {
    if (cb.checked) {
        races.add(cb.id);
    } else {
        races.delete(cb.id);
    }
    refresh();
}
function majorSelect(cb) {
    if (cb.checked) {
        showMajors.add(cb.id);
    } else {
        showMajors.delete(cb.id);
    }
    refresh();
}
function genderSelect(cb) {
    if (cb.checked) {
        genders.add(cb.id);
    } else {
        genders.delete(cb.id);
    }
    refresh();
}

function updateStacked() {
    stack = document.getElementById('stacked').checked;
    chart.options.scales.yAxes[0].stacked = stack;

    let legend = document.getElementById('legend').checked;
    chart.options.legend.display = legend;
}

function refresh() {
    let { years, majors, yearMajor } = aggYearMajor(results.data);
    const vol = yearMajor.get(years[years.length-1]);
    majors.sort((a,b) => {
        let x = vol.get(a);
        if (x === undefined) x = 0;
        let y = vol.get(b);
        if (y === undefined) y = 0;
        return x - y;
    });

    updateStacked();

    chart.data.labels = years;
    chart.data.datasets = [];
    chartColors = palette('tol', majors.length > 12 ? 12 : majors.length).map(x => '#' + x);
    const colorNames = Object.keys(chartColors);
    majors.forEach((major, i) => {
        const data = years.map(y => {
            if (yearMajor.get(y) === undefined) return 0;
            if (yearMajor.get(y).get(major) === undefined) return 0;
            return yearMajor.get(y).get(major);
        });
        const name = colorNames[i % colorNames.length];
        const color = chartColors[name];
        chart.data.datasets.push({
            lineTension: 0,
            label: major,
            data,
            borderColor: color,
            backgroundColor: color,
            fill: stack,
        });
    });
    chart.update();
}

var data = Papa.parse("/stanford.csv", {
    download: true,
    dynamicTyping: true,
    complete: complete,
});

function presetEandCS() {
    tabs.select('graph');

    // update all major checkboxes
    allMajors.forEach(m => {
        document.getElementById(m).checked = false;
    });
    document.getElementById('AllMajors').checked = false;
    document.getElementById('Computer Science').checked = true;
    document.getElementById('Engineering').checked = true;

    // show majors
    showMajors = new Set(['Computer Science', 'Engineering']);

    // select radio button
    document.getElementById('majorgender').checked = true;

    document.getElementById('M').checked = true;
    document.getElementById('F').checked = true;

    genders = new Set(["M", 'F']);

    allRaces.forEach(r => {
        const el = document.getElementById(r);
        if (el) el.checked = true;
    });
    document.getElementById('AllRaces').checked = true;
    races = new Set(allRaces);

    refresh();
}

function presetAsiBlkHisF() {
    tabs.select('graph');
    // update all major checkboxes
    allMajors.forEach(m => {
        document.getElementById(m).checked = true;
    });
    document.getElementById('AllMajors').checked = true;

    // show majors
    showMajors = new Set(allMajors);

    allRaces.forEach(r => {
        const el = document.getElementById(r);
        if (el) el.checked = false;
    });
    document.getElementById('AllRaces').checked = false;
    document.getElementById('Asi').checked = true;
    document.getElementById('Blk').checked = true;
    document.getElementById('His').checked = true;
    races = new Set(['Asi', 'Blk', 'His']);

    document.getElementById('M').checked = false;
    document.getElementById('F').checked = true;

    genders = new Set(['F']);

    // select radio button
    document.getElementById('race').checked = true;

    refresh();
}

function presetAsiBlkHisEE() {
    tabs.select('graph');
    // update all major checkboxes
    allMajors.forEach(m => {
        document.getElementById(m).checked = false;
    });
    document.getElementById('AllMajors').checked = false;
    document.getElementById('Electrical Engineering').checked = true;

    // show majors
    showMajors = new Set(['Electrical Engineering']);

    allRaces.forEach(r => {
        const el = document.getElementById(r);
        if (el) el.checked = false;
    });
    document.getElementById('AllRaces').checked = false;
    document.getElementById('Asi').checked = true;
    document.getElementById('Blk').checked = true;
    document.getElementById('His').checked = true;
    races = new Set(['Asi', 'Blk', 'His']);

    document.getElementById('M').checked = true;
    document.getElementById('F').checked = true;

    genders = new Set(["M", 'F']);

    // select radio button
    document.getElementById('race').checked = true;

    refresh();
}
