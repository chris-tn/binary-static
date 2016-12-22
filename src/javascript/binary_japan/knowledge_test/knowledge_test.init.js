var toJapanTimeIfNeeded = require('../../binary/base/utility').toJapanTimeIfNeeded;
var KnowledgeTestUI     = require('./knowledge_test.ui').KnowledgeTestUI;
var KnowledgeTestData   = require('./knowledge_test.data').KnowledgeTestData;

var KnowledgeTest = (function() {
    'use strict';

    var hiddenClass = 'invisible';

    var submitted = {};
    var submitCompleted = false;
    var randomPicks = [];
    var randomPicksObj = {};
    var resultScore = 0;

    var passMsg = '{JAPAN ONLY}Congratulations, you have pass the test, our Customer Support will contact you shortly.';
    var failMsg = '{JAPAN ONLY}Sorry, you have failed the test, please try again after 24 hours.';

    function questionAnswerHandler(ev) {
        var selected = ev.target.value;
        var qid = ev.target.name;
        submitted[qid] = selected === '1';
    }

    function submitHandler() {
        if (submitCompleted) {
            return;
        }
        var answeredQid = Object.keys(submitted).map(function(k) { return +k; });
        if (answeredQid.length !== 20) {
            $('#knowledge-test-instructions').addClass('invisible');
            $('#knowledge-test-msg')
                .addClass('notice-msg')
                .text(page.text.localize('You need to finish all 20 questions.'));

            var unAnswered = randomPicks.reduce((a, b) => a.concat(b))
                                        .find(q => answeredQid.indexOf(q.id) === -1).id;

            $.scrollTo('a[name="' + unAnswered + '"]', 500, { offset: -10 });
            return;
        }

        // compute score
        var questions = [];
        Object.keys(submitted).forEach(function (k) {
            var questionInfo = randomPicksObj[k],
                score = submitted[k] === questionInfo.correct_answer ? 1 : 0;
            resultScore += score;
            questionInfo.answer = submitted[k];
            questions.push({
                category: questionInfo.category,
                id      : questionInfo.id,
                question: questionInfo.question,
                answer  : questionInfo.answer ? 1 : 0,
                pass    : score,
            });
        });
        KnowledgeTestData.sendResult(questions, resultScore);
        submitCompleted = true;
    }

    function showQuestionsTable() {
        for (var j = 0; j < randomPicks.length; j++) {
            var table = KnowledgeTestUI.createQuestionTable(randomPicks[j]);
            $('#section' + (j + 1) + '-question').append(table);
        }

        $('#knowledge-test-questions input[type=radio]').click(questionAnswerHandler);
        $('#knowledge-test-submit').click(submitHandler);
        $('#knowledge-test-questions').removeClass(hiddenClass);
        $('#knowledge-test-msg').text(page.text.localize('{JAPAN ONLY}Please complete the following questions.'));
        $('#knowledge-test-instructions').removeClass('invisible');
    }

    function showResult(score, time) {
        $('#knowledge-test-instructions').addClass('invisible');
        $('#knowledge-test-header').text(page.text.localize('{JAPAN ONLY}Knowledge Test Result'));
        if (score >= 14) {
            $('#knowledge-test-msg').text(page.text.localize(passMsg));
        } else {
            $('#knowledge-test-msg').text(page.text.localize(failMsg));
        }

        var $resultTable = KnowledgeTestUI.createResultUI(score, time);

        $('#knowledge-test-container').append($resultTable);
        $('#knowledge-test-questions').addClass(hiddenClass);
    }

    function showMsgOnly(msg) {
        $('#knowledge-test-questions').addClass(hiddenClass);
        $('#knowledge-test-msg').text(page.text.localize(msg));
        $('#knowledge-test-instructions').addClass('invisible');
    }

    function showDisallowedMsg(jpStatus) {
        var msgTemplate =
            '{JAPAN ONLY}Dear customer, you are not allowed to take knowledge test until [_1]. Last test taken at [_2].';

        var msg = page.text.localize(msgTemplate, [
            toJapanTimeIfNeeded(jpStatus.next_test_epoch),
            toJapanTimeIfNeeded(jpStatus.last_test_epoch),
        ]);

        showMsgOnly(msg);
    }

    function showCompletedMsg() {
        var msg = "{JAPAN ONLY}Dear customer, you've already completed the knowledge test, please proceed to next step.";
        showMsgOnly(msg);
    }

    function populateQuestions() {
        randomPicks = KnowledgeTestData.randomPick20();
        randomPicks.reduce((a, b) => a.concat(b))
                   .forEach((question) => { randomPicksObj[question.id] = question; });

        showQuestionsTable();
    }

    function init() {
        BinarySocket.init({
            onmessage: function(msg) {
                var response = JSON.parse(msg.data);
                var type = response.msg_type;

                var passthrough = response.echo_req.passthrough && response.echo_req.passthrough.key;

                if (type === 'get_settings' && passthrough === 'knowledgetest') {
                    var jpStatus = response.get_settings.jp_account_status;

                    if (!jpStatus) {
                        window.location.href = page.url.url_for('/');
                        return;
                    }

                    switch (jpStatus.status) {
                        case 'jp_knowledge_test_pending': populateQuestions();
                            break;
                        case 'jp_knowledge_test_fail': if (Date.now() >= (jpStatus.next_test_epoch * 1000)) {
                            // show Knowledge Test cannot be taken
                            populateQuestions();
                        } else {
                            showDisallowedMsg(jpStatus);
                        }
                            break;
                        case 'jp_activation_pending':
                            showCompletedMsg();
                            showActivationPending();
                            break;
                        default: {
                            console.warn('Unexpected jp status');
                            window.location.href = page.url.url_for('/');
                        }
                    }
                } else if (type === 'jp_knowledge_test') {
                    if (!response.error) {
                        showResult(resultScore, response.jp_knowledge_test.test_taken_epoch * 1000);
                        $('html, body').animate({ scrollTop: 0 }, 'slow');

                        $('#knowledgetest-link').addClass(hiddenClass);     // hide it anyway
                    } else if (response.error.code === 'TestUnavailableNow') {
                        showMsgOnly('{JAPAN ONLY}The test is unavailable now, test can only be taken again on next business day with respect of most recent test.');
                    }
                }
            },
        });

        BinarySocket.send({ get_settings: 1, passthrough: { key: 'knowledgetest' } });
    }

    function showActivationPending() {
        $('#topbar-msg').children('a').addClass(hiddenClass + ' jp_activation_pending');
        if ($('.activation-message').length === 0) {
            $('#virtual-text').append(' <div class="activation-message">' + page.text.localize('Your Application is Being Processed.') + '</div>');
        }
    }

    function showKnowledgeTestTopBarIfValid(jpStatus) {
        if (!jpStatus) {
            return;
        }
        switch (jpStatus.status) {
            case 'jp_knowledge_test_pending':
            case 'jp_knowledge_test_fail':
                KnowledgeTestUI.createKnowledgeTestLink();
                break;
            case 'jp_activation_pending':
                showActivationPending();
                break;
            default:
        }
    }

    return {
        init                          : init,
        showKnowledgeTestTopBarIfValid: showKnowledgeTestTopBarIfValid,
    };
})();

module.exports = {
    KnowledgeTest: KnowledgeTest,
};
