
var uuid = require('uuid');
var fs = require('fs');
const _ = require('underscore-node');

var FeedbackService =  {
    saveFeedback: function (feedback) {
        feedback.id = uuid.v1();
        feedback.created_on = Date.now();
        this.save(feedback);
    },
    // persistence
    load: function () {
        var json = fs.readFileSync('./data/feedback.json', { encoding: 'utf8' });
        return JSON.parse(json);
    },
    save: function (orders) {
        var json = JSON.stringify(orders);
        fs.writeFileSync('./data/feedback.json', json, { encoding: 'utf8' });
    }
}

module.exports = FeedbackService;