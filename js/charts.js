var line = d3.line()
    // Basic line function - takes a list of points and plots them x-y, x-y one at a time
    .x(function (d, i) { return d[0]; })
    .y(function (d, i) {
        return d[1]

    })
//.curve(d3.curveMonotoneX) // apply smoothing to the line

var waypointCircles = []
var userCircles = []
var svg;
var label_array = []
var anchor_array = []
var labels, links
var linkSize = 1
var labelSize = "10px"
var labelColor = "black"
var userSize = 15
var userOpacity = 0.1
var userPointColor = "grey"
var waypointColor = "blue"


// 2D mode
var waypointR = 8     // Size of waypoint circles
var waypointOpacity = 1

var x;
var y;
var z;
var opacityUser, opacityWaypoint, opacityText
var minx, maxx, miny, maxy, minz, maxz

var cube;

function updateChartWaypoints() {
    label_array = []
    anchor_array = []
    waypointCircles = []
    d3.select("#chart").selectAll("*").remove() // Clear everything


    var zooming = false // set to true when using is moving/zooming, to prevent popups
    let zoom = d3.zoom()
        .on('zoom', handleZoom)
        .on("start", function () {
            zooming = true
        })
        .on("end", function () {
            zooming = false

        })

    var lastx = 0
    var lasty = 0
    function handleZoom(e) {
        // When user zooms, all chart "g" elements are changed accordingly

        const zoom_type = e.sourceEvent.type


        x = d3.scaleLinear()
            .domain([minx, maxx]) // input
            //.domain ([-500, 1000])
            .range([0, chartWidth]); // output

        y = d3.scaleLinear()
            .domain([miny, maxy])
            //.domain ([-500, 500])
            .range([chartHeight, 0])

        z = d3.scaleLinear()
            .domain([minz, maxz])
            .range([5, 10])



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

                var xd = lastx - x
                var yd = lasty - y
                lastx = x
                lasty = y
                if (Math.abs(xd) < 20 && Math.abs(yd) < 20) {
                    rotate(xd / 100, 0, yd / 100, waypointCircles, "waypoints", "list", "chart_labels")
                    rotate(xd / 100, 0, yd / 100, label_array, "label", "obj", "chart_labels")
                    rotate(xd / 100, 0, yd / 100, anchor_array, "link", "obj", "chart_labels")
                    rotate(xd / 100, 0, yd / 100, userCircles, "userpoints", "list", "chart_user")
                    rotate(xd / 100, 0, yd / 100, cube, "cube", "cube", "chart_cube")
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
    var svg_user = d3.select("#chart").append("g").attr("id", "chart_user")
    svg = d3.select("#chart").append("g").attr("id", "chart_labels")
    var svg2 = d3.select("#chart").append("g").attr("id", "chart_standards")
    var svgcube = d3.select("#chart").append("g").attr("id", "chart_cube")

    svg.selectAll("*").remove()

    d3.select("#chartsvg").call(zoom)




    var standardCoordinates = waypoints.map(e => e.coordinates)


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

    minx = minx * 2
    maxx = maxx * 2
    miny = miny * 2
    maxy = maxy * 2



    // Make the min/max square
    if (Math.abs(minx) < maxx) minx = -1 * maxx
    else maxx = -1 * minx
    if (Math.abs(miny) < maxy) miny = -1 * maxy
    else maxy = -1 * miny

    // These D3 functions return the properly scaled x and y coordinates
    x = d3.scaleLinear()
        .domain([minx, maxx]) // input
        //.domain ([-500, 1000])
        .range([0, chartWidth]); // output

    y = d3.scaleLinear()
        .domain([miny, maxy])
        //.domain ([-500, 500])
        .range([chartHeight, 0])

    z = d3.scaleLinear()
        .domain([minz, maxz])
        .range([5, 10])

    opacityWaypoint = d3.scaleLinear()
        .domain([5, 10])
        .range([0.4, 1])

    opacityUser = d3.scaleLinear()
        .domain([5, 10])
        .range([0.3, 0.8])

    opacityText = d3.scaleLinear()
        .domain([5, 10])
        .range([0.4, 1])

    waypoints.forEach(entry => {
        var xi = entry.coordinates[0]
        var yi = entry.coordinates[1]
        var zi = entry.coordinates[2]

        if (entry.match == true) {
            waypointCircles.push({ x: xi, y: yi, z: zi, fullentry: entry })
            label_array.push({ x: x(xi), y: y(yi), z: z(zi), width: 10, height: 4, name: entry.user + " " + entry.label, size: entry.size })
            anchor_array.push({ x: x(xi), y: y(yi), z: z(zi), r: waypointR })
        }

    })
    console.log("--> Adding waypoints: " + waypointCircles.length)



    // Draw labels - the first time they are drawn, there are probably bad positions and overlaps
    labels = svg.selectAll(".label")
        .data(label_array)
        .enter()
        .append("text")
        .attr("class", "label")
        .style("fill", labelColor)
        .attr("x", function (d, i) { return d.x })
        .attr("y", function (d) { return d.y })
        .style("font-size", function (d, i) {

            if (mode3d == true) {
                return Math.floor(d.z) + "px"
            }
            else return labelSize

        })

        .text(function (d) { return d.name })

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

    var index = 0
    labels.each(function () {
        label_array[index].width = this.getBBox().width;
        label_array[index].height = this.getBBox().height;
        index++

    })

    if (mode3d != true) {
        adjustLabels()
    }

    // ADD WAYPOINTS
    svg.selectAll(".waypoints")
        .data(waypointCircles)
        .enter()
        .append("circle")
        .attr("class", "waypoints")
        .attr("cx", function (d, i) {

            return x(d.x)
        })
        .attr("cy", function (d) {
            return y(d.y)
        })

        .attr("r", function (d) {
            if (mode3d == true) {
                return z(d.z)
            }
            else {
                return waypointR
            }


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
                return opacityWaypoint(z(d.z))
            }
            else return waypointOpacity

        })
        .attr("fill", waypointColor)
        .on("click", function (i, d) {
            // Toggle red/blue for selected waypoint
            var selected = d3.select(this).attr("selected")
            if (selected) {
                d3.select(this).attr("fill", "blue")
                    .attr("selected", false)
            }
            else {
                d3.select(this).attr("fill", "red")
                    .attr("selected", true)
            }

        }
        )
        .on("mouseover", function (event, d) {
            if (zooming == false) {
                var note = d.fullentry.popup

                const user = d.fullentry.user
                if (note == undefined) { note = "(No Notes)" }
                var fullhtml = "<h2>" + user + "</h2>" + note
                var x = event.pageX
                var y = event.pageY
                var popup = d3.select("#popup")

                popup
                    .style("display", "flex")
                    //.style("width", "200px")
                    //.style("height", "100px")
                    .style("left", (x + 10) + "px")
                    .style("top", (y + 10) + "px")
                    .append("div").style("margin", "10px")
                    .html(fullhtml)
            }


        })
        .on("mouseout", function (event, d) {
            d3.select("#popup")
                .transition()
                .style("display", "none")
                .duration(100)
                .selectAll("*").remove()

        })




}
function adjustLabels() {
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
        .duration(1000)
        .attr("x2", function (d) { return d.x; })
        .attr("y2", function (d) { return d.y; });
}

function updateChartUser(data, type) {


    if (type == "large") {
        userSize = 5
        userOpacity = 0.9
    }


    var svg = d3.select("#chart_user")
    svg.selectAll("*").remove() // Clear last chart, if any




    var vectors = data.map(e => getRelativeVector(e.vector))

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

        lineData.push([xi, yi])
        userCircles.push({ x: xi, y: yi, z: zi, moment: moment })
    })


    // USER'S POINTS
    svg
        .selectAll(".userpoints")
        .data(userCircles)
        .enter()
        .append("circle")
        .attr("class", "userpoints")
        .attr("cx", function (d, i) {

            return x(d.x)
        })
        .attr("cy", function (d) { return y(d.y) })
        .attr("r", function (d) { return z(d.z) })
        .attr("seconds", function (d) {
            return d.moment.seconds
        })


        .attr("opacity", userOpacity)
        .attr("fill", userPointColor)
        .on("mouseover", function (d) {
            d3.select(this).style("opacity", 0.9)
            var marker = d3.select("#mini-marker")

        })
        .on("click", function (i, d) {
            // Click on a user point

            console.log("vector at this point:")
            console.log(d.moment.vector)
            // Toggle color for selected waypoint
            var selected = d3.select(this).attr("selected")
            if (selected) {
                d3.select(this).attr("fill", userPointColor)
                    .attr("selected", false)
            }
            else {
                d3.select(this).attr("fill", "red")
                    .attr("selected", true)
            }

        })
        .on("mouseout", function (d) {
            d3.select(this).style("opacity", userOpacity)
        })

}



function rotate(pitch, yaw, roll, matrix, classname, type, svgid) {

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

    // TODO: use matrix math library
    //var m = math.matrix([[Axx, Axy, Axz], [Ayx, Ayy, Ayz], [Azx, Azy, Azz]])


    for (var i = 0; i < matrix.length; i++) {
        var px, py, pz


        if (type == "list" || type == "cube") {

            px = matrix[i].x
            py = matrix[i].y
            pz = matrix[i].z
            matrix[i].x = Axx * px + Axy * py + Axz * pz
            matrix[i].y = Ayx * px + Ayy * py + Ayz * pz
            matrix[i].z = Azx * px + Azy * py + Azz * pz

        }
        else {

            // Labels
            px = x.invert(matrix[i].x)
            py = y.invert(matrix[i].y)
            pz = z.invert(matrix[i].z)
            matrix[i].x = x(Axx * px + Axy * py + Axz * pz)
            matrix[i].y = y(Ayx * px + Ayy * py + Ayz * pz)
            matrix[i].z = z(Azx * px + Azy * py + Azz * pz)

        }
    }


    // Move the SVGs to new rotated coordinates
    if (classname != null) {
        var svg = d3.select("#" + svgid)
        if (type == "list") {

            var points = svg.selectAll("." + classname)
                .attr("cx", function (d) {
                    return x(d.x)
                })
                .attr("cy", function (d) {
                    return y(d.y)
                })
                .attr("r", function (d) {
                    if (classname == "userpoints") {
                        var size = z(d.z)
                        if (size < 5) size = 5
                        return size
                    }
                    else {
                        var size = z(d.z)
                        if (size < 5) size = 5
                        return size
                    }


                })
                .style("opacity", function (d, i) {


                    if (classname == "userpoints") {
                        var opacity = opacityUser(z(d.z))
                        if (opacity < 0.1) opacity = 0.1
                        return opacity
                    }
                    else {
                        var opacity = opacityWaypoint(z(d.z))
                        if (opacity < 0.1) opacity = 0.1
                        return opacity
                    }

                })

                .attr("z", function (d) { return z(d.z) })
        }
        else if (type == "cube") {
            svg.selectAll(".cube").remove()

            svg.append("line")
                .attr("class", "cube")
                .attr("x1", x(cube[0].x))
                .attr("y1", x(cube[0].y))
                .attr("x2", x(cube[1].x))
                .attr("y2", x(cube[1].y))
                .attr("stroke", "black")

            svg.append("line")
                .attr("class", "cube")
                .attr("x1", x(cube[1].x))
                .attr("y1", x(cube[1].y))
                .attr("x2", x(cube[2].x))
                .attr("y2", x(cube[2].y))
                .attr("stroke", "black")

            svg.append("line")
                .attr("class", "cube")
                .attr("x1", x(cube[2].x))
                .attr("y1", x(cube[2].y))
                .attr("x2", x(cube[3].x))
                .attr("y2", x(cube[3].y))
                .attr("stroke", "black")

            svg.append("line")
                .attr("class", "cube")
                .attr("x1", x(cube[3].x))
                .attr("y1", x(cube[3].y))
                .attr("x2", x(cube[0].x))
                .attr("y2", x(cube[0].y))
                .attr("stroke", "black")


        }
        else {


            svg.selectAll("." + classname)
                .attr("x", function (d) {
                    return d.x + d.z
                })
                .attr("y", function (d) {
                    return d.y - d.z
                })
                .attr("x1", function (d) {
                    return d.x
                })
                .attr("y1", function (d) {
                    return d.y
                })
                .attr("x2", function (d) {
                    return d.x
                })
                .attr("y2", function (d) {
                    return d.y
                })
                .style("font-size", function (d, i) {

                    if (mode3d == true) {
                        return Math.floor(d.z) + "px"
                    }
                    else return labelSize
                })
                .style("opacity", function (d) {
                    var opacity = opacityText(d.z)
                    if (opacity < 0.3) opacity = 0.3
                    return opacity
                })


        }
    }


}




