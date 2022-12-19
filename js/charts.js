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
var linkSize = 1
var labelSize = "10px"
var waypointR = 10      // Size of waypoint circles
var x;
var y;
var z;
var opacityUser, opacityWaypoint;
var minx, maxx, miny, maxy, minz, maxz



function updateChartWaypoints() {
    label_array = []
    anchor_array = []
    waypointCircles = []
    d3.select("#chart").selectAll("*").remove() // Clear everything


    let zoom = d3.zoom()
        .on('zoom', handleZoom);

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
                    rotate(xd / 100, 0, yd / 100, userCircles, "userpoints", "list", "chart_user")
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

    svg.selectAll("*").remove()

    d3.select("#chartsvg").call(zoom)
        .on("mousedown", function (d) {
            console.log("clicked")
        })




    var standardCoordinates = waypoints.map(e => e.coordinates)


    // Find the minimum and maxiumum range of the model, set the chart size a bit larger than those bounds
    minx = d3.min(standardCoordinates.map(e => e[0]))
    miny = d3.min(standardCoordinates.map(e => e[1]))
    maxx = d3.max(standardCoordinates.map(e => e[0]))
    maxy = d3.max(standardCoordinates.map(e => e[1]))
    minz = d3.min(standardCoordinates.map(e => e[2]))
    maxz = d3.max(standardCoordinates.map(e => e[2]))

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

    z = d3.scalePow()
        .exponent(1)
        .domain([minz, maxz])
        .range([5, 10])

    opacityWaypoint = d3.scaleLinear()
        .domain([5, 10])
        .range([0.4, 1])

    opacityUser = d3.scaleLinear()
        .domain([5, 10])
        .range([0.1, 0.12])

    waypoints.forEach(entry => {
        var xi = entry.coordinates[0]
        var yi = entry.coordinates[1]
        var zi = entry.coordinates[2]

        if (entry.match == true) {
            waypointCircles.push({ x: xi, y: yi, z: zi })
            label_array.push({ x: xi, y: yi, z: zi, width: 10, height: 4, name: entry.user + " " + entry.label, size: entry.size })
            anchor_array.push({ x: x(xi), y: y(yi), z: z(zi), r: waypointR })
        }

    })
    console.log("Adding waypoints: " + waypointCircles.length)

    svg.selectAll(".waypoints")
        .data(waypointCircles)
        .enter()
        .append("circle")
        .attr("class", "waypoints")
        .attr("cx", function (d, i) {
            if (i == 0) console.log(x(d[0]))
            return x(d.x)
        })
        .attr("cy", function (d) {
            return y(d.y)
        })

        .attr("r", function (d) {
            return z(d.z)

        })
        .style("opacity", function (d, i) {

            return opacityWaypoint(z(d.z))
        })
        .attr("fill", "blue")



    // Draw labels - the first time they are drawn, there are probably bad positions and overlaps
    var labels = svg.selectAll(".label")
        .data(label_array)
        .enter()
        .append("text")
        .attr("class", "label")
        .attr("x", function (d, i) { return x(d.x + waypointR) })
        .attr("y", function (d) { return y(d.y - waypointR) })
        .style("font-size", function (d, i) {

            return Math.floor(z(d.z)) + "px"
        })

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

    if (mode3d != true) {
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
            .attr("x", function (d) { return x(d.x) })
            .attr("y", function (d) { return y(d.y) })

        links
            .transition()
            .duration(800)
            .attr("x2", function (d) { return d.x; })
            .attr("y2", function (d) { return d.y - 2; });
    }



}
function updateChartUser(data, type) {

    var userSize = 15
    var userOpacity = 0.1
    if (type == "large") {
        userSize = 5
        userOpacity = 0.9
    }
    console.log("type: " + type)

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



    svg
        .selectAll(".userpoints")
        .data(userCircles)
        .enter()
        .append("circle")
        .attr("class", "userpoints")
        .attr("cx", function (d, i) {
            if (i == 0) console.log(x(d.x))
            return x(d.x)
        })
        .attr("cy", function (d) { return y(d.y) })
        .attr("r", function (d) { return z(d.z) })
        .attr("seconds", function (d) {
            return d.moment.seconds
        })


        .attr("opacity", userOpacity)
        .attr("fill", "black")
        .on("mouseover", function (d) {
            d3.select(this).style("opacity", 0.9)
            var marker = d3.select("#mini-marker")

        })
        .on("click", function (d) {
            console.log(moment.vector)
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

    var svg = d3.select("#" + svgid)
    for (var i = 0; i < matrix.length; i++) {
        var px, py, pz

        if (type == "list") {

            px = matrix[i].x
            py = matrix[i].y
            pz = matrix[i].z
            matrix[i].x = Axx * px + Axy * py + Axz * pz
            matrix[i].y = Ayx * px + Ayy * py + Ayz * pz
            matrix[i].z = Azx * px + Azy * py + Azz * pz

        }
        else {

            // Labels
            px = matrix[i].x
            py = matrix[i].y
            pz = matrix[i].z
            matrix[i].x = Axx * px + Axy * py + Axz * pz
            matrix[i].y = Ayx * px + Ayy * py + Ayz * pz
            matrix[i].z = Azx * px + Azy * py + Azz * pz

        }
    }


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
                    if (size < 2) size = 2
                    return size
                }
                else {
                    return z(d.z)
                }
                

            })
            .style("opacity", function (d, i) {


                if (classname == "userpoints") {
                    var opacity = opacityUser(z(d.z))
                    if (opacity < 0.1) opacity = 0.1
                    return opacity
                }
                else {
                    return opacityWaypoint(z(d.z))
                }

            })

            .attr("z", function (d) { return z(d.z) })
    }
    else {


        svg.selectAll("." + classname)
            .attr("x", function (d) {
                return x(d.x) + z(d.z)
            })
            .attr("y", function (d) {
                return y(d.y) - z(d.z)
            })
            .style("font-size", function (d, i) {

                return Math.floor(z(d.z)) + "px"
            })

    }
}




