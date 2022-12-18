
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


    roundN = Math.round(roundN)
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

function processMuseData(rows) {
    // Cleans up and pre-processes the data from a Muse CSV
    // Removes blank rows, adds timestamps, removes rows where user is moving too much, then averages this data

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
    let average10 = averageRows(clone(standardRows), standardRows.length / 10)
    let average3 = averageRows(clone(standardRows), standardRows.length / 3) // only used to compute some Waypoints for this user

    if (averageLowRes.length < 3) {
        alert("Meditation session was too short: " + averageLowRes.length + " minutes")
    }
    state.lowRes = averageLowRes
    state.highRes = averageHighRes
    state.avg10 = average10
    state.avg3 = average3

    // Find the first and last timestamp for timeseries chart x-axis
    const first_seconds = standardRows[0].seconds
    const last_seconds = standardRows.slice(-1)[0].seconds
    state.seconds_low = first_seconds
    state.seconds_high = last_seconds

    // Data is ready for plotting
    averageLowRes.forEach(entry => {
        //console.log(getRootVector(entry)) show all vectors
    })

    // re-build the Model using a few points from the user's data
    // Including user data like this helps to orient the chart 
    var userVectors = average3.map(e => getRelativeVector(e.vector))

    
    // Filter the waypoints by minimum distance from any of these test user vectors
    var distanceIds = {}
    userVectors.forEach(uservector => {

        waypoints.forEach(waypoint => {
            var waypoint_vector = getRelativeVector(waypoint.vector)
            var id = waypoint.id
            var distance = cosineSimilarity(uservector, waypoint_vector)
            if (id in distanceIds)
            {
                if (distanceIds[id] < distance)
                {
                    distanceIds[id] = distance
                }
                
            }
            else
                {
                    distanceIds[id] = distance
                }
            
        })
    })
    var maxd = Object.entries(distanceIds)
    maxd.sort(function (a, b) {
        return a[1] - b[1]
    })
    var filtered_waypoint_ids = maxd.slice(2).map(e => e[0])
    var filtered_waypoints = waypoints.filter(e => filtered_waypoint_ids.includes(e.id)).map(e => getRelativeVector(e.vector))
    console.log("Using " + filtered_waypoints.length + " waypoints")

    // Combine the waypoints with the three user points
    var allwaypoints = filtered_waypoints //.concat(userVectors)
        
    buildModel(allwaypoints)
    updateChartWaypoints()
    updateChartUser(state.highRes, "small")
    updateChartUser(state.avg10, "large")


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
    waypoints.map(waypoint => 
        {
            waypoint.coordinates = points[i]
            i ++
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

    // Set full screen
    chartWidth = window.innerWidth - sidebarWidth
    chartHeight = window.innerHeight

    // Check if user is on a phone
    if (navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/iPhone/i)) {
        closeNav()
        chartWidth = 360
    }
    d3.select("#main").style("position", "absolute").style("top", 0).style("left", 0)
    d3.select("#open_btn").style("position", "absolute").style("top", "10px").style("left", "10px")

    var svg = d3.select("#chartsvg")
        .attr("width", chartWidth + (2 * chartMargin))
        .attr("height", chartHeight + (2 * chartMargin))
        .style("background-color", "lightgrey")
        .append("g")
        .attr("id", "chart")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("transform", "translate(" + chartMargin + "," + chartMargin + ")")

    // Add the "browse" button
    buildBrowseFile(d3.select("#browse-div"), "UPLOAD", "t1")

    // Build model of meditation states using the "vectors.js" file
    // This first time, include ALL the waypoints
    let vectors = waypoints.map(e => getRelativeVector(e.vector))
    buildModel(vectors)


    // Immediately display a map of the waypoints when user loads page
    updateChartWaypoints()

}

setup()





