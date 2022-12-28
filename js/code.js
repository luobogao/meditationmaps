
const minimumMatch = 0.1
var backgroundColor = "#d9d9d9"
var sidebarWidth = 300
var waypoints = waypoints_muse

var chartWidth = window.innerWidth - sidebarWidth - 250
var chartHeight = window.innerHeight
var defaultSelectedUsers = ["Steffan", "Kaio", "Nii", "Students"]
var excludeWaypoints = ["similarity_nii_selfinquiry", "similarity_nii_lettinggo", "similarity_steffan_1"]

var chartMargin = 10

var mode3d = true // 3-d mode

const minichartWidth = 200
const minichartHeight = 200
const minichartMargin = 10

const matchchartWidth = 200
const matchchartHeight = 200
const matchchartMargin = 10

const fontFamily = "Roboto, sans-serif"
const textSizeLarge = 25
const textSizeMed = 18
const textSizeSmall = 12
const channels = ["TP9", "TP10", "AF7", "AF8"]
const bands = ["Delta", "Theta", "Alpha", "Beta", "Gamma"]
const band_channels = []
bands.forEach(band => {
    channels.forEach(channel => {
        band_channels.push(band + "_" + channel)
    })
})
const rl_pairs = [["TP10", "TP9"], ["AF8", "AF7"]]
const fb_pairs = [["TP9", "AF7"], ["TP10", "AF8"]]

var state =
{
    "filename": "<filename>",
    "device": "Muse",

    "model":
    {
        "mapped": null, // Mapped x-y coordinates of each standard vector
        "selected_users": defaultSelectedUsers,
    },
    "avg10": []

}

function receivedFile() {
    // Callback from the "browse" button
    // fr.result contains the string of the file that was uploading

    let string = fr.result
    console.log("--> Loaded file")

    d3.select("#loader").style("display", "flex")
    d3.select("#browse-div").style("display", "none")

    if (string.substring(0, 30).includes("timestampMs")) {
        state.device = "MindLink"
        waypoints = waypoints_mindlink
    }
    else {
        state.device = "Muse"
        waypoints = waypoints_muse
    }

    let w = new Worker("js/worker_load.js")
    w.postMessage(string)
    w.onmessage = function (event) {

        var data = JSON.parse(event.data)
        state.raw = data.raw
        state.lowRes = data.lowRes
        state.highRes = data.highRes
        state.avg10 = data.avg10
        state.averageMax = data.averageMax
        state.seconds_low = data.seconds_low
        state.seconds_high = data.seconds_high
        state.filename = data.filename
        rebuildChart()
    }

}




function rebuildChart() {
    // Critical variables

    d3.select("#loader").style("display", "none")
    d3.select("#browse-div").style("display", "flex")
    console.log("low res:")
    console.log(state.lowRes)

    var waypoints_include = waypoints.filter(e => !excludeWaypoints.includes(e.id)) //.filter(e => e.exclude != true) // remove manually excluded vectors
    var filtered_waypoints_match = waypoints_include

    // If user data has been uploaded, use it to find waypoints that don't have a good match, and remove them
    if (state.avg10.length > 0) {
        // re-build the Model using a few points from the user's data
        // Including user data like this helps to orient the chart 

        var variances = band_channels.map(key => d3.variance(state.avg10.map(e => e[key])))
        if (!variances.every(e => e != 0)) {
            alert("Bad data! Electrodes not attached right")
            return

        }

        var userVectors = state.avg10.map(e => getRelativeVector(e.vector))


        // Filter the waypoints by minimum distance from any of these test user vectors
        var distanceIds = {}
        userVectors.forEach(uservector => {

            waypoints.forEach(waypoint => {
                var waypoint_vector = getRelativeVector(waypoint.vector)
                var id = waypoint.id
                var distance = measureDistance(uservector, waypoint_vector)
                


                if (id in distanceIds) {
                    // This is the best match so far
                    if (distanceIds[id] < distance) {
                        distanceIds[id] = distance
                        waypoint.cosineSimilarity = distance
                    }

                }
                else {
                    distanceIds[id] = distance
                }

            })
        })
        var maxd = Object.entries(distanceIds)
        maxd.sort(function (a, b) {
            return b[1] - a[1]
        })
        //console.log("Best Match:")
        var bestMatch = maxd[0]
        //console.log(bestMatch)
        var bestFullMatch = waypoints.filter(e => e.id == bestMatch[0])[0]

        var filtered_waypoint_ids = maxd.filter(e => e[1] > minimumMatch).map(e => e[0])

        // Remove waypoints that have been selected for removal by the "removeN" standard
        filtered_waypoints_match = waypoints_include.filter(e => filtered_waypoint_ids.includes(e.id))
    }

    // Remove waypoints that have been de-selected by the user
    var filtered_waypoints = filtered_waypoints_match.filter(e => state.model.selected_users.includes(e.user))

    if (filtered_waypoints.length == 0) {
        alert("zero waypoints selected!")
        return
    }

    // Tag each waypoint (included filtered waypoints) as 'true' or 'false' match so that graph can remove filtered ones dynamically
    var ids = filtered_waypoints.map(e => e.id)
    waypoints.map(waypoint => {
        if (ids.includes(waypoint.id)) {
            waypoint.match = true
        }
        else waypoint.match = false
    })

    // Add distance to each user's rows
    state.modelRows = state.avg10 // Use a highly averaged dataset to check for matches
    state.modelRows.forEach(userRow => {
        var userVector = getRelativeVector(userRow.vector)
        var distances = []
        filtered_waypoints.forEach(waypoint => {

            var waypointVector = getRelativeVector(waypoint.vector)

            var distance = measureDistance(userVector, waypointVector)
            

            var label = waypoint.label + " (" + waypoint.user + ")"

            distances.push({ label: label, distance: distance, waypoint: waypoint, uid: uid() })

        })
        distances.sort(function (a, b) {
            return b.distance - a.distance
        })

        userRow.distances = distances

    })


    // Charts

    var type = "map"
    if (type == "map") {
        updateChartWaypoints()

        // Update user data if loaded
        if (state.lowRes.length > 10) {

            updateChartUser(state.highRes)
            buildBandChart(state.highRes)
            buildSimilarityChart(state.modelRows)

        }


    }
    else {
        buildCardChart(state.highRes)
        buildBandChart(state.highRes)
        buildSimilarityChart(state.modelRows)
    }



}



function buildModel(vectors) {
    // Builds the AI model using a collection of input vectors
    // These vectors are the raw (but averaged) values for each band/channel
    // Okay to use a mix of the "standard" vectors plus a few user vectors
    // Does not return x-y points - for that, need to call "run model" using the parameters set by this function

    console.log("Building model with " + vectors.length + " vectors")
    pca(vectors)

    // Build x-y points for each waypoint and store them
    let points = runModel(waypoints.map(e => getRelativeVector(e.vector)))
    var i = 0
    waypoints.map(waypoint => {
        waypoint.coordinates = points[i]
        i++
    })


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
    let vectors = waypoints.filter(e => e.exclude != true)
        .filter(e => state.model.selected_users.includes(e.user))
        .map(e => getRelativeVector(e.vector))

    buildModel(vectors)


    // Immediately display a map of the waypoints when user loads page
    waypoints.forEach(e => {
        if (state.model.selected_users.includes(e.user)) {
            e.match = true
        }

    }
    )

    // Add UIDs for every waypoint
    waypoints_muse.forEach(e => e.uid = uid())
    waypoints_mindlink.forEach(e => e.uid = uid())


    updateChartWaypoints()

    buildLoading(d3.select("#loading-div"))

    d3.selectAll(".subtitle")
        .style("font-style", "italic")
        .style("opacity", 0.7)

    // Mini-graph
    d3.select("#minichart")
        .style("background-color", backgroundColor)
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

    // Match graph
    d3.select("#matchchart")
        .style("background-color", backgroundColor)
        .style("border", "1px solid black")
        .style("border-radius", "3px")
        .attr("width", matchchartWidth + (2 * minichartMargin))
        .attr("height", matchchartHeight + (2 * minichartMargin))
        .style("position", "absolute")
        .style("right", "10px")
        .style("bottom", "250px")
        .append("g")
        .attr("id", "matchchartid")
        .attr("width", matchchartWidth + "px")
        .attr("height", matchchartHeight + "px")
        .attr("transform", "translate(" + matchchartMargin + "," + matchchartMargin + ")")

    // Popup
    d3.select("#popup")
        .style("border-radius", "5px")
        .style("opacity", 0.95)
        .style("position", "absolute")
        .style("background", "#404040")
        .style("z-index", 10)
        .style("color", "white")
        .style("margin-right", "20px")

    d3.select("#message1")
        .style("position", "absolute")
        .style("bottom", "100px")
        .style("opacity", 0.7)
        .style("font-size", "14px")
        .style("text-align", "center")

    d3.select("#options")
        .selectAll("*")
        .on("mouseover", function (d) {
            d3.select(this).style("cursor", "pointer");
        })

    buildSidebarRight()
    buildImages()

}
function buildSidebarRight() {
    // Right sidebar
    var contributors = unique(waypoints.map(e => e.user))


    var div = d3.select("#sidebarRight")
        .append("div")
        .style("display", "flex")
        .style("flex-direction", "column")

  
    contributors.forEach(name => {

        var checked = false
        if (state.model.selected_users.includes(name)) checked = true

        var checkbox = addCheckbox(div, name, checked)
        checkbox.on("click", function () {
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

            rebuildChart()

        })

    })

    var settingsDiv = d3.select("#sidebarRight")
        .append("div")

    settingsDiv.append()


}
function buildImages() {
    d3.selectAll(".logos")
        .style("display", "flex")
        .style("align-items", "center")
        .style("margin-left", "10px")
}

setup()





