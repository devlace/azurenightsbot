
const request = require('request');
const rp = require('request-promise');

var sigId = process.env.MEETUP_API_SIG_ID

var MeetupService = {
    getPastMeetups: function () {
        var sig = process.env.MEETUP_API_SIG_GETPASTMEETUPS
        var uri = 'https://api.meetup.com/Melbourne-Azure-Nights/events?scroll=recent_past&photo-host=public&page=20&sig_id=' + sigId + '&status=past&sig=' + sig;
        var options = {
            uri: uri,
            headers: {
                'User-Agent': 'Request-Promise'
            },
            json: true
        };
        var meetups = rp(options)
            .then(function (response) {
                return (response);
            })
            .catch(function (error) {
                console.log('error:', error);
            });
        return Promise.resolve(meetups);
    },
    getMeetups: function () {
        var sig = process.env.MEETUP_API_SIG_GETMEETUPS
        var options = {
            uri: 'https://api.meetup.com/Melbourne-Azure-Nights/events?scroll=recent_past&photo-host=public&page=20&sig_id=' + sigId + '&fields=photo_album%2Cgroup_photo%2Cplain_text_description&sig=' + sig,
            headers: {
                'User-Agent': 'Request-Promise'
            },
            json: true
        };
        var meetups = rp(options)
            .then(function (response) {
                return (response);
            })
            .catch(function (error) {
                console.log('error:', error); 
            });
        return Promise.resolve(meetups);
    },
    getNextMeetup: function () {
        var sig = process.env.MEETUP_API_SIG_GETNEXTMEETUPS
        var options = {
            uri: 'https://api.meetup.com/Melbourne-Azure-Nights/events?scroll=next_upcoming&photo-host=public&page=20&sig_id=' + sigId + '&status=upcoming&fields=photo_album%2Cgroup_photo%2Cplain_text_description&sig=' + sig,
            headers: {
                'User-Agent': 'Request-Promise'
            },
            json: true
        };
        var meetups = rp(options)
            .then(function (response) {
                return (response);
            })
            .catch(function (error) {
                console.log('error:', error);
            });
        return Promise.resolve(meetups);
    }
}

module.exports = MeetupService;

