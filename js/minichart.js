var x_mini;
var y_mini;

function updateMiniChart(museData) {
    var data = getEveryNth(museData.map(e => [e.seconds, e.Gamma_TP10]), 10)

    var svg = d3.select("#minichartid")
    svg.selectAll("*").remove()

    var xarray = data.map(e => e[0])
    var yarray = data.map(e => e[1])

    x_mini = d3.scaleLinear()
        .domain([d3.min(xarray), d3.max(xarray)])
        .range([0, minichartWidth])

    y_mini = d3.scaleLinear()
        .domain([d3.min(yarray), d3.max(yarray)])
        .range([minichartHeight, 0])




    var line = d3.line()
        // Basic line function - takes a list of points and plots them x-y, x-y one at a time
        .x(function (d, i) { return x_mini(d[0]); })
        .y(function (d, i) {
            return y_mini(d[1])
        })
        .curve(d3.curveMonotoneX) // apply smoothing to the line


    svg.append("path")
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("d", function () {
            return line(data)
        })


    svg.append("circle")
        .attr("cx", 20)
        .attr("cy", 20)
        .attr("r", 10)
        .style("fill", "black")
        .attr("id", "mini-marker")


    d3.select("#minichart")
    .on("mouseover", function (mouse) {
        // Reverse-calculate which second from the dataset the user is hovering over
        const [x, y] = d3.pointer(mouse)
        const second = x_mini.invert(x) // invert the axis to get the seconds from the pixel value
        let nearby = d3.selectAll(".userpoints")
            .style("opacity", 0.02)
            .filter(function () {
                var this_second = d3.select(this).attr("seconds")
                return this_second > second - 10 && this_second < second + 10
            })
        nearby.style("opacity", 1)


    })

}