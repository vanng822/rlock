var assert = require('assert');
var rlock = require('../index.js');
var vows = require('vows');
var redis = require('redis');

vows.describe('Test suite for parsing options').addBatch({
	'Given options should be set correctly' : function() {
		var rclient = redis.createClient(6378);
		rclient.on('error', function(err) {
			// catch error emit so we not crashing
		});
		var lock1 = new rlock.Lock('rlock.parseOptions', {
			rclient : rclient,
			maxRetries : 30,
			retryDelay : 45,
			timeout : 3000
		});
		var lock2 = new rlock.Lock('rlock.parseOptions');
		assert.ok(lock1.rclient === rclient);
		assert.ok(lock2.rclient !== rclient);
		assert.ok(lock1.maxRetries === 30);
		assert.ok(lock1.retryDelay === 45);
		assert.ok(lock1.timeout === 3000);
		assert.ok(lock1.retries === 0);
		// assertion of default
		assert.ok(lock2.maxRetries === 10);
		assert.ok(lock2.retryDelay === 50);
		assert.ok(lock2.timeout === 5000);
		assert.ok(lock2.retries === 0);
	}
}).export(module);
