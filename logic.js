
const config = require('./config');
const rp = require('request-promise');
const dataHandlerApi =`${config.dataHandler.url}:${config.dataHandler.port}`;
const Queue = require('bull');

const queue = new Queue("hotelsQueue", {redis: {port: config.redis.port, host: config.redis.host}});

function reserveHotel(task) {
    let params = {roomName: task.roomName, uid: parseInt(task.uid), dealId: task.dealId};
    
    return rp({
        uri: dataHandlerApi + '/closeDeal',
        qs:  params
    })
}

function handleUnsuccessfulMessage(job, jobDone) {
    if (Date.now() - job.data.firstTimeHandled > config.timeUntilThrown) { //There should be a limit on time any message can stay in the queue
        return jobDone();
    }
    
    queue.add(job.data, {      
        removeOnComplete: true
    })
    .then(()=>{
        jobDone();
    })
    .catch((err) =>{
        console.log(err); //better use logging tool with error index in order to monitor these logs
        jobDone(err);
    });
}

function handleWorkerJob(){
    queue.process(function(job, jobDone){
        job.data.firstTimeHandled = job.data.firstTimeHandled ? job.data.firstTimeHandled : Date.now();
        reserveHotel(job.data)
        .then((reserveRes)=>{
            let parsedRes = JSON.parse(reserveRes);
            if (!parsedRes.isSuccess) {
                handleUnsuccessfulMessage(job, jobDone);
            }
            else {
                jobDone();
            }
        });
    });
}


module.exports = { handleWorkerJob }