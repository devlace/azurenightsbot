'use strict';

const builder = require('botbuilder');
const _ = require('underscore-node');
const dateformat = require('dateformat');
const util = require('util');

const meetupService = require('../services/meetup.js');
const feedbackService = require('../services/feedback.js');
const textAnalyticsService = require('../services/textAnalytics.js');

// Create chat connector for communicating with the Bot Framework Service
const connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Receive messages from the user and respond by echoing each message back (prefixed with 'You said:')
var bot = module.exports = new builder.UniversalBot(connector, function (session) {

    var welcomeCard = new builder.HeroCard(session)
        .title('main_greetings')
        .subtitle('main_greetings_subtitle')
        .tap(builder.CardAction.openUrl(session, 'https://www.meetup.com/Melbourne-Azure-Nights/'))
        .images([
            new builder.CardImage(session)
                .url("https://azurenightsmeetupbotstor.blob.core.windows.net/media/Facebook.jpg")
                .alt('main_greetings')
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'https://www.meetup.com/Melbourne-Azure-Nights/', 'Learn More')
        ]);

    session.send(new builder.Message(session)
        .addAttachment(welcomeCard));

    return session.beginDialog('rootMenu');
});

// Set default locale
bot.set('localizerSettings', {
    botLocalePath: './bot/locale',
    defaultLocale: 'en'
});

// You can provide your own model by specifing the 'LUIS_MODEL_URL' environment variable
// This Url can be obtained by uploading or creating your model from the LUIS portal: https://www.luis.ai/
var recognizer = new builder.LuisRecognizer(process.env.LUIS_MODEL_URL);
bot.recognizer(recognizer);

// Dialog: Root menu
bot.dialog('rootMenu', [

    function (session) {
        builder.Prompts.choice(session, session.gettext('main_ask'), 'Give feedback on a session|View sessions|Become a member|Help|Quit', {
            listStyle: builder.ListStyle.button
        });
    },
    function (session, results) {
        switch (results.response.index) {
            case 0:
                session.beginDialog('giveFeedback');
                break;
            case 1:
                session.beginDialog('viewSessions');
                break;
            case 2:
                session.beginDialog('goToWebsite');
                break;
            case 3:
                session.beginDialog('help');
                break;
            default:
                session.endDialog('goodbye');
                break;
        }
    },
    function (session) {
        // Reload menu
        session.replaceDialog('rootMenu');
    }
]).reloadAction('showMenu', null, { matches: /^(menu|back)/i });



// Dialog: Give Feedback
bot.dialog('giveFeedback', [
    function (session) {
        session.beginDialog('selectSession');
    },
    function (session, args) {
        session.dialogData.selectedMeetupId = args.selectedMeetupId;
        builder.Prompts.choice(session, session.gettext('ask_rate_the_speaker'), "1|2|3|4|5", {
            listStyle: builder.ListStyle.button,
            maxRetries: 3,
            retryPrompt: session.gettext('invalid_option')
        })
    },
    function (session, results) {
        session.dialogData.ratingSpeaker = results.response;
        builder.Prompts.choice(session, session.gettext('ask_rate_the_content'), "1|2|3|4|5", {
            listStyle: builder.ListStyle.button,
            maxRetries: 3,
            retryPrompt: session.gettext('invalid_option')
        })
    },
    function (session, results) {
        session.dialogData.ratingContent = results.response;
        builder.Prompts.choice(session, session.gettext('ask_rate_the_overall'), "1|2|3|4|5", {
            listStyle: builder.ListStyle.button,
            maxRetries: 3,
            retryPrompt: session.gettext('invalid_option')
        })
    },
    function (session, results) {
        session.dialogData.ratingOverall = results.response;
        builder.Prompts.text(session, session.gettext('ask_general_feedback'));
    },
    function (session, results) {
        session.dialogData.generalFeedback = results.response;
        var phrases = results.response.split(".");

        //Sentiment analysis
        textAnalyticsService.getAvgSentiment(phrases).then(function (sentiment) {
            session.dialogData.generalFeedbackSentiment = sentiment;
            if (sentiment < 0.3) {
                session.send(session.gettext('sorry_bad_feedback'));
            } else if (sentiment > 0.8) {
                session.send(session.gettext('thanks_great_feedback'));
            } else {
                session.send(session.gettext('thanks_for_feedback'));
            }

            // Save feedback
            var feedback = {
                ratingSpeaker: session.dialogData.speakerRating,
                ratingContent: session.dialogData.ratingContent,
                ratingOverall: session.dialogData.ratingOverall,
                generalFeedback: session.dialogData.generalFeedback,
                generalFeedbackSentiment: session.dialogData.generalFeedbackSentiment,
                selectedMeetupId: session.dialogData.selectedMeetupId
            };
            feedbackService.save(feedback);

            session.endDialog(session.gettext('feedback_has_submitted'));
        });
    }
]).triggerAction({
    matches: /(give|provide|.*).*(feedback)/i
}).reloadAction('restartGiveFeedback', 'Ok.. restarting feedback', {
    matches: /^(restart|start over)/i,
    confirmPrompt: "Are you sure you want to start over?"
}).cancelAction('cancelList', "Feedback canceled", {
    matches: /^cancel/i,
    confirmPrompt: "Are you sure you want to cancel giving feedback?"
});

// Dialog: Select session
bot.dialog('selectSession', [
    function (session, args) {
        session.sendTyping();
        meetupService.getPastMeetups().then(function (meetups) {
            var selectedMeetups = _.chain(meetups)
                .first(3)
                .map(function (m) {
                    return { name: m.name, id: m.id }
                })
                .reduce(function (map, obj) { // Needs to be an object map (not array) to pass to Prompts.choice
                    map[obj.name] = { meetup_id: obj.id, meetup_name: obj.name }
                    return map;
                }, {})
                .value();
            builder.Prompts.choice(session, session.gettext('ask_which_session'), selectedMeetups, {
                listStyle: builder.ListStyle.button
            });
        });
    },
    function (session, results) {
        if (!(results.response.entity)) {
            session.send(session.gettext('session_not_found', results.response.entity));
            session.replaceDialog('selectSession')
        }
        session.send(session.gettext('your_selected_session', results.response.entity));
        session.endDialogWithResult({ selectedMeetupId: results.response.entity });
    }
]);

// Dialog: View sessions
bot.dialog('viewSessions', function (session, args) {
    session.sendTyping();
    meetupService.getMeetups().then(function (meetups) {
        if (meetups) {
            var cards = _.map(meetups, function (m) {
                return toHeroCard(session, m);
            })

            // create reply with Carousel AttachmentLayout
            var reply = new builder.Message(session)
                .attachmentLayout(builder.AttachmentLayout.carousel)
                .attachments(cards);

            session.endDialog(reply);
        } else {
            session.endDialog(no_session_found);
        }
    });
});

// LUIS
bot.dialog('AskNextSession', function (session) {
    session.sendTyping();
    meetupService.getNextMeetup().then(function (meetups) {
        if (meetups) {
            var card =  _.map(meetups, function (m) {
                    return toHeroCard(session, m);
                });

            // create reply with Carousel AttachmentLayout
            var reply = new builder.Message(session)
                .addAttachment(card[0]);

            session.send(session.gettext('next_session'));
            session.endDialog(reply);
        } else {
            session.endDialog(no_session_found);
        }
    });
}).triggerAction({
    matches: 'AskNextSession'
});


// Dialog: Go to Website
bot.dialog('goToWebsite', function (session, args) {
    session.endDialog('go_to_website')
});

// Dialog: Help
bot.dialog('help', [
    function (session, args) {
        session.endDialog(session.gettext('help'))
    }
]).triggerAction({
    matches: /^help$/,
    onSelectAction: (session, args, next) => {
        // Add the help dialog to the dialog stack 
        // (override the default behavior of replacing the stack)
        session.beginDialog(args.action, args);
    }
});


function toHeroCard(session, meetup) {
    var when = meetup.time ? dateformat(new Date(meetup.time)) : "TBD";
    var where = meetup.venue ? meetup.venue.name : "TBD";
    var subtitle = util.format('When: %s \nWhere: %s', when, where);
    var text = meetup.plain_text_description ? meetup.plain_text_description.substring(0, 100) : "TBD";
    var url = meetup.link;
    var picUrl = 'https://azurenightsmeetupbotstor.blob.core.windows.net/media/Facebook.jpg'
    if (meetup.photo_album) {
        picUrl = meetup.photo_album.photo_sample ? meetup.photo_album.photo_sample[0].photo_link : picUrl;
    }

    return new builder.HeroCard(session)
        .title(meetup.name)
        .subtitle(subtitle)
        .text(text)
        .images([
            builder.CardImage.create(session, picUrl)
        ])
        .buttons([
            builder.CardAction.openUrl(session, url, 'Learn More')
        ])
}
