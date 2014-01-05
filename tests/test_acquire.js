var assert = require('assert');
var rlock = require('../index.js');
var vows = require('vows');
var redis = require('redis');
var testUtil = require('./util.js');

vows.describe('Test suite for acquire lock').addBatch({
	'acquire lock acquire1' : {
		'topic' : function() {
			this.lock = new rlock.Lock('rlock::acquire1');
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
				testUtil.getRedisKey('rlock::acquire1', this.callback);
			},
			'it should give same timestamp' : function(err, result) {
				assert.ok(parseInt(result) === this.lock._expire);
				testUtil.deleteRedisKey('rlock::acquire1');
			}
		}
	},
	'acquire buzy lock acquire2' : {
		'topic' : function() {
			var self = this;
			testUtil.setRedisKey('rlock::acquire2', Date.now() + 1000000, function(err, result) {
				assert.ok(result);
				self.lock = new rlock.Lock('rlock::acquire2', {
					retryDelay : 2,
					maxRetries : 5
				});
				self.lock.acquire(self.callback);
			});
		},
		'should not be ok' : function(err, done) {
			assert.ok(done === null);
			testUtil.deleteRedisKey('rlock::acquire2');
		},
		'and number of retries should be correct': function(err, done) {
			assert.ok(this.lock.retries === 5);
		},
		'and the lock flag should be false' : function(err, done) {
			assert.ok(this.lock._locked === false);
		}
	},
	'acquire expired lock acquire3' : {
		'topic' : function() {
			var self = this;
			testUtil.setRedisKey('rlock::acquire3', Date.now() - 1000000, function(err, result) {
				assert.ok(result);
				self.lock = new rlock.Lock('rlock::acquire3', {
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
				testUtil.getRedisKey('rlock::acquire3', this.callback);
			},
			'it should have same value' : function(err, result) {
				assert.ok(this.lock._expire === parseInt(result));
				testUtil.deleteRedisKey('rlock::acquire3');
			}
		}
	}
}).export(module);
