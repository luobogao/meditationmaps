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
// Note: Mean subtraction is a standard part of PCA analysis, but not necessary when the vectors are already standardized ratios

// Subtracts the mean of each column from each value
// required for PCA analysis, this standardizes rows prior to variance
{
    
    // var mean_subtracted_matrix = []
    // for (var r = 0; r < matrix.length; r++) {
    //     var row = matrix[r]
    //     var new_row = []
    //     for (var c = 0; c < row.length; c++) {
    //         var new_value = row[c] - means[c]
    //         new_row.push(new_value)
    //     }
    //     mean_subtracted_matrix.push(new_row)
    // }
    // return mean_subtracted_matrix
    
    return matrix

}
function unit_scaling(matrix, maxes)
{
    var unit_scaled_matrix = []
    for (var r = 0; r < matrix.length; r++) {
        var row = matrix[r]
        var new_row = []
        for (var c = 0; c < row.length; c++) {
            var new_value = row[c] / maxes[c]
            new_row.push(new_value)
        }
        unit_scaled_matrix.push(new_row)
    }
    return unit_scaled_matrix
}
function covarianceMatrix(matrix, means, maxes)
{
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
    return covariance_matrix

}

function pca(data)
// Pricipal Component Analysis
// Takes a matrix and finds a single 2-d vector which can generate a 2-d map of this data
{
    
    if (data.length == 0)
    {
        alert("calling PCA with no data!")
    }

    // Starting matrix
    var matrix = clone(data)

    // Find means and maxes (of each column)
    // Used by various models to make the covariance matrix
    var means = []
    var maxes = []
    for (var i = 0; i < matrix[0].length; i++) {
        let column = matrix.map(e => e[i])
        maxes.push(d3.max(column.map(e => Math.abs(e))))
        means.push(d3.mean(column))

    }
    

    var covariance_matrix = covarianceMatrix(matrix, means, maxes)

    
    // Eigenvectors
    var e = math.eigs(covariance_matrix)
    var eigen_values = e.values
    var eigen_vectors = e.vectors

    // View the eigen values - largest indicate best match
    var total_values = d3.sum(eigen_values)
    const dimensions = 3 
    var top = d3.sum(eigen_values.slice(-1 * dimensions))
    var percent_match = Math.round(100 * top / total_values)
    console.log("--> Top " + dimensions + " vector match " + percent_match + "% of variance")

    // Take only the two largest vectors (this involves taking the last two COLUMNS of EACH vector)
    var take_N = eigen_vectors.map(e => [e[e.length - 1], e[e.length - 2], e[e.length - 3]])
    var principals = math.transpose(take_N)

    return [principals, means, maxes]
}
