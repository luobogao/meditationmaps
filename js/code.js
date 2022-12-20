
var backgroundColor = "white"
var sidebarWidth = 300

var chartWidth = window.innerWidth - sidebarWidth - 250
var chartHeight = window.innerHeight

var chartMargin = 30

var mode3d = true // 3-d mode

const minichartWidth = 200
const minichartHeight = 200
const minichartMargin = 10

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
    },
    "avg10": []

}

function receivedFile() {
    // Callback from the "browse" button
    // fr.result contains the string of the file that was uploading

    let string = fr.result
    let data = d3.csvParse(string)
    let headers = data.slice(-1)[0]
    let rows = data.slice(0, data.length - 1)
    let keys = Object.keys(rows[0])
    processMuseData(rows)


}



function averageRows(rows, roundN) {

    const channels = ["TP9", "TP10", "AF7", "AF8"]
    const bands = ["Delta", "Theta", "Alpha", "Beta", "Gamma"]

    console.log("Rounding with " + roundN + " in " + rows.length + " rows")
    roundN = Math.round(roundN)
    if (roundN == 1) {
        console.log("ERROR: rounding is too low, using raw rows")
        return rows
    }
    else {
        const roundN_half = Math.round(roundN / 2)
        let newRows = []
        for (let i = roundN_half + 1; i < rows.length - roundN_half; i = i + roundN_half) {
            if (i < rows.length) {
                let row = rows[i]
                let newRow = {}
                newRow.seconds = row.seconds
                newRow.minutes = row.minutes

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

}

function processMuseData(rows) {
    // Cleans up and pre-processes the data from a Muse CSV
    // Removes blank rows, adds timestamps, removes rows where user is moving too much, then averages this data

    if (rows.length > 100000)
    {
        alert("File is too large!")
        return;
    }
    
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

        if (row) {
            row.vector = getRootVector(row)
            standardRows.push(row)
        }
    }
    console.log("Standardized rows")

    var lowResolution = 60   // average over 60 seconds
    var highResolution = 20  // average over 10 seconds

    // Long duration meditations should using longer rounding
    if (total_hours > 0.8) {

    }

    // Perform two different rounding operations with different average N
    let averageHighRes = averageRows(clone(standardRows), highResolution)
    let averageLowRes = averageRows(clone(standardRows), lowResolution)
    let average10 = averageRows(clone(standardRows), standardRows.length / 10)
    let averageMax = averageRows(clone(standardRows), standardRows.length / 100)

    if (averageLowRes.length < 3) {
        alert("Meditation session was too short: " + averageLowRes.length + " minutes")
    }
    state.raw = clone(standardRows)
    state.lowRes = averageLowRes
    state.highRes = averageHighRes
    state.avg10 = average10
    state.averageMax = averageMax

    // Find the first and last timestamp for timeseries chart x-axis
    const first_seconds = standardRows[0].seconds
    const last_seconds = standardRows.slice(-1)[0].seconds
    state.seconds_low = first_seconds
    state.seconds_high = last_seconds

    // Data is ready for plotting
    averageLowRes.forEach(entry => {
        //console.log(getRootVector(entry)) show all vectors
    })

    rebuildChart()


}
function rebuildChart() {
    // Critical variables
    const minimumMatch = 0.5 // filter out waypoints with a cosine similarity less than this 

    var filtered_waypoints_match = waypoints

    // If user data has been uploaded, use it to find waypoints that don't have a good match, and remove them
    if (state.avg10.length > 0) {
        // re-build the Model using a few points from the user's data
        // Including user data like this helps to orient the chart 

        var userVectors = state.avg10.map(e => getRelativeVector(e.vector))


        // Filter the waypoints by minimum distance from any of these test user vectors

        var distanceIds = {}

        userVectors.forEach(uservector => {

            waypoints.forEach(waypoint => {
                var waypoint_vector = getRelativeVector(waypoint.vector)
                var id = waypoint.id
                var distance = cosineSimilarity(uservector, waypoint_vector)
                if (id in distanceIds) {
                    if (distanceIds[id] < distance) {
                        distanceIds[id] = distance
                    }

                }
                else {
                    distanceIds[id] = distance
                }

            })
        })
        var maxd = Object.entries(distanceIds)
        maxd.sort(function (a, b) {
            return a[1] - b[1]
        })
        //console.log("sorted matches:")
        //console.log(maxd)
        var filtered_waypoint_ids = maxd.filter(e => e[1] > minimumMatch).map(e => e[0])

        // Remove waypoints that have been selected for removal by the "removeN" standard
        filtered_waypoints_match = waypoints.filter(e => filtered_waypoint_ids.includes(e.id))
    }

    // Remove waypoints that have been de-selected by the user
    var filtered_waypoints_user = filtered_waypoints_match.filter(e => state.model.selected_users.includes(e.user))
    var selected_waypoints = filtered_waypoints_user.map(e => getRelativeVector(e.vector))

    console.log("Using " + selected_waypoints.length + " waypoints")

    var ids = filtered_waypoints_user.map(e => e.id)

    // Tag each waypoint (included filtered waypoints) as 'true' or 'false' match so that graph can remove filtered ones dynamically
    waypoints.map(waypoint => {
        if (ids.includes(waypoint.id)) {
            waypoint.match = true
        }
        else waypoint.match = false
    })


    // Combine the waypoints with the three user points
    if (selected_waypoints.length == 0) {
        alert("zero waypoints selected!")
    }
    else {
        buildModel(selected_waypoints)
        updateChartWaypoints()


        // Update user data if it exists
        if (state.avg10.length > 10) {
            updateChartUser(state.averageMax)
            updateMiniChart(state.highRes)

        }

    }


}



function buildModel(vectors) {
    // Builds the AI model using a collection of input vectors
    // These vectors are the raw (but averaged) values for each band/channel
    // Okay to use a mix of the "standard" vectors plus a few user vectors
    // Does not return x-y points - for that, need to call "run model" using the parameters set by this function

    var pca_data = pca(vectors)
    var principals = pca_data[0]
    var means = pca_data[1]
    state.model.principals = principals
    state.model.means = means

    // Build x-y points for each waypoint and store them
    let points = runModel(waypoints.map(e => getRelativeVector(e.vector)))
    var i = 0
    waypoints.map(waypoint => {
        waypoint.coordinates = points[i]
        i++
    })


}
function runModel(rows)
// Takes rows of vectors calculated from the Muse data, and the principals (output from PCA function)
// Returns a list of x-y points, the location on 2-d space for each of those vectors

{
    var d = math.transpose(subtract_means(rows, state.model.means))
    var mappedCoordinates = math.transpose(math.multiply(state.model.principals, d))
    return mappedCoordinates
}



function setup() {
    // First-time setup of all the GUI sizes etc



    // Check if user is on a phone
    if (navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/iPhone/i)) {
        closeNav()
        chartWidth = 360
    }
    d3.select("#main").style("position", "absolute").style("top", 0).style("left", 0)
    d3.select("#open_btn").style("position", "absolute").style("top", "10px").style("left", "10px")

    var svg = d3.select("#chartsvg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .style("background-color", backgroundColor)
        .append("g")
        .attr("id", "chart")
        .attr("width", chartWidth - (2 * chartMargin))
        .attr("height", chartHeight - (2 * chartMargin))
        .attr("transform", "translate(" + chartMargin + "," + chartMargin + ")")

    // Add the "browse" button
    buildBrowseFile(d3.select("#browse-div"), "UPLOAD", "t1")

    // Build model of meditation states using the "vectors.js" file
    // This first time, include ALL the waypoints
    let vectors = waypoints.map(e => getRelativeVector(e.vector))
    buildModel(vectors)


    // Immediately display a map of the waypoints when user loads page
    waypoints.map(e => e.match = true) // For this splash chart, use all waypoints
    updateChartWaypoints()



    // Mini-graph
    d3.select("#minichart")
        .style("background-color", "white")
        .style("border", "1px solid black")
        .style("border-radius", "3px")
        .attr("width", minichartWidth + (2 * minichartMargin))
        .attr("height", minichartHeight + (2 * minichartMargin))
        .style("position", "absolute")
        .style("right", "10px")
        .style("bottom", "10px")
        .append("g")
        .attr("id", "minichartid")
        .attr("width", minichartWidth + "px")
        .attr("height", minichartHeight + "px")
        .attr("transform", "translate(" + minichartMargin + "," + minichartMargin + ")")

    // Popup
    d3.select("#popup")
        .style("border-radius", "5px")
        .style("opacity", 0.95)
        .style("position", "absolute")
        .style("background", "#404040")
        .style("z-index", 10)
        .style("color", "white")
        .style("margin-right", "20px")

    buildSidebarRight()

}
function buildSidebarRight() {
    // Right sidebar
    var contributors = unique(waypoints.map(e => e.user))
    state.model.selected_users = contributors

    var div = d3.select("#sidebarRight")
        .append("div")
        .style("display", "flex")
        .style("flex-direction", "column")

    function addCheckbox(name) {
        var checkboxDiv = div.append("div")
            .style("margin", "8px")

        checkboxDiv.append("input")
            .attr("type", "checkbox")
            .property("checked", true)
            .on("click", function () {
                const newState = this.checked

                // Add or remove a name from the "Selected Users" list
                // This action should prompt a rebuild of the model and a redrawing of the graph
                if (newState == true) {
                    state.model.selected_users.push(name)
                }
                else {
                    var i = state.model.selected_users.indexOf(name)
                    if (i != -1) {
                        state.model.selected_users.splice(i, 1)
                    }

                }
                console.log(state.model.selected_users)
                rebuildChart()

            })

        checkboxDiv.append("label")
            .text(name)

    }
    contributors.forEach(name => {
        addCheckbox(name)
    })



}

setup()





