
var sidebarWidth = 300
var chartWidth = 800
var chartHeight = 500
var chartMargin = 30
var x;
var y;

const fontFamily = "Roboto, sans-serif"
const textSizeLarge = 25
const textSizeMed = 18
const textSizeSmall = 12
const channels = ["TP9", "TP10", "AF7", "AF8"]
const bands = ["Delta", "Theta", "Alpha", "Beta", "Gamma"]
const rl_pairs = [["TP10", "TP9"], ["AF8", "AF7"]]
const fb_pairs = [["TP9", "AF7"], ["TP10", "AF8"]]

const band_channels = []
bands.forEach(band => {
    channels.forEach(channel => {
        band_channels.push(band + "_" + channel)
    })
})


var state =
{
    "filename": "<filename>",
    "model":
    {
        "mapped": null, // Mapped x-y coordinates of each standard vector
    }

}

function receivedFile() {


    let string = fr.result
    let data = d3.csvParse(string)
    let headers = data.slice(-1)[0]
    let rows = data.slice(0, data.length - 1)
    let keys = Object.keys(rows[0])
    processMuseData(rows)


}
function processMuseData(rows) {
    // Remove rows with blank data
    rows = rows.filter(row => row.Delta_TP9 || row.Theta_AF8 || row.Beta_AF7 || row.Gamma_TP10) // remove blank rows

    // This file only had blank rows
    if (rows.length == 0) {
        alert("No data!")
    }

    console.log("Loading " + rows.length + " rows")

    // First timestamp - used to define the start time of this meditation
    let first_timestamp = parseTime(rows[0].TimeStamp)

    // First timestamp can't be parsed - use current time as starting point and increment by 1 sec per row
    if (typeof first_timestamp != "number" || isNaN(first_timestamp) || first_timestamp < 1000000) {
        console.log("Bad timestamps")
        var date = new Date()
        first_timestamp = date.getMilliseconds()
        var i = 0
        rows.forEach(row => {
            row.TimeStamp = first_timestamp + (i * 1000)
            i++
        })
    }

    // Build a full human-readable timestamp for this file - used when saving images
    let f = "ddd DD-MMM-YYYY hh:mm A"
    let d = moment(first_timestamp).format(f)
    state.filename = d

    // Clean Data
    for (let r = 0; r < rows.length; r++) {
        let row = rows[r]

        // Convert all EEG values from log10 to raw values
        band_channels.forEach(ch => {
            let logValue = row[ch]
            let rawValue = Math.pow(10, logValue)

            row[ch] = round(parseFloat(rawValue))
        })

        row.acc_x = row["Accelerometer_X"]
        row.acc_y = row["Accelerometer_Y"]
        row.acc_z = row["Accelerometer_Z"]


        let timestamp = parseTime(row.TimeStamp)

        row.seconds = Math.round((timestamp - first_timestamp) / 1000) // seconds since beginning of meditation
        row.secondsFull = Math.round(timestamp / 1000) // Seconds since origin
        row.minutes = Math.round(row.seconds / 60) // minutes since beginning of meditation

    }
    // Calculate motion - set "moving = true" if motion is too high
    var motion_variance_max = 0.01
    for (let i = 0; i < rows.length - 10; i++) {

        var motion = ["acc_x", "acc_y", "acc_z"]
        motion.forEach(col => {
            let avgArray = []
            for (let a = i; a < i + 10; a++) {

                let val = rows[a][col]
                if (!isNaN(val)) {
                    avgArray.push(val)
                }

            }
            var variance = d3.variance(avgArray)
            rows[i][col + "_variance"] = variance

            // Variance from motion is too high - flag this row for removal in next step
            if (variance > motion_variance_max) {

                rows[i].moving = true
            }

        })


    }
    // remove rows with too much motion
    rows = rows.filter(e => e.moving != true)

    // Remove last 10 seconds and first 10 seconds - user is probably moving during this time
    rows = rows.slice(10, rows.length - 10)
    console.log("Validated rows: " + rows.length)

    let last_timestamp = parseTime(rows.slice(-1)[0].TimeStamp)
    let total_seconds = Math.round((last_timestamp - first_timestamp) / 1000)
    let total_hours = total_seconds / 60 / 60

    // Rows standardized to one per second
    var standardRows = []
    for (var s = 0; s < total_seconds; s++) {
        let row = rows.filter(r => r.seconds == s)[0]
        if (row) standardRows.push(row)
    }

    var lowResolution = 60   // average over 60 seconds
    var highResolution = 10  // average over 10 seconds

    // Long duration meditations should using longer rounding
    if (total_hours > 0.8) {

    }

    // Perform two different rounding operations with different average N
    let averageHighRes = averageRows(clone(standardRows), highResolution)
    let averageLowRes = averageRows(clone(standardRows), lowResolution)

    if (averageLowRes.length < 3) {
        alert("Meditation session was too short: " + averageLowRes.length + " minutes")
    }
    state.lowRes = averageLowRes
    state.highRes = averageHighRes

    // Find the first and last timestamp for timeseries chart x-axis
    const first_seconds = standardRows[0].seconds
    const last_seconds = standardRows.slice(-1)[0].seconds
    state.seconds_low = first_seconds
    state.seconds_high = last_seconds

    // Data is ready for plotting
    averageLowRes.forEach(entry => {
        console.log(getRootVector(entry))
    })
    updateChartUser()


}



function averageRows(rows, roundN) {

    const channels = ["TP9", "TP10", "AF7", "AF8"]
    const bands = ["Delta", "Theta", "Alpha", "Beta", "Gamma"]


    roundN = Math.round(roundN)
    const roundN_half = Math.round(roundN / 2)
    let newRows = []
    for (let i = roundN_half + 1; i < rows.length - roundN_half; i = i + roundN_half) {
        if (i < rows.length) {
            let row = rows[i]
            let newRow = {}
            newRow.seconds = row.seconds
            newRow.minutes = row.minutes
            newRow.vector_raw = getRelativeVector(row)

            // Average each band + channel
            bands.forEach(band => {
                channels.forEach(channel => {
                    let avgArray = []
                    const key = band + "_" + channel // "Gamma_TP10"

                    for (let a = i - roundN_half; a < i + roundN_half; a++) {
                        var row = rows[a]

                        let val = row[key]
                        if (!isNaN(val)) {
                            avgArray.push(val)
                        }

                    }
                    // If there are not enough valid values for an average, return NaN
                    if (avgArray.length > roundN_half) {
                        let avg = round(d3.quantile(avgArray, 0.5))
                        let max = round(d3.quantile(avgArray, 0.95))
                        let min = round(d3.quantile(avgArray, 0.05))
                        newRow[key] = avg
                        newRow[key + "_min"] = min
                        newRow[key + "_max"] = max

                    }
                    else {

                        newRow[key] = NaN
                    }

                })
            })
            newRow.vector = getRootVector(newRow) // Compute the averaged vector

            newRows.push(newRow)

        }
    }
    return newRows
}

function updateChart() {
    var linkSize = 1
    var labelSize = "14px"
    var stateSize = 10
    d3.select("#chart").selectAll("*").remove() // Clear everything


    let zoom = d3.zoom()
        .on('zoom', handleZoom);

    function handleZoom(e) {
        // When user zooms, all chart "g" elements are changed accordingly
        d3.select("#chartsvg").selectAll("g").attr("transform", e.transform)
                   

    }


    // Add a series of "g" containers to the SVG in order of "elevation"
    // This allows for future chart updates to act on shapes below these shapes
    var svg_user = d3.select("#chart").append("g").attr("id", "chart_user")
    var svg = d3.select("#chart").append("g").attr("id", "chart_labels")
    var svg2 = d3.select("#chart").append("g").attr("id", "chart_standards")

    d3.select("#chartsvg").call(zoom)



    var standards = Object.entries(standard_vectors).map(entry => entry[1])

    var standardCoordinates = standards.map(e => e.coordinates)


    // Find the minimum and maxiumum range of the model, set the chart size a bit larger than those bounds
    var minx = d3.min(standardCoordinates.map(e => e[0]))
    var miny = d3.min(standardCoordinates.map(e => e[1]))
    var maxx = d3.max(standardCoordinates.map(e => e[0]))
    var maxy = d3.max(standardCoordinates.map(e => e[1]))

    minx = minx * 2
    maxx = maxx * 2
    miny = miny * 2
    maxy = maxy * 2

    // These D3 functions return the properly scaled x and y coordinates
    x = d3.scalePow()
        .exponent(0.7)
        .domain([minx, maxx]) // input
        //.domain ([-500, 1000])
        .range([0, chartWidth]); // output

    y = d3.scalePow()
        .exponent(0.7)
        .domain([miny, maxy])
        //.domain ([-500, 500])
        .range([chartHeight, 0])


    function add(xi, yi, size, color, opacity) {
        svg2.append("circle")
            .attr("cx", x(xi))
            .attr("cy", y(yi))
            .attr("r", size)
            .attr("opacity", opacity)
            .attr("fill", color)

    }

    standards.forEach(entry => {
        var xi = entry.coordinates[0]
        var yi = entry.coordinates[1]
        add(xi, yi, stateSize, "blue", 1)

    })



    // Draw labels - the first time they are drawn, there are probably bad positions and overlaps

    var label_array = []
    var anchor_array = []
    standards.forEach(entry => {
        var xi = entry.coordinates[0]
        var yi = entry.coordinates[1]
        label_array.push({ x: x(xi), y: y(yi), width: 10, height: 4, name: entry.user + " " + entry.label })
        anchor_array.push({ x: x(xi), y: y(yi), r: stateSize * 2 })
    })
    var labels = svg.selectAll(".label")
        .data(label_array)
        .enter()
        .append("text")
        .attr("class", "label")
        .style("font-size", labelSize)
        .attr("x", function (d) { return d.x })
        .attr("y", function (d) { return d.y })
        .text(function (d) { return d.name })

    var links = svg.selectAll(".link")
        .data(label_array)
        .enter()
        .append("line")
        .attr("class", "link")
        .attr("opacity", 0.2)
        .attr("x1", function (d) { return (d.x); })
        .attr("y1", function (d) { return (d.y); })
        .attr("x2", function (d) { return (d.x); })
        .attr("y2", function (d) { return (d.y); })
        .attr("stroke-width", linkSize)
        .attr("stroke", "black");

    var index = 0
    labels.each(function () {
        label_array[index].width = this.getBBox().width;
        label_array[index].height = this.getBBox().height;
        index++

    })

    // Use d3-labeler library to move each label so that it doesn't overlap
    d3.labeler()
        .label(label_array)
        .anchor(anchor_array)
        .width(chartWidth)
        .height(chartHeight)
        .start(1000)


    labels
        .transition()
        .duration(1000)
        .attr("x", function (d) { return d.x })
        .attr("y", function (d) { return d.y })

    links
        .transition()
        .duration(800)
        .attr("x2", function (d) { return d.x; })
        .attr("y2", function (d) { return d.y - 2; });







}


function updateChartUser() {

    var svg = d3.select("#chart_user")
    svg.selectAll("*").remove() // Clear last chart, if any

    var data = state.highRes.map(e => getRelativeVector(e.vector))

    var mapped = runModel(data, state.model.principals, state.model.means)
    var fulldata = state.highRes
    var index = 0
    mapped.forEach(entry => {

        var moment = fulldata[index]
        svg.append("circle")
            .attr("cx", x(entry[0]))
            .attr("cy", y(entry[1]))
            .attr("r", 10)
            .attr("opacity", 0.1)
            .attr("fill", "black")
            .on("mouseover", function(d){
                d3.select(this).style("opacity", 1)
                //console.log(moment.vector)
                console.log(moment.Gamma_AF7)
                
            })
            .on("click", function(d)
            {
                console.log(moment.vector)
            })
            .on("mouseout", function(d){
                d3.select(this).style("opacity", 0.1)
            })

        index ++            
            
    })


}

function buildModel() {
    var data = Object.entries(standard_vectors).map(e => getRelativeVector(e[1].vector))
    var pca_data = pca(data)
    var principals = pca_data[0]
    var means = pca_data[1]
    state.model.principals = principals
    state.model.means = means
    var model = runModel(data, principals, means)

    // Store these mapped coorindate in each standard's entry 
    var keys = Object.keys(standard_vectors)
    for (var c = 0; c < keys.length; c++) {
        var coord = model[c]
        var key = keys[c]
        standard_vectors[key].coordinates = coord

    }

}

// Add the "browse" button
buildBrowseFile(d3.select("#browse-div"), "UPLOAD", "t1")

// Build model of meditation states using the "vectors.js" file
buildModel()
buildChart()
function buildChart() {

    // Set full screen
    chartWidth = window.innerWidth - sidebarWidth
    chartHeight = window.innerHeight
    
    // Check if user is on a phone
    if (navigator.userAgent.match(/Android/i) ||    navigator.userAgent.match(/iPhone/i))
    {
        closeNav()    
        chartWidth = 360
    }
    d3.select("#main").style("position", "absolute").style("top", 0).style("left", 0)
    d3.select("#open_btn").style("position", "absolute").style("top", "10px").style("left", "10px")
    
    var svg = d3.select("#chartsvg")
        .attr("width", chartWidth + (2 * chartMargin))
        .attr("height", chartHeight + (2 * chartMargin))
        .style("background-color", "grey")
        .append("g")
        .attr("id", "chart")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("transform", "translate(" + chartMargin + "," + chartMargin + ")")


}
updateChart()



