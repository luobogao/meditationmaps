
var backgroundColor = "#d9d9d9"
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
    
    let w = new Worker("js/worker_load.js")
    w.postMessage(string)
    w.onmessage = function(event) {
        
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
        const minimumMatch = 0.8 // filter out waypoints with a cosine similarity less than this 
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
    let vectors = waypoints.map(e => getRelativeVector(e.vector))
    buildModel(vectors)


    // Immediately display a map of the waypoints when user loads page
    waypoints.map(e => e.match = true) // For this splash chart, use all waypoints
    updateChartWaypoints()



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





