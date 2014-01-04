var assert = require('assert');
var rlock = require('../index.js');
var vows = require('vows');
var redis = require('redis');
var testUtil = require('./util.js');

vows.describe('Test suite for lock').addBatch({
	'acquire lock test1' : {
		'topic' : function() {
			this.lock = new rlock.Lock('rlock::test1');
			this.lock.acquire(this.callback);
		},
		'should be ok' : function(err, done) {
			assert.ok(done !== null);
		},
		'and lock flag is true': function(err, done) {
			assert.ok(this.lock._locked);
		},
		'and when getting value from redis' : {
			'topic' : function() {
				testUtil.getRedisKey('rlock::test1', this.callback);
			},
			'it should give same timestamp' : function(err, result) {
				assert.ok(parseInt(result) === this.lock._expire);
				testUtil.deleteRedisKey('rlock::test1');
			}
		}
	},
	'acquire buzy lock test2' : {
		'topic' : function() {
			testUtil.setRedisKey('rlock::test2');
			var lock = new rlock.Lock('rlock::test2', {
				retryDelay : 2,
				maxRetries : 1
			});
			lock.acquire(this.callback);
		},
		'should not be ok' : function(err, done) {
			assert.ok(done === null);
			testUtil.deleteRedisKey('rlock::test2');
		}
	}
}).export(module);
