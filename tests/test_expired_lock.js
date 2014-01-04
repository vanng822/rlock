var assert = require('assert');
var rlock = require('../index.js');
var vows = require('vows');
var redis = require('redis');
var testUtil = require('./util.js');

vows.describe('Test suite for expired lock').addBatch({
	'acquire expired lock expire1' : {
		'topic' : function() {
			var self = this;
			testUtil.setRedisKey('rlock::expire1', Date.now() - 1000000, function(err, result) {
				assert.ok(result);
				self.lock = new rlock.Lock('rlock::expire1', {
					retryDelay : 2,
					maxRetries : 5
				});
				self.lock.acquire(self.callback);
			});
		},
		'should be ok' : function(err, done) {
			assert.ok(done !== null);
		},
		'and lock flag is true' : function(err, done) {
			assert.ok(this.lock._locked);
		},
		'and no need of retry': function(err, done) {
			assert.ok(this.lock.retries === 0);
		},
		'and when getting value from redis': {
			'topic': function() {
				testUtil.getRedisKey('rlock::expire1', this.callback);
			},
			'it should have same value' : function(err, result) {
				assert.ok(this.lock._expire === parseInt(result));
				testUtil.deleteRedisKey('rlock::expire1');
			}
		}
	}
}).export(module);
