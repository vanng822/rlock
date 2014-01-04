rlock
=====

Distributed lock for nodejs using redis


## Usage example

	var rlock = require('rlock');
	var lock = new rlock.Lock('rlock.key');
	lock.acquire(function(err, done) {
		// Do stuffs
		done();
		// OR
		done(function(err, ok){
			console.log(ok);
		});
		// OR
		lock.release(function(err, ok){
			console.log(ok);
		});
	});
	// Set global redis client, with your own setting
	var rlock = require('rlock');
	var redis = require('redis');
	rlock.setRedisClient(redis.createClient(6378));

## API

### Lock(key, options)
* `key` String
* `options` Object

Options available configuration
* `maxRetries` Maximum number of retries if can not acquire the lock, specify 0 if no retry, default 10.
* `retryDelay` Number of milliseconds to wait until next try, default 50 milliseconds.
* `timeout` Number of milliseconds before the lock expires, default 5000 milliseconds.
* `rclient` Instance of redis client, see https://github.com/mranney/node_redis#rediscreateclientport-host-options. If not specified it will create a client with default config.

#### Lock.acquire(callback)
* `callback` Function(err, done) success if and only if done is a function. Can use it to release the lock.

#### Lock.release(callback)
* `callback` Function(err, ok) success if ok true. Callback is optional. This can only call if Lock.acquire was successful.


### setRedisClient(client)
* `client` Instance of redis client, see https://github.com/mranney/node_redis#rediscreateclientport-host-options
