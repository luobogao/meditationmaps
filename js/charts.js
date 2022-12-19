var line = d3.line()
    // Basic line function - takes a list of points and plots them x-y, x-y one at a time
    .x(function (d, i) { return d[0]; })
    .y(function (d, i) {
        return d[1]

    })
//.curve(d3.curveMonotoneX) // apply smoothing to the line

var waypointCircles = []
var svg;
var label_array = []
var anchor_array = []
var linkSize = 1
var labelSize = "14px"
var waypointR = 10      // Size of waypoint circles
var x;
var y;
var z;


function updateChartWaypoints() {
    label_array = []
    anchor_array = []
    d3.select("#chart").selectAll("*").remove() // Clear everything


    let zoom = d3.zoom()
        .on('zoom', handleZoom);

    var lastx = 0
    var lasty = 0
    function handleZoom(e) {
        // When user zooms, all chart "g" elements are changed accordingly

        const zoom_type = e.sourceEvent.type
        console.log("x: " + x(0))

        if (zoom_type == "wheel") {
            // both 2d and 3d modes uses scroll wheel for zooming
            e.transform.x = x(0)
            e.transform.y = y(0)
            d3.select("#chartsvg").selectAll("g").attr("transform", e.transform)
            
        }
        else {

            if (mode3d == true) {
                // 3d mode rotates in-place instead of panning
                var x = e.sourceEvent.clientX
                var y = e.sourceEvent.clientY

                var xd = lastx - x
                var yd = y - lasty
                lastx = x
                lasty = y
                if (Math.abs(xd) < 20 && Math.abs(yd) < 20) {
                    rotate(xd / 100, 0, yd / 100, waypointCircles, "waypoints", "list")
                    rotate(xd / 100, 0, yd / 100, label_array, "label", "obj")
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

    d3.select("#chartsvg").call(zoom)
        .on("mousedown", function (d) {
            console.log("clicked")
        })




    var standardCoordinates = waypoints.map(e => e.coordinates)


    // Find the minimum and maxiumum range of the model, set the chart size a bit larger than those bounds
    var minx = d3.min(standardCoordinates.map(e => e[0]))
    var miny = d3.min(standardCoordinates.map(e => e[1]))
    var maxx = d3.max(standardCoordinates.map(e => e[0]))
    var maxy = d3.max(standardCoordinates.map(e => e[1]))
    var minz = d3.min(standardCoordinates.map(e => e[2]))
    var maxz = d3.max(standardCoordinates.map(e => e[2]))

    minx = minx * 2
    maxx = maxx * 2
    miny = miny * 2
    maxy = maxy * 2

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

    waypoints.forEach(entry => {
        var xi = entry.coordinates[0]
        var yi = entry.coordinates[1]
        var zi = entry.coordinates[2]
        waypointCircles.push([xi, yi, zi])
        if (entry.match == true) {
            label_array.push({ x: x(xi), y: y(yi), z: z(zi), width: 10, height: 4, name: entry.user + " " + entry.label, size: entry.size })
            anchor_array.push({ x: x(xi), y: y(yi), z: z(zi), r: waypointR })
        }

    })


    svg.selectAll(".waypoints")
        .data(waypointCircles)
        .enter()
        .append("circle")
        .attr("class", "waypoints")
        .attr("cx", function (d, i) {
            if (i == 0) console.log(x(d[0]))
            return x(d[0])
        })
        .attr("cy", function (d) {
            return y(d[1])
        })
        .attr("r", waypointR)

        .attr("fill", "blue")



    // Draw labels - the first time they are drawn, there are probably bad positions and overlaps
    var labels = svg.selectAll(".label")
        .data(label_array)
        .enter()
        .append("text")
        .attr("class", "label")
        .style("font-size", function (d) {
            if (mode3d == true) {
                //return Math.floor(5 + d.size) + "px" // not working
                return labelSize
            }
            else return labelSize

        })
        .attr("x", function (d, i) {
                         return d.x + waypointR
             })
        .attr("y", function (d) { return d.y - waypointR })
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
            .attr("x", function (d) { return d.x })
            .attr("y", function (d) { return d.y })

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


    var svg = d3.select("#chart_user")
    svg.selectAll("*").remove() // Clear last chart, if any

    var vectors = data.map(e => getRelativeVector(e.vector))

    var mapped = runModel(vectors)

    var index = 0

    var lineData = []


    mapped.forEach(entry => {


        var moment = data[index]
        var xi = x(entry[0])
        var yi = y(entry[1])
        var zi = z(entry[2])

        lineData.push([xi, yi])

        if (type != "large") {
            setTimeout(function () {
                svg.append("circle")
                    .attr("cx", xi)
                    .attr("cy", yi)
                    .attr("r", zi)
                    .attr("seconds", moment.seconds) // store the seconds (x-value) so that circles can be filtered based on a specific second
                    .attr("class", "userpoints")
                    .attr("opacity", userOpacity)
                    .attr("fill", "grey")
                    .on("mouseover", function (d) {
                        d3.select(this).style("opacity", 0.9)
                        //console.log(moment.vector) 
                        var marker = d3.select("#mini-marker")
                        marker.attr("cx", x_mini(moment.seconds))


                    })
                    .on("click", function (d) {
                        console.log(moment.vector)
                    })
                    .on("mouseout", function (d) {
                        d3.select(this).style("opacity", userOpacity)
                    })



            }, index * (1000 / mapped.length))

        }

        index++

    })


    if (type == "large") {
        setTimeout(function () {
            svg.append("path")
                .attr("fill", "none")
                .attr("stroke", "black")
            //.attr("d", function () { return line(lineData) })
        }, 1000)

    }
    else {

    }




}



function rotate(pitch, yaw, roll, matrix, classname, type) {
    
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

        if (type == "list") {
            px = matrix[i][0];
            py = matrix[i][1];
            pz = matrix[i][2];
            matrix[i][0] = Axx * px + Axy * py + Axz * pz;
            matrix[i][1] = Ayx * px + Ayy * py + Ayz * pz;
            matrix[i][2] = Azx * px + Azy * py + Azz * pz;
            var points = svg.selectAll("." + classname)

                .attr("cx", function (d) {
                    return x(d[0])
                })
                .attr("cy", function (d) {
                    return y(d[1])
                })
                .attr("r", function (d) {
                    //return z(d[2])
                    return 10
                })
                .attr("z", function (d) { return z(d[2]) })
        }
        else {

            // Labels
            px = x.invert(matrix[i].x);
            py = y.invert(matrix[i].y);
            pz = z.invert(matrix[i].z);
            matrix[i].x = x(Axx * px + Axy * py + Axz * pz);
            matrix[i].y = y(Ayx * px + Ayy * py + Ayz * pz);
            matrix[i].z = z(Azx * px + Azy * py + Azz * pz);


            var points = svg.selectAll("." + classname)
                .attr("x", function (d) {
                    return d.x + waypointR
                })
                .attr("y", function (d) {
                    return d.y - waypointR
                })

        }



    }





}




