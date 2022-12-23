function buildCardChart(rows) {
    const cardN = 3
    var svg = d3.select("#chart")
    svg.selectAll("*").remove()

    var cardCollection = []  // Array of entries which have an x-axis value (i) and an array of "cards"
    // {label, distance, waypoint}

    var i = 0
    var n = rows.length

    var x = d3.scaleLinear()
        .domain([0, n])
        .range([0, chartWidth * 0.9])

    var cardWidth = 0.8 * ((x(n) - x(0)) / n)

    var minY = d3.min(rows.map(row => row.distances.slice(0, cardN).slice(-1)[0].distance))
    
    var y = d3.scaleLog()
        .domain([minY, 100])
        .range([chartHeight * 0.8, chartHeight * 0.1])
    rows.forEach(row => {
        if (i > 0) {
            var top3 = row.distances.slice(0, 3)
            var labels = top3.map(e => e.label)
            var add = true
            if (cardCollection.length > 0) {
                var lastCards = cardCollection.slice(-1)[0]
                if (arraysEqual(lastCards.cards, labels)) {

                    add = false
                }
                else {

                    add = true
                }



            }
            if (add == true) {
                var newCards = { i: i, cards: top3 }
                cardCollection.push(newCards)
            }


        }
        i++
    })
    cardCollection.forEach(entry => {
        var cards = entry.cards

        var xi = x(entry.i)
        var firstY = y(cards[0].distance)
        var cardHeight = 50
        var cardYmargin = 20
        var lastY = firstY + cardHeight + cardYmargin

        cards.forEach(card => {

            var thisY = d3.max([y(card.distance), lastY])
            svg.append("rect")
                .attr("x", xi)
                .attr("y", thisY)
                .attr("width", cardWidth)
                .attr("height", cardHeight)
                .attr("fill", "none")
                .attr("rx", "5px")
                .attr("stroke", "black")

            svg.append("text")
                .text(card.waypoint.label)
                .style("font-size", "14px")
                .attr("x", xi + 10)
                .attr("y", thisY + cardHeight / 2)

            svg.append("text")
                .text(card.waypoint.user)
                .style("font-size", "12px")
                .attr("x", xi + 20)
                .attr("opacity", 0.7)
                .attr("y", thisY + (cardHeight / 2) + 10)


            lastY = thisY + cardHeight + cardYmargin
        })



    })



}