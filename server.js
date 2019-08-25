const express = require('express');
const app = express();
const router = express.Router();
const config = require('./config');
const cluster = require('cluster');
const logic = require('./logic');

app.use('/', router);

if(cluster.isMaster && !process.env.DEBUG){
    const port = config.port || 8082;
    app.listen(port, function () {
        console.log('Pending Queue listening on port 8082')
    })

    //while the service runs with only one cpu this may be not so efficient. Still, I'm willing to leave clustering here
    for (var i = 0; i < config.workersAmount; i++) {
        cluster.fork();
    }

    cluster.on('exit', function(worker, code, signal) {
        console.log('worker ' + worker.process.pid + ' died');
    });
} else {
    logic.handleWorkerJob();
}

process.on('uncaughtException', function (err) {
	console.error((new Date).toUTCString() + ' uncaughtException:', err.message);
	console.error(err.stack);
	process.exit(1);
})


