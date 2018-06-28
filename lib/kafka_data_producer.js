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

var KafkaBaseProducer = require('./kafka_base_producer');
var ProducerRecord = require('./producer_record');

function KafkaDataProducer(options) {
    var self = this;
    self.producer = new KafkaBaseProducer(options, 'KafkaDataProducer');
}

KafkaDataProducer.prototype.connect = function connect(onConnect) {
    var self = this;
    self.producer.connect(onConnect);
};

KafkaDataProducer.prototype.produceSync = function produceSync(topic, produceRecord, callback) {
    var self = this;
    self.producer.produceSync(topic, produceRecord, callback);
};

KafkaDataProducer.prototype.produce = function produce(topic, message, timestamp, callback) {
    var self = this;
    var value;
    if (Buffer.isBuffer(message)) {
        value = message.toString();
    } else {
        value = message;
    }
    self.producer.produceSync(topic, new ProducerRecord({value: value}), callback);
};

KafkaDataProducer.prototype.close = function close(callback) {
    var self = this;
    self.producer.close(callback);
};

module.exports = KafkaDataProducer;
