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
	'fail to acquire buzy lock acquire2' : {
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
	'succeed to acquire buzy lock acquire4' : {
		'topic' : function() {
			var self = this;
			testUtil.setRedisKey('rlock::acquire4', Date.now() + 30, function(err, result) {
				assert.ok(result);
				self.lock = new rlock.Lock('rlock::acquire4', {
					retryDelay : 20,
					maxRetries : 5
				});
				self.lock.acquire(self.callback);
			});
		},
		'should be ok' : function(err, done) {
			assert.ok(done !== null);
			testUtil.deleteRedisKey('rlock::acquire4');
		},
		'and number of retries should be larger than zero': function(err, done) {
			assert.ok(this.lock.retries > 0);
		},
		'and the lock flag should be true' : function(err, done) {
			assert.ok(this.lock._locked === true);
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
	},
	'two concurrent acquire': {
		'topic': function() {
			var lock1 = new rlock.Lock('rlock::concurrent1', {maxRetries: 1, retryDelay: 5});
			var lock2 = new rlock.Lock('rlock::concurrent1', {maxRetries: 1, retryDelay: 5});
			var lock3 = new rlock.Lock('rlock::concurrent1', {maxRetries: 1, retryDelay: 5});
			var counter = 0;
			var self = this;
			lock1.acquire(function(err, done) {
				counter++;
				if (counter === 3) {
					self.callback(null, [lock1,lock2,lock3]);
				}
			});
			
			lock2.acquire(function(err, done) {
				counter++;
				if (counter === 3) {
					self.callback(null, [lock1,lock2,lock3]);
				}
			});
			
			lock3.acquire(function(err, done) {
				counter++;
				if (counter === 3) {
					self.callback(null, [lock1,lock2,lock3]);
				}
			});
		},
		'should be one success and others failed': function(err, locks) {
			var i, len, successCounter = 0;
			assert.equal(locks.length, 3);
			for (i = 0, len = locks.length; i < len; i++) {
				if (locks[i]._locked) {
					successCounter++;
				} else {
					assert.equal(locks[i].retries, 1);
				}
			}
			assert.equal(successCounter, 1);
			
			testUtil.deleteRedisKey('rlock::concurrent1');
		}
	}
}).export(module);
