// Copyright (c) 2015 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

'use strict';

var rewire = require('rewire');
var test = require('tape');
var KafkaRestProxyServer = require('./lib/test_kafka_rest_proxy');
var KafkaRestClient = rewire('../lib/kafka_rest_client');
var MigratorBlacklistServer = require('./lib/test_migrator_blacklist_server');
var MigratorBlacklistClient = require('../lib/migrator_blacklist_client');

KafkaRestClient.__set__({
    'KafkaRestClient.prototype.getTopicRequestBody': function getTopicRequestBodyMock(proxyHost, proxyPort, callback) {
        var messages = {
            'localhost:1111': ['testTopic0', 'testTopic1', 'testTopic2', 'testTopic3'],
            'localhost:2222': ['testTopic4', 'testTopic5', 'testTopic6', 'testTopic7'],
            'localhost:15380': ['LOGGING TOPICS']
        };
        callback(null, JSON.stringify(messages));
    }
});

test('KafkaRestClient can discover topics', function testKafkaRestClientTopicDiscovery(assert) {
    var configs = {
        proxyHost: 'localhost',
        proxyPort: 4444,
        proxyRefreshTime: 0
    };
    var restClient = new KafkaRestClient({
        proxyHost: configs.proxyHost,
        proxyPort: configs.proxyPort,
        refreshTime: configs.proxyRefreshTime,
        maxRetries: 0
    });
    assert.equal(Object.keys(restClient.cachedTopicToUrlMapping).length, 9);
    assert.equal(restClient.cachedTopicToUrlMapping.testTopic0, 'localhost:1111');
    assert.equal(restClient.cachedTopicToUrlMapping.testTopic1, 'localhost:1111');
    assert.equal(restClient.cachedTopicToUrlMapping.testTopic2, 'localhost:1111');
    assert.equal(restClient.cachedTopicToUrlMapping.testTopic3, 'localhost:1111');
    assert.equal(restClient.cachedTopicToUrlMapping.testTopic4, 'localhost:2222');
    assert.equal(restClient.cachedTopicToUrlMapping.testTopic5, 'localhost:2222');
    assert.equal(restClient.cachedTopicToUrlMapping.testTopic6, 'localhost:2222');
    assert.equal(restClient.cachedTopicToUrlMapping.testTopic7, 'localhost:2222');
    restClient.close();
    assert.end();
});

test('KafkaRestClient handle failed post', function testKafkaRestClientHanldeFailedPostCall(assert) {
    var configs = {
        proxyHost: 'localhost',
        proxyPort: 4444,
        proxyRefreshTime: 0
    };
    var timeStamp = Date.now() / 1000.0;
    var restClient = new KafkaRestClient({
        proxyHost: configs.proxyHost,
        proxyPort: configs.proxyPort,
        refreshTime: configs.proxyRefreshTime,
        maxRetries: 0
    });

    function getProduceMessage(topic, message, ts, type) {
        var produceMessage = {};
        produceMessage.topic = topic;
        produceMessage.message = message;
        produceMessage.timeStamp = ts;
        produceMessage.type = type;
        return produceMessage;
    }

    restClient.produce(getProduceMessage('testTopic0', 'msg0', timeStamp, 'binary'),
            function assertHttpErrorReason(err) {
                assert.equal(err.reason, 'connect ECONNREFUSED');
            });

    restClient.produce(getProduceMessage('testTopic0', 'msg0', timeStamp, 'binary'), function assertErrorThrows(err) {
        assert.equal(err.reason, 'connect ECONNREFUSED');
    });
    restClient.close();
    assert.end();
});

test('KafkaRestClient handle failed post with retries', function testKafkaRestClientHanldeFailedPostCall(assert) {
    var configs = {
        proxyHost: 'localhost',
        proxyPort: 1111,
        proxyRefreshTime: 0
    };
    var timeStamp = Date.now() / 1000.0;
    var restClient = new KafkaRestClient({
        proxyHost: configs.proxyHost,
        proxyPort: configs.proxyPort,
        refreshTime: configs.proxyRefreshTime,
        maxRetries: 1
    });

    function getProduceMessage(topic, message, ts, type) {
        var produceMessage = {};
        produceMessage.topic = topic;
        produceMessage.message = message;
        produceMessage.timeStamp = ts;
        produceMessage.type = type;
        return produceMessage;
    }

    restClient.produce(getProduceMessage('testTopic0', 'msg0', timeStamp, 'binary'),
        function assertHttpErrorReason(err) {
            assert.equal(err.reason, 'connect ECONNREFUSED');
        });

    restClient.produce(getProduceMessage('testTopic0', 'msg0', timeStamp, 'binary'),
        function assertErrorThrows(err) {
            assert.equal(err.reason, 'connect ECONNREFUSED');
        });
    /* eslint-disable no-undef,block-scoped-var */
    setTimeout(function stopAll() {
        restClient.close();
        assert.end();
    }, 8000);
    /* eslint-enable no-undef,block-scoped-var */
});

test('KafkaRestClient handle not cached non-heatpipe topics', function testKafkaRestClientHanldeFailedPostCall(assert) {

    var server = new KafkaRestProxyServer(15380);

    var configs = {
        proxyHost: 'localhost',
        proxyPort: 1111,
        proxyRefreshTime: 0
    };
    var timeStamp = Date.now() / 1000.0;
    var restClient = new KafkaRestClient({
        proxyHost: configs.proxyHost,
        proxyPort: configs.proxyPort,
        refreshTime: configs.proxyRefreshTime,
        maxRetries: 1
    });

    function getProduceMessage(topic, message, ts, type) {
        var produceMessage = {};
        produceMessage.topic = topic;
        produceMessage.message = message;
        produceMessage.timeStamp = ts;
        produceMessage.type = type;
        return produceMessage;
    }

    restClient.produce(getProduceMessage('testTopic-not-in-map', 'msg0', timeStamp, 'binary'),
        function assertHttpErrorReason(err) {
            assert.equal(err.reason, 'connect ECONNREFUSED');
            server.start();
            restClient.produce(getProduceMessage('testTopic-not-in-map', 'msg0', timeStamp, 'binary'),
                function assertHttpErrorReason2(err2) {
                    assert.equal(err2, null);
                });
        });

    restClient.produce(getProduceMessage('testTopic0', 'msg0', timeStamp, 'binary'),
        function assertHttpErrorReason(err) {
            assert.equal(err.reason, 'connect ECONNREFUSED');
        });

    restClient.produce(getProduceMessage('hp-testTopic-not-in-map', 'msg0', timeStamp, 'binary'),
        function assertErrorThrows(err) {
            assert.equal(err.message, 'Topics Not Found.');
        });
    /* eslint-disable no-undef,block-scoped-var */
    setTimeout(function stopAll() {
        restClient.close();
        server.stop();
        assert.end();
    }, 8000);
    /* eslint-enable no-undef,block-scoped-var */
});

test('KafkaRestClient handle post with blacklist client', function testKafkaRestClientHanldeFailedPostCall(assert) {
    var server = new MigratorBlacklistServer(2222);
    server.start();
    var migratorBlacklistClient = new MigratorBlacklistClient('localhost:2222');

    var configs = {
        proxyHost: 'localhost',
        proxyPort: 1111,
        proxyRefreshTime: 0
    };
    var timeStamp = Date.now() / 1000.0;
    var restClient = new KafkaRestClient({
        proxyHost: configs.proxyHost,
        proxyPort: configs.proxyPort,
        refreshTime: configs.proxyRefreshTime,
        blacklistMigratorHttpClient: migratorBlacklistClient,
        maxRetries: 1
    });

    function getProduceMessage(topic, message, ts, type) {
        var produceMessage = {};
        produceMessage.topic = topic;
        produceMessage.message = message;
        produceMessage.timeStamp = ts;
        produceMessage.type = type;
        return produceMessage;
    }

    restClient.produce(getProduceMessage('testTopic0', 'msg0', timeStamp, 'binary'),
        function assertHttpErrorReason(err) {
            assert.equal(err.reason, 'connect ECONNREFUSED');
        });

    restClient.produce(getProduceMessage('testTopic1', 'msg0', timeStamp, 'binary'),
        function assertErrorThrows(err, resp) {
            assert.equal(err.reason, 'connect ECONNREFUSED');
            assert.equal(resp, undefined);
        });

    /* eslint-disable no-undef,block-scoped-var */
    setTimeout(function stopAll() {
        restClient.close();
        server.stop();
        assert.end();
    }, 8000);
    /* eslint-enable no-undef,block-scoped-var */
});
