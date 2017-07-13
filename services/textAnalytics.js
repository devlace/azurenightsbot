
const request = require('request');
const rp = require('request-promise');
const _ = require('underscore-node');
require('dotenv').config()

var TextAnalyticsService = {
    getAvgSentiment: function (phrases) {
        var documents = _.map(phrases, function (elem, index) {
            return {
                language: "en",
                id: index,
                text: elem
            };
        });

        var options = {
            method: 'POST',
            uri: 'https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/sentiment',
            headers: {
                'Ocp-Apim-Subscription-Key': process.env.TEXT_ANALYTICS_KEY,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: {
                "documents": documents
            },
            json: true // Automatically parses the JSON string in the response 
        };

        var sentiment = rp(options)
            .then(function (response) {
                console.log('response:', response);

                // Parse response, avg the sentiment scores
                var avgSentiment = _.reduce(response.documents, function (memo, num) {
                    return memo + num.score;
                }, 0) / (response.documents.length === 0 ? 1 : response.documents.length);

                return (avgSentiment);
            })
            .catch(function (error) {
                console.log('error:', error); // Print the error if one occurred
            });

        return Promise.resolve(sentiment);
    }
}

module.exports = TextAnalyticsService;