function dot(a, b)
// Dot product
{
    var d = 0
    for (var i = 0; i < a.length; i++) {
        var sum = a[i] * b[i]
        d = d + sum
    }
    return d

}

function cosineSimilarity(a, b)
// Cosine Similarity - used to find how similar to high-dimensional vectors are to each other
// Different from Eucleadean distance because it cares more about direction than magnitude
// I propose that this measurement is best for measuring the "style" of a meditation vs the strength
{
    var similarity = dot(a, b) / (Math.sqrt(dot(a, a)) * Math.sqrt(dot(b, b)))
    //if (similarity < 0) similarity = 0
    return similarity
}


const vector_columns = [
    "Delta_TP9", "Theta_TP9", "Alpha_TP9", "Beta_TP9", "Gamma_TP9",
    "Delta_TP10", "Theta_TP10", "Alpha_TP10", "Beta_TP10", "Gamma_TP10",
    "Delta_AF7", "Theta_AF7", "Alpha_AF7", "Beta_AF7", "Gamma_AF7",
    "Delta_AF8", "Theta_AF8", "Alpha_AF8", "Beta_AF8", "Gamma_AF8"
]
function getRootVector(row) {

    var data = {}
    vector_columns.forEach(key => {
        data[key] = row[key]
    })

    return data
}

function getRelativeVector(row) {

    const channels = ["TP9", "TP10", "AF7", "AF8"]
    const bands = ["Delta", "Theta", "Alpha", "Beta", "Gamma"]

    var vector = []

    channels.forEach(channel => {
        bands.forEach(band => {
            // Divide each value by the theta value in this channel
            // this is my method to avoid magnitude differences
            var value = ratio(row[band + "_" + channel], row["Theta" + "_" + channel])
            vector.push(value)
        })
    })
    
    return vector

}

function covariance(x, y, matrix) {
    // Covariance of the two columns x and y in a matrix
    // Similar to standard variance measurement, except two values are used 
    // Required for PCA analysis
    var sum = 0
    for (var i = 0; i < matrix.length; i++) {
        let row = matrix[i]
        let v = row[x] * row[y]
        sum += v
    }
    var c = sum / (matrix.length - 1)
    return c
}

function subtract_means(matrix, means)
// Subtracts the mean of each column from each value
// required for PCA analysis, this standardizes rows prior to variance
{
    
    var mean_subtracted_matrix = []
    for (var r = 0; r < matrix.length; r++) {
        var row = matrix[r]
        var new_row = []
        for (var c = 0; c < row.length; c++) {
            var new_value = row[c] - means[c]
            new_row.push(new_value)
        }
        mean_subtracted_matrix.push(new_row)
    }
    return mean_subtracted_matrix

}

function pca(data)
// Pricipal Component Analysis
// Takes a matrix and finds a single 2-d vector which can generate a 2-d map of this data
{
    console.log("Build PCA")

    // Starting matrix
    var matrix = clone(data)

    // Find mean (of each column)
    var means = []
    for (var i = 0; i < matrix[0].length; i++) {
        let column = matrix.map(e => e[i])
        let mean = d3.mean(column)
        means.push(mean)

    }
    
    // Subtract mean from each value in original matrix
    var mean_subtracted_matrix = subtract_means(matrix, means)
    // Covariance matrix (find covariance of each value with each other value)
    var covariance_matrix = []

    for (var a = 0; a < matrix[0].length; a++) {
        var new_row = []
        for (var b = 0; b < matrix[0].length; b++) {
            var c = covariance(a, b, mean_subtracted_matrix)
            new_row.push(c)
        }
        covariance_matrix.push(new_row)
    }

    // Eigenvectors
    var e = math.eigs(covariance_matrix)
    var eigen_values = e.values
    var eigen_vectors = e.vectors

    // View the eigen values - largest indicate best match
    var total_values = d3.sum(eigen_values)
    var top_2 = d3.sum(eigen_values.slice(-2))
    var percent_match = Math.round(100 * top_2 / total_values)
    console.log("--> Top two vector match " + percent_match + "% of variance")

    // Take only the two largest vectors (this involves taking the last two COLUMNS of EACH vector)
    var take_2 = eigen_vectors.map(e => [e[e.length - 2], e[e.length - 1]])
    var principals = math.transpose(take_2)

    return [principals, means]
}
function runModel(rows, principals, means)
// Takes rows of vectors calculated from the Muse data, and the principals (output from PCA function)
// Returns a list of x-y points, the location on 2-d space for each of those vectors

{
    var d = math.transpose(subtract_means(rows, means))
    var mappedCoordinates = math.transpose(math.multiply(principals, d))
    return mappedCoordinates
}