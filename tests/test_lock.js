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
		'and lock flag is true' : function(err, done) {
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
			var self = this;
			testUtil.setRedisKey('rlock::test2', function(err, result) {
				assert.ok(result);
				var lock = new rlock.Lock('rlock::test2', {
					retryDelay : 2,
					maxRetries : 1
				});
				lock.acquire(self.callback);
			});
		},
		'should not be ok' : function(err, done) {
			assert.ok(done === null);
			testUtil.deleteRedisKey('rlock::test2');
		}
	},
	'release lock test3' : {
		'topic' : function() {
			var self = this;
			this.lock = new rlock.Lock('rlock::test3');
			this.lock.acquire(function() {
				self.lock.release(self.callback);
			});
		},
		'should be ok' : function(err, result) {
			assert.ok(result === true);
		},
		'and when getting value from redis' : {
			'topic' : function() {
				testUtil.getRedisKey('rlock::test3', this.callback);
			},
			'it should give null' : function(err, result) {
				assert.ok(result === null);
			}
		}
	}
}).export(module);
