var line = d3.line()
    // Basic line function - takes a list of points and plots them x-y, x-y one at a time
    .x(function (d, i) { return x(d[0]); })
    .y(function (d, i) { return y(d[1]) })
//.curve(d3.curveMonotoneX) // apply smoothing to the line

var rotateOpening // an 'interval' which rotates the chart when user starts
var waypointCircles = []
var waypointLinks = []
var userCircles = []
var svg;
var zooming = false
var label_array = []
var anchor_array = []
var labels, links
var linkSize = 1
var labelSize = "20px"
var labelColor = "black"
var userSize = 30
var waypointSize = 15    // Size of waypoint circles
var userOpacity = 0.2
var waypointOpacity = 0.9
var userPointColor = "grey"
var waypointColor = "blue"
var labelOffset = 15 // The distance of labels from points


// Modes
var link_mode = "center"  // "center" or "between" - center links all nodes to origin 0,0


// 2D mode



var x;
var y;
var z;
var opacityUser, opacityWaypoint, opacityText, fontScale, userSizeScale
var minx, maxx, miny, maxy, minz, maxz

var cube;

function updateChartWaypoints() {
    label_array = []
    anchor_array = []
    waypointCircles = []
    waypointLinks = []
    d3.select("#chart").selectAll("*").remove() // Clear everything


    zooming = false // set to true when using is moving/zooming, to prevent popups
    let zoom = d3.zoom()
        .on('zoom', handleZoom)
        .on("start", function () {
            zooming = true
            clearInterval(rotateOpening)



        })
        .on("end", function () {
            zooming = false

        })

    var lastx = 0
    var lasty = 0
    function handleZoom(e) {
        // When user zooms, all chart "g" elements are changed accordingly

        const zoom_type = e.sourceEvent.type



        if (zoom_type == "wheel") {
            // both 2d and 3d modes uses scroll wheel for zooming

            var widthD = (chartWidth * e.transform.k) - chartWidth
            var heightD = (chartHeight * e.transform.k) - chartHeight
            e.transform.x = -1 * (widthD / 2)
            e.transform.y = -1 * (heightD / 2)
            d3.select("#chartsvg").selectAll("g").attr("transform", e.transform)

        }
        else {

            if (mode3d == true) {
                // 3d mode rotates in-place instead of panning
                var x = e.sourceEvent.clientX
                var y = e.sourceEvent.clientY

                var xd = (lastx - x)
                var yd = (lasty - y)
                lastx = x
                lasty = y
                if (Math.abs(xd) < 20 && Math.abs(yd) < 20) {
                    rotate(xd / 100, 0, yd / 100)

                }
            }
            else {
                // 2d mode allows for panning
                d3.select("#chartsvg").selectAll("g").attr("transform", e.transform)
            }
        }




    }



    // Add a series of "g" containers to the SVG in order of "elevation"
    // This allows for future chart updates to act on shapes below these shapes
    d3.select("#chart").append("g").attr("id", "chart_user")
    svg = d3.select("#chart").append("g").attr("id", "chart_labels")

    svg.selectAll("*").remove()

    d3.select("#chartsvg").call(zoom)



    // Get min/max only from the selected waypoints
    var standardCoordinates = waypoints.filter(e => e.exclude != true).filter(e => e.match == true).map(e => e.coordinates)


    // Find the minimum and maxiumum range of the model, set the chart size a bit larger than those bounds
    minx = d3.min(standardCoordinates.map(e => e[0]))
    miny = d3.min(standardCoordinates.map(e => e[1]))
    maxx = d3.max(standardCoordinates.map(e => e[0]))
    maxy = d3.max(standardCoordinates.map(e => e[1]))
    minz = d3.min(standardCoordinates.map(e => e[2]))
    maxz = d3.max(standardCoordinates.map(e => e[2]))

    cube = [
        { x: minx, y: miny, z: minz },
        { x: maxx, y: miny, z: minz },
        { x: maxx, y: maxy, z: minz },
        { x: minx, y: maxy, z: minz },

    ]

    minx = minx * 1.2
    maxx = maxx * 1.2
    miny = miny * 1.2
    maxy = maxy * 1.2



    // Make the min/max square

    if (Math.abs(minx) < maxx) minx = -1 * maxx
    else maxx = -1 * minx
    if (Math.abs(miny) < maxy) miny = -1 * maxy
    else maxy = -1 * miny


    // These D3 functions return the properly scaled x and y coordinates
    x = d3.scaleLinear()
        .domain([minx, maxx]) // input
        //.domain ([-500, 1000])
        .range([0, chartWidth - 30]); // output

    y = d3.scaleLinear()
        .domain([miny, maxy])
        //.domain ([-500, 500])
        .range([chartHeight - 100, 0])

    z = d3.scaleLinear()
        .domain([-10, 10])
        .range([5, 15])

    userSizeScale = d3.scaleLinear()
        .domain([-10, 10])
        .range([userSize / 2, userSize])

    fontScale = d3.scaleLinear()
        .domain([-10, 10])
        .range([8, 12])


    opacityWaypoint = d3.scaleLinear()
        .domain([5, 10])
        .range([0.4, waypointOpacity])

    opacityUser = d3.scaleLinear()
        .domain([5, 10])
        .range([0.3, 0.8])

    opacityText = d3.scaleLinear()
        .domain([8, 15])
        .range([0.4, 1])

    waypoints.forEach(entry => {
        var xi = entry.coordinates[0]
        var yi = entry.coordinates[1]
        var zi = entry.coordinates[2]

        var label = entry.user + " " + entry.label
        if (entry.match == true) {
            waypointCircles.push({ x: xi, y: yi, z: zi, fullentry: entry, id: entry.id, label: label })


        }

    })
    console.log("--> Adding waypoints: " + waypointCircles.length)

    cameraProject(waypointCircles)

    // Draw labels - the first time they are drawn, there are probably bad positions and overlaps
    labels = svg.selectAll(".label")
        .data(waypointCircles)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("id", function (d, i) { return "label_" + i })
        .style("fill", labelColor)
        .attr("x", function (d, i) { return x(d.xp) + labelOffset })
        .attr("y", function (d) { return y(d.yp) - labelOffset })
        .attr("z", function (d) { return z(d.z) })
        .style("font-size", function (d, i) {

            return labelSize
        })

        .text(function (d) { return d.label })

    links = svg.selectAll(".link")
        .data(label_array)
        .enter()
        .append("line")
        .attr("class", "link")
        .attr("opacity", 0.2)
        .attr("x1", function (d) { return d.x; })
        .attr("y1", function (d) { return d.y; })
        .attr("x2", function (d) { return d.x; })
        .attr("y2", function (d) { return d.y; })
        .attr("stroke-width", linkSize)
        .attr("stroke", "black");



    if (mode3d != true) {
        //adjustLabels()
    }

    buildLinks(svg, waypointCircles)
    addWaypoints(svg, waypointCircles)
    
    rotate(Math.random(), 0, Math.random())
    rotateOpening = setInterval(function () {
        rotate(0.001, 0, 0.001)
    }, 10)

}
function addWaypoints(svg, data) {
    // ADD WAYPOINTS

    svg.selectAll(".waypoints")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "waypoints")
        .attr("cx", function (d, i) {

            return x(d.xp)
        })
        .attr("cy", function (d) {
            return y(d.yp)


        })

        .attr("r", function (d) {
            if (mode3d == true) {
                //return z(d.z)
                return waypointSize

            }
            else {
                return waypointSize
            }


        })
        .style("display", function (d) {
            // Option: don't display a waypoint if 'match' is false
            if (d.fullentry.match) return "flex"
            else return "none"
        })

        .style("stroke", function (d) {
            if (mode3d == true) return "none"
            else return "white"
        }
        )
        .style("stroke-width", function (d) {
            if (mode3d == true) return 0
            else return 0.5
        })
        .style("opacity", function (d, i) {

            if (mode3d == true) {
                return waypointOpacity //opacityWaypoint(z(d.z))
            }
            else return waypointOpacity

        })

        .attr("fill", function (d) {
            // Option: don't display a waypoint if 'match' is false
            if (d.fullentry.match) return waypointColor
            else return "red"
        })
        .on("click", function (i, d) {
            // Toggle red/blue for selected waypoint
            var waypoint = d3.select(this)
            var selected = waypoint.attr("selected")
            if (selected) {
                waypoint.attr("fill", "blue")
                    .attr("selected", false)
            }
            else {
                waypoint.attr("fill", "blue")
                    .attr("selected", true)
            }

            waypoint.raise()
            recenter(d, 1000)

        }
        )
        .on("mouseover", function (event, d) {

            if (zooming == false) {
                var note = d.fullentry.popup
                d3.select(this).style("fill", "red")

                const user = d.fullentry.user
                if (note == undefined) { note = "(No Notes)" }
                var html = "<h2>" + user + "</h2>" + note + "<br><br>" + d.fullentry.cosineSimiarity
                popUp(event, html)
            }


        })
        .on("mouseout", function (event, d) {
            d3.select(this).style("fill", waypointColor)
            popUpremove()

        })
}
function buildLinks(svg, waypointData) {

    // Add lines between waypoints (as indicated by the variable: node_links)



    waypointLinks = []
    function getWaypoint(id) {
        var matches = waypointData.filter(e => e.id == id)
        if (matches.length == 1) {

            return matches[0]
        }

        else {
            return null
        }
    }
    if (link_mode == "center") {
        var all_nodes = waypoints.map(e => [e.id]) // Use ALL waypoints 
        all_nodes.forEach(waypoint_id => {
            var w1 = getWaypoint(waypoint_id)
            if (w1 != null) {
                waypointLinks.push([w1, {x: 0, y:0, z: 0}])
            }

        })
    }
    else {
        node_links.forEach(waypoint_ids => {
            for (let i = 0; i < waypoint_ids.length - 1; i++) {
                var w1 = getWaypoint(waypoint_ids[i])
                var w2 = getWaypoint(waypoint_ids[i + 1])
                if (w1 != null && w2 != null) {
                    waypointLinks.push([w1, w2])
                }

            }
        })
    }



    var visibility = "flex"
    if (link_mode == "none") {
        visibility = "none"
    }
    svg.selectAll(".waypoint_link")
        .data(waypointLinks)
        .enter()
        .append("line")
        .attr("class", "waypoint_link")
        .style("display", visibility)
        .attr("x1", function (d) { return x(d[0].xp) })
        .attr("y1", function (d) { return y(d[0].yp) })
        .attr("x2", function (d) {
            if (link_mode == "center") {
                return x(0)
            }
            else return x(d[1].xp)
        })
        .attr("y2", function (d) {
            if (link_mode == "center") {
                return y(0)
            }
            else return y(d[1].yp)

        })
        .attr('stroke', "black")
}
function adjustLabels() {
    // Use d3-labeler library to move each label so that it doesn't overlap

    function overlap(x1, y1, width1, height1, x2, y2) {
        if ((x2 > x1 && x2 < (x1 + width1)) && (y2 > y1 && y2 < (y1 + height1))) {
            return true
        }
    }



    var test_array = []
    labels.each(function () {
        var width = parseInt(this.getBBox().width)
        var height = this.getBBox().height;
        var element = d3.select(this)

        var entry = {}
        entry.width = width;
        entry.height = height;
        entry.id = element.attr("id")
        entry.x = parseInt(parseFloat(element.attr("x")))
        entry.y = parseInt(parseFloat(element.attr("y")))
        entry.z = parseInt(parseFloat(element.attr("z")))
        test_array.push(entry)




    })

    var test_overlaps = false
    if (test_overlaps == true) {
        // Doesn't work right yet, the overlap boundaries are wrong
        d3.selectAll('.label').style("opacity", 1)
        test_array.forEach(label1 => {

            test_array.forEach(label2 => {
                if (label1.id != label2.id) {
                    if (overlap(label1.x, label1.y, label1.width, label1.height, label2.x, label2.y)) {

                        if (label1.z > label2.z) {
                            d3.select("#" + label2.id).style("opacity", 0.2)
                        }
                        else {

                            d3.select("#" + label1.id).style("opacity", 0.2)
                        }
                    }

                }


            })


        })

    }

    var use_library = false

    // Testing: using d3-labeller library
    if (use_library == true) {

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
            .duration(1000)
            .attr("x2", function (d) { return d.x; })
            .attr("y2", function (d) { return d.y; });
    }
    else {

    }

}
function updateChartUser(data, type) {

    if (type == "large") {
        userSize = 5
        userOpacity = 0.9
    }


    var svg = d3.select("#chart_user")
    svg.selectAll("*").remove() // Clear last chart, if any

    var vectors = data.map(e => getRelativeVector(e.vector))
    
    // FOR TESTING: use the waypoints as user point, they should match PERFECTLY with waypoinst
    //var vectors = waypoints.filter(e => e.match == true).map(e => getRelativeVector(e.vector))


    var mapped = runModel(vectors)

    var index = 0

    var lineData = []

    userCircles = []

    mapped.forEach(entry => {


        var moment = data[index]
        var xi = entry[0]
        var yi = entry[1]
        var zi = entry[2]
        index++

        userCircles.push({ x: xi, y: yi, z: zi, moment: moment })

    })
    cameraProject(userCircles)

    // svg.append("path")
    //     .attr("fill", "none")
    //     .attr("stroke", "black")
    //     .attr("stroke-width", "10px")
    //     .attr("opacity", 0.3)
    //     .attr("d", line(lineData))


    // USER'S POINTS
    svg
        .selectAll(".userpoints")
        .data(userCircles)
        .enter()
        .append("circle")
        .attr("class", "userpoints")
        .attr("cx", function (d, i) {

            return x(d.xp)
        })
        .attr("cy", function (d) { return y(d.yp) })
        .attr("r", function (d) { return userSizeScale(d.z) })
        .attr("seconds", function (d) {
            return d.moment.seconds
        })
        .style("mix-blend-mode", "multiply") // How the opacity behaves with overlaps


        .attr("opacity", userOpacity)
        .attr("fill", userPointColor)
        .on("mouseover", function (i, d) {

            if (zooming != true) {
                d3.select(this).style("opacity", 1) //.style("stroke", "black")

                // Move the mini-chart marker to the same point

                var seconds = d.moment.seconds

                var marker_y_matches = state.highRes.filter(e => e.seconds > seconds) // Find a datapoint matching this second

                if (marker_y_matches.length > 0) {
                    var match = marker_y_matches[0]

                    var marker_y = 50
                    var marker_x = x_mini(match.seconds)
                    

                    d3.select("#mini-marker")
                        .attr("cx", marker_x)
                        .attr("cy", marker_y)
                        .style("display", "flex")
                }
                else {
                    d3.select("#mini-marker").style("display", "none")
                }



            }


        })
        .on("click", function (i, d) {
            // Click on a user point

            console.log("vector at this point:")
            console.log(d.moment.vector)
            console.log("relative vector:")
            console.log(getRelativeVector(d.moment.vector))
            console.log("distances:")
            console.log(d.moment.distances)

            var node = d3.select(this)

            // Toggle color for selected waypoint
            var selected = node.attr("selected")
            if (selected) {
                node.attr("fill", userPointColor)
                    .attr("selected", false)
            }
            else {
                node.attr("fill", userPointColor)
                    .attr("selected", true)
            }
            node.raise()
            recenter(d, 1000)

        })
        .on("mouseout", function (d) {
            d3.select(this).style("opacity", userOpacity) //.style("stroke", "none")
            d3.select("#mini-marker").style("display", "none")
        })

    var center = centroid(userCircles) // get the center of a point cloud
    recenter(center)

}

function rotate(pitch, yaw, roll) {

    var cosa = Math.cos(yaw);
    var sina = Math.sin(yaw);

    var cosb = Math.cos(pitch);
    var sinb = Math.sin(pitch);

    var cosc = Math.cos(roll);
    var sinc = Math.sin(roll);

    var Axx = cosa * cosb;
    var Axy = cosa * sinb * sinc - sina * cosc;
    var Axz = cosa * sinb * cosc + sina * sinc;

    var Ayx = sina * cosb;
    var Ayy = sina * sinb * sinc + cosa * cosc;
    var Ayz = sina * sinb * cosc - cosa * sinc;

    var Azx = -sinb;
    var Azy = cosb * sinc;
    var Azz = cosb * cosc;

    var transform = [[Axx, Axy, Axz], [Ayx, Ayy, Ayz], [Azx, Azy, Azz]]

    rotatethis(waypointCircles, "list", "waypoints")
    
    if (userCircles.length > 0) {
        rotatethis(userCircles, "list", "test")
    }
    function rotatethis(matrix, type, name) {
        if (type == "list") {

            var m = matrix.map(row => [row.x, row.y, row.z])
            var m2 = math.multiply(m, transform)
            for (let e = 0; e < m2.length; e++) {

              
                matrix[e].x = m2[e][0]
                matrix[e].y = m2[e][1]
                matrix[e].z = m2[e][2]
            }
            
            
            


        }


        else if (type == "link") {
            matrix.forEach(link => {
                var m = link.map(pnt => [pnt.x, pnt.y, pnt.z])
                var m2 = math.multiply(m, transform)
                for (let e = 0; e < m2.length; e++) {
                    link[e].x = m2[e][0]
                    link[e].y = m2[e][1]
                    link[e].z = m2[e][2]
                }

            })
        }

        // NO LONGER USED
        else if (type == "obj") {

            var m = matrix.map(row => [x.invert(row.x), y.invert(row.y), z.invert(row.z)])
            var m2 = math.multiply(m, transform)
            for (let e = 0; e < m2.length; e++) {
                matrix[e].x = x(m2[e][0])
                matrix[e].y = y(m2[e][1])
                matrix[e].z = z(m2[e][2])
            }


        }

    }


    // Move the SVGs to new rotated coordinates
    readjustAllPoints(0)
}

function cameraProject(matrix) {
    var m = []
    matrix.forEach(row => {
        m.push([row.x, row.y, row.z, 1])
    })

    var cameraMatrix = [[10, 0, 0, 0], [0, 10, 0, 0], [0, 0, 1, 0]]
    var projection = math.transpose(math.multiply(cameraMatrix, math.transpose(m)))
    //console.log(projection)
    for (let i = 0; i < matrix.length; i++) {
        var p = projection[i]
        matrix[i].xp = matrix[i].x // p[0]
        matrix[i].yp = matrix[i].y // p[1]
    }
}

function recenter(node, duration) {

    var x = node.x
    var y = node.y
    var z = node.z
    // Centers the view around the user's data center of gravity instead of the model origin

    

    var updates = [userCircles, waypointCircles]
    updates.forEach(arr => {
        arr.forEach(entry => {
            entry.x = entry.x - x
            entry.y = entry.y - y
            entry.z = entry.z - z
        })

    })

    readjustAllPoints(duration)

}
function readjustAllPoints(duration) {
    cameraProject(waypointCircles)

    //adjustLabels()

    if (userCircles.length > 0) {
        cameraProject(userCircles)
    }

    function updatePoints(svgid, classname) {
        var svg = d3.select("#" + svgid)
        svg.selectAll("." + classname)
            .transition()
            .attr("cx", function (d) {
                return x(d.xp)
            })
            .attr("cy", function (d) {
                return y(d.yp)
            })
            .attr("r", function (d) {
                if (classname == "userpoints") {
                    //var size = userSizeScale(d.z)
                    //if (size < 5) size = 5
                    //return size
                    return userSize
                }
                else {
                    //var size = z(d.z)
                    //if (size < 5) size = 5
                    //return size
                    return waypointSize

                }


            })
            .style("opacity", function (d, i) {


                if (classname == "userpoints") {
                    //var opacity = opacityUser(z(d.z))
                    //if (opacity < 0.1) opacity = 0.1
                    //return opacity
                    return userOpacity //userOpacity
                }
                else {
                    //var opacity = opacityWaypoint(z(d.z))
                    //if (opacity < 0.1) opacity = 0.1
                    return waypointOpacity
                }

            })

            .attr("z", function (d) { return z(d.z) })
            .duration(duration)
    }

    function updateLabels(svgid, classname) {
        var svg = d3.select("#" + svgid)
        svg.selectAll("." + classname)
            .transition()
            .attr("x", function (d) {
                return x(d.xp) + labelOffset
            })
            .attr("y", function (d) {
                return y(d.yp) - labelOffset
            })

            .style("font-size", function (d, i) {

                return labelSize
            })
            .style("opacity", function (d) {
                var opacity = opacityText(z(d.z))
                if (opacity < 0.3) opacity = 0.3
                return opacity
            })
            .duration(duration)
    }
    function updateLines(svgid, classname) {
        var svg = d3.select("#" + svgid)
        svg.selectAll("." + classname)
            .transition()
            .attr("x1", function (d) { return x(d[0].xp) })
            .attr("y1", function (d) { return y(d[0].yp) })
            .attr("x2", function (d) {
                if (link_mode == "center") {
                    return x(0)
                }
                else return x(d[1].xp)
            })
            .attr("y2", function (d) {
                if (link_mode == "center") {
                    return y(0)
                }
                else return y(d[1].yp)

            })
            .duration(duration)

    }
    updatePoints("chart_user", "userpoints")
    updatePoints("chart_labels", "waypoints")
    updateLabels("chart_labels", "label")
    updateLines("chart_labels", "waypoint_link")



}





