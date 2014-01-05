var cluster = require('cluster');
var os = require('os');
var rlock = require('../lib/lock');
var key = 'rlock.example1';
/* tailor those for suitable server setup/hardware */
var options = {
	timeout : 200,
	maxRetries : 10, // big int compare to timeout means retry until success, reduce to see failure
	retryDelay : 50
};
var stats = {
	total: 0,
	acquireErr : 0,
	releaseErr : 0,
	acquireSuccess : 0,
	acquireFailed : 0,
	releaseSuccess : 0
};

if(cluster.isMaster) {
	for( i = 0; i < os.cpus().length; i++) {
		var worker = cluster.fork();
		worker.on('message', function(msg) {
			stats.total++;
			switch(msg.cmd) {
				case 'acquireErr':
					stats.acquireErr++;
					break;
				case 'releaseErr':
					stats.releaseErr++;
					break;
				case 'acquireSuccess':
					stats.acquireSuccess++;
					break;
				case 'releaseSuccess':
					stats.releaseSuccess++;
					break;
				case 'acquireFailed':
					stats.acquireFailed++;
					break;
			}
		});
	}
	setInterval(function() {
		console.log(stats);
	}, 2000);
} else if(cluster.isWorker) {
	setTimeout(function() {
		setInterval(function job() {
			var lock = new rlock.Lock(key, options);
			lock.acquire(function(err, done) {
				if(err) {
					process.send({
						cmd : 'acquireErr'
					});
					return;
				}
				if(done) {
					process.send({
						cmd : 'acquireSuccess'
					});
				} else {
					process.send({
						cmd : 'acquireFailed'
					});
					return;
				}
				setTimeout(function() {
					lock.release(function(err, ok) {
						if(err) {
							process.send({
								cmd : 'releaseErr'
							});
						}
						if(ok) {
							process.send({
								cmd : 'releaseSuccess'
							});
						}
					});
				}, Math.random() * options.timeout * 1.1); // simulate some long jobs
			});
		}, options.timeout * os.cpus().length);
	}, Math.random() * 500);
}
