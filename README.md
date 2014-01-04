rlock
=====

redis lock for nodejs


## usage example

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
	

## API

### Lock(key, options)
* `key` String
* `options` Object

Options available configuration
* `maxRetries` Maximum number of retries if can not acquire the lock, specify 0 if no retry, default 10
* `retryDelay` Number of milliseconds to wait until next try, default 50 milliseconds.
* `timeout` Number of milliseconds before the lock expires
* `rclient` Instance of redis client, see https://github.com/mranney/node_redis#rediscreateclientport-host-options. If not specified a client will create a client with default config.

#### Lock.acquire(callback)
* `callback` Function(err, done) success if and only if done is a function. Can use it to release the lock.

#### Lock.release(callback)
* `callback` Function(err, ok) success if ok true. Callback is optional.
